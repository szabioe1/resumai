# Frontend Integration Guide - Database & Analytics

This guide explains how to integrate the new database API endpoints into your React frontend.

## Overview

The backend now provides persistent storage for:

- User resume uploads
- Resume analysis results
- Job matching results
- User activity analytics

## API Base Configuration

Create a configuration file for API endpoints:

```typescript
// src/config/api.ts
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000";

export const API_ENDPOINTS = {
  // Resume Management
  RESUMES_LIST: "/api/resumes",
  RESUMES_SAVE: "/api/resumes/save",
  RESUMES_DELETE: (id: string) => `/api/resumes/${id}`,

  // Analytics
  ANALYTICS_SUMMARY: "/api/analytics/summary",
  ANALYTICS_ANALYSES: "/api/analytics/analyses",
  ANALYTICS_JOB_MATCHES: "/api/analytics/job-matches",
  ANALYTICS_EVENTS: "/api/analytics/events",

  // Enhanced Analysis
  ANALYZE_RESUME_SAVE: "/analyze-resume-save",
  MATCH_JOB_SAVE: "/match-job-save",
};
```

## API Service Hook

Create a custom hook for API calls:

```typescript
// src/hooks/useResumAIAPI.ts
import { useContext } from "react";
import { AuthContext } from "@/contexts/auth";
import { API_BASE_URL } from "@/config/api";

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

export const useResumAIAPI = () => {
  const auth = useContext(AuthContext);

  const request = async (endpoint: string, options: RequestOptions = {}) => {
    if (!auth?.token) {
      throw new Error("Not authenticated");
    }

    const { params, ...fetchOptions } = options;

    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        Authorization: `Bearer ${auth.token}`,
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "API Error");
    }

    return response.json();
  };

  return { request };
};
```

## Resume Management

### Upload and Save Resume

```typescript
// Example: Upload resume
const uploadResume = async (file: File) => {
  const { request } = useResumAIAPI();
  const formData = new FormData();
  formData.append("file", file);

  const result = await request("/api/resumes/save", {
    method: "POST",
    body: formData,
  });

  return result.resume;
};
```

### List Saved Resumes

```typescript
// src/hooks/useSavedResumes.ts
import { useState, useEffect } from "react";
import { useResumAIAPI } from "./useResumAIAPI";

export const useSavedResumes = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { request } = useResumAIAPI();

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const data = await request("/api/resumes");
      setResumes(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch resumes"),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const deleteResume = async (resumeId: string) => {
    try {
      await request(`/api/resumes/${resumeId}`, { method: "DELETE" });
      setResumes(resumes.filter((r) => r.id !== resumeId));
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to delete resume"),
      );
    }
  };

  return { resumes, loading, error, refetch: fetchResumes, deleteResume };
};
```

## Analytics Integration

### Get User Analytics Summary

```typescript
// src/hooks/useUserAnalytics.ts
import { useState, useEffect } from "react";
import { useResumAIAPI } from "./useResumAIAPI";

interface AnalyticsSummary {
  resume_count: number;
  analysis_count: number;
  job_match_count: number;
  average_overall_score: number | null;
  average_ats_score: number | null;
  event_counts: Record<string, number>;
}

export const useUserAnalytics = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { request } = useResumAIAPI();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await request("/api/analytics/summary");
        setSummary(data);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  return { summary, loading };
};
```

### Get Analysis History

```typescript
// Get user's previous resume analyses
const { request } = useResumAIAPI();

const analyses = await request("/api/analytics/analyses", {
  params: { limit: 10 },
});

// Example response:
// [
//   {
//     id: "uuid",
//     resume_id: "uuid",
//     overall_score: 85,
//     ats_compatibility_score: 78,
//     created_at: "2024-02-03T10:00:00Z"
//   }
// ]
```

### Get Job Match History

```typescript
// Get user's previous job matches
const { request } = useResumAIAPI();

const matches = await request("/api/analytics/job-matches", {
  params: { limit: 10 },
});

// Example response:
// [
//   {
//     id: "uuid",
//     resume_id: "uuid",
//     job_title: "Software Engineer",
//     match_percentage: 85,
//     hirability_score: 82,
//     created_at: "2024-02-03T10:00:00Z"
//   }
// ]
```

### Get User Activity Events

```typescript
// Get all user activity
const { request } = useResumAIAPI();

const response = await request("/api/analytics/events", {
  params: { limit: 50 },
});

// Filter by event type
const resumeEvents = await request("/api/analytics/events", {
  params: {
    event_type: "resume_uploaded",
    limit: 20,
  },
});
```

## Enhanced Analysis Endpoints

### Analyze Resume with Save

Instead of using the old `/analyze-resume` endpoint, use the new endpoint that automatically saves results:

```typescript
// src/hooks/useAnalyzeResume.ts
import { useState } from "react";
import { useResumAIAPI } from "./useResumAIAPI";

export const useAnalyzeResume = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { request } = useResumAIAPI();

  const analyze = async (file: File, targetJob?: string) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      if (targetJob) {
        formData.append("targetJob", targetJob);
      }

      const result = await request("/analyze-resume-save", {
        method: "POST",
        body: formData,
      });

      return {
        resumeId: result.resume_id,
        analysisId: result.analysis_id,
        analysis: result.analysis,
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Analysis failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { analyze, loading, error };
};
```

### Match Resume to Job with Save

```typescript
// src/hooks/useJobMatch.ts
import { useState } from "react";
import { useResumAIAPI } from "./useResumAIAPI";

export const useJobMatch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { request } = useResumAIAPI();

  const match = async (file: File, jobDescription: string) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobDescription", jobDescription);

      const result = await request("/match-job-save", {
        method: "POST",
        body: formData,
      });

      return {
        resumeId: result.resume_id,
        matchId: result.match_id,
        result: result.match_result,
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Job matching failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { match, loading, error };
};
```

## Example Component: Analytics Dashboard

```typescript
// src/components/analytics-dashboard.tsx
import React from 'react';
import { useUserAnalytics } from '@/hooks/useUserAnalytics';
import { useSavedResumes } from '@/hooks/useSavedResumes';

export const AnalyticsDashboard: React.FC = () => {
  const { summary, loading: summaryLoading } = useUserAnalytics();
  const { resumes, loading: resumesLoading } = useSavedResumes();

  if (summaryLoading || resumesLoading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-500/10 rounded-lg">
          <div className="text-2xl font-bold">{summary?.resume_count || 0}</div>
          <div className="text-sm text-gray-400">Resumes Uploaded</div>
        </div>
        <div className="p-4 bg-green-500/10 rounded-lg">
          <div className="text-2xl font-bold">{summary?.analysis_count || 0}</div>
          <div className="text-sm text-gray-400">Analyses Completed</div>
        </div>
        <div className="p-4 bg-purple-500/10 rounded-lg">
          <div className="text-2xl font-bold">{summary?.job_match_count || 0}</div>
          <div className="text-sm text-gray-400">Job Matches</div>
        </div>
        <div className="p-4 bg-orange-500/10 rounded-lg">
          <div className="text-2xl font-bold">
            {summary?.average_overall_score?.toFixed(1) || '—'}
          </div>
          <div className="text-sm text-gray-400">Avg Score</div>
        </div>
      </div>

      {/* Saved Resumes */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Saved Resumes</h3>
        <div className="space-y-2">
          {resumes.map(resume => (
            <div key={resume.id} className="p-3 bg-slate-700/30 rounded-lg">
              <div className="font-medium">{resume.file_name}</div>
              <div className="text-sm text-gray-400">
                {new Date(resume.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## Example Component: Resume History

```typescript
// src/components/resume-history.tsx
import React from 'react';
import { useResumAIAPI } from '@/hooks/useResumAIAPI';

export const ResumeHistory: React.FC = () => {
  const [analyses, setAnalyses] = React.useState([]);
  const { request } = useResumAIAPI();

  React.useEffect(() => {
    const fetch = async () => {
      const data = await request('/api/analytics/analyses', {
        params: { limit: 20 }
      });
      setAnalyses(data);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Analysis History</h3>
      {analyses.map(analysis => (
        <div key={analysis.id} className="p-4 bg-slate-700/30 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium">Resume Analysis</div>
              <div className="text-sm text-gray-400">
                {new Date(analysis.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-blue-400">
                {analysis.overall_score}%
              </div>
              <div className="text-xs text-gray-500">
                ATS: {analysis.ats_compatibility_score}%
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Best Practices

1. **Cache Results** - Use React Query or SWR for efficient caching
2. **Error Handling** - Always handle API errors gracefully
3. **Loading States** - Show loading indicators during API calls
4. **Optimistic Updates** - Update UI before server response when appropriate
5. **Data Validation** - Validate file types and sizes on frontend
6. **Token Management** - Keep JWT tokens secure, refresh when needed

## Error Handling Example

```typescript
try {
  const result = await useAnalyzeResume();
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes("401")) {
      // Handle auth error
    } else if (error.message.includes("413")) {
      // Handle file too large
    }
  }
}
```

## Next Steps

1. Integrate hooks into your components
2. Update existing analyze and match endpoints to use new `-save` versions
3. Add analytics dashboard to show user insights
4. Create resume history/management pages
5. Implement data export functionality

See `DATABASE.md` for complete API documentation.
