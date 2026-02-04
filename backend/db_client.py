#!/usr/bin/env python3
"""
Quick reference and testing script for ResumAI database API
"""

import requests
import json
from typing import Optional

# Configuration
API_BASE_URL = "http://localhost:8000"
DEBUG = True


class ResumAIClient:
    """Client for ResumAI database API"""
    
    def __init__(self, base_url: str = API_BASE_URL, token: Optional[str] = None):
        self.base_url = base_url
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}" if token else ""
        }
    
    def set_token(self, token: str):
        """Set JWT token for authentication"""
        self.token = token
        self.headers["Authorization"] = f"Bearer {token}"
    
    def _request(self, method: str, endpoint: str, **kwargs):
        """Make HTTP request"""
        url = f"{self.base_url}{endpoint}"
        if DEBUG:
            print(f"\n📤 {method} {url}")
        response = requests.request(method, url, headers=self.headers, **kwargs)
        if DEBUG:
            print(f"📥 {response.status_code}")
        response.raise_for_status()
        return response.json() if response.text else None
    
    # ============ Resume Management ============
    
    def upload_resume(self, file_path: str) -> dict:
        """Upload a resume file"""
        with open(file_path, "rb") as f:
            files = {"file": f}
            return self._request("POST", "/api/resumes/save", files=files)
    
    def list_resumes(self) -> list:
        """List user's saved resumes"""
        return self._request("GET", "/api/resumes")
    
    def get_resume(self, resume_id: str) -> dict:
        """Get resume details"""
        return self._request("GET", f"/api/resumes/{resume_id}")
    
    def delete_resume(self, resume_id: str) -> dict:
        """Delete a resume"""
        return self._request("DELETE", f"/api/resumes/{resume_id}")
    
    # ============ Analytics ============
    
    def get_analyses(self, limit: int = 50) -> list:
        """Get resume analysis history"""
        return self._request("GET", "/api/analytics/analyses", params={"limit": limit})
    
    def get_job_matches(self, limit: int = 50) -> list:
        """Get job matching history"""
        return self._request("GET", "/api/analytics/job-matches", params={"limit": limit})
    
    def get_summary(self) -> dict:
        """Get user analytics summary"""
        return self._request("GET", "/api/analytics/summary")
    
    def get_events(self, event_type: Optional[str] = None, limit: int = 100) -> list:
        """Get user activity events"""
        params = {"limit": limit}
        if event_type:
            params["event_type"] = event_type
        return self._request("GET", "/api/analytics/events", params=params)
    
    # ============ Analysis & Matching ============
    
    def analyze_resume(self, file_path: str, target_job: Optional[str] = None) -> dict:
        """Analyze resume and save results"""
        with open(file_path, "rb") as f:
            files = {"file": f}
            data = {}
            if target_job:
                data["targetJob"] = target_job
            return self._request("POST", "/analyze-resume-save", files=files, data=data)
    
    def match_job(self, file_path: str, job_description: str) -> dict:
        """Match resume to job and save results"""
        with open(file_path, "rb") as f:
            files = {"file": f}
            data = {"jobDescription": job_description}
            return self._request("POST", "/match-job-save", files=files, data=data)


# ============ Quick Test Examples ============

def print_section(title: str):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def example_list_resumes(client: ResumAIClient):
    """Example: List user's resumes"""
    print_section("List Saved Resumes")
    try:
        resumes = client.list_resumes()
        if resumes:
            for resume in resumes:
                print(f"  📄 {resume['file_name']}")
                print(f"     ID: {resume['id']}")
                print(f"     Created: {resume['created_at']}")
        else:
            print("  No resumes found")
    except Exception as e:
        print(f"  ❌ Error: {e}")


def example_get_summary(client: ResumAIClient):
    """Example: Get analytics summary"""
    print_section("User Analytics Summary")
    try:
        summary = client.get_summary()
        print(f"  📊 Resume Count: {summary['resume_count']}")
        print(f"  📈 Analysis Count: {summary['analysis_count']}")
        print(f"  🎯 Job Matches: {summary['job_match_count']}")
        if summary['average_overall_score']:
            print(f"  ⭐ Avg Overall Score: {summary['average_overall_score']:.1f}")
        if summary['average_ats_score']:
            print(f"  🤖 Avg ATS Score: {summary['average_ats_score']:.1f}")
        print(f"\n  Event Breakdown:")
        for event_type, count in summary['event_counts'].items():
            print(f"    - {event_type}: {count}")
    except Exception as e:
        print(f"  ❌ Error: {e}")


def example_get_events(client: ResumAIClient):
    """Example: Get recent activity"""
    print_section("Recent User Activity")
    try:
        events = client.get_events(limit=10)
        if events['events']:
            for event in events['events']:
                print(f"  📌 {event['event_type']}")
                print(f"     Time: {event['created_at']}")
                if event.get('event_data'):
                    print(f"     Data: {json.dumps(event['event_data'], indent=8)}")
        else:
            print("  No events found")
    except Exception as e:
        print(f"  ❌ Error: {e}")


def example_get_analyses(client: ResumAIClient):
    """Example: Get resume analyses"""
    print_section("Resume Analysis History")
    try:
        analyses = client.get_analyses(limit=5)
        if analyses:
            for analysis in analyses:
                print(f"  📋 Analysis ID: {analysis['id']}")
                print(f"     Overall Score: {analysis['overall_score']}/100")
                print(f"     ATS Score: {analysis['ats_compatibility_score']}/100")
                print(f"     Date: {analysis['created_at']}")
        else:
            print("  No analyses found")
    except Exception as e:
        print(f"  ❌ Error: {e}")


def run_examples(token: str):
    """Run example API calls"""
    print("\n🚀 ResumAI Database API Examples")
    print("   (Make sure server is running at http://localhost:8000)\n")
    
    client = ResumAIClient(token=token)
    
    # Run examples
    example_list_resumes(client)
    example_get_summary(client)
    example_get_analyses(client)
    example_get_events(client)
    
    print("\n✅ Examples complete!")


# ============ Command Line Usage ============

if __name__ == "__main__":
    import sys
    
    print("""
    ResumAI Database API - Python Client Reference
    
    Usage:
        python db_client.py <jwt_token>
    
    Example:
        python db_client.py "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    
    This script demonstrates:
      - Uploading resumes
      - Listing saved resumes
      - Getting analytics summaries
      - Viewing event history
      - Analyzing resumes
      - Matching resumes to jobs
    """)
    
    if len(sys.argv) > 1:
        token = sys.argv[1]
        run_examples(token)
    else:
        print("\n⚠️  Please provide a JWT token as an argument")
        print("    python db_client.py <your_jwt_token>")
