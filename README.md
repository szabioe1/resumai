# ResumAI

AI-powered resume analysis with Google sign-in, OCR support for scanned PDFs/images, and detailed ATS-compatible scoring.

## Features

- Google OAuth sign-in
- Resume upload (PDF, scanned PDF, JPG, PNG, BMP, TIFF)
- OCR fallback via Tesseract
- Detailed scoring across Format, Content, Keywords, Impact
- ATS compatibility scoring

## Tech Stack

- Frontend: React + Tailwind CSS
- Backend: FastAPI + OpenAI
- OCR: Tesseract + pdf2image

## Prerequisites

- Node.js 16+
- Python 3.8+
- Tesseract OCR installed
- Poppler (for PDF OCR on Windows)
- OpenAI API key
- Google OAuth Client ID

## Setup

### 1) Backend

1. Install dependencies:
   - `pip install -r backend/requirements.txt`
2. Create backend env file: [backend/.env](backend/.env)
   - `OPENAI_API_KEY=...`
   - `GOOGLE_CLIENT_ID=...`
   - `JWT_SECRET=...`
   - `TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe`
3. Run server:
   - `python backend/main.py`
   - Server runs at http://localhost:8000

### 2) Frontend

1. Install dependencies:
   - `npm install`
2. Create frontend env file: .env.local
   - `REACT_APP_API_URL=http://localhost:8000`
   - `REACT_APP_GOOGLE_CLIENT_ID=...`
3. Run app:
   - `npm start`
   - App runs at http://localhost:3000

## Google Sign-In Setup

Follow the full guide in [GOOGLE_AUTH_SETUP.md](GOOGLE_AUTH_SETUP.md).

## API Overview

- POST `/auth/signin` – Google token verification
- GET `/auth/me` – current user profile
- GET `/resumes` – current user resume history
- POST `/analyze-resume` – analyze resume (requires auth)

## Notes

- Resume history is stored in-memory; it resets when the backend restarts.
- For production, move users and resume history to a database.
