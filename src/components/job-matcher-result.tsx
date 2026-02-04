import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useTheme } from '@/contexts/theme';
import { cn } from '@/lib/utils';

interface KeywordMatch {
  keyword: string;
  frequency: number;
  relevance: 'high' | 'medium' | 'low';
}

interface Recommendation {
  priority: 'high' | 'medium';
  title: string;
  description: string;
}

interface JobMatchResultProps {
  result: {
    matchPercentage: number;
    hirabilityScore: number;
    matchAnalysis: string;
    keywordMatches: KeywordMatch[];
    missingKeywords: string[];
    strengths: string[];
    improvements: string[];
    recommendations: Recommendation[];
  };
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-blue-400';
  return 'text-orange-500';
}

function getScoreBgColor(score: number) {
  if (score >= 80) return 'from-emerald-500/20 to-emerald-600/20';
  if (score >= 60) return 'from-blue-500/20 to-blue-600/20';
  return 'from-orange-500/20 to-orange-600/20';
}

export function AnalysisResult({ result }: JobMatchResultProps) {
  const { isDarkMode } = useTheme();
  const [scoreAnimations, setScoreAnimations] = useState({ match: 0, hireability: 0 });

  useEffect(() => {
    const matchInterval = setInterval(() => {
      setScoreAnimations((prev) => {
        if (prev.match >= result.matchPercentage) {
          clearInterval(matchInterval);
          return prev;
        }
        return { ...prev, match: Math.min(prev.match + 2, result.matchPercentage) };
      });
    }, 20);

    const hirabilityInterval = setInterval(() => {
      setScoreAnimations((prev) => {
        if (prev.hireability >= result.hirabilityScore) {
          clearInterval(hirabilityInterval);
          return prev;
        }
        return { ...prev, hireability: Math.min(prev.hireability + 2, result.hirabilityScore) };
      });
    }, 20);

    return () => {
      clearInterval(matchInterval);
      clearInterval(hirabilityInterval);
    };
  }, [result]);

  return (
    <div className="space-y-8">
      {/* Match Scores */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className={cn('overflow-hidden rounded-2xl border transition-all duration-700 backdrop-blur', getScoreBgColor(result.matchPercentage), isDarkMode ? 'border-blue-500/20' : 'border-blue-400/30')}>
          <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <Target className={cn("h-5 w-5", isDarkMode ? "text-blue-400" : "text-blue-600")} />
              <h3 className={cn("text-lg font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Job Match %</h3>
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
                    strokeDasharray={`${scoreAnimations.match * 4.02} 402`}
                    className={cn(getScoreColor(result.matchPercentage), "transition-all duration-300")}
                    strokeLinecap="round" 
                  />
                </svg>
                <span className={cn("absolute text-4xl font-bold tabular-nums", getScoreColor(result.matchPercentage))}>{scoreAnimations.match}%</span>
              </div>
              <div className="flex-1">
                <p className={cn("text-sm leading-relaxed font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  {result.matchPercentage >= 80 ? "✨ Excellent match! Your resume aligns well with this job." : result.matchPercentage >= 60 ? "👍 Good alignment. You meet most requirements." : "⚠️ Partial match. Consider improvements below."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={cn('overflow-hidden rounded-2xl border transition-all duration-700 backdrop-blur', getScoreBgColor(result.hirabilityScore), isDarkMode ? 'border-emerald-500/20' : 'border-emerald-400/30')}>
          <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className={cn("h-5 w-5", isDarkMode ? "text-emerald-400" : "text-emerald-600")} />
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
                    strokeDasharray={`${scoreAnimations.hireability * 4.02} 402`}
                    className={cn(getScoreColor(result.hirabilityScore), "transition-all duration-300")}
                    strokeLinecap="round" 
                  />
                </svg>
                <span className={cn("absolute text-4xl font-bold tabular-nums", getScoreColor(result.hirabilityScore))}>{scoreAnimations.hireability}</span>
              </div>
              <div className="flex-1">
                <p className={cn("text-sm leading-relaxed font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  {result.hirabilityScore >= 80 ? "🎯 Strong hire! You're competitive for this role." : result.hirabilityScore >= 60 ? "💼 Good prospect. You could succeed in this role." : "🤔 Possible fit but significant gaps to address."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Match Analysis */}
      {result.matchAnalysis && (
        <div className={cn(
          "overflow-hidden rounded-2xl border backdrop-blur transition-all duration-700",
          isDarkMode
            ? "border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-indigo-500/10"
            : "border-purple-300 bg-gradient-to-br from-purple-100 to-indigo-100"
        )}>
          <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle className={cn("h-6 w-6", isDarkMode ? "text-purple-400" : "text-purple-600")} />
              <h3 className={cn("text-2xl font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Match Analysis</h3>
            </div>
            <div className={cn("leading-relaxed space-y-4 whitespace-pre-line", isDarkMode ? "text-slate-200" : "text-slate-700")}>
              {result.matchAnalysis}
            </div>
          </div>
        </div>
      )}

      {/* Keywords & Missing Keywords */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Matched Keywords */}
        <div className={cn(
          "overflow-hidden rounded-2xl border p-6 backdrop-blur",
          isDarkMode
            ? "border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-900/40"
            : "border-gray-300 bg-gradient-to-br from-gray-100 to-gray-50"
        )}>
          <div className="mb-6 flex items-center gap-2">
            <CheckCircle2 className={cn("h-6 w-6", isDarkMode ? "text-emerald-400" : "text-emerald-600")} />
            <h3 className={cn("text-lg font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Matched Keywords ({result.keywordMatches.length})</h3>
          </div>
          <div className="space-y-3">
            {result.keywordMatches.map((match) => (
              <div key={match.keyword} className={cn(
                "flex items-center justify-between p-2 rounded-lg border",
                isDarkMode
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-emerald-100 border-emerald-300"
              )}>
                <span className={cn("font-medium", isDarkMode ? "text-slate-200" : "text-slate-800")}>{match.keyword}</span>
                <span className={cn('text-xs font-semibold px-2 py-1 rounded', 
                  match.relevance === 'high' ? isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-200 text-emerald-700' :
                  match.relevance === 'medium' ? isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-200 text-blue-700' :
                  isDarkMode ? 'bg-slate-500/20 text-slate-300' : 'bg-gray-300 text-gray-700'
                )}>
                  {match.relevance} ({match.frequency}x)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Missing Keywords */}
        <div className={cn(
          "overflow-hidden rounded-2xl border p-6 backdrop-blur",
          isDarkMode
            ? "border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-900/40"
            : "border-gray-300 bg-gradient-to-br from-gray-100 to-gray-50"
        )}>
          <div className="mb-6 flex items-center gap-2">
            <AlertCircle className={cn("h-6 w-6", isDarkMode ? "text-orange-400" : "text-orange-600")} />
            <h3 className={cn("text-lg font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Missing Keywords ({result.missingKeywords.length})</h3>
          </div>
          <div className="space-y-3">
            {result.missingKeywords.map((keyword) => (
              <div key={keyword} className={cn(
                "flex items-center gap-2 p-2 rounded-lg border",
                isDarkMode
                  ? "bg-orange-500/10 border-orange-500/20"
                  : "bg-orange-100 border-orange-300"
              )}>
                <span className={isDarkMode ? "text-orange-300" : "text-orange-600"}>→</span>
                <span className={cn("font-medium", isDarkMode ? "text-slate-200" : "text-slate-800")}>{keyword}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className={cn(
          "rounded-2xl border p-6 backdrop-blur",
          isDarkMode
            ? "border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-900/40"
            : "border-gray-300 bg-gradient-to-br from-gray-100 to-gray-50"
        )}>
          <div className="mb-6 flex items-center gap-2">
            <CheckCircle2 className={cn("h-6 w-6", isDarkMode ? "text-emerald-400" : "text-emerald-600")} />
            <h3 className={cn("text-lg font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Your Strengths</h3>
          </div>
          <div className="space-y-3">
            {result.strengths.map((strength, i) => (
              <div key={i} className={cn(
                "flex gap-3 p-3 rounded-lg border",
                isDarkMode
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-emerald-100 border-emerald-300"
              )}>
                <CheckCircle2 className={cn("h-5 w-5 flex-shrink-0 mt-0.5", isDarkMode ? "text-emerald-400" : "text-emerald-600")} />
                <p className={cn("text-sm", isDarkMode ? "text-slate-200" : "text-slate-800")}>{strength}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={cn(
          "rounded-2xl border p-6 backdrop-blur",
          isDarkMode
            ? "border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-900/40"
            : "border-gray-300 bg-gradient-to-br from-gray-100 to-gray-50"
        )}>
          <div className="mb-6 flex items-center gap-2">
            <AlertCircle className={cn("h-6 w-6", isDarkMode ? "text-orange-400" : "text-orange-600")} />
            <h3 className={cn("text-lg font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Areas to Improve</h3>
          </div>
          <div className="space-y-3">
            {result.improvements.map((improvement, i) => (
              <div key={i} className={cn(
                "flex gap-3 p-3 rounded-lg border",
                isDarkMode
                  ? "bg-orange-500/10 border-orange-500/20"
                  : "bg-orange-100 border-orange-300"
              )}>
                <AlertCircle className={cn("h-5 w-5 flex-shrink-0 mt-0.5", isDarkMode ? "text-orange-400" : "text-orange-600")} />
                <p className={cn("text-sm", isDarkMode ? "text-slate-200" : "text-slate-800")}>{improvement}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className={cn(
          "rounded-2xl border p-6 backdrop-blur",
          isDarkMode
            ? "border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-900/40"
            : "border-gray-300 bg-gradient-to-br from-gray-100 to-gray-50"
        )}>
          <h3 className={cn("mb-6 text-2xl font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>Recommendations</h3>
          <div className="space-y-4">
            {result.recommendations.map((rec, i) => (
              <div key={i} className={cn('rounded-xl border p-4',
                rec.priority === 'high'
                  ? isDarkMode
                    ? 'border-red-500/20 bg-red-500/10'
                    : 'border-red-400 bg-red-100'
                  : isDarkMode
                  ? 'border-blue-500/20 bg-blue-500/10'
                  : 'border-blue-400 bg-blue-100'
              )}>
                <div className="flex items-start gap-3">
                  <span className={cn('px-2 py-1 rounded text-xs font-bold',
                    rec.priority === 'high'
                      ? isDarkMode
                        ? 'bg-red-600 text-white'
                        : 'bg-red-600 text-white'
                      : isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-600 text-white'
                  )}>
                    {rec.priority.toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <h4 className={cn("font-semibold mb-1", isDarkMode ? "text-slate-100" : "text-slate-900")}>{rec.title}</h4>
                    <p className={cn("text-sm", isDarkMode ? "text-slate-300" : "text-slate-700")}>{rec.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
