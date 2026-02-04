"use client";

import React from "react"

import { useState, useCallback, useEffect } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/theme";

interface ResumeUploadProps {
  onAnalyze: (file: File) => void;
  isAnalyzing: boolean;
  disabled?: boolean;
}

export function ResumeUpload({ onAnalyze, isAnalyzing, disabled = false }: ResumeUploadProps) {
  const { isDarkMode } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (
      droppedFile &&
      (droppedFile.type === "application/pdf" ||
        droppedFile.type.startsWith("image/"))
    ) {
      setFile(droppedFile);
      // Create preview URL for images
      if (droppedFile.type.startsWith("image/")) {
        const url = URL.createObjectURL(droppedFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        // Create preview URL for images
        if (selectedFile.type.startsWith("image/")) {
          const url = URL.createObjectURL(selectedFile);
          setPreviewUrl(url);
        } else {
          setPreviewUrl(null);
        }
      }
    },
    []
  );

  const removeFile = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  const handleAnalyze = useCallback(() => {
    if (file) {
      onAnalyze(file);
    }
  }, [file, onAnalyze]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300",
          disabled
            ? isDarkMode
              ? "border-slate-700/30 bg-slate-900/30 cursor-not-allowed opacity-50"
              : "border-gray-300 bg-gray-100 cursor-not-allowed opacity-50"
            : isDragging
            ? isDarkMode
              ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20"
              : "border-cyan-300 bg-cyan-100 shadow-lg shadow-cyan-300/20"
            : isDarkMode
              ? "border-slate-600/50 bg-slate-800/30 hover:border-blue-500/50 hover:bg-slate-800/50 hover:shadow-lg hover:shadow-blue-500/10"
              : "border-gray-300 bg-gray-50 hover:border-blue-400/50 hover:bg-blue-50 hover:shadow-lg hover:shadow-blue-400/10",
          file && isDarkMode && "border-blue-500/50 bg-blue-500/10",
          file && !isDarkMode && "border-blue-400/50 bg-blue-100"
        )}
      >
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileInput}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={isAnalyzing || disabled}
        />

        {file ? (
          <div className="flex items-center gap-4 px-4 w-full">
            {previewUrl ? (
              // Image preview
              <div className="relative w-full max-w-md mx-auto">
                <img
                  src={previewUrl}
                  alt="Resume preview"
                  className={cn(
                    "w-full h-auto max-h-[400px] object-contain rounded-lg border shadow-lg",
                    isDarkMode
                      ? "border-blue-500/20 shadow-blue-500/10"
                      : "border-blue-400/20 shadow-blue-400/10"
                  )}
                />
                <div className={cn(
                  "mt-4 flex items-center justify-between rounded-lg p-3 border",
                  isDarkMode
                    ? "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20"
                    : "bg-gradient-to-r from-blue-100 to-cyan-100 border-blue-300"
                )}>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                      {file.name}
                    </p>
                    <p className={cn("text-xs mt-1", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    className={cn("ml-3 rounded-full p-2 transition-colors", isDarkMode ? "hover:bg-red-500/20" : "hover:bg-red-200")}
                    disabled={isAnalyzing}
                  >
                    <X className={cn("h-5 w-5", isDarkMode ? "text-red-400" : "text-red-600")} />
                  </button>
                </div>
              </div>
            ) : (
              // PDF file info
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20">
                  <FileText className="h-7 w-7 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  className="rounded-full p-2 hover:bg-red-500/20 transition-colors"
                  disabled={isAnalyzing}
                >
                  <X className="h-5 w-5 text-red-400" />
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20">
              <Upload className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">
                Drop your resume here or click to browse
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Supports PDF and image files (JPG, PNG, etc.)
              </p>
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={handleAnalyze}
        disabled={!file || isAnalyzing || disabled}
        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-6 text-base rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:opacity-50 disabled:shadow-none"
        size="lg"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            Analyzing Resume...
          </>
        ) : disabled ? (
          <>
            <FileText className="mr-3 h-5 w-5" />
            Select a Job First
          </>
        ) : (
          <>
            <FileText className="mr-3 h-5 w-5" />
            Analyze Resume
          </>
        )}
      </Button>
    </div>
  );
}
