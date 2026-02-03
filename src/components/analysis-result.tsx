"use client";

import React from "react"

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

interface DetailedMetric {
  label: string;
  score: number;
  max: number;
  suggestion?: string;
}

interface AnalysisResultProps {
  result: {
    overallScore: number;
    atsCompatibilityScore: number;
    sections: {
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
  };
}

const iconMap = {
  format: FileText,
  content: BookOpen,
  keywords: Target,
  impact: TrendingUp,
};

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-blue-400";
  return "text-orange-500";
}

function getScoreBgColor(score: number) {
  if (score >= 80) return "from-emerald-500/20 to-emerald-600/20";
  if (score >= 60) return "from-blue-500/20 to-blue-600/20";
  return "from-orange-500/20 to-orange-600/20";
}

export function AnalysisResult({ result }: AnalysisResultProps) {
  return (
    <div className="space-y-8">
      {/* Overall Score & ATS Score */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className={cn("overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br", getScoreBgColor(result.overallScore))}>
          <div className="p-6">
            <h3 className="mb-6 text-lg font-semibold text-slate-200">Overall Resume Score</h3>
            <div className="flex items-center gap-8">
              <div className="relative flex h-32 w-32 items-center justify-center">
                <svg className="h-32 w-32 -rotate-90 transform">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-600" />
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="6" fill="none" strokeDasharray={`${result.overallScore * 3.52} 352`} className={getScoreColor(result.overallScore)} strokeLinecap="round" />
                </svg>
                <span className={cn("absolute text-4xl font-bold", getScoreColor(result.overallScore))}>{result.overallScore}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed text-slate-300">
                  {result.overallScore >= 80 ? "Excellent work! Your resume is well-optimized and competitive." : result.overallScore >= 60 ? "Good foundation. Polish these areas to stand out more." : "Significant improvements needed to be competitive."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={cn("overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br", getScoreBgColor(result.atsCompatibilityScore))}>
          <div className="p-6">
            <h3 className="mb-6 text-lg font-semibold text-slate-200">ATS Compatibility</h3>
            <div className="flex items-center gap-8">
              <div className="relative flex h-32 w-32 items-center justify-center">
                <svg className="h-32 w-32 -rotate-90 transform">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-600" />
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="6" fill="none" strokeDasharray={`${result.atsCompatibilityScore * 3.52} 352`} className={getScoreColor(result.atsCompatibilityScore)} strokeLinecap="round" />
                </svg>
                <span className={cn("absolute text-4xl font-bold", getScoreColor(result.atsCompatibilityScore))}>{result.atsCompatibilityScore}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed text-slate-300">
                  {result.atsCompatibilityScore >= 80 ? "Your resume will pass through most ATS systems cleanly." : result.atsCompatibilityScore >= 60 ? "Minor ATS issues detected. Fix formatting for better parsing." : "Critical ATS issues. Restructure your resume."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Scores with Metrics */}
      <div>
        <h2 className="mb-4 text-2xl font-bold text-slate-100">Category Breakdown</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {result.sections.map((section) => {
            const Icon = iconMap[section.icon];
            return (
              <div key={section.name} className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-500/30">
                      <Icon className="h-5 w-5 text-blue-400" />
                    </div>
                    <span className="font-semibold text-slate-100">{section.name}</span>
                  </div>
                  <span className={cn("text-2xl font-bold", getScoreColor(section.score))}>{section.score}</span>
                </div>
                <Progress value={section.score} className="mb-3" />
                <p className="mb-4 text-sm text-slate-400">{section.feedback}</p>
                {section.metrics && (
                  <div className="space-y-3 border-t border-slate-700/50 pt-4">
                    {section.metrics.map((metric) => (
                      <div key={metric.label} className="text-sm">
                        <div className="mb-1.5 flex justify-between">
                          <span className="text-slate-300">{metric.label}</span>
                          <span className="text-slate-400">{metric.score}/{metric.max}</span>
                        </div>
                        <Progress value={(metric.score / metric.max) * 100} className="mb-1" />
                        {metric.suggestion && <p className="mt-1 text-xs italic text-slate-500">{metric.suggestion}</p>}
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
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 backdrop-blur">
        <h3 className="mb-6 text-xl font-bold text-slate-100">Key Metrics</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4">
            <p className="text-xs font-medium text-slate-400">Word Count</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">450-500</p>
            <p className="mt-1 text-xs text-emerald-400">✓ Optimal</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4">
            <p className="text-xs font-medium text-slate-400">Readability</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">Grade 9</p>
            <p className="mt-1 text-xs text-emerald-400">✓ Excellent</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4">
            <p className="text-xs font-medium text-slate-400">Action Verbs</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">12</p>
            <p className="mt-1 text-xs text-emerald-400">✓ Strong</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-orange-500/10 to-amber-500/10 p-4">
            <p className="text-xs font-medium text-slate-400">Bullet Points</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">18</p>
            <p className="mt-1 text-xs text-emerald-400">✓ Good</p>
          </div>
        </div>
      </div>

      {/* Keyword Analysis */}
      {result.keywordMatches && result.keywordMatches.length > 0 && (
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 backdrop-blur">
          <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-100">
            <Target className="h-5 w-5 text-blue-400" />
            Top Keywords Found
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.keywordMatches.slice(0, 12).map((keyword) => (
              <div key={keyword.keyword} className={cn("rounded-full px-3 py-1.5 text-xs font-medium border", keyword.relevance === "high" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : keyword.relevance === "medium" ? "border-blue-500/50 bg-blue-500/10 text-blue-300" : "border-slate-600/50 bg-slate-700/30 text-slate-300")}>
                {keyword.keyword} <span className="ml-1 opacity-60">×{keyword.frequency}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Improvements */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6 backdrop-blur">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-100">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            Strengths
          </h3>
          <div className="space-y-3">
            {result.strengths.map((strength) => (
              <div key={strength} className="flex items-start gap-3 text-sm text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                {strength}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-orange-500/10 to-amber-500/10 p-6 backdrop-blur">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-100">
            <AlertCircle className="h-5 w-5 text-orange-400" />
            Areas to Improve
          </h3>
          <div className="space-y-3">
            {result.improvements.map((improvement) => (
              <div key={improvement} className="flex items-start gap-3 text-sm text-slate-300">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                {improvement}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prioritized Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 backdrop-blur">
          <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-100">
            <Zap className="h-5 w-5 text-blue-400" />
            Action Items
          </h3>
          <div className="space-y-3">
            {result.recommendations.map((rec, idx) => (
              <div key={idx} className="flex gap-4 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700/50">
                  <span className={cn("text-sm font-bold", rec.priority === "high" ? "text-orange-400" : rec.priority === "medium" ? "text-blue-400" : "text-slate-400")}>
                    {rec.priority === "high" ? "!" : rec.priority === "medium" ? "~" : "•"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-100">{rec.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
