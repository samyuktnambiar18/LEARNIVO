import React from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { PdfUploader } from '../../components/upload/PdfUploader';

export const UploadPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#F7F5FA] mb-1">
            Upload Learning Material
          </h2>
          <p className="text-sm text-[#A6A1B2]">
            Upload a PDF document to let LEARNIVO analyze topics, extract structure, and power your learning experience.
          </p>
        </div>

        <PdfUploader />
      </div>
    </MainLayout>
  );
};
