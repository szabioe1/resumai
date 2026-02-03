import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth';

declare global {
  interface Window {
    google: any;
  }
}

export const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const { signin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize Google Sign-In
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
        callback: handleCredentialResponse,
      });

      // Render the sign-in button
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: '100%',
        }
      );
    }
  }, []);

  const handleCredentialResponse = async (response: any) => {
    setLoading(true);
    setError(null);

    try {
      // Send token to backend for verification
      const backendResponse = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/signin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: response.credential }),
        }
      );

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        throw new Error(errorData.detail || 'Sign-in failed');
      }

      const data = await backendResponse.json();

      // Store token in localStorage
      localStorage.setItem('authToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Update auth context
      signin(data.accessToken, data.user);

      // Navigate to app root (MainLayout)
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Sign-in failed. Please try again.');
      console.error('Sign-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">ResumAI</h1>
          <p className="text-gray-600">AI-Powered Resume Analysis</p>
        </div>

        {/* Sign-In Content */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome Back</h2>
            <p className="text-gray-600 text-sm">Sign in with your Google account to analyze your resume</p>
          </div>

          {/* Google Sign-In Button */}
          <div id="google-signin-button" className="w-full"></div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">Signing in...</span>
            </div>
          )}

          {/* Features */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Why ResumAI?</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span className="text-sm text-gray-600">AI-powered resume analysis</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span className="text-sm text-gray-600">ATS compatibility scoring</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span className="text-sm text-gray-600">Detailed improvement recommendations</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span className="text-sm text-gray-600">Keyword optimization insights</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Privacy Notice */}
        <p className="text-center text-xs text-gray-500 mt-6">
          We respect your privacy. Your resume data is only used for analysis.
        </p>
      </div>
    </div>
  );
};
