import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Trash2, FileText, Upload, Sparkles } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { storageService } from '../../services/storage/storageService';
import { LearningMaterial } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const MaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);

  useEffect(() => {
    setMaterials(storageService.getMaterials());
  }, []);

  const handleDelete = (id: string) => {
    storageService.deleteMaterial(id);
    setMaterials(storageService.getMaterials());
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#F7F5FA] mb-1">
              Learning Materials Repository
            </h2>
            <p className="text-xs text-[#A6A1B2]">
              All processed PDF documents, extracted topics, and chapter outlines.
            </p>
          </div>

          <Link to="/upload">
            <Button variant="primary" size="sm">
              <Upload className="w-4 h-4 mr-1.5" />
              Upload PDF
            </Button>
          </Link>
        </div>

        {materials.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No learning material yet"
            description="Upload a PDF document to begin your intelligent learning experience."
            actionLabel="Upload Material"
            onAction={() => window.location.href = '/upload'}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map((mat) => (
              <div key={mat.id} className="surface-card p-6 border border-white/10 rounded-xl space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#F7F5FA]">{mat.title}</h3>
                      <p className="text-xs text-[#A6A1B2]">
                        {(mat.fileSize / (1024 * 1024)).toFixed(2)} MB • Uploaded {new Date(mat.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(mat.id)}
                    className="p-1.5 text-[#A6A1B2] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-[#C7FF4A] uppercase tracking-wider mb-2">
                    Extracted Topics ({mat.topics.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {mat.topics.map(t => (
                      <Badge key={t.id} variant="neutral">
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3 border-t border-white/10">
                  <Link to="/pages/chat.html">
                    <Button variant="outline" size="sm">
                      Study with AI
                    </Button>
                  </Link>
                  <Link to="/pages/practice.html">
                    <Button variant="ghost" size="sm">
                      Practice Problems
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};
