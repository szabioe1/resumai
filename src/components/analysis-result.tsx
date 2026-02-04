"use client";

import React, { useState, useEffect } from "react"

import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  FileText,
  Target,
  BookOpen,
  Zap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useTheme } from '../contexts/theme';

interface DetailedMetric {
  label: string;
  score: number;
  max: number;
  suggestion?: string;
}

interface AnalysisResultProps {
  result: {
    type?: 'job_match' | 'analysis';
    overallScore?: number;
    atsCompatibilityScore?: number;
    personalizedAdvice?: string;
    sections?: {
      name: string;
      score: number;
      feedback: string;
      icon: "format" | "content" | "keywords" | "impact";
      metrics?: DetailedMetric[];
    }[];
    strengths: string[];
    improvements: string[];
    keywordMatches?: { keyword: string; frequency: number; relevance: "high" | "medium" | "low" }[];
    recommendations?: { priority: "high" | "medium" | "low"; title: string; description: string }[];
    // Job match specific fields
    matchPercentage?: number;
    hirabilityScore?: number;
    matchAnalysis?: string;
    missingKeywords?: string[];
  };
  onMatchToJob?: () => void;
}

const iconMap = {
  format: FileText,
  content: BookOpen,
  keywords: Target,
  impact: TrendingUp,
};

function getScoreColor(score: number, isDark: boolean = true) {
  if (score >= 80) return isDark ? "text-emerald-500" : "text-emerald-600";
  if (score >= 60) return isDark ? "text-blue-400" : "text-blue-600";
  return isDark ? "text-orange-500" : "text-orange-600";
}

function getScoreBgColor(score: number, isDark: boolean = true) {
  if (score >= 80) return isDark ? "from-emerald-500/20 to-emerald-600/20" : "from-emerald-200 to-emerald-300";
  if (score >= 60) return isDark ? "from-blue-500/20 to-blue-600/20" : "from-blue-200 to-blue-300";
  return isDark ? "from-orange-500/20 to-orange-600/20" : "from-orange-200 to-orange-300";
}

export function AnalysisResult({ result, onMatchToJob }: AnalysisResultProps) {
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());
  const [scoreAnimations, setScoreAnimations] = useState({ overall: 0, ats: 0 });
  const { isDarkMode } = useTheme();

  // Check if this is a job match result
  const isJobMatch = result.type === 'job_match';

  useEffect(() => {
    if (isJobMatch) return; // Skip animations for job match results

    // Animate circular scores
    const overallInterval = setInterval(() => {
      setScoreAnimations(prev => {
        if (prev.overall >= (result.overallScore || 0)) {
          clearInterval(overallInterval);
          return prev;
        }
        return { ...prev, overall: Math.min(prev.overall + 2, result.overallScore || 0) };
      });
    }, 20);

    const atsInterval = setInterval(() => {
      setScoreAnimations(prev => {
        if (prev.ats >= (result.atsCompatibilityScore || 0)) {
          clearInterval(atsInterval);
          return prev;
        }
        return { ...prev, ats: Math.min(prev.ats + 2, result.atsCompatibilityScore || 0) };
      });
    }, 20);

    // Stagger section visibility
    const sectionTimers = (result.sections || []).map((_, idx) => {
      return setTimeout(() => {
        setVisibleSections(prev => new Set(prev).add(idx));
      }, idx * 200);
    });

    return () => {
      clearInterval(overallInterval);
      clearInterval(atsInterval);
      sectionTimers.forEach(timer => clearTimeout(timer));
    };
  }, [result, isJobMatch]);

  return (
    <div className="space-y-8">
      {/* If this is a job match result, delegate to job matcher result component */}
      {isJobMatch && (
        <>
          {/* Display as job match result with match percentage and hireability score */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Match Percentage */}
            <div className={cn(
              "overflow-hidden rounded-2xl border backdrop-blur p-8",
              isDarkMode
                ? "border-blue-500/20 bg-blue-500/10"
                : "border-blue-400 bg-blue-100"
            )}>
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className={cn("h-5 w-5", isDarkMode ? "text-blue-400" : "text-blue-600")} />
                <h3 className={cn("text-lg font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Match Percentage</h3>
              </div>
              <div className="flex items-center gap-8">
                <div className="relative flex h-36 w-36 items-center justify-center">
                  <svg className="h-36 w-36 -rotate-90 transform">
                    <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="none" className={isDarkMode ? "text-slate-700/50" : "text-gray-300"} />
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="64" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      fill="none" 
                      strokeDasharray={`${(result.matchPercentage || 0) * 4.02} 402`}
                      className={cn("transition-all duration-300", isDarkMode ? "text-blue-500" : "text-blue-600")}
                      strokeLinecap="round" 
                    />
                  </svg>
                  <span className={cn("absolute text-4xl font-bold", isDarkMode ? "text-blue-500" : "text-blue-600")}>{result.matchPercentage || 0}%</span>
                </div>
                <div className="flex-1">
                  <p className={cn("text-sm leading-relaxed font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                    Your resume matches {result.matchPercentage || 0}% of the job requirements.
                  </p>
                </div>
              </div>
            </div>

            {/* Hireability Score */}
            <div className={cn(
              "overflow-hidden rounded-2xl border backdrop-blur p-8",
              isDarkMode
                ? "border-cyan-500/20 bg-cyan-500/10"
                : "border-cyan-400 bg-cyan-100"
            )}>
              <div className="flex items-center gap-2 mb-6">
                <Zap className={cn("h-5 w-5", isDarkMode ? "text-cyan-400" : "text-cyan-600")} />
                <h3 className={cn("text-lg font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Hireability Score</h3>
              </div>
              <div className="flex items-center gap-8">
                <div className="relative flex h-36 w-36 items-center justify-center">
                  <svg className="h-36 w-36 -rotate-90 transform">
                    <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="none" className={isDarkMode ? "text-slate-700/50" : "text-gray-300"} />
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="64" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      fill="none" 
                      strokeDasharray={`${(result.hirabilityScore || 0) * 4.02} 402`}
                      className={cn("transition-all duration-300", isDarkMode ? "text-cyan-500" : "text-cyan-600")}
                      strokeLinecap="round" 
                    />
                  </svg>
                  <span className={cn("absolute text-4xl font-bold", isDarkMode ? "text-cyan-500" : "text-cyan-600")}>{result.hirabilityScore || 0}%</span>
                </div>
                <div className="flex-1">
                  <p className={cn("text-sm leading-relaxed font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                    {(result.hirabilityScore || 0) >= 70 ? "✨ Strong candidate!" : (result.hirabilityScore || 0) >= 50 ? "👍 Good fit" : "⚠️ Needs improvement"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Match Analysis */}
          {result.matchAnalysis && (
            <div className={cn(
              "rounded-2xl border backdrop-blur p-8",
              isDarkMode
                ? "border-slate-700 bg-slate-900/50"
                : "border-gray-300 bg-gray-100"
            )}>
              <h3 className={cn("text-xl font-bold mb-4", isDarkMode ? "text-slate-100" : "text-slate-900")}>Analysis</h3>
              <p className={cn("leading-relaxed whitespace-pre-wrap", isDarkMode ? "text-slate-300" : "text-slate-700")}>{result.matchAnalysis}</p>
            </div>
          )}

          {/* Keyword Matches */}
          {result.keywordMatches && result.keywordMatches.length > 0 && (
            <div className={cn(
              "rounded-2xl border backdrop-blur p-8",
              isDarkMode
                ? "border-slate-700 bg-slate-900/50"
                : "border-gray-300 bg-gray-100"
            )}>
              <h3 className={cn("text-xl font-bold mb-4", isDarkMode ? "text-slate-100" : "text-slate-900")}>Matched Keywords</h3>
              <div className="space-y-2">
                {result.keywordMatches.map((match, idx) => (
                  <div key={idx} className={cn(
                    "flex items-center justify-between p-3 rounded-lg",
                    isDarkMode ? "bg-slate-800/50" : "bg-gray-200"
                  )}>
                    <span className={isDarkMode ? "text-slate-200" : "text-slate-800"}>{match.keyword}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      match.relevance === 'high' ? (isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-200 text-green-700') :
                      match.relevance === 'medium' ? (isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-200 text-yellow-700') :
                      isDarkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-300 text-gray-700'
                    }`}>
                      {match.relevance}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Keywords */}
          {result.missingKeywords && result.missingKeywords.length > 0 && (
            <div className={cn(
              "rounded-2xl border backdrop-blur p-8",
              isDarkMode
                ? "border-slate-700 bg-slate-900/50"
                : "border-gray-300 bg-gray-100"
            )}>
              <h3 className={cn("text-xl font-bold mb-4", isDarkMode ? "text-slate-100" : "text-slate-900")}>Missing Keywords</h3>
              <ul className="space-y-2">
                {result.missingKeywords.map((keyword, idx) => (
                  <li key={idx} className={cn("flex items-center gap-2", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                    <span className={cn("h-2 w-2 rounded-full", isDarkMode ? "bg-red-500" : "bg-red-600")} />
                    {keyword}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Regular analysis view */}
      {!isJobMatch && (
        <>
          {/* Match to Job Button */}
          {onMatchToJob && (
            <div className="flex justify-end">
              <button
                onClick={onMatchToJob}
                className={cn(
                  "px-6 py-2 rounded-lg font-semibold transition-all",
                  isDarkMode
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                    : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                )}
              >
                Match to Job
              </button>
            </div>
          )}

          {/* Overall Score & ATS Score */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className={cn("overflow-hidden rounded-2xl border transition-all duration-700 backdrop-blur", 
          getScoreBgColor(result.overallScore || 0, isDarkMode),
          isDarkMode ? "border-emerald-500/20" : "border-emerald-400"
        )}>
          <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className={cn("h-5 w-5", isDarkMode ? "text-emerald-400" : "text-emerald-600")} />
              <h3 className={cn("text-lg font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Overall Resume Score</h3>
            </div>
            <div className="flex items-center gap-8">
              <div className="relative flex h-36 w-36 items-center justify-center">
                <svg className="h-36 w-36 -rotate-90 transform">
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="none" className={isDarkMode ? "text-slate-700/50" : "text-gray-300"} />
                  <circle 
                    cx="72" 
                    cy="72" 
                    r="64" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    fill="none" 
                    strokeDasharray={`${scoreAnimations.overall * 4.02} 402`}
                    className={cn(getScoreColor(result.overallScore || 0, isDarkMode), "transition-all duration-300")}
                    strokeLinecap="round" 
                  />
                </svg>
                <span className={cn("absolute text-4xl font-bold tabular-nums", getScoreColor(result.overallScore || 0, isDarkMode))}>{scoreAnimations.overall}</span>
              </div>
              <div className="flex-1">
                <p className={cn("text-sm leading-relaxed font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  {(result.overallScore || 0) >= 80 ? "✨ Excellent work! Your resume is well-optimized and highly competitive." : (result.overallScore || 0) >= 60 ? "👍 Good foundation. Polish these areas to stand out more." : "⚠️ Significant improvements needed to be competitive."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={cn("overflow-hidden rounded-2xl border transition-all duration-700 backdrop-blur", 
          getScoreBgColor(result.atsCompatibilityScore || 0, isDarkMode),
          isDarkMode ? "border-blue-500/20" : "border-blue-400"
        )}>
          <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <Zap className={cn("h-5 w-5", isDarkMode ? "text-cyan-400" : "text-cyan-600")} />
              <h3 className={cn("text-lg font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>ATS Compatibility</h3>
            </div>
            <div className="flex items-center gap-8">
              <div className="relative flex h-36 w-36 items-center justify-center">
                <svg className="h-36 w-36 -rotate-90 transform">
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="none" className={isDarkMode ? "text-slate-700/50" : "text-gray-300"} />
                  <circle 
                    cx="72" 
                    cy="72" 
                    r="64" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    fill="none" 
                    strokeDasharray={`${scoreAnimations.ats * 4.02} 402`}
                    className={cn(getScoreColor(result.atsCompatibilityScore || 0, isDarkMode), "transition-all duration-300")}
                    strokeLinecap="round" 
                  />
                </svg>
                <span className={cn("absolute text-4xl font-bold tabular-nums", getScoreColor(result.atsCompatibilityScore || 0, isDarkMode))}>{scoreAnimations.ats}</span>
              </div>
              <div className="flex-1">
                <p className={cn("text-sm leading-relaxed font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  {(result.atsCompatibilityScore || 0) >= 80 ? "✅ Your resume will pass through most ATS systems cleanly." : (result.atsCompatibilityScore || 0) >= 60 ? "⚙️ Minor ATS issues detected. Fix formatting for better parsing." : "🔧 Critical ATS issues. Restructure your resume."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personalized Advice Section */}
      {result.personalizedAdvice && (
        <div className={cn(
          "overflow-hidden rounded-2xl border backdrop-blur transition-all duration-700",
          isDarkMode
            ? "border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-indigo-500/10"
            : "border-purple-400 bg-gradient-to-br from-purple-100 to-indigo-100"
        )}>
          <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className={cn("h-6 w-6", isDarkMode ? "text-purple-400" : "text-purple-600")} />
              <h3 className={cn("text-2xl font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Personalized Advice for Your Resume</h3>
            </div>
            <div className="prose prose-invert max-w-none">
              <div className={cn("leading-relaxed space-y-4 whitespace-pre-line", isDarkMode ? "text-slate-200" : "text-slate-700")}>
                {result.personalizedAdvice}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Scores with Metrics */}
      <div>
        <h2 className={cn("mb-6 text-3xl font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Category Breakdown</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {(result.sections || []).map((section, idx) => {
            const Icon = iconMap[section.icon];
            const isVisible = visibleSections.has(idx);
            return (
              <div 
                key={section.name} 
                className={cn(
                  "rounded-2xl border backdrop-blur transition-all duration-700 p-6",
                  isDarkMode 
                    ? "border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-900/40 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10"
                    : "border-gray-300 bg-gradient-to-br from-gray-100 to-gray-50 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-200/10",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg border",
                      isDarkMode
                        ? "bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border-blue-500/20"
                        : "bg-gradient-to-br from-blue-300 to-cyan-300 border-blue-400"
                    )}>
                      <Icon className={cn("h-6 w-6", isDarkMode ? "text-blue-300" : "text-blue-700")} />
                    </div>
                    <span className={cn("font-bold text-lg", isDarkMode ? "text-slate-100" : "text-slate-900")}>{section.name}</span>
                  </div>
                  <span className={cn("text-3xl font-bold", getScoreColor(section.score, isDarkMode))}>{section.score}</span>
                </div>
                <Progress value={section.score} className="mb-4 h-2" />
                <p className={cn("mb-4 text-sm leading-relaxed font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>{section.feedback}</p>
                {section.metrics && (
                  <div className={cn("space-y-3 border-t pt-4", isDarkMode ? "border-slate-700/30" : "border-gray-300")}>
                    {section.metrics.map((metric) => (
                      <div key={metric.label} className="text-sm">
                        <div className="mb-2 flex justify-between">
                          <span className={cn("font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>{metric.label}</span>
                          <span className={cn("font-semibold", isDarkMode ? "text-blue-400" : "text-blue-600")}>{metric.score}/{metric.max}</span>
                        </div>
                        <Progress value={(metric.score / metric.max) * 100} className="mb-1" />
                        {metric.suggestion && <p className={cn("mt-1 text-xs italic", isDarkMode ? "text-slate-500" : "text-gray-500")}>{metric.suggestion}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className={cn(
        "rounded-2xl border p-6 backdrop-blur",
        isDarkMode
          ? "border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50"
          : "border-gray-300 bg-gradient-to-br from-gray-100 to-gray-50"
      )}>
        <h3 className={cn("mb-6 text-xl font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Key Metrics</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className={cn(
            "rounded-xl border p-4",
            isDarkMode
              ? "border-slate-700/50 bg-gradient-to-br from-blue-500/10 to-cyan-500/10"
              : "border-blue-300 bg-gradient-to-br from-blue-100 to-cyan-100"
          )}>
            <p className={cn("text-xs font-medium", isDarkMode ? "text-slate-400" : "text-slate-600")}>Word Count</p>
            <p className={cn("mt-2 text-2xl font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>450-500</p>
            <p className={cn("mt-1 text-xs", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>✓ Optimal</p>
          </div>
          <div className={cn(
            "rounded-xl border p-4",
            isDarkMode
              ? "border-slate-700/50 bg-gradient-to-br from-purple-500/10 to-pink-500/10"
              : "border-purple-300 bg-gradient-to-br from-purple-100 to-pink-100"
          )}>
            <p className={cn("text-xs font-medium", isDarkMode ? "text-slate-400" : "text-slate-600")}>Readability</p>
            <p className={cn("mt-2 text-2xl font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Grade 9</p>
            <p className={cn("mt-1 text-xs", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>✓ Excellent</p>
          </div>
          <div className={cn(
            "rounded-xl border p-4",
            isDarkMode
              ? "border-slate-700/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10"
              : "border-emerald-300 bg-gradient-to-br from-emerald-100 to-teal-100"
          )}>
            <p className={cn("text-xs font-medium", isDarkMode ? "text-slate-400" : "text-slate-600")}>Action Verbs</p>
            <p className={cn("mt-2 text-2xl font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>12</p>
            <p className={cn("mt-1 text-xs", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>✓ Strong</p>
          </div>
          <div className={cn(
            "rounded-xl border p-4",
            isDarkMode
              ? "border-slate-700/50 bg-gradient-to-br from-orange-500/10 to-amber-500/10"
              : "border-orange-300 bg-gradient-to-br from-orange-100 to-amber-100"
          )}>
            <p className={cn("text-xs font-medium", isDarkMode ? "text-slate-400" : "text-slate-600")}>Bullet Points</p>
            <p className={cn("mt-2 text-2xl font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>18</p>
            <p className={cn("mt-1 text-xs", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>✓ Good</p>
          </div>
        </div>
      </div>

      {/* Keyword Analysis */}
      {result.keywordMatches && result.keywordMatches.length > 0 && (
        <div className={cn(
          "rounded-2xl border p-6 backdrop-blur",
          isDarkMode
            ? "border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50"
            : "border-gray-300 bg-gradient-to-br from-gray-100 to-gray-50"
        )}>
          <h3 className={cn("mb-6 flex items-center gap-2 text-xl font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
            <Target className={cn("h-5 w-5", isDarkMode ? "text-blue-400" : "text-blue-600")} />
            Top Keywords Found
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.keywordMatches.slice(0, 12).map((keyword) => (
              <div key={keyword.keyword} className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border",
                keyword.relevance === "high"
                  ? isDarkMode ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-emerald-400 bg-emerald-100 text-emerald-700"
                  : keyword.relevance === "medium"
                  ? isDarkMode ? "border-blue-500/50 bg-blue-500/10 text-blue-300" : "border-blue-400 bg-blue-100 text-blue-700"
                  : isDarkMode ? "border-slate-600/50 bg-slate-700/30 text-slate-300" : "border-gray-400 bg-gray-200 text-gray-700"
              )}>
                {keyword.keyword} <span className="ml-1 opacity-60">×{keyword.frequency}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Improvements */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className={cn(
          "rounded-2xl border p-6 backdrop-blur",
          isDarkMode
            ? "border-slate-700/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10"
            : "border-emerald-300 bg-gradient-to-br from-emerald-100 to-teal-100"
        )}>
          <h3 className={cn("mb-4 flex items-center gap-2 text-lg font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
            <CheckCircle2 className={cn("h-5 w-5", isDarkMode ? "text-emerald-400" : "text-emerald-600")} />
            Strengths
          </h3>
          <div className="space-y-3">
            {(result.strengths || []).map((strength) => (
              <div key={strength} className={cn("flex items-start gap-3 text-sm", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", isDarkMode ? "text-emerald-400" : "text-emerald-600")} />
                {strength}
              </div>
            ))}
          </div>
        </div>

        <div className={cn(
          "rounded-2xl border p-6 backdrop-blur",
          isDarkMode
            ? "border-slate-700/50 bg-gradient-to-br from-orange-500/10 to-amber-500/10"
            : "border-orange-300 bg-gradient-to-br from-orange-100 to-amber-100"
        )}>
          <h3 className={cn("mb-4 flex items-center gap-2 text-lg font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
            <AlertCircle className={cn("h-5 w-5", isDarkMode ? "text-orange-400" : "text-orange-600")} />
            Areas to Improve
          </h3>
          <div className="space-y-3">
            {(result.improvements || []).map((improvement) => (
              <div key={improvement} className={cn("flex items-start gap-3 text-sm", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                <XCircle className={cn("mt-0.5 h-4 w-4 shrink-0", isDarkMode ? "text-orange-400" : "text-orange-600")} />
                {improvement}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prioritized Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className={cn(
          "rounded-2xl border p-6 backdrop-blur",
          isDarkMode
            ? "border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50"
            : "border-gray-300 bg-gradient-to-br from-gray-100 to-gray-50"
        )}>
          <h3 className={cn("mb-6 flex items-center gap-2 text-xl font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
            <Zap className={cn("h-5 w-5", isDarkMode ? "text-blue-400" : "text-blue-600")} />
            Action Items
          </h3>
          <div className="space-y-3">
            {result.recommendations.map((rec, idx) => (
              <div key={idx} className={cn(
                "flex gap-4 rounded-xl border p-4",
                isDarkMode
                  ? "border-slate-700/50 bg-slate-800/50"
                  : "border-gray-300 bg-gray-100"
              )}>
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  isDarkMode ? "bg-slate-700/50" : "bg-gray-200"
                )}>
                  <span className={cn("text-sm font-bold", 
                    rec.priority === "high" 
                      ? isDarkMode ? "text-orange-400" : "text-orange-600"
                      : rec.priority === "medium" 
                      ? isDarkMode ? "text-blue-400" : "text-blue-600"
                      : isDarkMode ? "text-slate-400" : "text-gray-600"
                  )}>
                    {rec.priority === "high" ? "!" : rec.priority === "medium" ? "~" : "•"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className={cn("font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>{rec.title}</p>
                  <p className={cn("mt-1 text-sm", isDarkMode ? "text-slate-400" : "text-slate-600")}>{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
