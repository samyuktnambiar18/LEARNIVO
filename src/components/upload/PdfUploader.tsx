import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, RefreshCw, Loader2 } from 'lucide-react';
import { pdfService } from '../../services/api/pdfService';
import { storageService } from '../../services/storage/storageService';
import { LearningMaterial } from '../../types';
import { Button } from '../ui/Button';

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

  return (
    <div className="surface-card p-8 max-w-2xl mx-auto border border-white/10 rounded-xl">
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
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center mx-auto mb-4 text-[#C7FF4A]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#F7F5FA] mb-1">Processing Complete</h3>
          <p className="text-sm text-[#A6A1B2] mb-6">
            Document "{processedMaterial.title}" is ready for learning.
          </p>

          <div className="bg-[#181620] p-4 rounded-lg text-left border border-white/10 mb-6 max-h-48 overflow-y-auto">
            <h4 className="text-xs font-semibold text-[#C7FF4A] uppercase tracking-wider mb-2">
              Detected Topics ({processedMaterial.topics.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {processedMaterial.topics.map(t => (
                <span key={t.id} className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs text-[#F7F5FA]">
                  {t.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={handleReset}>
              Upload Another PDF
            </Button>
            <Button
              variant="primary"
              onClick={() => window.location.href = '/pages/student-dashboard.html'}
            >
              Go to Workspace
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
