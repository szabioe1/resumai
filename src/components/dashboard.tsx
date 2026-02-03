import React, { useState } from 'react';
import { useAuth } from '../contexts/auth';
import { ResumeUpload } from './resume-upload';
import { AnalysisResult } from './analysis-result';

interface AnalysisResultType {
  overallScore: number;
  atsCompatibilityScore: number;
  sections: any[];
  strengths: string[];
  improvements: string[];
  keywordMatches: any[];
  recommendations: any[];
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function Dashboard() {
  const { token } = useAuth();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_BASE_URL}/analyze-resume`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let message = 'Failed to analyze resume';
        try {
          const errorData = await response.json();
          message = errorData.detail || message;
        } catch (parseError) {
          const errorText = await response.text();
          if (errorText) {
            message = errorText;
          }
        }
        throw new Error(message);
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while analyzing the resume';
      setError(errorMessage);
      console.error('Error analyzing resume:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          Resume AI Analyzer
        </h1>
        <p className="text-gray-400">
          Upload your resume and get instant AI-powered insights
        </p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}
      
      <ResumeUpload 
        onAnalyze={handleAnalyze} 
        isAnalyzing={isAnalyzing}
      />
      
      {analysisResult && (
        <div className="mt-8">
          <AnalysisResult result={analysisResult} />
        </div>
      )}
    </div>
  );
}
