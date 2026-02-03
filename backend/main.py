import os
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import pdfplumber
from openai import OpenAI
from pydantic import BaseModel, Field
from typing import Literal, Optional
import json
from io import BytesIO
import traceback
import pytesseract
from PIL import Image
from datetime import datetime, timedelta, timezone
import jwt
from google.auth.transport import requests
from google.oauth2 import id_token
import hashlib

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure authentication
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Simple in-memory user storage (replace with database in production)
users_db = {}  # {user_id: {email, name, picture, created_at, resume_analyses}}
sessions = {}  # {token: {user_id, email, expires_at}}

# Configure Tesseract path if provided
tesseract_cmd = os.getenv("TESSERACT_CMD")
if tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

client = OpenAI(api_key=api_key)


# ============ Authentication Utilities ============

def verify_google_token(token: str) -> dict:
    """
    Verify Google ID token and extract user info.
    Raises HTTPException if token is invalid.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLIENT_ID not configured in environment"
        )
    
    try:
        # Verify the token with Google
        id_info = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )
        
        # Token is valid
        return id_info
        
    except ValueError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Token verification failed: {str(e)}"
        )


def create_jwt_token(user_id: str, email: str) -> str:
    """Create a JWT token for authenticated user."""
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": now + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": now,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def verify_jwt_token(token: str) -> dict:
    """Verify JWT token and extract payload."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(authorization: Optional[str] = Header(None)) -> "UserProfile":
    """Dependency to get current authenticated user from JWT token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    token = parts[1]
    payload = verify_jwt_token(token)
    user_id = payload.get("user_id")
    
    if user_id not in users_db:
        raise HTTPException(status_code=401, detail="User not found")
    
    user_data = users_db[user_id]
    return UserProfile(
        id=user_id,
        email=user_data["email"],
        name=user_data["name"],
        picture=user_data.get("picture")
    )


# ============ Pydantic Models ============

class Metric(BaseModel):
    """Individual metric within a section."""
    label: str
    score: int = Field(ge=0, le=10)
    max: int = 10
    suggestion: str


class Section(BaseModel):
    """Analysis section with metrics."""
    name: str
    score: int = Field(ge=0, le=100)
    feedback: str
    icon: Literal["format", "content", "keywords", "impact"]
    metrics: list[Metric]


class KeywordMatch(BaseModel):
    """Keyword found in resume with frequency and relevance."""
    keyword: str
    frequency: int = Field(ge=0)
    relevance: Literal["high", "medium", "low"]


class Recommendation(BaseModel):
    """Actionable recommendation for resume improvement."""
    priority: Literal["high", "medium"]
    title: str
    description: str


class AnalysisResult(BaseModel):
    """Complete resume analysis result."""
    overallScore: int = Field(ge=0, le=100)
    atsCompatibilityScore: int = Field(ge=0, le=100)
    sections: list[Section]
    strengths: list[str]
    improvements: list[str]
    keywordMatches: list[KeywordMatch]
    recommendations: list[Recommendation]


# ============ Auth Models ============

class GoogleSignInRequest(BaseModel):
    """Google Sign-In token request from frontend."""
    token: str


class UserProfile(BaseModel):
    """User profile response."""
    id: str
    email: str
    name: str
    picture: Optional[str] = None


class AuthResponse(BaseModel):
    """Authentication response with JWT token."""
    accessToken: str
    user: UserProfile
    expiresIn: int  # seconds


class ResumeHistoryItem(BaseModel):
    """Stored resume analysis metadata for a user."""
    id: str
    filename: str
    timestamp: str
    overall_score: int
    status: Literal["analyzed", "pending", "optimizing"] = "analyzed"


# ============ Utility Functions ============

def ensure_tesseract_available():
    """Verify Tesseract is available on PATH."""
    try:
        pytesseract.get_tesseract_version()
    except Exception as e:
        message = str(e) or "Tesseract not found"
        print("Tesseract error traceback:\n" + traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=(
                "OCR requires Tesseract. Install it and add to PATH. "
                "Windows: https://github.com/UB-Mannheim/tesseract/wiki. "
                f"Details: {message}"
            ),
        )


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file using pdfplumber, with OCR fallback for scanned PDFs."""
    try:
        # Wrap bytes in BytesIO to create a file-like object
        file_obj = BytesIO(file_content)
        with pdfplumber.open(file_obj) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                # Handle None return and empty text
                if page_text:
                    text += page_text + "\n"
        
        # Check if we extracted any text
        if text.strip():
            return text
        
        # If no text found, try OCR on PDF pages
        print("No text extracted from PDF, attempting OCR...")
        return extract_text_from_pdf_ocr(file_content)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error extracting PDF text: {str(e)}")


def extract_text_from_pdf_ocr(file_content: bytes) -> str:
    """Extract text from PDF pages using OCR (for scanned PDFs)."""
    try:
        from pdf2image import convert_from_bytes
        import numpy as np
        
        # Convert PDF pages to images
        images = convert_from_bytes(file_content)
        
        if not images:
            raise ValueError("Could not convert PDF to images")
        
        ensure_tesseract_available()
        text = ""
        
        for idx, image in enumerate(images, 1):
            print(f"Processing page {idx} with OCR...")
            # Convert PIL Image to numpy array
            img_array = np.array(image)
            
            # Run OCR with Tesseract
            page_text = pytesseract.image_to_string(img_array)
            text += page_text + "\n"
        
        if not text.strip():
            raise ValueError("No text could be extracted from PDF pages using OCR")
        
        return text
        
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PDF OCR support requires pdf2image. Please run: pip install pdf2image",
        )
    except Exception as e:
        message = str(e)
        print(f"OCR PDF error: {message}")
        if "PDFInfoNotInstalledError" in message or "poppler" in message.lower():
            raise HTTPException(
                status_code=500,
                detail=(
                    "PDF OCR requires Poppler. Install Poppler and ensure it's on PATH. "
                    "Windows: https://github.com/oschwartz10612/poppler-windows"
                ),
            )
        raise HTTPException(status_code=400, detail=f"Error during OCR: {message}")


def extract_text_from_image(file_content: bytes) -> str:
    """Extract text from image file using OCR."""
    try:
        import numpy as np
        
        ensure_tesseract_available()
        # Open image from bytes
        image = Image.open(BytesIO(file_content))
        img_array = np.array(image)
        
        print("Processing image with OCR...")
        # Run OCR with Tesseract
        text = pytesseract.image_to_string(img_array)
        
        if not text.strip():
            raise ValueError("No text could be extracted from image")
        
        return text
        
    except Exception as e:
        message = str(e)
        if not message:
            message = "Unknown OCR error. Check server logs for traceback."
        print("OCR image error traceback:\n" + traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Error extracting image text: {message}")


def analyze_resume_with_gpt(resume_text: str) -> AnalysisResult:
    """
    Analyze resume using GPT-4o with comprehensive, detailed evaluation framework.
    Returns validated AnalysisResult with strict schema.
    """
    
    analysis_prompt = f"""You are an expert resume analyst with 20+ years of hiring and career coaching experience. Analyze the following resume comprehensively and provide detailed, ACCURATE ratings based on professional standards.

CRITICAL: Your response MUST be valid JSON matching this exact schema:
{{
  "overallScore": <integer 0-100>,
  "atsCompatibilityScore": <integer 0-100>,
  "sections": [
    {{
      "name": "<string>",
      "score": <integer 0-100>,
      "feedback": "<string>",
      "icon": "<one of: 'format', 'content', 'keywords', 'impact'>",
      "metrics": [
        {{
          "label": "<string>",
          "score": <integer 0-10>,
          "max": 10,
          "suggestion": "<string>"
        }}
      ]
    }}
  ],
  "strengths": ["<string>", ...],
  "improvements": ["<string>", ...],
  "keywordMatches": [
    {{
      "keyword": "<string>",
      "frequency": <integer>,
      "relevance": "<one of: 'high', 'medium', 'low'>"
    }}
  ],
  "recommendations": [
    {{
      "priority": "<one of: 'high', 'medium'>",
      "title": "<string>",
      "description": "<string>"
    }}
  ]
}}

====== COMPREHENSIVE EVALUATION FRAMEWORK ======

1. FORMAT & STRUCTURE (icon: "format") - Evaluate and rate 0-100
   Critical evaluation points:
   - Visual hierarchy and readability: Font consistency (no more than 2-3 fonts), proper size hierarchy (11-12pt body, 14pt+ headers)
   - Section organization and logical flow: Standard order (contact, summary, experience, skills, education, certifications)
   - Length appropriateness: 1 page for entry-level (<2yrs), 1-2 pages for mid-career (2-10yrs), 2 pages for senior (10+ yrs)
   - Formatting consistency: Bullet points aligned, consistent date formats (MM/YYYY or Month Year), spacing between sections
   - Mobile/ATS parsing compatibility: NO graphics, tables, columns, images, icons, or complex formatting. Plain text parseable
   - Margins and spacing: 0.5-1 inch margins, adequate white space preventing dense walls of text
   
   Specific metrics (rate each 0-10 with suggestions):
   - Section Clarity: How logically organized and easy to scan?
   - Font Consistency: Appropriate fonts and sizes?
   - Spacing Balance: Not too cramped, not too sparse?
   - ATS Parsability: Will ATS systems parse correctly?
   - Length Optimization: Appropriate length for experience level?
   - Visual Hierarchy: Clear emphasis on most important content?

2. CONTENT QUALITY (icon: "content") - Evaluate and rate 0-100
   Critical evaluation points:
   - Professional summary/objective: Is it compelling, role-specific, and achievement-focused? Or generic and vague?
   - Experience descriptions depth: Are job responsibilities clear? Are accomplishments specific or vague ("was responsible for" vs "led")?
   - Relevance of positions to target role: Does career progression show advancement? Are jobs relevant to likely target role?
   - Detail level and specificity: Are bullet points detailed enough to understand impact? Or just lists of duties?
   - Education section completeness: Degree type, institution name, graduation date, GPA (if 3.5+), relevant coursework
   - Certifications and additional qualifications: Listed? Dated? Relevant to the industry?
   - Skills section organization: Organized by category or skill level? Or just random list?
   - Writing quality: Spelling, grammar, punctuation errors? Professional tone maintained?
   
   Specific metrics (rate each 0-10 with suggestions):
   - Experience Relevance: How relevant are positions to career goals?
   - Achievement Detail: Are accomplishments specific with context?
   - Summary Quality: Is professional summary compelling and role-specific?
   - Grammatical Accuracy: Any spelling, grammar, or punctuation errors?
   - Skill Organization: Skills well-categorized and relevant?
   - Education Completeness: All degree details included?

3. KEYWORDS & ATS OPTIMIZATION (icon: "keywords") - Evaluate and rate 0-100
   Critical evaluation points:
   - Technical skills keywords: Programming languages, tools, platforms, frameworks, software (Python, Java, SQL, AWS, React, etc.)
   - Industry-specific terminology: Domain language relevant to the field (HIPAA for healthcare, GDPR for data, etc.)
   - Soft skills presence: Leadership, communication, teamwork, problem-solving, project management, etc.
   - Keyword density: Not too sparse (missing expected keywords), not keyword-stuffed
   - Action verb variety and strength: "Led", "Implemented", "Optimized" are strong; "Was responsible for", "Worked on" are weak
   - Missing critical keywords: Compare to typical job postings - what major keywords are missing?
   - ATS keyword matching: Do keywords match likely job descriptions in target field?
   - Acronym clarity: Define any acronyms (avoid "JIRA" without context if industry-specific)
   
   Specific metrics (rate each 0-10 with suggestions):
   - Technical Skills: Sufficient technical keywords listed?
   - Industry Terms: Domain-specific language present?
   - Soft Skills: Leadership and interpersonal skills visible?
   - Action Verb Strength: Strong, impactful action verbs used?
   - Keyword Optimization: Matches likely target job postings?
   - Acronym Clarity: All acronyms defined or understood in context?

4. IMPACT & QUANTIFIABLE RESULTS (icon: "impact") - Evaluate and rate 0-100
   Critical evaluation points:
   - Percentage and metric usage: Are results quantified with %, $, hours, etc.? Or vague ("improved efficiency")?
   - Business impact clarity: Can reader understand business value? (Revenue generated, cost saved, efficiency gains, growth metrics)
   - Achievement prominence: Are accomplishments prominent or buried among duties?
   - Challenge-Action-Result (CAR) format: "Challenge: Problem faced. Action: What I did. Result: Measurable outcome"
   - Quantifiable outcomes: Do results have numbers, percentages, concrete metrics?
   - Results relevance and credibility: Are results significant and believable?
   - Outcome measurement specificity: Is baseline clear? Is improvement magnitude clear?
   - Progressive responsibility: Do achievements show increasing complexity and responsibility over time?
   
   Specific metrics (rate each 0-10 with suggestions):
   - Quantification Usage: Results expressed with numbers/percentages?
   - Business Impact: Can reader understand business value?
   - Result Specificity: Are improvements specific and measurable?
   - Achievement Clarity: Accomplishments clear and prominent?
   - CAR Format Usage: Challenge-Action-Result structure used?
   - Progressive Responsibility: Increasing complexity and scope visible?

====== SCORING METHODOLOGY ======

OVERALL SCORE (weighted):
- Content Quality: 40% (depth, relevance, detail, accuracy)
- Impact & Results: 35% (quantification, business value, achievement clarity)
- Keywords: 12.5% (technical skills, industry terms, soft skills)
- Format: 12.5% (organization, readability, ATS compatibility)
- Apply penalties for critical issues:
  - Poor grammar/spelling: -5 to -10 points
  - Missing contact info: -10 points
  - Unclear career progression: -10 points
  - No quantifiable results: -15 points
  - Poor formatting/ATS issues: -10 points

ATS COMPATIBILITY SCORE (0-100):
- Evaluate likelihood of passing Applicant Tracking Systems
- 0-40: Poor format (graphics, tables, columns), sparse keywords, missing info
- 40-70: Acceptable format but missing some keywords or optimization
- 70-85: Good format and keywords, minor optimization needed
- 85-100: Excellent ATS optimization, clean format, comprehensive keywords

STRENGTHS (5-7 items):
- Identify genuine strengths observed. Be specific and positive but realistic.

IMPROVEMENTS (8-10 items):
- Identify specific, actionable improvements prioritized by impact. Be critical but constructive.

KEYWORD MATCHES (10-15 items):
- Extract professional keywords found with frequency count and relevance (high/medium/low)
- HIGH relevance: Critical technical/industry keywords
- MEDIUM relevance: Important soft skills or supporting keywords
- LOW relevance: Tangential keywords, nice-to-have skills

RECOMMENDATIONS (6-8 items):
- Specific, actionable recommendations with priority level (high/medium)
- HIGH priority: Critical improvements affecting overall competitiveness
- MEDIUM priority: Important but secondary improvements

====== CRITICAL INSTRUCTIONS ======
- BE CRITICAL AND ACCURATE: This is a professional evaluation, not a confidence booster
- Score conservatively: A 70-75 resume is good, 80+ is excellent, 90+ is outstanding
- Most resumes should score 45-65 unless exceptional
- Provide specific, actionable feedback, not generic praise
- If content is weak, scores should reflect that (even if format is good)
- Missing quantifiable results is a major detriment (should lower Content and Impact scores significantly)

Resume to analyze:
{resume_text}

GENERATE COMPREHENSIVE, DETAILED, ACCURATE ANALYSIS NOW.
Ensure all sections have exactly one icon value from: format, content, keywords, impact.
Return ONLY valid JSON, no other text."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert professional resume analyst. Provide detailed, ACCURATE, and CRITICAL evaluations based on professional hiring standards. Do not inflate scores. Rate conservatively and provide actionable feedback. Always return valid JSON matching the specified schema exactly.",
                },
                {"role": "user", "content": analysis_prompt},
            ],
            temperature=0.6,  # Slightly lower to encourage more consistent, critical analysis
            response_format={"type": "json_object"},
        )
        
        # Parse the JSON response
        response_text = response.choices[0].message.content
        analysis_data = json.loads(response_text)
        
        # Validate and parse into Pydantic model (raises ValidationError if schema doesn't match)
        try:
            validated_result = AnalysisResult(**analysis_data)
            return validated_result
        except Exception as validation_error:
            print(f"Pydantic validation error: {validation_error}")
            print(f"AI response was: {json.dumps(analysis_data, indent=2)}")
            raise HTTPException(
                status_code=500,
                detail=f"AI response validation failed: {str(validation_error)}",
            )
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Error parsing AI response as JSON: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing resume: {str(e)}")


# ============ API Endpoints ============

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/auth/signin", response_model=AuthResponse)
async def signin(request: GoogleSignInRequest):
    """
    Sign in with Google. Verifies Google ID token and returns JWT.
    Frontend sends Google token, backend verifies and creates session.
    """
    # Verify Google token
    id_info = verify_google_token(request.token)
    
    # Extract user info from Google token
    user_id = id_info.get("sub")  # Google's unique user ID
    email = id_info.get("email")
    name = id_info.get("name", "User")
    picture = id_info.get("picture")
    
    if not user_id or not email:
        raise HTTPException(status_code=400, detail="Missing user info in token")
    
    # Create or update user in database
    if user_id not in users_db:
        users_db[user_id] = {
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "resume_analyses": []
        }
    else:
        # Update user info in case it changed
        users_db[user_id].update({
            "email": email,
            "name": name,
            "picture": picture
        })
    
    # Create JWT token for this session
    jwt_token = create_jwt_token(user_id, email)
    
    # Return auth response
    return AuthResponse(
        accessToken=jwt_token,
        user=UserProfile(
            id=user_id,
            email=email,
            name=name,
            picture=picture
        ),
        expiresIn=JWT_EXPIRATION_HOURS * 3600
    )


@app.get("/auth/me", response_model=UserProfile)
async def get_current_user_info(current_user: UserProfile = Depends(get_current_user)):
    """Get current authenticated user info."""
    return current_user


@app.post("/auth/signout")
async def signout(current_user: UserProfile = Depends(get_current_user)):
    """Sign out current user."""
    return {"status": "signed out"}


@app.get("/resumes", response_model=list[ResumeHistoryItem])
async def list_resumes(current_user: UserProfile = Depends(get_current_user)):
    """Get resume analysis history for current user."""
    user_data = users_db.get(current_user.id, {})
    return user_data.get("resume_analyses", [])


@app.post("/analyze-resume", response_model=AnalysisResult)
async def analyze_resume(file: UploadFile = File(...), current_user: UserProfile = Depends(get_current_user)):
    """
    Upload a resume (PDF or image) and get AI-powered analysis.
    Supports: PDF (with OCR for scanned PDFs), JPG, PNG, BMP, TIFF.
    Returns detailed analysis with scores, feedback, and recommendations.
    Requires authentication (JWT token).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")
    
    filename_lower = file.filename.lower()
    
    # Check file type
    if filename_lower.endswith('.pdf'):
        file_type = 'pdf'
    elif filename_lower.endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff')):
        file_type = 'image'
    else:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and image files (JPG, PNG, BMP, TIFF) are supported",
        )
    
    # Read file content
    content = await file.read()
    
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    
    # Extract text based on file type
    if file_type == 'pdf':
        resume_text = extract_text_from_pdf(content)
    else:  # image
        resume_text = extract_text_from_image(content)
    
    # Analyze with OpenAI (single pass, comprehensive prompt)
    analysis = analyze_resume_with_gpt(resume_text)
    
    # Save analysis to user's history
    analysis_timestamp = datetime.now(timezone.utc).isoformat()
    analysis_id = hashlib.sha256(
        f"{current_user.id}:{file.filename}:{analysis_timestamp}".encode("utf-8")
    ).hexdigest()[:12]
    analysis_record = {
        "id": analysis_id,
        "filename": file.filename,
        "timestamp": analysis_timestamp,
        "overall_score": analysis.overallScore,
        "status": "analyzed",
        "analysis": analysis.dict(),
    }
    users_db[current_user.id]["resume_analyses"].append(analysis_record)
    
    return analysis


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
