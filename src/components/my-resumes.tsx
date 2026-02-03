import React, { useEffect, useState } from 'react';
import { FileText, Trash2, Edit2, Download, Eye } from 'lucide-react';
import { Card } from './ui/card';
import { useAuth } from '../contexts/auth';

interface ResumeHistoryItem {
  id: string;
  filename: string;
  timestamp: string;
  overall_score: number;
  status: 'pending' | 'analyzed' | 'optimizing';
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function MyResumes() {
  const { token } = useAuth();
  const [resumes, setResumes] = useState<ResumeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'analyzed':
        return <span className={`${baseClasses} bg-green-500/10 text-green-400`}>Analyzed</span>;
      case 'pending':
        return <span className={`${baseClasses} bg-yellow-500/10 text-yellow-400`}>Pending Review</span>;
      case 'optimizing':
        return <span className={`${baseClasses} bg-blue-500/10 text-blue-400`}>Optimizing</span>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Resumes</h1>
        <p className="text-gray-400">Manage and track your resume versions</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-red-400">{error}</p>
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
                  <h3 className="font-semibold text-lg mb-1">{resume.filename}</h3>
                  <p className="text-sm text-gray-400">Last modified {formatTimestamp(resume.timestamp)}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(resume.overall_score)}`}>
                    {resume.overall_score}
                  </div>
                  <p className="text-xs text-gray-400">AI Score</p>
                </div>

                <div>
                  {getStatusBadge(resume.status)}
                </div>

                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors" title="View" disabled>
                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-200" />
                  </button>
                  <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors" title="Download" disabled>
                    <Download className="h-4 w-4 text-gray-400 hover:text-gray-200" />
                  </button>
                  <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors" title="Edit" disabled>
                    <Edit2 className="h-4 w-4 text-gray-400 hover:text-gray-200" />
                  </button>
                  <button className="p-2 hover:bg-red-900/20 rounded-lg transition-colors" title="Delete" disabled>
                    <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {!isLoading && resumes.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
          <p className="text-gray-400">Upload your first resume to get started</p>
        </Card>
      )}
    </div>
  );
}
