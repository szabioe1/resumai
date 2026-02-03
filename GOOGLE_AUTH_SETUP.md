# ResumAI - Google OAuth Sign-In Setup Guide

## Overview

Your ResumAI application now has Google OAuth 2.0 authentication integrated. Users can sign in with their Google account, and all resume analyses are associated with their account.

## Backend Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"
4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `http://localhost:5000`
   - Add **Authorized redirect URIs**:
     - `http://localhost:3000/signin`
   - Copy the **Client ID**

### 3. Update Backend .env

```env
# In backend/.env
GOOGLE_CLIENT_ID=<your-google-client-id>
JWT_SECRET=<your-secret-key>  # Change in production!
```

### 4. Run Backend Server

```bash
cd backend
python main.py
# Or: uvicorn main:app --reload
```

Server runs on `http://localhost:8000`

## Frontend Setup

### 1. Install Dependencies

```bash
npm install react-router-dom
```

### 2. Create .env.local

```env
# In root .env.local
REACT_APP_API_URL=http://localhost:8000
REACT_APP_GOOGLE_CLIENT_ID=<your-google-client-id>
```

### 3. Run Frontend

```bash
npm start
```

App runs on `http://localhost:3000`

## How It Works

### Sign-In Flow

1. User lands on `/signin` page
2. Google Sign-In button loads with your Client ID
3. User clicks button and authenticates with Google
4. Google returns ID token to frontend
5. Frontend sends token to backend `/auth/signin` endpoint
6. Backend verifies token with Google
7. Backend creates JWT token for session
8. Frontend stores JWT and redirects to dashboard

### Protected API Calls

All resume analysis requests require JWT authentication:

```typescript
const response = await fetch(`/analyze-resume`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

### User Session

- JWT tokens expire after 24 hours (configurable)
- User data stored in-memory (replace with database in production)
- Resume analyses are associated with user account

## Architecture

### Backend Components

- **`/auth/signin`** - POST endpoint for Google token verification
- **`/auth/me`** - GET endpoint to retrieve current user (authenticated)
- **`/auth/signout`** - POST endpoint for logout
- **`/analyze-resume`** - POST endpoint (requires authentication)

### Frontend Components

- **`SignIn`** - Login page with Google Sign-In button
- **`AuthProvider`** - Context for managing authentication state
- **`ProtectedRoute`** - Wrapper for routes requiring authentication
- **`useAuth`** - Hook for accessing auth context

### Data Models

**User Profile**

```json
{
  "id": "google-user-id",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://..."
}
```

**Auth Response**

```json
{
  "accessToken": "jwt-token",
  "user": {
    /* User Profile */
  },
  "expiresIn": 86400
}
```

## File Structure

```
ResumAI/
├── backend/
│   ├── main.py              # FastAPI server with auth
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Google Client ID + JWT Secret
├── src/
│   ├── contexts/
│   │   └── auth.tsx         # Auth context + useAuth hook
│   ├── components/
│   │   ├── signin.tsx       # Google Sign-In page
│   │   ├── protected-route.tsx
│   │   ├── dashboard.tsx    # Updated with auth
│   │   ├── sidebar.tsx      # Shows user info + logout
│   │   └── ...other components
│   └── App.js               # Updated with routing
├── .env.local               # Frontend env vars
└── public/index.html        # Includes Google Sign-In script
```

## Common Issues & Solutions

### "GOOGLE_CLIENT_ID not configured"

- Ensure `GOOGLE_CLIENT_ID` is set in backend `.env`
- Restart backend server

### Google Sign-In button doesn't load

- Check browser console for errors
- Verify `REACT_APP_GOOGLE_CLIENT_ID` is set in frontend `.env.local`
- Ensure `http://localhost:3000` is in Google OAuth authorized origins

### "Invalid token" errors

- Token may have expired (24 hours)
- User needs to sign out and back in
- Check JWT_SECRET is consistent between backend sessions

### CORS errors

- Backend CORS is configured for `localhost:3000`
- Add your domain to `allow_origins` in `main.py` for production

## Production Checklist

- [ ] Change `JWT_SECRET` to a strong random key
- [ ] Replace in-memory user database with real database (PostgreSQL, MongoDB, etc.)
- [ ] Use HTTPS for all domains
- [ ] Update Google OAuth authorized origins and redirect URIs
- [ ] Set appropriate JWT expiration time
- [ ] Implement token refresh mechanism
- [ ] Add rate limiting to auth endpoints
- [ ] Add email verification
- [ ] Log authentication events
- [ ] Implement password reset (if needed)
- [ ] Add 2FA support (optional)

## API Reference

### POST /auth/signin

Sign in with Google token

```
Request:
{
  "token": "google-id-token"
}

Response:
{
  "accessToken": "jwt-token",
  "user": {...},
  "expiresIn": 86400
}
```

### GET /auth/me

Get current user profile (requires JWT)

```
Headers: Authorization: Bearer <jwt-token>

Response:
{
  "id": "...",
  "email": "...",
  "name": "...",
  "picture": "..."
}
```

### POST /auth/signout

Sign out current user

```
Headers: Authorization: Bearer <jwt-token>

Response:
{
  "status": "signed out"
}
```

### POST /analyze-resume

Analyze resume (requires JWT)

```
Headers: Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

Form Data:
- file: <resume-file>

Response: AnalysisResult
```

## Support

For issues with Google OAuth setup, see:

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Web](https://developers.google.com/identity/gsi/web)
