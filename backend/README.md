# ResumAI Backend

Python FastAPI backend for resume analysis using OpenAI API.

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key to `.env`

3. Run the server:

```bash
python main.py
```

The server will start at `http://localhost:8000`

## API Endpoints

### POST /analyze-resume

Upload a PDF resume and get AI-powered analysis.

**Request:**

- Form data with file upload (PDF only)

**Response:**

```json
{
  "overallScore": 68,
  "atsCompatibilityScore": 65,
  "sections": [...],
  "strengths": [...],
  "improvements": [...],
  "keywordMatches": [...],
  "recommendations": [...]
}
```

## Features

- **PDF Text Extraction**: Uses pdfplumber for reliable text extraction
- **Dual-Model Analysis**:
  - GPT-4o-mini for fast, cost-effective initial analysis
  - GPT-4o for final polish and enhanced recommendations
- **Comprehensive Scoring**: Analyzes format, content, keywords, and impact
- **CORS Enabled**: Configured for local development

## Requirements

- Python 3.8+
- OpenAI API key
