"""
Database models and management for ResumAI.
Uses SQLite for persistent storage of users, resumes, and analytics.
"""

import sqlite3
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
import os

DATABASE_PATH = os.getenv("DATABASE_PATH", "resumai.db")


@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Initialize database tables."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                picture TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        
        # Resumes table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS resumes (
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
        ''')
        
        # Resume Analysis Results
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS resume_analyses (
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
        ''')
        
        # Job Matching Results
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS job_matches (
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
        ''')
        
        # Analytics Events (for tracking user actions)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS analytics_events (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                event_data JSON,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        # Create indexes for better query performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON resume_analyses(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_analyses_resume_id ON resume_analyses(resume_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_job_matches_user_id ON job_matches(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_job_matches_resume_id ON job_matches(resume_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id)')
        
        conn.commit()
        print("Database initialized successfully")


# ============ User Operations ============

def create_user(user_id: str, email: str, name: str, picture: Optional[str] = None) -> Dict[str, Any]:
    """Create a new user."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO users (id, email, name, picture, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, email, name, picture, now, now))
    return {
        "id": user_id,
        "email": email,
        "name": name,
        "picture": picture,
        "created_at": now,
    }


def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def user_exists(user_id: str) -> bool:
    """Check if user exists."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT 1 FROM users WHERE id = ?', (user_id,))
        return cursor.fetchone() is not None


def update_user(user_id: str, **kwargs) -> Dict[str, Any]:
    """Update user information."""
    now = datetime.now(timezone.utc).isoformat()
    allowed_fields = {'email', 'name', 'picture'}
    update_fields = {k: v for k, v in kwargs.items() if k in allowed_fields}
    
    if not update_fields:
        return get_user(user_id)
    
    update_fields['updated_at'] = now
    set_clause = ', '.join([f'{k} = ?' for k in update_fields.keys()])
    values = list(update_fields.values()) + [user_id]
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(f'UPDATE users SET {set_clause} WHERE id = ?', values)
    
    return get_user(user_id)


# ============ Resume Operations ============

def save_resume(resume_id: str, user_id: str, file_name: str, file_path: str, raw_text: str) -> Dict[str, Any]:
    """Save a resume for a user."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO resumes (id, user_id, file_name, file_path, raw_text, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (resume_id, user_id, file_name, file_path, raw_text, now, now))
    return {
        "id": resume_id,
        "user_id": user_id,
        "file_name": file_name,
        "file_path": file_path,
        "created_at": now,
    }


def get_user_resumes(user_id: str) -> List[Dict[str, Any]]:
    """Get all resumes for a user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM resumes 
            WHERE user_id = ? AND is_deleted = 0
            ORDER BY created_at DESC
        ''', (user_id,))
        return [dict(row) for row in cursor.fetchall()]


def get_resume(resume_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific resume."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM resumes WHERE id = ? AND is_deleted = 0', (resume_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def delete_resume(resume_id: str) -> bool:
    """Soft delete a resume."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE resumes 
            SET is_deleted = 1, updated_at = ?
            WHERE id = ?
        ''', (now, resume_id))
    return cursor.rowcount > 0


# ============ Resume Analysis Operations ============

def save_analysis(
    analysis_id: str,
    resume_id: str,
    user_id: str,
    overall_score: int,
    ats_compatibility_score: int,
    personalized_advice: str,
    sections: List[Dict],
    strengths: List[str],
    improvements: List[str],
    keyword_matches: List[Dict],
    recommendations: List[Dict],
) -> Dict[str, Any]:
    """Save resume analysis results."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO resume_analyses (
                id, resume_id, user_id, overall_score, ats_compatibility_score,
                personalized_advice, sections, strengths, improvements, keyword_matches,
                recommendations, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            analysis_id, resume_id, user_id, overall_score, ats_compatibility_score,
            personalized_advice, json.dumps(sections), json.dumps(strengths),
            json.dumps(improvements), json.dumps(keyword_matches),
            json.dumps(recommendations), now
        ))
    return {
        "id": analysis_id,
        "resume_id": resume_id,
        "user_id": user_id,
        "overall_score": overall_score,
        "created_at": now,
    }


def get_resume_analyses(resume_id: str) -> List[Dict[str, Any]]:
    """Get all analyses for a resume."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM resume_analyses
            WHERE resume_id = ?
            ORDER BY created_at DESC
        ''', (resume_id,))
        rows = [dict(row) for row in cursor.fetchall()]
        for row in rows:
            if row.get('sections'):
                row['sections'] = json.loads(row['sections'])
            if row.get('strengths'):
                row['strengths'] = json.loads(row['strengths'])
            if row.get('improvements'):
                row['improvements'] = json.loads(row['improvements'])
            if row.get('keyword_matches'):
                row['keyword_matches'] = json.loads(row['keyword_matches'])
            if row.get('recommendations'):
                row['recommendations'] = json.loads(row['recommendations'])
        return rows


def get_user_analyses(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get all analyses for a user with limit."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM resume_analyses
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ''', (user_id, limit))
        rows = [dict(row) for row in cursor.fetchall()]
        for row in rows:
            if row.get('sections'):
                row['sections'] = json.loads(row['sections'])
            if row.get('strengths'):
                row['strengths'] = json.loads(row['strengths'])
            if row.get('improvements'):
                row['improvements'] = json.loads(row['improvements'])
            if row.get('keyword_matches'):
                row['keyword_matches'] = json.loads(row['keyword_matches'])
            if row.get('recommendations'):
                row['recommendations'] = json.loads(row['recommendations'])
        return rows


# ============ Job Match Operations ============

def save_job_match(
    match_id: str,
    resume_id: str,
    user_id: str,
    job_title: str,
    job_description: str,
    match_percentage: int,
    hirability_score: int,
    match_analysis: str,
    keyword_matches: List[Dict],
    missing_keywords: List[str],
    strengths: List[str],
    improvements: List[str],
    recommendations: List[Dict],
) -> Dict[str, Any]:
    """Save job matching results."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO job_matches (
                id, resume_id, user_id, job_title, job_description,
                match_percentage, hirability_score, match_analysis,
                keyword_matches, missing_keywords, strengths, improvements,
                recommendations, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            match_id, resume_id, user_id, job_title, job_description,
            match_percentage, hirability_score, match_analysis,
            json.dumps(keyword_matches), json.dumps(missing_keywords),
            json.dumps(strengths), json.dumps(improvements),
            json.dumps(recommendations), now
        ))
    return {
        "id": match_id,
        "resume_id": resume_id,
        "job_title": job_title,
        "match_percentage": match_percentage,
        "created_at": now,
    }


def get_job_matches(resume_id: str) -> List[Dict[str, Any]]:
    """Get all job matches for a resume."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM job_matches
            WHERE resume_id = ?
            ORDER BY created_at DESC
        ''', (resume_id,))
        rows = [dict(row) for row in cursor.fetchall()]
        for row in rows:
            if row.get('keyword_matches'):
                row['keyword_matches'] = json.loads(row['keyword_matches'])
            if row.get('missing_keywords'):
                row['missing_keywords'] = json.loads(row['missing_keywords'])
            if row.get('strengths'):
                row['strengths'] = json.loads(row['strengths'])
            if row.get('improvements'):
                row['improvements'] = json.loads(row['improvements'])
            if row.get('recommendations'):
                row['recommendations'] = json.loads(row['recommendations'])
        return rows


def get_user_job_matches(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get all job matches for a user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM job_matches
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ''', (user_id, limit))
        rows = [dict(row) for row in cursor.fetchall()]
        for row in rows:
            if row.get('keyword_matches'):
                row['keyword_matches'] = json.loads(row['keyword_matches'])
            if row.get('missing_keywords'):
                row['missing_keywords'] = json.loads(row['missing_keywords'])
            if row.get('strengths'):
                row['strengths'] = json.loads(row['strengths'])
            if row.get('improvements'):
                row['improvements'] = json.loads(row['improvements'])
            if row.get('recommendations'):
                row['recommendations'] = json.loads(row['recommendations'])
        return rows


# ============ Analytics Operations ============

def log_event(user_id: str, event_type: str, event_data: Optional[Dict] = None) -> Dict[str, Any]:
    """Log an analytics event."""
    import uuid
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO analytics_events (id, user_id, event_type, event_data, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (event_id, user_id, event_type, json.dumps(event_data or {}), now))
    
    return {
        "id": event_id,
        "user_id": user_id,
        "event_type": event_type,
        "created_at": now,
    }


def get_user_analytics(user_id: str, event_type: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    """Get analytics events for a user."""
    with get_db() as conn:
        cursor = conn.cursor()
        if event_type:
            cursor.execute('''
                SELECT * FROM analytics_events
                WHERE user_id = ? AND event_type = ?
                ORDER BY created_at DESC
                LIMIT ?
            ''', (user_id, event_type, limit))
        else:
            cursor.execute('''
                SELECT * FROM analytics_events
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            ''', (user_id, limit))
        
        rows = [dict(row) for row in cursor.fetchall()]
        for row in rows:
            if row.get('event_data'):
                row['event_data'] = json.loads(row['event_data'])
        return rows


def get_user_analytics_summary(user_id: str) -> Dict[str, Any]:
    """Get a summary of user analytics."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Count resumes
        cursor.execute('SELECT COUNT(*) as count FROM resumes WHERE user_id = ? AND is_deleted = 0', (user_id,))
        resume_count = cursor.fetchone()['count']
        
        # Count analyses
        cursor.execute('SELECT COUNT(*) as count FROM resume_analyses WHERE user_id = ?', (user_id,))
        analysis_count = cursor.fetchone()['count']
        
        # Count job matches
        cursor.execute('SELECT COUNT(*) as count FROM job_matches WHERE user_id = ?', (user_id,))
        job_match_count = cursor.fetchone()['count']
        
        # Get average scores
        cursor.execute('''
            SELECT 
                AVG(overall_score) as avg_overall,
                AVG(ats_compatibility_score) as avg_ats
            FROM resume_analyses
            WHERE user_id = ?
        ''', (user_id,))
        scores = cursor.fetchone()
        
        # Get event counts by type
        cursor.execute('''
            SELECT event_type, COUNT(*) as count
            FROM analytics_events
            WHERE user_id = ?
            GROUP BY event_type
        ''', (user_id,))
        event_counts = {row['event_type']: row['count'] for row in cursor.fetchall()}
        
        return {
            "resume_count": resume_count,
            "analysis_count": analysis_count,
            "job_match_count": job_match_count,
            "average_overall_score": scores['avg_overall'],
            "average_ats_score": scores['avg_ats'],
            "event_counts": event_counts,
        }
