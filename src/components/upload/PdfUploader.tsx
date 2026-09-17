import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, AlertCircle, X, RefreshCw, Loader2, MessageSquareCode, BrainCircuit } from 'lucide-react';
import { pdfService } from '../../services/api/pdfService';
import { youtubeScraperService } from '../../services/api/youtubeScraperService';
import { storageService } from '../../services/storage/storageService';
import { LearningMaterial } from '../../types';
import { Button } from '../ui/Button';
import { VideoRecommendations } from '../learning/VideoRecommendations';

interface PdfUploaderProps {
  onSuccess?: (material: LearningMaterial) => void;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processedMaterial, setProcessedMaterial] = useState<LearningMaterial | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelectFile = (selectedFile: File) => {
    setErrorMessage(null);
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Invalid file format. Please upload a PDF file (application/pdf).');
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds maximum limit of 25MB.');
      return;
    }
    setFile(selectedFile);
    setStatus('idle');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setErrorMessage(null);

    try {
      // Transition to processing state
      setTimeout(() => setStatus('processing'), 800);

      const result = await pdfService.uploadPdf(file);
      
      // Wait briefly for SNS Agent Workbench to complete Supabase database insertion
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Fetch the newly stored syllabus & 5 topics from Supabase courses table
      const latestData = await youtubeScraperService.getLatestSyllabusAndMaterials();

      if (latestData && latestData.selected5Topics.length > 0) {
        result.topics = latestData.selected5Topics.map((name, i) => ({
          id: `top_${i}_${Date.now()}`,
          name,
          difficulty: 'Medium'
        }));
        if (latestData.subjectTitle) {
          result.title = latestData.subjectTitle;
        }
      }

      // Save material to persistent local storage
      storageService.saveMaterial(result);
      
      setProcessedMaterial(result);
      setStatus('ready');

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error: any) {
      console.error('PDF Processing Error:', error);
      setStatus('error');
      setErrorMessage(error?.message || 'Failed to upload and process PDF file. Please try again.');
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus('idle');
    setErrorMessage(null);
    setProcessedMaterial(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const mainTopic = processedMaterial?.topics[0]?.name || processedMaterial?.title || '';

  return (
    <div className="surface-card p-8 max-w-3xl mx-auto border border-white/10 rounded-xl">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            validateAndSelectFile(e.target.files[0]);
          }
        }}
      />

      {status === 'ready' && processedMaterial ? (
        <div className="space-y-6">
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center mx-auto mb-3 text-[#C7FF4A]">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-[#F7F5FA] mb-1">Document Processed & Concepts Extracted</h3>
            <p className="text-xs text-[#A6A1B2]">
              "{processedMaterial.title}" is ready. Topics identified and YouTube learning resources matched.
            </p>
          </div>

          <div className="bg-[#181620] p-4 rounded-lg text-left border border-white/10">
            <h4 className="text-xs font-semibold text-[#C7FF4A] uppercase tracking-wider mb-2">
              Extracted Topics ({processedMaterial.topics.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {processedMaterial.topics.map(t => (
                <span key={t.id} className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs text-[#F7F5FA]">
                  {t.name}
                </span>
              ))}
            </div>
          </div>

          {/* Related YouTube Videos Component */}
          {mainTopic && (
            <div className="mt-4">
              <VideoRecommendations topic={mainTopic} />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/ai-tutor">
              <Button variant="primary" size="sm">
                <MessageSquareCode className="w-4 h-4 mr-1.5" />
                Ask AI Tutor
              </Button>
            </Link>
            <Link to="/practice">
              <Button variant="secondary" size="sm">
                <BrainCircuit className="w-4 h-4 mr-1.5" />
                Practice Questions
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Upload Another PDF
            </Button>
          </div>
        </div>
      ) : (

        <div>
          {/* Dropzone */}
          {!file && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-[#C7FF4A] bg-[#C7FF4A]/5'
                  : 'border-white/15 hover:border-white/30 bg-[#181620]/50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-[#C7FF4A]">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-[#F7F5FA] mb-1">
                Click to browse or drag and drop your PDF
              </p>
              <p className="text-xs text-[#A6A1B2]">
                Supports application/pdf up to 25MB
              </p>
            </div>
          )}

          {/* Selected File Details */}
          {file && status !== 'ready' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#181620] border border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-[#F7F5FA] truncate">{file.name}</p>
                    <p className="text-xs text-[#A6A1B2]">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {status === 'idle' && (
                  <button
                    onClick={handleReset}
                    className="p-1 text-[#A6A1B2] hover:text-rose-400 transition-colors"
                    title="Remove file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Status Indicator */}
              {(status === 'uploading' || status === 'processing') && (
                <div className="p-4 rounded-lg bg-[#181620] border border-white/10 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#C7FF4A] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[#F7F5FA] capitalize">
                    {status === 'uploading' ? 'Uploading PDF file...' : 'Analyzing & processing document structure...'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3">
                {status === 'idle' && (
                  <>
                    <Button variant="ghost" onClick={handleReset}>
                      Replace File
                    </Button>
                    <Button variant="primary" onClick={handleUpload}>
                      Start Upload & Processing
                    </Button>
                  </>
                )}
                {status === 'error' && (
                  <Button variant="primary" onClick={handleUpload}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Upload
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Error Message Display */}
          {errorMessage && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
