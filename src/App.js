import React, { useState } from 'react';
import { Sidebar } from './components/sidebar';
import { ResumeUpload } from './components/resume-ipload';
import { AnalysisResult } from './components/analysis-result';
import './App.css';

function App() {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async (file) => {
    setIsAnalyzing(true);
    
    // Simulate API call for analysis
    setTimeout(() => {
      const mockResult = {
        overallScore: 75,
        sections: [
          {
            name: 'Format & Structure',
            score: 85,
            feedback: 'Well-organized with clear sections',
            icon: 'format'
          },
          {
            name: 'Content Quality',
            score: 70,
            feedback: 'Good content, could use more specific achievements',
            icon: 'content'
          },
          {
            name: 'Keywords',
            score: 65,
            feedback: 'Missing some industry-specific keywords',
            icon: 'keywords'
          },
          {
            name: 'Impact',
            score: 80,
            feedback: 'Strong action verbs and quantifiable results',
            icon: 'impact'
          }
        ],
        strengths: [
          'Clear and concise formatting',
          'Strong action verbs used throughout',
          'Quantifiable achievements included'
        ],
        improvements: [
          'Add more industry-specific keywords',
          'Include more metrics and numbers',
          'Expand on leadership experiences'
        ]
      };
      
      setAnalysisResult(mockResult);
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="dark flex h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-auto ml-64">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              Resume AI Analyzer
            </h1>
            <p className="text-gray-400">
              Upload your resume and get instant AI-powered insights
            </p>
          </div>
          
          <ResumeUpload 
            onAnalyze={handleAnalyze} 
            isAnalyzing={isAnalyzing}
          />
          
          {analysisResult && (
            <div className="mt-8">
              <AnalysisResult result={analysisResult} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
