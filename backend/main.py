import os
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header, Form
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
import uuid

# Load environment variables
load_dotenv()

# Initialize database
from database import (
    init_db, create_user, get_user, user_exists, update_user,
    save_resume, get_user_resumes, get_resume, delete_resume,
    save_analysis, get_resume_analyses, get_user_analyses,
    save_job_match, get_job_matches, get_user_job_matches,
    log_event, get_user_analytics, get_user_analytics_summary
)

# Initialize database on startup
init_db()

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
    personalizedAdvice: str = Field(description="AI-generated personalized advice for this specific resume")
    sections: list[Section]
    strengths: list[str]
    improvements: list[str]
    keywordMatches: list[KeywordMatch]
    recommendations: list[Recommendation]


class JobMatchResult(BaseModel):
    """Job description matching result."""
    matchPercentage: int = Field(ge=0, le=100, description="Percentage match between resume and job")
    hirabilityScore: int = Field(ge=0, le=100, description="Overall chance of being hired (0-100)")
    matchAnalysis: str = Field(description="Detailed analysis of resume to job fit")
    keywordMatches: list[KeywordMatch]
    missingKeywords: list[str] = Field(description="Important keywords from job not in resume")
    strengths: list[str] = Field(description="Resume strengths for this specific job")
    improvements: list[str] = Field(description="Specific improvements to match this job better")
    recommendations: list[Recommendation] = Field(description="Actionable recommendations to improve chances")


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
    overall_score: Optional[int] = None  # None for job match results
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


def analyze_resume_with_gpt(resume_text: str, job_title: str = "") -> AnalysisResult:
    """
    Analyze resume using GPT-4o-mini with comprehensive, detailed evaluation framework.
    Tailored to the specific job position if provided.
    Returns validated AnalysisResult with strict schema.
    """
    
    job_context = ""
    if job_title:
        job_context = f"""
JOB TARGET:
You will be evaluating this resume specifically for the following job position: {job_title}

Key analysis focus:
1. How well does the resume match typical requirements for a {job_title} role?
2. Are relevant technical skills and experience evident?
3. Does the resume address likely job posting requirements for this position?
4. Rate keywords based on importance for {job_title} specifically
5. Prioritize improvements that would make the candidate more competitive for {job_title}

Recommendations should include how to make the resume more competitive specifically for {job_title} positions.
"""
    analysis_prompt = f"""You are an expert resume analyst with 25+ years of hiring, talent acquisition, and ATS system experience. Your task is to provide the MOST ACCURATE resume evaluation possible.

ANALYSIS INSTRUCTIONS:
1. Read the entire resume carefully before scoring
2. Compare against actual industry standards, not arbitrary benchmarks
3. Score based on OBSERVABLE facts, not assumptions
4. Be critical: this helps candidates improve
5. Identify specific issues with line-by-line analysis
6. Provide actionable, specific feedback

CRITICAL JSON REQUIREMENT:
Your response MUST be ONLY valid JSON (no markdown, no code blocks, no extra text) matching this schema EXACTLY:
{{
  "overallScore": <integer 0-100>,
  "atsCompatibilityScore": <integer 0-100>,
  "personalizedAdvice": "<detailed, personalized 3-4 paragraph advice specifically for THIS resume>",
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

1. FORMAT & STRUCTURE (icon: "format") - 0-100 score
   SCORING RUBRIC:
   - 90-100: Professional formatting, excellent ATS compatibility, perfect organization
   - 70-89: Minor formatting issues, generally ATS compatible, good structure
   - 50-69: Noticeable formatting problems, some ATS issues, organization needs work
   - 30-49: Poor formatting, major ATS concerns, confusing structure
   - 0-29: Unusable format, not ATS compatible, severely disorganized

   CRITICAL CHECKS:
   - Length: Entry <2yrs=1pg, Mid 2-10yrs=1-2pg, Senior 10+yrs=2pg max. Penalize by -15 if exceeded
   - NO graphics, tables, columns, images, text boxes, unusual fonts/symbols
   - Contact info present (name, email, phone, location)
   - Consistent date format throughout (MM/YYYY or Month Year, not "present"/"current")
   - Proper bullet alignment, consistent spacing, readable margins
   - No walls of text: visual breathing room between sections
   
   Metrics to rate (0-10 each):
   - Section Clarity (1-10): Logical flow from top to bottom
   - Font Consistency (1-10): Professional fonts only, 11-12pt body text
   - Spacing Balance (1-10): White space adequate without being sparse
   - ATS Parsability (1-10): Will ATS extract text correctly?
   - Length Optimization (1-10): Appropriate for experience level
   - Visual Hierarchy (1-10): Easy to scan, important info stands out

2. CONTENT QUALITY (icon: "content") - 0-100 score
   SCORING RUBRIC:
   - 90-100: Compelling narrative, all details present, error-free, strategic positioning
   - 70-89: Good content, minor gaps, professional tone, mostly complete
   - 50-69: Basic content, some missing details, few errors, generic tone
   - 30-49: Weak content, vague descriptions, multiple errors, unclear progression
   - 0-29: Poor quality, major omissions, numerous errors, incoherent

   CRITICAL CHECKS:
   - Professional summary: Role-specific? Achievement-focused? Or generic?
   - Experience descriptions: Start each with strong ACTION VERB. Use "Led", "Implemented", "Optimized" NOT "Was responsible for"
   - Job duties vs accomplishments: Ratio should be 30% duties / 70% accomplishments
   - Career progression: Each job more complex/responsible than previous?
   - Education complete: Degree, institution, graduation date, GPA (if 3.5+), relevant coursework
   - Certifications: All listed with dates? Relevant to target industry?
   - No typos, spelling errors, or grammar mistakes
   - Skills section: Organized by category (Technical, Leadership, etc.) or jumbled?
   
   Metrics to rate (0-10 each):
   - Experience Relevance (1-10): Jobs aligned with target role progression
   - Achievement Detail (1-10): Accomplishments specific with impact
   - Summary Quality (1-10): Compelling, role-specific professional summary
   - Grammatical Accuracy (1-10): No errors in spelling, grammar, punctuation
   - Skill Organization (1-10): Well-categorized and industry-relevant
   - Education Completeness (1-10): All required degree info present

3. KEYWORDS & ATS OPTIMIZATION (icon: "keywords") - 0-100 score
   SCORING RUBRIC:
   - 90-100: Rich keyword diversity, industry-specific terms, strong action verbs, comprehensive
   - 70-89: Good keyword coverage, most industry terms, mostly strong verbs
   - 50-69: Basic keywords present, some industry terms missing, weak verb usage
   - 30-49: Sparse keywords, major gaps, few action verbs
   - 0-29: Minimal keywords, almost no industry terminology

   CRITICAL CHECKS:
   - Count action verbs used: "Led", "Implemented", "Optimized", "Achieved", "Improved", "Delivered"
     Strong verbs: 10+. Weak phrases like "responsible for" or "worked on" = penalize by -10
   - Industry keywords: Research typical 5-10 job postings for role. Resume should contain 50%+ of keywords
   - Technical keywords: Are major tools/languages/platforms mentioned?
   - Soft skills: Communication, Leadership, Teamwork visible?
   - No keyword stuffing (obvious repetition of same word)
   - Acronyms defined or industry-standard (AWS, SQL fine; internal company acronyms = penalize)
   
   Metrics to rate (0-10 each):
   - Technical Skills (1-10): Programming, tools, platforms mentioned
   - Industry Terms (1-10): Domain-specific terminology present
   - Soft Skills (1-10): Leadership, communication, collaboration visible
   - Action Verb Strength (1-10): Powerful verbs instead of weak phrases
   - Keyword Optimization (1-10): Matches typical job postings in field
   - Acronym Clarity (1-10): Acronyms defined or industry-standard

4. IMPACT & QUANTIFIABLE RESULTS (icon: "impact") - 0-100 score
   SCORING RUBRIC:
   - 90-100: Every accomplishment quantified, clear business value, impressive metrics
   - 70-89: Most accomplishments quantified, good business context, believable
   - 50-69: Some quantification, results somewhat unclear, mixed confidence
   - 30-49: Little quantification, vague business impact, weak results
   - 0-29: No quantification, no business impact, no measurable results

   CRITICAL CHECKS:
   - Quantification: Every bullet should have %, $, #, timeframe, or measurable outcome
     Example WEAK: "Improved efficiency in customer service"
     Example STRONG: "Reduced response time by 40% (from 2hrs to 1.2hrs), handling 25% more tickets monthly"
   - CAR Format: Challenge-Action-Result in bullets?
   - Business value: Can recruiter understand impact on company/customers?
   - Metrics: Revenue, cost savings, efficiency gains, growth %, time saved?
   - Scale: Impact proportional to role level?
   - Credibility: Results believable or inflated?
   
   Metrics to rate (0-10 each):
   - Quantification Usage (1-10): Results have numbers/percentages
   - Business Impact (1-10): Value to company clearly stated
   - Result Specificity (1-10): Improvements measurable and specific
   - Achievement Clarity (1-10): Accomplishments stand out vs duties
   - CAR Format (1-10): Challenge-Action-Result structure used
   - Progressive Responsibility (1-10): Increasing scope and complexity

====== SCORING FORMULA ======

METRIC SCORES: Average each section's 6 metrics (0-100 scale)
- Format Score = Avg(Section Clarity, Font, Spacing, ATS, Length, Hierarchy)
- Content Score = Avg(Experience Relevance, Achievement Detail, Summary, Grammar, Skills, Education)
- Keywords Score = Avg(Technical, Industry Terms, Soft Skills, Action Verbs, Optimization, Acronyms)
- Impact Score = Avg(Quantification, Business Impact, Specificity, Clarity, CAR, Progressive)

OVERALL SCORE = Weighted Average:
- (Content × 0.40) + (Impact × 0.35) + (Keywords × 0.125) + (Format × 0.125)

Apply PENALTIES (max -20 total):
- Grammar/spelling errors (-2 per error, max -10): Any typos = immediate notice
- Missing contact info (-10): No email or phone = critical
- No quantifiable results (-15): Zero numbers in bullets = major detriment
- ATS red flags (-10): Tables, graphics, complex formatting
- Career gaps/unclear progression (-10): Unexplained time jumps

ATS COMPATIBILITY SCORE:
- Assess probability resume passes ATS parsing
- Check: No graphics, no tables, no columns, plain text format, clear structure
- 85-100: Excellent (will parse cleanly in any ATS)
- 70-84: Good (should parse with minor issues)
- 50-69: Acceptable (may have parsing issues)
- 30-49: Poor (likely to fail ATS)
- 0-29: Critical (almost certainly won't parse)

====== ACCURACY REQUIREMENTS ======

STRENGTHS (List 5-7):
- Only list ACTUAL strengths you observed in resume
- Be specific: "Well-organized technical skills section" not "Good skills"
- Positive but realistic

IMPROVEMENTS (List 8-10):
- Prioritize by impact: What fixes would help MOST?
- Be specific and actionable: "Add quantifiable metrics to experience bullets" not "Make it better"
- Include line-by-line examples where possible

KEYWORD MATCHES (List 10-15):
- Extract ACTUAL keywords you see, don't invent
- Count ACTUAL frequency (how many times mentioned)
- Assess relevance based on typical job postings in field

RECOMMENDATIONS (List 6-8):
- HIGH priority: Critical improvements (grammar fixes, missing quantification, format issues)
- MEDIUM priority: Enhancement opportunities (better organization, additional keywords)
- Each should be specific and actionable

PERSONALIZED ADVICE (3-4 detailed paragraphs):
- Write personalized, specific advice for THIS exact resume
- Reference actual content from their resume (e.g., "Your experience at [Company] shows strong...")
- Provide a strategic narrative: What's working? What needs immediate attention? What's the path forward?
- Be encouraging but honest - this is personal coaching, not generic template
- Include specific next steps they should take
- Make it feel like a 1-on-1 conversation with an expert career advisor

====== CRITICAL ACCURACY GUIDELINES ======

DO:
✓ Score based on what's ACTUALLY in the resume
✓ Be objective and evidence-based
✓ Compare against real industry standards
✓ Lower scores for missing elements (no quantification = major deduction)
✓ Verify calculations match rubrics exactly
✓ Check JSON schema compliance before responding

DON'T:
✗ Assume details not present
✗ Give high scores for adequate/acceptable work
✗ Use generic feedback
✗ Inflate scores to be "nice"
✗ Miss obvious errors or omissions

Resume to analyze:
{resume_text}
{job_context}

PERFORM ANALYSIS:
1. Read entire resume carefully
2. Calculate each metric score (1-10) with reasoning
3. Calculate section scores (0-100) from metrics
4. Calculate overall score using formula
5. Identify specific strengths (5-7 actual items)
6. Identify specific improvements (8-10 actionable items)
7. Extract keywords with frequency
8. Create recommendations with priority
9. Return ONLY valid JSON, no extra text
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Cost-efficient model (~25x cheaper than gpt-4o)
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert professional resume analyst. Provide detailed, ACCURATE, and CRITICAL evaluations based on professional hiring standards. Score based on OBSERVABLE facts only. Do not inflate scores. Rate conservatively. Always return valid JSON ONLY matching the specified schema exactly. No markdown, no code blocks.",
                },
                {"role": "user", "content": analysis_prompt},
            ],
            temperature=0.3,  # Lower temperature for more consistent, objective analysis
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


def analyze_resume_to_job(resume_text: str, job_description: str) -> JobMatchResult:
    """
    Analyze how well a resume matches a specific job description.
    Returns match percentage, hireability score, and detailed recommendations.
    """
    analysis_prompt = f"""You are an expert recruiter and ATS specialist with 20+ years of experience matching resumes to job descriptions. Analyze how well this resume matches the given job posting.

CRITICAL JSON REQUIREMENT:
Your response MUST be ONLY valid JSON (no markdown, no code blocks, no extra text) matching this schema EXACTLY:
{{
  "matchPercentage": <integer 0-100>,
  "hirabilityScore": <integer 0-100>,
  "matchAnalysis": "<detailed 2-3 paragraph analysis of resume to job fit>",
  "keywordMatches": [
    {{
      "keyword": "<string>",
      "frequency": <integer>,
      "relevance": "<one of: 'high', 'medium', 'low'>"
    }}
  ],
  "missingKeywords": ["<string>", ...],
  "strengths": ["<string>", ...],
  "improvements": ["<string>", ...],
  "recommendations": [
    {{
      "priority": "<one of: 'high', 'medium'>",
      "title": "<string>",
      "description": "<string>"
    }}
  ]
}}

====== EVALUATION FRAMEWORK ======

JOB DESCRIPTION:
{job_description}

RESUME:
{resume_text}

====== ANALYSIS INSTRUCTIONS ======

1. MATCH PERCENTAGE (0-100):
   - 90-100: Exceptional fit, almost all required skills present
   - 75-89: Strong fit, most requirements met, few gaps
   - 60-74: Good fit, core requirements met, some gaps
   - 40-59: Moderate fit, some alignment, significant gaps
   - 20-39: Weak fit, limited alignment, many gaps
   - 0-19: Poor fit, minimal alignment, critical gaps

2. HIREABILITY SCORE (0-100):
   - This is your professional assessment: "Would I hire this person for this role?"
   - Consider: skills match, experience level, career progression, relevance
   - 85-100: Strong hire, likely to succeed
   - 70-84: Good hire, should perform well
   - 55-69: Possible hire, might work with training
   - 40-54: Questionable hire, concerns about fit
   - 20-39: Unlikely hire, significant concerns
   - 0-19: Poor hire, not recommended

3. KEYWORD MATCHING:
   - Extract keywords FROM THE JOB DESCRIPTION that appear in the resume
   - Only list keywords that are actually present in resume
   - Assess relevance (high = critical for role, medium = important, low = nice-to-have)
   - Track frequency of keywords

4. MISSING KEYWORDS:
   - Extract 5-8 keywords FROM THE JOB DESCRIPTION that are NOT in the resume
   - Only include keywords that are clearly mentioned in the job posting
   - Prioritize high-impact keywords the candidate lacks

5. STRENGTHS (For This Specific Job):
   - List 4-6 actual resume strengths that match this job
   - Be specific: "Experience with [technology] for [type of projects]"
   - Explain why each strength is relevant to this role

6. IMPROVEMENTS (For This Specific Job):
   - List 5-7 specific improvements to better match this job
   - Focus on what would make them stronger candidate for THIS role
   - Include missing skills/experience, keyword additions, restructuring suggestions

7. RECOMMENDATIONS (Actionable Next Steps):
   - HIGH priority: Critical additions/changes to improve chances (missing required skills, add missing keywords, highlight relevant experience)
   - MEDIUM priority: Enhancement opportunities (additional certifications, side projects, volunteer experience)
   - Each should be specific and directly improve match for this job

====== SCORING GUIDELINES ======

MATCH PERCENTAGE reflects: alignment of skills, experience, requirements
HIREABILITY SCORE reflects: your gut feeling as experienced recruiter - would you hire them?

These can differ:
- Resume might match job posting well (high match %) but candidate might be overqualified or have red flags (lower hireability)
- Candidate might have good foundation but gaps (medium match %) but strong potential (higher hireability)

Be balanced and realistic. Most candidates won't be perfect fits.

GENERATE ANALYSIS:
1. Read job description carefully - what are core requirements?
2. Read resume carefully - what are core strengths?
3. Identify gaps and misalignments
4. Calculate match percentage based on skill/experience coverage
5. Calculate hireability based on overall fit and potential
6. Extract keywords and missing keywords
7. List actual strengths relevant to this job
8. List specific, actionable improvements
9. Create prioritized recommendations
10. Return ONLY valid JSON

Resume Analysis for Job Match:
Start now - return ONLY the JSON, no other text."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert recruiter analyzing resume to job fit. Provide objective, realistic assessments. Always return valid JSON ONLY matching the specified schema exactly. No markdown, no code blocks.",
                },
                {"role": "user", "content": analysis_prompt},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        
        response_text = response.choices[0].message.content
        match_data = json.loads(response_text)
        
        try:
            validated_result = JobMatchResult(**match_data)
            return validated_result
        except Exception as validation_error:
            print(f"Pydantic validation error: {validation_error}")
            print(f"AI response was: {json.dumps(match_data, indent=2)}")
            raise HTTPException(
                status_code=500,
                detail=f"Job match validation failed: {str(validation_error)}",
            )
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Error parsing job match response as JSON: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing job match: {str(e)}")


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
    if not user_exists(user_id):
        create_user(user_id, email, name, picture)
        log_event(user_id, "user_signup", {"email": email})
    else:
        # Update user info in case it changed
        update_user(user_id, email=email, name=name, picture=picture)
        log_event(user_id, "user_signin", {"email": email})
    
    # Also maintain in-memory cache for backwards compatibility
    if user_id not in users_db:
        users_db[user_id] = {
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "resume_analyses": []
        }
    else:
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


@app.get("/resumes/{resume_id}")
async def get_resume_analysis(resume_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Get the full analysis for a specific resume (regular analysis or job match)."""
    user_data = users_db.get(current_user.id, {})
    resume_analyses = user_data.get("resume_analyses", [])
    
    for analysis_record in resume_analyses:
        if analysis_record.get("id") == resume_id:
            # If it's a regular analysis (nested structure), flatten it
            if "analysis" in analysis_record:
                # Flatten the nested analysis structure
                flattened = {**analysis_record}
                analysis_data = flattened.pop("analysis")
                flattened.update(analysis_data)
                return flattened
            # Otherwise return as-is (job match format)
            return analysis_record
    
    raise HTTPException(status_code=404, detail="Resume analysis not found")


@app.put("/resumes/{resume_id}")
async def update_resume_name(
    resume_id: str, 
    filename: str = Form(...),
    current_user: UserProfile = Depends(get_current_user)
):
    """Update the filename of a resume."""
    user_data = users_db.get(current_user.id, {})
    resume_analyses = user_data.get("resume_analyses", [])
    
    for analysis_record in resume_analyses:
        if analysis_record.get("id") == resume_id:
            analysis_record["filename"] = filename
            return {"success": True, "filename": filename}
    
    raise HTTPException(status_code=404, detail="Resume not found")


@app.delete("/resumes/{resume_id}")
async def delete_resume_analysis(
    resume_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    """Delete a resume analysis from history."""
    user_data = users_db.get(current_user.id, {})
    resume_analyses = user_data.get("resume_analyses", [])
    
    # Find and remove the resume
    initial_length = len(resume_analyses)
    user_data["resume_analyses"] = [r for r in resume_analyses if r.get("id") != resume_id]
    
    if len(user_data["resume_analyses"]) == initial_length:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    return {"success": True, "message": "Resume deleted"}


@app.post("/analyze-resume", response_model=AnalysisResult)
async def analyze_resume(
    file: UploadFile = File(...), 
    current_user: UserProfile = Depends(get_current_user),
    job_title: str = ""
):
    """
    Upload a resume (PDF or image) and get AI-powered analysis.
    Supports: PDF (with OCR for scanned PDFs), JPG, PNG, BMP, TIFF.
    Returns detailed analysis with scores, feedback, and recommendations.
    Requires authentication (JWT token).
    Tailored to the specified job position if provided.
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
    analysis = analyze_resume_with_gpt(resume_text, job_title)
    
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


@app.post("/match-job", response_model=JobMatchResult)
async def match_resume_to_job(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Match resume to job description and analyze fit.
    Returns match percentage, hireability score, and recommendations.
    """
    if not job_description or not job_description.strip():
        raise HTTPException(status_code=400, detail="Job description is required")

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
    
    # Extract text from resume
    try:
        content = await file.read()
        
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
        if file_type == 'pdf':
            resume_text = extract_text_from_pdf(content)
        else:
            resume_text = extract_text_from_image(content)
        
        if not resume_text or not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from resume")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing resume file: {str(e)}")

    # Analyze resume to job match
    try:
        match_result = analyze_resume_to_job(resume_text, job_description)
        
        # Save job match result to resume analyses
        match_record = {
            "id": hashlib.md5(f"{current_user.id}{file.filename}{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest(),
            "filename": file.filename,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": "job_match",  # Distinguish from regular analysis
            "job_description_preview": job_description[:200],  # Store first 200 chars for reference
            "matchPercentage": match_result.matchPercentage,
            "hirabilityScore": match_result.hirabilityScore,
            "matchAnalysis": match_result.matchAnalysis,
            "keywordMatches": match_result.keywordMatches,
            "missingKeywords": match_result.missingKeywords,
            "strengths": match_result.strengths,
            "improvements": match_result.improvements,
            "recommendations": match_result.recommendations,
        }
        
        if current_user.id not in users_db:
            users_db[current_user.id] = {"email": current_user.email, "resume_analyses": []}
        
        if "resume_analyses" not in users_db[current_user.id]:
            users_db[current_user.id]["resume_analyses"] = []
        
        users_db[current_user.id]["resume_analyses"].append(match_record)
        
        return match_result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing job match: {str(e)}")


# ============ Resume Management Endpoints ============

class SavedResumeItem(BaseModel):
    """Saved resume item for listing."""
    id: str
    file_name: str
    created_at: str
    updated_at: str


class ResumeDetail(BaseModel):
    """Detailed resume information."""
    id: str
    file_name: str
    file_path: str
    raw_text: Optional[str]
    created_at: str
    updated_at: str


@app.post("/api/resumes/save")
async def save_resume_file(
    file: UploadFile = File(...),
    current_user: UserProfile = Depends(get_current_user)
):
    """Save a resume file to database."""
    try:
        resume_id = str(uuid.uuid4())
        file_path = f"uploads/{current_user.id}/{resume_id}.pdf"
        
        # Read file content
        file_content = await file.read()
        
        # Extract text from PDF
        try:
            with pdfplumber.open(BytesIO(file_content)) as pdf:
                raw_text = "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])
        except Exception as e:
            raw_text = ""
            print(f"Warning: Could not extract text from PDF: {str(e)}")
        
        # Save to database
        resume = save_resume(
            resume_id=resume_id,
            user_id=current_user.id,
            file_name=file.filename,
            file_path=file_path,
            raw_text=raw_text
        )
        
        log_event(current_user.id, "resume_uploaded", {
            "file_name": file.filename,
            "file_size": len(file_content)
        })
        
        return {"success": True, "resume": resume}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error saving resume: {str(e)}")


@app.get("/api/resumes", response_model=list[SavedResumeItem])
async def list_user_resumes(current_user: UserProfile = Depends(get_current_user)):
    """Get all saved resumes for current user."""
    resumes = get_user_resumes(current_user.id)
    return [SavedResumeItem(
        id=r['id'],
        file_name=r['file_name'],
        created_at=r['created_at'],
        updated_at=r['updated_at']
    ) for r in resumes]


@app.get("/api/resumes/{resume_id}", response_model=ResumeDetail)
async def get_resume_detail(
    resume_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    """Get detailed resume information."""
    resume = get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Verify ownership
    if resume['user_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    return ResumeDetail(
        id=resume['id'],
        file_name=resume['file_name'],
        file_path=resume['file_path'],
        raw_text=resume['raw_text'],
        created_at=resume['created_at'],
        updated_at=resume['updated_at']
    )


@app.delete("/api/resumes/{resume_id}")
async def delete_resume_file(
    resume_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    """Delete a saved resume."""
    resume = get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Verify ownership
    if resume['user_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    delete_resume(resume_id)
    log_event(current_user.id, "resume_deleted", {"resume_id": resume_id})
    
    return {"success": True, "message": "Resume deleted"}


# ============ Analytics Endpoints ============

class AnalysisSummary(BaseModel):
    """Summary of a resume analysis."""
    id: str
    resume_id: str
    overall_score: int
    ats_compatibility_score: int
    created_at: str


class JobMatchSummary(BaseModel):
    """Summary of a job match result."""
    id: str
    resume_id: str
    job_title: str
    match_percentage: int
    hirability_score: int
    created_at: str


class UserAnalyticsSummary(BaseModel):
    """User analytics summary."""
    resume_count: int
    analysis_count: int
    job_match_count: int
    average_overall_score: Optional[float]
    average_ats_score: Optional[float]
    event_counts: dict


@app.get("/api/analytics/analyses", response_model=list[AnalysisSummary])
async def get_user_resume_analyses(
    limit: int = 50,
    current_user: UserProfile = Depends(get_current_user)
):
    """Get resume analyses for current user."""
    analyses = get_user_analyses(current_user.id, limit=limit)
    return [AnalysisSummary(
        id=a['id'],
        resume_id=a['resume_id'],
        overall_score=a['overall_score'],
        ats_compatibility_score=a['ats_compatibility_score'],
        created_at=a['created_at']
    ) for a in analyses]


@app.get("/api/analytics/job-matches", response_model=list[JobMatchSummary])
async def get_user_job_matches_list(
    limit: int = 50,
    current_user: UserProfile = Depends(get_current_user)
):
    """Get job match results for current user."""
    matches = get_user_job_matches(current_user.id, limit=limit)
    return [JobMatchSummary(
        id=m['id'],
        resume_id=m['resume_id'],
        job_title=m['job_title'],
        match_percentage=m['match_percentage'],
        hirability_score=m['hirability_score'],
        created_at=m['created_at']
    ) for m in matches]


@app.get("/api/analytics/summary", response_model=UserAnalyticsSummary)
async def get_user_analytics_summary_endpoint(
    current_user: UserProfile = Depends(get_current_user)
):
    """Get analytics summary for current user."""
    summary = get_user_analytics_summary(current_user.id)
    return UserAnalyticsSummary(**summary)


@app.get("/api/analytics/events")
async def get_user_events(
    event_type: Optional[str] = None,
    limit: int = 100,
    current_user: UserProfile = Depends(get_current_user)
):
    """Get analytics events for current user."""
    events = get_user_analytics(current_user.id, event_type=event_type, limit=limit)
    return {"events": events}


# ============ Analyze Resume with Database Storage ============

@app.post("/analyze-resume-save")
async def analyze_resume_and_save(
    file: UploadFile = File(...),
    targetJob: str = Form(None),
    current_user: UserProfile = Depends(get_current_user)
):
    """Analyze resume and save results to database."""
    try:
        # Save resume first
        resume_id = str(uuid.uuid4())
        file_path = f"uploads/{current_user.id}/{resume_id}.pdf"
        file_content = await file.read()
        
        # Extract text
        try:
            with pdfplumber.open(BytesIO(file_content)) as pdf:
                resume_text = "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing PDF: {str(e)}")
        
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        # Save resume to database
        save_resume(
            resume_id=resume_id,
            user_id=current_user.id,
            file_name=file.filename,
            file_path=file_path,
            raw_text=resume_text
        )
        
        # Analyze resume
        analysis_result = analyze_resume(resume_text, targetJob)
        
        # Save analysis to database
        analysis_id = str(uuid.uuid4())
        save_analysis(
            analysis_id=analysis_id,
            resume_id=resume_id,
            user_id=current_user.id,
            overall_score=analysis_result.overallScore,
            ats_compatibility_score=analysis_result.atsCompatibilityScore,
            personalized_advice=analysis_result.personalizedAdvice,
            sections=[s.dict() for s in analysis_result.sections],
            strengths=analysis_result.strengths,
            improvements=analysis_result.improvements,
            keyword_matches=[k.dict() for k in analysis_result.keywordMatches],
            recommendations=[r.dict() for r in analysis_result.recommendations],
        )
        
        log_event(current_user.id, "resume_analyzed", {
            "resume_id": resume_id,
            "overall_score": analysis_result.overallScore
        })
        
        return {
            "success": True,
            "resume_id": resume_id,
            "analysis_id": analysis_id,
            "analysis": analysis_result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error analyzing resume: {str(e)}")


# ============ Job Match with Database Storage ============

@app.post("/match-job-save")
async def match_job_and_save(
    file: UploadFile = File(...),
    jobDescription: str = Form(...),
    current_user: UserProfile = Depends(get_current_user)
):
    """Match resume to job and save results to database."""
    try:
        # Save resume first
        resume_id = str(uuid.uuid4())
        file_path = f"uploads/{current_user.id}/{resume_id}.pdf"
        file_content = await file.read()
        
        # Extract text
        try:
            with pdfplumber.open(BytesIO(file_content)) as pdf:
                resume_text = "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing PDF: {str(e)}")
        
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        # Save resume to database
        save_resume(
            resume_id=resume_id,
            user_id=current_user.id,
            file_name=file.filename,
            file_path=file_path,
            raw_text=resume_text
        )
        
        # Match resume to job
        match_result = analyze_resume_to_job(resume_text, jobDescription)
        
        # Extract job title from description (first line or until period)
        job_title = jobDescription.split('\n')[0][:100]
        
        # Save job match to database
        match_id = str(uuid.uuid4())
        save_job_match(
            match_id=match_id,
            resume_id=resume_id,
            user_id=current_user.id,
            job_title=job_title,
            job_description=jobDescription,
            match_percentage=match_result.matchPercentage,
            hirability_score=match_result.hirabilityScore,
            match_analysis=match_result.matchAnalysis,
            keyword_matches=[k.dict() for k in match_result.keywordMatches],
            missing_keywords=match_result.missingKeywords,
            strengths=match_result.strengths,
            improvements=match_result.improvements,
            recommendations=[r.dict() for r in match_result.recommendations],
        )
        
        log_event(current_user.id, "job_matched", {
            "resume_id": resume_id,
            "job_title": job_title,
            "match_percentage": match_result.matchPercentage
        })
        
        return {
            "success": True,
            "resume_id": resume_id,
            "match_id": match_id,
            "match_result": match_result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing job match: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
