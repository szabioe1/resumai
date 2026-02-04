# Database Troubleshooting Guide

## Common Issues & Solutions

### 1. Database Not Initializing

**Problem:** Server starts but database tables not created

**Solution:**

```bash
# Make sure database.py has no syntax errors
python -m py_compile backend/database.py

# Check permissions
ls -la backend/

# Try deleting and recreating
rm backend/resumai.db
# Restart server
```

---

### 2. "Module 'database' not found" Error

**Problem:** ImportError when starting server

**Solution:**

```bash
# Make sure database.py is in backend/ directory
ls backend/database.py

# Check Python path
cd backend
python -c "import database; print('OK')"

# Reinstall if needed
pip install -r requirements.txt
```

---

### 3. "User not found" Error on API Calls

**Problem:** 401 error when calling endpoints

**Causes & Solutions:**

a) **Missing Authorization Header**

```bash
# ❌ Wrong
curl http://localhost:8000/api/resumes

# ✅ Correct
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8000/api/resumes
```

b) **Invalid or Expired Token**

```bash
# Sign in again to get new token
curl -X POST http://localhost:8000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"token": "google_id_token"}'
```

c) **User Record Corrupted**

```bash
# Delete database and sign in again
rm backend/resumai.db
# Restart server and signin
```

---

### 4. "Resume not found" Error

**Problem:** 404 when trying to get or delete resume

**Solutions:**

a) **Resume ID Wrong Format**

```python
# Check resume ID format - should be UUID
import uuid
print(uuid.uuid4())  # Example: 550e8400-e29b-41d4-a716-446655440000
```

b) **Trying to Access Another User's Resume**

```python
# Each user can only access their own resumes
# Check current_user.id matches resume.user_id in database
```

c) **Resume Was Soft Deleted**

```python
# Soft deleted resumes have is_deleted=1
# They won't appear in queries, but data is preserved
```

---

### 5. API Returns 500 Internal Server Error

**Problem:** Unexpected server error

**Solutions:**

a) **Check Server Logs**

```bash
# Watch the server output for error messages
# Common issues:
# - File not found
# - JSON parsing error
# - Missing environment variable
```

b) **Verify File Uploads**

```python
# Check if file is valid PDF
import pdfplumber
with pdfplumber.open("resume.pdf") as pdf:
    print(f"Pages: {len(pdf.pages)}")
```

c) **Database Corrupted**

```bash
# Backup and recreate database
cp backend/resumai.db backend/resumai.backup.db
rm backend/resumai.db
# Restart server
```

---

### 6. "No jobs match" in Job Selector

**Problem:** Job dropdown showing no results when searching

**This is frontend issue, not database related**

Solution: Check job-selector.tsx component

---

### 7. Database File Growing Too Large

**Problem:** resumai.db file becoming very large

**Solutions:**

a) **Archive Old Data**

```python
# Export and delete old analyses (> 1 year)
from database import get_db
import sqlite3

with get_db() as conn:
    cursor = conn.cursor()
    cursor.execute('''
        DELETE FROM analytics_events
        WHERE created_at < datetime('now', '-1 year')
    ''')
```

b) **Optimize Database**

```bash
# Run SQLite maintenance
sqlite3 backend/resumai.db VACUUM
sqlite3 backend/resumai.db ANALYZE
```

---

### 8. Slow API Responses

**Problem:** Endpoints responding slowly

**Solutions:**

a) **Check Database Indexes**

```python
# Verify indexes exist
from database import get_db
with get_db() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
    for row in cursor.fetchall():
        print(row[0])
```

b) **Limit Query Results**

```bash
# Use limit parameter
curl "http://localhost:8000/api/analytics/events?limit=10"
```

c) **Clear Old Events**

```python
# Delete old events
with get_db() as conn:
    cursor = conn.cursor()
    cursor.execute('''
        DELETE FROM analytics_events
        WHERE created_at < datetime('now', '-3 months')
    ''')
```

---

### 9. CORS Issues with Frontend

**Problem:** Frontend can't call backend API

**Solution:** Check CORS configuration in main.py

```python
# Should allow localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### 10. File Upload Size Limit Exceeded

**Problem:** 413 Payload Too Large error

**Solutions:**

a) **Use Smaller Files**

- Typical resume: < 5MB
- Most PDFs: < 2MB

b) **Increase Limit in FastAPI**

```python
# In main.py, after app = FastAPI():
from fastapi.middleware import Middleware

app.max_upload_size = 10 * 1024 * 1024  # 10MB
```

---

### 11. JSON Parse Errors in Analytics

**Problem:** Invalid JSON in database fields

**Solutions:**

a) **Check Data Integrity**

```python
from database import get_db
import json

with get_db() as conn:
    cursor = conn.cursor()
    cursor.execute('SELECT id, sections FROM resume_analyses LIMIT 1')
    row = cursor.fetchone()
    try:
        data = json.loads(row['sections'])
        print("JSON valid:", data)
    except json.JSONDecodeError as e:
        print("Invalid JSON:", e)
```

b) **Fix Corrupted Data**

```python
# Migrate data to JSON serializable format
# Or delete and re-analyze
```

---

### 12. Permission Denied on Database File

**Problem:** "database is locked" or permission error

**Solutions:**

a) **Check File Permissions**

```bash
# Make sure backend directory is writable
ls -la backend/
chmod 755 backend/
chmod 644 backend/resumai.db
```

b) **Close Other Connections**

```bash
# Make sure only one server instance is running
ps aux | grep "python main.py"
pkill -f "python main.py"  # Kill all instances
```

c) **Use Different Database Path**

```bash
export DATABASE_PATH="/tmp/resumai.db"
python backend/main.py
```

---

### 13. No Data Visible After Upload

**Problem:** Resume uploaded but not showing in list

**Solutions:**

a) **Verify Save Request Succeeded**

```bash
# Check response status
curl -v -X POST http://localhost:8000/api/resumes/save \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@resume.pdf"
```

b) **Check Database Directly**

```bash
sqlite3 backend/resumai.db
SELECT COUNT(*) FROM resumes;
SELECT * FROM resumes WHERE user_id='YOUR_USER_ID';
```

c) **User Not Authenticated**

```python
# Make sure user was created during signin
# Check users table for your user ID
sqlite3 backend/resumai.db
SELECT * FROM users;
```

---

### 14. Testing Database Functions

**Problem:** Want to test without frontend

**Solution:** Use db_client.py

```bash
# Get JWT token first (from signin)
python backend/db_client.py "your_jwt_token"

# Or use Python directly
python -c "
from database import *
init_db()
user = create_user('test_id', 'test@example.com', 'Test User')
print('User created:', user)
"
```

---

### 15. Backup and Recovery

**Problem:** Need to backup/restore database

**Solution:**

```bash
# Backup
cp backend/resumai.db backend/resumai_$(date +%Y%m%d).db

# Restore
cp backend/resumai_20240203.db backend/resumai.db
# Restart server
```

---

## Debug Mode

Enable verbose logging:

```python
# In database.py, add after imports
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Add logging to functions
logger.debug(f"Creating resume: {resume_id}")
```

---

## Quick Diagnostic Checks

Run this to verify everything is working:

```bash
# 1. Check database exists and is readable
ls -la backend/resumai.db

# 2. Check database integrity
sqlite3 backend/resumai.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table';"

# 3. Check for errors in main.py
python -m py_compile backend/main.py

# 4. Start server and check no errors
python backend/main.py

# 5. Test health endpoint
curl http://localhost:8000/health
```

---

## Getting Help

If you encounter an issue not listed here:

1. **Check logs** - Run server with `DEBUG=1` flag
2. **Verify database** - `sqlite3 resumai.db ".tables"`
3. **Test with curl** - Use `curl -v` for verbose output
4. **Check documentation** - See DATABASE.md for API details
5. **Review examples** - Check db_client.py for working code

---

## Performance Diagnostics

```bash
# Check database file size
du -h backend/resumai.db

# Check number of records
sqlite3 backend/resumai.db "
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'resumes', COUNT(*) FROM resumes
UNION ALL
SELECT 'resume_analyses', COUNT(*) FROM resume_analyses
UNION ALL
SELECT 'job_matches', COUNT(*) FROM job_matches
UNION ALL
SELECT 'analytics_events', COUNT(*) FROM analytics_events
;"

# Check slow queries
sqlite3 backend/resumai.db ".eqp on"
```

---

## Still Having Issues?

1. Provide error message
2. Include output of `sqlite3 resumai.db ".tables"`
3. Check browser console for frontend errors
4. Share relevant log entries
5. Verify environment variables are set

Most issues are resolved by:

- ✅ Restarting the server
- ✅ Deleting resumai.db and restarting
- ✅ Signing out and back in
- ✅ Clearing browser cache
- ✅ Checking file permissions
