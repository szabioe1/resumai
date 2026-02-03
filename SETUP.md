# ResumAI - Full Stack Setup Guide

## Prerequisites

- Node.js 16+ (for frontend)
- Python 3.8+ (for backend)
- OpenAI API key

## Frontend Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` file (already created):

```
REACT_APP_API_URL=http://localhost:8000
```

3. Start the development server:

```bash
npm start
```

The frontend will run at `http://localhost:3000`

## Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create a virtual environment:

```bash
python -m venv venv
```

3. Activate the virtual environment:

**On Windows (PowerShell):**

```bash
.\venv\Scripts\Activate.ps1
```

**On Windows (Command Prompt):**

```bash
venv\Scripts\activate.bat
```

**On macOS/Linux:**

```bash
source venv/bin/activate
```

4. Install dependencies:

```bash
pip install -r requirements.txt
```

5. Configure OpenAI API Key:
   - Copy `.env.example` to `.env` if not already done
   - Edit `.env` and add your OpenAI API key:

   ```
   OPENAI_API_KEY=sk-your-api-key-here
   ```

6. Start the backend server:

```bash
python main.py
```

The backend will run at `http://localhost:8000`

## Running Both Servers

You need two terminal windows/tabs:

**Terminal 1 - Frontend:**

```bash
# In the project root
npm start
```

**Terminal 2 - Backend:**

```bash
cd backend
python -m venv venv
# Activate virtual environment (see above)
pip install -r requirements.txt
python main.py
```

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

## Features

### Resume Analysis

- Upload PDF resumes
- Automatic text extraction using pdfplumber
- AI-powered analysis with two-stage processing:
  - **Stage 1**: GPT-4o-mini for fast, comprehensive analysis
  - **Stage 2**: GPT-4o for polishing and enhancing recommendations
- Detailed scoring across multiple dimensions:
  - Format & Structure
  - Content Quality
  - Keywords
  - Impact & Results

### Analysis Output

- Overall score (0-100)
- ATS compatibility score
- Detailed section analysis with metrics
- Strengths and weaknesses
- Keyword matching and frequency
- Actionable recommendations prioritized by importance

## Troubleshooting

### Backend Connection Error

If you see "Failed to connect to backend", ensure:

- Backend server is running on port 8000
- `.env` file is properly configured with OpenAI API key
- CORS headers are properly set

### PDF Upload Error

- Ensure the file is a valid PDF
- Check that pdfplumber can extract text from the PDF
- Some PDFs with scanned images may not work

### OpenAI API Error

- Verify your API key is correct and has sufficient credits
- Check that the key is properly set in `.env`
- Ensure your OpenAI account is active and in good standing

## Project Structure

```
ResumAI/
├── src/
│   ├── components/
│   │   ├── dashboard.tsx          # Main analysis page
│   │   ├── my-resumes.tsx         # Resume management
│   │   ├── settings.tsx           # User settings
│   │   ├── sidebar.tsx            # Navigation sidebar
│   │   ├── resume-upload.tsx      # File upload component
│   │   ├── analysis-result.tsx    # Results display
│   │   └── ui/                    # UI components
│   ├── App.js                     # Main app component
│   └── index.js                   # Entry point
├── backend/
│   ├── main.py                    # FastAPI server
│   ├── requirements.txt           # Python dependencies
│   ├── .env                       # Environment variables
│   └── .env.example               # Example env file
└── package.json                   # Node dependencies
```
