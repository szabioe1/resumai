# ResumAI Database & Analytics Documentation

## Overview

The ResumAI backend now includes a SQLite database to persistently store user data, resumes, and analytics information. This enables users to:

- Save and manage multiple resumes
- Track resume analysis history
- Store job matching results
- View user analytics and insights

## Database Schema

### Tables

#### 1. **users**

Stores user account information.

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    picture TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
```

- **id**: Google user ID (unique identifier)
- **email**: User's email address
- **name**: User's full name
- **picture**: User's profile picture URL
- **created_at**: Account creation timestamp
- **updated_at**: Last update timestamp

---

#### 2. **resumes**

Stores uploaded resume files and metadata.

```sql
CREATE TABLE resumes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    raw_text TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

- **id**: Unique resume identifier (UUID)
- **user_id**: Owner of the resume
- **file_name**: Original file name
- **file_path**: Path where file is stored
- **raw_text**: Extracted text from PDF
- **is_deleted**: Soft delete flag

---

#### 3. **resume_analyses**

Stores resume analysis results.

```sql
CREATE TABLE resume_analyses (
    id TEXT PRIMARY KEY,
    resume_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    overall_score INTEGER,
    ats_compatibility_score INTEGER,
    personalized_advice TEXT,
    sections JSON,
    strengths JSON,
    improvements JSON,
    keyword_matches JSON,
    recommendations JSON,
    created_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES resumes(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

- **id**: Unique analysis identifier
- **overall_score**: Resume quality score (0-100)
- **ats_compatibility_score**: ATS compatibility score (0-100)
- **personalized_advice**: AI-generated feedback
- **sections**: JSON array of analysis sections
- **strengths**: JSON array of resume strengths
- **improvements**: JSON array of suggested improvements
- **keyword_matches**: JSON array of matched keywords
- **recommendations**: JSON array of actionable recommendations

---

#### 4. **job_matches**

Stores job description matching results.

```sql
CREATE TABLE job_matches (
    id TEXT PRIMARY KEY,
    resume_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    job_title TEXT NOT NULL,
    job_description TEXT,
    match_percentage INTEGER,
    hirability_score INTEGER,
    match_analysis TEXT,
    keyword_matches JSON,
    missing_keywords JSON,
    strengths JSON,
    improvements JSON,
    recommendations JSON,
    created_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES resumes(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

- **match_percentage**: How well resume matches job (0-100)
- **hirability_score**: Overall chances of being hired (0-100)
- **missing_keywords**: Keywords from job description not in resume
- **match_analysis**: Detailed matching analysis

---

#### 5. **analytics_events**

Tracks user actions and events for analytics.

```sql
CREATE TABLE analytics_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSON,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

- **event_type**: Type of event (e.g., "resume_uploaded", "user_signin", "resume_analyzed")
- **event_data**: Additional data related to the event (JSON)

---

## Indexes

The database includes the following indexes for optimal query performance:

```sql
idx_resumes_user_id
idx_analyses_user_id
idx_analyses_resume_id
idx_job_matches_user_id
idx_job_matches_resume_id
idx_analytics_user_id
```

---

## API Endpoints

### Authentication

#### POST `/auth/signin`

Sign in with Google and get JWT token. Creates user in database if new.

**Request:**

```json
{
  "token": "google_id_token"
}
```

**Response:**

```json
{
  "accessToken": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "url_to_picture"
  },
  "expiresIn": 86400
}
```

---

### Resume Management

#### POST `/api/resumes/save`

Save a resume file to the database.

**Request:**

- Content-Type: `multipart/form-data`
- Body: PDF file
- Header: `Authorization: Bearer {jwt_token}`

**Response:**

```json
{
  "success": true,
  "resume": {
    "id": "resume_uuid",
    "user_id": "user_id",
    "file_name": "resume.pdf",
    "file_path": "uploads/user_id/resume_uuid.pdf",
    "created_at": "2024-02-03T10:00:00Z"
  }
}
```

---

#### GET `/api/resumes`

Get all saved resumes for the current user.

**Response:**

```json
[
  {
    "id": "resume_uuid",
    "file_name": "resume.pdf",
    "created_at": "2024-02-03T10:00:00Z",
    "updated_at": "2024-02-03T10:00:00Z"
  }
]
```

---

#### GET `/api/resumes/{resume_id}`

Get detailed information about a specific resume.

**Response:**

```json
{
  "id": "resume_uuid",
  "file_name": "resume.pdf",
  "file_path": "uploads/user_id/resume_uuid.pdf",
  "raw_text": "extracted text...",
  "created_at": "2024-02-03T10:00:00Z",
  "updated_at": "2024-02-03T10:00:00Z"
}
```

---

#### DELETE `/api/resumes/{resume_id}`

Delete a saved resume (soft delete).

**Response:**

```json
{
  "success": true,
  "message": "Resume deleted"
}
```

---

### Analytics

#### GET `/api/analytics/analyses`

Get resume analysis history for the current user.

**Query Parameters:**

- `limit`: Number of results (default: 50)

**Response:**

```json
[
  {
    "id": "analysis_uuid",
    "resume_id": "resume_uuid",
    "overall_score": 85,
    "ats_compatibility_score": 78,
    "created_at": "2024-02-03T10:00:00Z"
  }
]
```

---

#### GET `/api/analytics/job-matches`

Get job matching history for the current user.

**Query Parameters:**

- `limit`: Number of results (default: 50)

**Response:**

```json
[
  {
    "id": "match_uuid",
    "resume_id": "resume_uuid",
    "job_title": "Software Engineer",
    "match_percentage": 85,
    "hirability_score": 82,
    "created_at": "2024-02-03T10:00:00Z"
  }
]
```

---

#### GET `/api/analytics/summary`

Get analytics summary for the current user.

**Response:**

```json
{
  "resume_count": 5,
  "analysis_count": 12,
  "job_match_count": 8,
  "average_overall_score": 83.5,
  "average_ats_score": 79.2,
  "event_counts": {
    "resume_uploaded": 5,
    "resume_analyzed": 12,
    "user_signin": 15
  }
}
```

---

#### GET `/api/analytics/events`

Get analytics events for the current user.

**Query Parameters:**

- `event_type`: Filter by event type (optional)
- `limit`: Number of results (default: 100)

**Response:**

```json
{
  "events": [
    {
      "id": "event_uuid",
      "user_id": "user_id",
      "event_type": "resume_uploaded",
      "event_data": {
        "file_name": "resume.pdf",
        "file_size": 245000
      },
      "created_at": "2024-02-03T10:00:00Z"
    }
  ]
}
```

---

### Resume Analysis with Storage

#### POST `/analyze-resume-save`

Analyze a resume and save both the file and results to the database.

**Request:**

- Content-Type: `multipart/form-data`
- Body:
  - `file`: PDF file
  - `targetJob`: Target job title (optional)
- Header: `Authorization: Bearer {jwt_token}`

**Response:**

```json
{
  "success": true,
  "resume_id": "resume_uuid",
  "analysis_id": "analysis_uuid",
  "analysis": {
    "overallScore": 85,
    "atsCompatibilityScore": 78,
    "personalizedAdvice": "...",
    "sections": [...],
    "strengths": [...],
    "improvements": [...],
    "keywordMatches": [...],
    "recommendations": [...]
  }
}
```

---

### Job Matching with Storage

#### POST `/match-job-save`

Match a resume to a job description and save results to the database.

**Request:**

- Content-Type: `multipart/form-data`
- Body:
  - `file`: PDF file
  - `jobDescription`: Job description text
- Header: `Authorization: Bearer {jwt_token}`

**Response:**

```json
{
  "success": true,
  "resume_id": "resume_uuid",
  "match_id": "match_uuid",
  "match_result": {
    "matchPercentage": 85,
    "hirabilityScore": 82,
    "matchAnalysis": "...",
    "keywordMatches": [...],
    "missingKeywords": [...],
    "strengths": [...],
    "improvements": [...],
    "recommendations": [...]
  }
}
```

---

## Event Types

The system logs the following event types:

| Event Type        | Description               |
| ----------------- | ------------------------- |
| `user_signup`     | New user created          |
| `user_signin`     | User signed in            |
| `resume_uploaded` | Resume file uploaded      |
| `resume_analyzed` | Resume analysis completed |
| `job_matched`     | Job matching completed    |
| `resume_deleted`  | Resume deleted            |

---

## Usage Examples

### Python Example

```python
import requests
import os

API_URL = "http://localhost:8000"
TOKEN = "your_jwt_token"

headers = {
    "Authorization": f"Bearer {TOKEN}"
}

# Get user analytics summary
response = requests.get(f"{API_URL}/api/analytics/summary", headers=headers)
summary = response.json()
print(f"Resumes: {summary['resume_count']}")
print(f"Analyses: {summary['analysis_count']}")

# Get user's resumes
response = requests.get(f"{API_URL}/api/resumes", headers=headers)
resumes = response.json()
for resume in resumes:
    print(f"Resume: {resume['file_name']} ({resume['created_at']})")

# Upload and analyze a resume
with open("resume.pdf", "rb") as f:
    files = {"file": f}
    data = {"targetJob": "Software Engineer"}
    response = requests.post(
        f"{API_URL}/analyze-resume-save",
        files=files,
        data=data,
        headers=headers
    )
    result = response.json()
    print(f"Analysis ID: {result['analysis_id']}")
    print(f"Overall Score: {result['analysis']['overallScore']}")
```

---

## Database File

By default, the SQLite database is stored as `resumai.db` in the backend directory. You can change this by setting the `DATABASE_PATH` environment variable:

```bash
export DATABASE_PATH="/path/to/custom/database.db"
```

---

## Backup & Maintenance

To backup the database:

```bash
cp resumai.db resumai.backup.db
```

To reset the database (caution - deletes all data):

```bash
rm resumai.db
# Restart the server to reinitialize
```

---

## Performance Considerations

- Database indexes are created on frequently queried fields
- JSON data is stored as text for flexibility
- Soft deletes are used to preserve data integrity
- Consider archiving old analytics events periodically for large datasets

---

## Security Notes

- Always use JWT tokens for API authentication
- Resume files contain sensitive information - implement file access controls
- Consider encrypting the database file in production
- Regularly backup the database
- Use HTTPS in production environments
