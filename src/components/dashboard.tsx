import React, { useState } from 'react';
import { useAuth } from '../contexts/auth';
import { useTheme } from '../contexts/theme';
import { JobSelector } from './job-selector';
import { ResumeUpload } from './resume-upload';
import { AnalysisResult } from './analysis-result';
import { AnalysisSkeleton } from './analysis-skeleton';
import { cn } from '../lib/utils';

interface AnalysisResultType {
  overallScore: number;
  atsCompatibilityScore: number;
  personalizedAdvice?: string;
  sections: any[];
  strengths: string[];
  improvements: string[];
  keywordMatches: any[];
  recommendations: any[];
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function Dashboard() {
  const { token } = useAuth();
  const { isDarkMode } = useTheme();
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (file: File) => {
    if (!selectedJob) {
      setError('Please select a job position first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('job_title', selectedJob);
      
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
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="mb-10">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Resume AI Analyzer
        </h1>
        <p className={cn("text-lg", isDarkMode ? "text-slate-400" : "text-slate-600")}>
          Upload your resume and get AI-powered insights tailored to your target job
        </p>
      </div>
      
      {error && (
        <div className={cn("mb-6 p-4 border rounded-lg backdrop-blur-sm animate-pulse", isDarkMode ? "bg-red-500/10 border-red-500/30" : "bg-red-100 border-red-300")}>
          <p className={isDarkMode ? "text-red-300" : "text-red-700"}>{error}</p>
        </div>
      )}

      {/* Quality Warning */}
      <div className={cn("mb-6 p-4 border rounded-lg backdrop-blur-sm", isDarkMode ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-100 border-amber-300")}>
        <div className="flex items-start gap-3">
          <div className={cn("font-bold text-lg", isDarkMode ? "text-amber-400" : "text-amber-600")}>⚠️</div>
          <div>
            <p className={cn("font-semibold mb-1", isDarkMode ? "text-amber-300" : "text-amber-700")}>Resume Quality Matters</p>
            <p className={cn("text-sm", isDarkMode ? "text-amber-200/80" : "text-amber-600/80")}>
              For accurate analysis, please upload a clean, well-formatted resume. Low quality or poorly structured resumes may yield inaccurate results. Ensure your resume is free of errors, properly organized, and contains quantifiable achievements.
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className={cn("glass-card rounded-2xl p-6 border relative z-30", isDarkMode ? "border-blue-500/20" : "border-blue-400/30")}>
          <JobSelector onSelect={setSelectedJob} selectedJob={selectedJob} />
        </div>

        <div className={cn("glass-card rounded-2xl p-6 border relative z-10", isDarkMode ? "border-blue-500/20" : "border-blue-400/30")}>
          <ResumeUpload 
            onAnalyze={handleAnalyze} 
            isAnalyzing={isAnalyzing}
            disabled={!selectedJob}
          />
        </div>
      </div>
      
      {isAnalyzing && (
        <div className="mt-12 fade-in-up">
          <AnalysisSkeleton />
        </div>
      )}
      
      {!isAnalyzing && analysisResult && (
        <div className="mt-12 fade-in-up">
          <AnalysisResult result={analysisResult} />
        </div>
      )}
    </div>
  );
}
