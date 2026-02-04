import React from 'react';
import { cn } from '@/lib/utils';

export function AnalysisSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Score Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
            <div className="p-6">
              <div className="mb-6 h-5 w-40 rounded bg-slate-700/50"></div>
              <div className="flex items-center gap-8">
                <div className="relative flex h-32 w-32 items-center justify-center">
                  <svg className="h-32 w-32 -rotate-90 transform">
                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-700/50" />
                  </svg>
                  <div className="absolute h-10 w-16 rounded bg-slate-700/50"></div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full rounded bg-slate-700/50"></div>
                  <div className="h-4 w-4/5 rounded bg-slate-700/50"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Personalized Advice Skeleton */}
      <div className="overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
        <div className="p-8">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-slate-700/50"></div>
            <div className="h-7 w-64 rounded bg-slate-700/50"></div>
          </div>
          <div className="space-y-4">
            <div className="h-4 w-full rounded bg-slate-700/50"></div>
            <div className="h-4 w-full rounded bg-slate-700/50"></div>
            <div className="h-4 w-11/12 rounded bg-slate-700/50"></div>
            <div className="h-4 w-full rounded bg-slate-700/50"></div>
            <div className="h-4 w-10/12 rounded bg-slate-700/50"></div>
            <div className="mt-6 h-4 w-full rounded bg-slate-700/50"></div>
            <div className="h-4 w-full rounded bg-slate-700/50"></div>
            <div className="h-4 w-9/12 rounded bg-slate-700/50"></div>
            <div className="mt-6 h-4 w-full rounded bg-slate-700/50"></div>
            <div className="h-4 w-full rounded bg-slate-700/50"></div>
            <div className="h-4 w-10/12 rounded bg-slate-700/50"></div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Skeleton */}
      <div>
        <div className="mb-4 h-8 w-48 rounded bg-slate-700/50"></div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-700/50"></div>
                  <div className="h-5 w-32 rounded bg-slate-700/50"></div>
                </div>
                <div className="h-8 w-12 rounded bg-slate-700/50"></div>
              </div>
              <div className="mb-3 h-2 w-full rounded-full bg-slate-700/50"></div>
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-slate-700/50"></div>
                <div className="h-4 w-4/5 rounded bg-slate-700/50"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics Skeleton */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6">
        <div className="mb-6 h-6 w-32 rounded bg-slate-700/50"></div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
              <div className="h-3 w-20 rounded bg-slate-700/50"></div>
              <div className="mt-2 h-8 w-24 rounded bg-slate-700/50"></div>
              <div className="mt-1 h-3 w-16 rounded bg-slate-700/50"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Improvements Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-slate-700/50"></div>
              <div className="h-5 w-24 rounded bg-slate-700/50"></div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex items-start gap-3">
                  <div className="mt-0.5 h-4 w-4 shrink-0 rounded bg-slate-700/50"></div>
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-full rounded bg-slate-700/50"></div>
                    {j % 2 === 0 && <div className="h-4 w-3/4 rounded bg-slate-700/50"></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action Items Skeleton */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-slate-700/50"></div>
          <div className="h-6 w-32 rounded bg-slate-700/50"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-700/50"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 rounded bg-slate-700/50"></div>
                <div className="h-4 w-full rounded bg-slate-700/50"></div>
                <div className="h-4 w-4/5 rounded bg-slate-700/50"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
