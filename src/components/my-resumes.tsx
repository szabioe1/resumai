import React, { useEffect, useState } from 'react';
import { FileText, Trash2, Edit2, Download, Eye, ArrowLeft, Check, X } from 'lucide-react';
import { Card } from './ui/card';
import { useAuth } from '../contexts/auth';
import { useTheme } from '../contexts/theme';
import { AnalysisResult } from './analysis-result';
import { JobMatcher } from './job-matcher';
import { cn } from '../lib/utils';

interface ResumeHistoryItem {
  id: string;
  filename: string;
  timestamp: string;
  overall_score?: number;
  status?: 'pending' | 'analyzed' | 'optimizing';
  type?: 'job_match';
  matchPercentage?: number;
  hirabilityScore?: number;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function MyResumes() {
  const { token } = useAuth();
  const { isDarkMode } = useTheme();
  const [resumes, setResumes] = useState<ResumeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [showJobMatcher, setShowJobMatcher] = useState(false);
  const [editingResumeId, setEditingResumeId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchResumes = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/resumes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          let message = 'Failed to load resumes';
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

        const data = await response.json();
        setResumes(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load resumes';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResumes();
  }, [token]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const handleViewAnalysis = async (resumeId: string) => {
    setIsLoadingAnalysis(true);
    try {
      const response = await fetch(`${API_BASE_URL}/resumes/${resumeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load analysis');
      }

      const data = await response.json();
      setSelectedAnalysis(data);
      setSelectedResumeId(resumeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleBackToList = () => {
    setSelectedResumeId(null);
    setSelectedAnalysis(null);
    setShowJobMatcher(false);
  };

  const handleMatchToJob = () => {
    setShowJobMatcher(true);
  };

  const handleEditName = (resumeId: string, currentName: string) => {
    setEditingResumeId(resumeId);
    setEditedName(currentName);
  };

  const handleSaveName = async (resumeId: string) => {
    if (!editedName.trim()) {
      setError('Filename cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('filename', editedName);

      const response = await fetch(`${API_BASE_URL}/resumes/${resumeId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to update resume name');
      }

      // Update local state
      setResumes(resumes.map(r => 
        r.id === resumeId ? { ...r, filename: editedName } : r
      ));
      
      setEditingResumeId(null);
      setEditedName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update resume name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingResumeId(null);
    setEditedName('');
  };

  const handleDeleteResume = async (resumeId: string, filename: string) => {
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingResumeId(resumeId);
    try {
      const response = await fetch(`${API_BASE_URL}/resumes/${resumeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete resume');
      }

      // Remove from local state
      setResumes(resumes.filter(r => r.id !== resumeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete resume');
    } finally {
      setDeletingResumeId(null);
    }
  };

  // If viewing job matcher from a resume
  if (selectedResumeId && showJobMatcher) {
    return (
      <div className="container mx-auto px-6 py-8">
        <button
          onClick={handleBackToList}
          className={cn("mb-6 flex items-center gap-2 transition-colors", isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700")}
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Analysis
        </button>
        <JobMatcher preloadedResumeId={selectedResumeId as string} token={token || ''} />
      </div>
    );
  }

  // If viewing an analysis, show it
  if (selectedResumeId && selectedAnalysis) {
    return (
      <div className="container mx-auto px-6 py-8">
        <button
          onClick={handleBackToList}
          className={cn("mb-6 flex items-center gap-2 transition-colors", isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700")}
        >
          <ArrowLeft className="h-5 w-5" />
          Back to My Resumes
        </button>
        <AnalysisResult result={selectedAnalysis} onMatchToJob={handleMatchToJob} />
      </div>
    );
  }
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'analyzed':
        return <span className={`${baseClasses} ${isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700'}`}>Analyzed</span>;
      case 'pending':
        return <span className={`${baseClasses} ${isDarkMode ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>Pending Review</span>;
      case 'optimizing':
        return <span className={`${baseClasses} ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>Optimizing</span>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className={cn("text-4xl font-bold mb-2", isDarkMode ? "text-white" : "text-slate-900")}>My Resumes</h1>
        <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Manage and track your resume versions</p>
      </div>

      {error && (
        <div className={cn("mb-6 p-4 rounded-lg border", isDarkMode ? "bg-red-500/10 border-red-500/50" : "bg-red-100 border-red-300")}>
          <p className={isDarkMode ? "text-red-400" : "text-red-700"}>{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {resumes.map((resume) => (
          <Card key={resume.id} className="p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  {editingResumeId === resume.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className={cn("flex-1 px-3 py-1 rounded-lg focus:outline-none focus:border-blue-500 border", isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-100 border-gray-300 text-slate-900")}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName(resume.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <button
                        onClick={() => handleSaveName(resume.id)}
                        disabled={isSaving}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <Check className="h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <h3 className={cn("font-semibold text-lg mb-1", isDarkMode ? "text-white" : "text-slate-900")}>{resume.filename}</h3>
                  )}
                  <p className={isDarkMode ? "text-sm text-gray-400" : "text-sm text-gray-600"}>Last modified {formatTimestamp(resume.timestamp)}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  {resume.type === 'job_match' ? (
                    <>
                      <div className={cn("text-2xl font-bold", isDarkMode ? "text-blue-500" : "text-blue-600")}>
                        {resume.matchPercentage || 0}%
                      </div>
                      <p className={isDarkMode ? "text-xs text-gray-400" : "text-xs text-gray-600"}>Match %</p>
                    </>
                  ) : (
                    <>
                      <div className={cn("text-2xl font-bold", isDarkMode ? (resume.overall_score! >= 80 ? 'text-green-500' : resume.overall_score! >= 60 ? 'text-yellow-500' : 'text-red-500') : (resume.overall_score! >= 80 ? 'text-green-600' : resume.overall_score! >= 60 ? 'text-yellow-600' : 'text-red-600'))}>
                        {resume.overall_score || 0}
                      </div>
                      <p className={isDarkMode ? "text-xs text-gray-400" : "text-xs text-gray-600"}>AI Score</p>
                    </>
                  )}
                </div>

                <div>
                  {resume.status && getStatusBadge(resume.status)}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleViewAnalysis(resume.id)}
                    className={cn("p-2 rounded-lg transition-colors", isDarkMode ? "hover:bg-blue-900/20" : "hover:bg-blue-100")}
                    title="View Analysis"
                  >
                    <Eye className={cn("h-4 w-4", isDarkMode ? "text-blue-400 hover:text-blue-200" : "text-blue-600 hover:text-blue-700")} />
                  </button>
                  <button className={cn("p-2 rounded-lg transition-colors", isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-200")} title="Download" disabled>
                    <Download className={cn("h-4 w-4", isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700")} />
                  </button>
                  <button 
                    onClick={() => handleEditName(resume.id, resume.filename)}
                    className={cn("p-2 rounded-lg transition-colors", isDarkMode ? "hover:bg-blue-900/20" : "hover:bg-blue-100")}
                    title="Edit Name"
                    disabled={editingResumeId !== null}
                  >
                    <Edit2 className={cn("h-4 w-4", editingResumeId !== null ? (isDarkMode ? 'text-gray-600' : 'text-gray-400') : (isDarkMode ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'))} />
                  </button>
                  <button 
                    onClick={() => handleDeleteResume(resume.id, resume.filename)}
                    className={cn("p-2 rounded-lg transition-colors", isDarkMode ? "hover:bg-red-900/20" : "hover:bg-red-100")}
                    title="Delete"
                    disabled={deletingResumeId === resume.id}
                  >
                    <Trash2 className={cn("h-4 w-4", deletingResumeId === resume.id ? (isDarkMode ? 'text-gray-600 animate-pulse' : 'text-gray-400 animate-pulse') : (isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'))} />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {!isLoading && resumes.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className={cn("h-16 w-16 mx-auto mb-4", isDarkMode ? "text-gray-600" : "text-gray-400")} />
          <h3 className={cn("text-xl font-semibold mb-2", isDarkMode ? "text-white" : "text-slate-900")}>No resumes yet</h3>
          <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Upload your first resume to get started</p>
        </Card>
      )}
    </div>
  );
}
