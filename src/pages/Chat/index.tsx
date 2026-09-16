import React, { useState, useEffect } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { AiTutorChat } from '../../components/chat/AiTutorChat';
import { storageService } from '../../services/storage/storageService';
import { LearningMaterial } from '../../types';

export const ChatPage: React.FC = () => {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<LearningMaterial | null>(null);

  useEffect(() => {
    const loaded = storageService.getMaterials();
    setMaterials(loaded);
    if (loaded.length > 0) {
      setSelectedMaterial(loaded[0]);
    }
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#F7F5FA] mb-1">
              AI Tutor Workspace
            </h2>
            <p className="text-xs text-[#A6A1B2]">
              Context-aware tutoring for mathematical reasoning, proofs, algorithms, and uploaded materials.
            </p>
          </div>

          {materials.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A6A1B2]">Active Material:</span>
              <select
                value={selectedMaterial?.id || ''}
                onChange={(e) => {
                  const found = materials.find(m => m.id === e.target.value);
                  setSelectedMaterial(found || null);
                }}
                className="bg-[#181620] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F7F5FA] focus:outline-none focus:border-[#C7FF4A]"
              >
                {materials.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <AiTutorChat selectedMaterial={selectedMaterial} />
      </div>
    </MainLayout>
  );
};
