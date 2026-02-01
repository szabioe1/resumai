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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface AnalysisResultProps {
  result: {
    overallScore: number;
    sections: {
      name: string;
      score: number;
      feedback: string;
      icon: "format" | "content" | "keywords" | "impact";
    }[];
    strengths: string[];
    improvements: string[];
  };
}

const iconMap = {
  format: FileText,
  content: BookOpen,
  keywords: Target,
  impact: TrendingUp,
};

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function getProgressColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export function AnalysisResult({ result }: AnalysisResultProps) {
  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card className="overflow-hidden border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-foreground">
            Overall Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative flex h-28 w-28 items-center justify-center">
              <svg className="h-28 w-28 -rotate-90 transform">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${result.overallScore * 3.02} 302`}
                  className={getScoreColor(result.overallScore)}
                  strokeLinecap="round"
                />
              </svg>
              <span
                className={cn(
                  "absolute text-3xl font-bold",
                  getScoreColor(result.overallScore)
                )}
              >
                {result.overallScore}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                {result.overallScore >= 80
                  ? "Excellent! Your resume is well-optimized and ready for applications."
                  : result.overallScore >= 60
                    ? "Good progress! A few improvements could make your resume stand out more."
                    : "Your resume needs some work. Follow our suggestions to improve your chances."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Scores */}
      <div className="grid gap-4 md:grid-cols-2">
        {result.sections.map((section) => {
          const Icon = iconMap[section.icon];
          return (
            <Card key={section.name} className="border-border bg-card">
              <CardContent className="pt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">
                      {section.name}
                    </span>
                  </div>
                  <span
                    className={cn("text-lg font-bold", getScoreColor(section.score))}
                  >
                    {section.score}
                  </span>
                </div>
                <Progress
                  value={section.score}
                  className="mb-3 h-2 bg-muted"
                  style={
                    {
                      "--progress-background": getProgressColor(section.score),
                    } as React.CSSProperties
                  }
                />
                <p className="text-xs text-muted-foreground">{section.feedback}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Strengths & Improvements */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.strengths.map((strength) => (
              <div
                key={strength}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                {strength}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.improvements.map((improvement) => (
              <div
                key={improvement}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                {improvement}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
