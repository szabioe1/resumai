import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Loader2, FileText, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../contexts/auth';
import { useTheme } from '../contexts/theme';
import { AnalysisResult } from './job-matcher-result';
import { AnalysisSkeleton } from './analysis-skeleton';

interface JobMatchResult {
  matchPercentage: number;
  hirabilityScore: number;
  matchAnalysis: string;
  keywordMatches: { keyword: string; frequency: number; relevance: 'high' | 'medium' | 'low' }[];
  missingKeywords: string[];
  strengths: string[];
  improvements: string[];
  recommendations: { priority: 'high' | 'medium'; title: string; description: string }[];
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function JobMatcher({ preloadedResumeId, token: propsToken }: { preloadedResumeId?: string; token?: string } = {}) {
  const { token: authToken } = useAuth();
  const { isDarkMode } = useTheme();
  const token = propsToken || authToken;
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load preloaded resume if available
  useEffect(() => {
    if (preloadedResumeId && token) {
      // Mark that we're using a preloaded resume from history
      // We'll handle this in the analyze function
    }
  }, [preloadedResumeId, token]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      setResumeFile(file);
      setError(null);
    } else {
      setError('Please select a valid PDF or image file');
    }
  }, []);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }
    if (!resumeFile) {
      setError('Please upload a resume');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', resumeFile);
      formData.append('job_description', jobDescription);

      const response = await fetch(`${API_BASE_URL}/match-job`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let message = 'Failed to analyze job match';
        try {
          const errorData = await response.json();
          message = errorData.detail || message;
        } catch {
          const errorText = await response.text();
          if (errorText) message = errorText;
        }
        throw new Error(message);
      }

      const result = await response.json();
      setMatchResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Show results view
  if (matchResult) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <button
          onClick={() => setMatchResult(null)}
          className={cn("mb-6 transition-colors", isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700")}
        >
          ← Back to Job Matcher
        </button>
        <AnalysisResult result={matchResult} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl">
      <div className="mb-10">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Job Description Matcher
        </h1>
        <p className={cn("text-lg", isDarkMode ? "text-slate-400" : "text-slate-600")}>
          Paste a job description and upload your resume to see your match percentage and hiring chances
        </p>
      </div>

      {error && (
        <div className={cn("mb-6 p-4 border rounded-lg backdrop-blur-sm", isDarkMode ? "bg-red-500/10 border-red-500/30" : "bg-red-100 border-red-300")}>
          <p className={isDarkMode ? "text-red-300" : "text-red-700"}>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Job Description Input */}
        <div className={cn("glass-card rounded-2xl p-6 border relative z-30", isDarkMode ? "border-blue-500/20" : "border-blue-400/30")}>
          <label className={cn("mb-3 block text-sm font-semibold", isDarkMode ? "text-slate-200" : "text-slate-700")}>
            📋 Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here... Include responsibilities, requirements, skills, and qualifications"
            className={cn(
              "w-full h-80 rounded-xl border-2 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none",
              isDarkMode
                ? "border-slate-700/50 bg-slate-800/30 text-slate-100 placeholder-slate-500"
                : "border-gray-300 bg-gray-100 text-gray-900 placeholder-gray-500"
            )}
          />
          <div className={cn("mt-3 text-xs", isDarkMode ? "text-slate-400" : "text-gray-600")}>
            Character count: {jobDescription.length}
          </div>
        </div>

        {/* Resume Upload */}
        <div className={cn("glass-card rounded-2xl p-6 border relative z-10", isDarkMode ? "border-blue-500/20" : "border-blue-400/30")}>
          <label className={cn("mb-3 block text-sm font-semibold", isDarkMode ? "text-slate-200" : "text-slate-700")}>
            📄 Your Resume
          </label>
          
          <div className={cn(
            "relative h-80 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all",
            isDarkMode
              ? "border-slate-600/50 bg-slate-800/30 hover:border-blue-500/50 hover:bg-slate-800/50"
              : "border-gray-400 bg-gray-100 hover:border-blue-400 hover:bg-blue-50"
          )}>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileSelect}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isAnalyzing}
            />
            {resumeFile ? (
              <div className="text-center">
                <div className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-xl border mx-auto mb-4",
                  isDarkMode
                    ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/20"
                    : "bg-gradient-to-br from-blue-100 to-cyan-100 border-blue-300"
                )}>
                  <FileText className={cn("h-8 w-8", isDarkMode ? "text-blue-400" : "text-blue-600")} />
                </div>
                <p className={cn("font-semibold mb-1", isDarkMode ? "text-slate-100" : "text-gray-900")}>{resumeFile.name}</p>
                <p className={cn("text-xs mb-3", isDarkMode ? "text-slate-400" : "text-gray-600")}>
                  {(resumeFile.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setResumeFile(null);
                  }}
                  className={cn(
                    "text-xs transition-colors",
                    isDarkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-700"
                  )}
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full border mx-auto mb-4",
                  isDarkMode
                    ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/20"
                    : "bg-gradient-to-br from-blue-100 to-cyan-100 border-blue-300"
                )}>
                  <Upload className={cn("h-7 w-7", isDarkMode ? "text-blue-400" : "text-blue-600")} />
                </div>
                <p className={cn("font-medium", isDarkMode ? "text-slate-100" : "text-gray-900")}>Drop your resume or click to browse</p>
                <p className={cn("text-xs mt-2", isDarkMode ? "text-slate-400" : "text-gray-600")}>PDF or image files (JPG, PNG, etc.)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={!jobDescription.trim() || !resumeFile || isAnalyzing}
        className={cn(
          'w-full py-4 rounded-xl font-semibold text-lg transition-all',
          !jobDescription.trim() || !resumeFile || isAnalyzing
            ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/30'
        )}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="inline mr-2 h-5 w-5 animate-spin" />
            Analyzing Job Match...
          </>
        ) : (
          <>
            <Zap className="inline mr-2 h-5 w-5" />
            Analyze Match
          </>
        )}
      </button>

      {/* Loading State */}
      {isAnalyzing && (
        <div className="mt-12 fade-in-up">
          <AnalysisSkeleton />
        </div>
      )}
    </div>
  );
}
