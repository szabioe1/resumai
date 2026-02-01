"use client";

import React from "react"

import { useState, useCallback } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ResumeUploadProps {
  onAnalyze: (file: File) => void;
  isAnalyzing: boolean;
}

export function ResumeUpload({ onAnalyze, isAnalyzing }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (
      droppedFile &&
      (droppedFile.type === "application/pdf" ||
        droppedFile.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ) {
      setFile(droppedFile);
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
      }
    },
    []
  );

  const removeFile = useCallback(() => {
    setFile(null);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (file) {
      onAnalyze(file);
    }
  }, [file, onAnalyze]);

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50 hover:bg-card/80",
          file && "border-primary/30 bg-primary/5"
        )}
      >
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileInput}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={isAnalyzing}
        />

        {file ? (
          <div className="flex items-center gap-3 px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
              className="rounded-full p-1 hover:bg-muted"
              disabled={isAnalyzing}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Drop your resume here or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports PDF and DOCX files
              </p>
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={handleAnalyze}
        disabled={!file || isAnalyzing}
        className="w-full"
        size="lg"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing Resume...
          </>
        ) : (
          <>
            <FileText className="mr-2 h-4 w-4" />
            Analyze Resume
          </>
        )}
      </Button>
    </div>
  );
}
