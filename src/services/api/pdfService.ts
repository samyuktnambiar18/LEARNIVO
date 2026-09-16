import { parsePdfResponse } from '../../utils/adapters';
import { extractTextFromPdfFile } from '../../utils/pdfExtractor';
import { LearningMaterial } from '../../types';

const PDF_WEBHOOK_URL = import.meta.env.VITE_PDF_WEBHOOK_URL || 'https://api.agents.snsihub.ai/webhook/d519ae83-ca78-4432-906a-728a293e202f';

export const pdfService = {
  uploadPdf: async (file: File): Promise<LearningMaterial> => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      throw new Error('Only valid PDF files (application/pdf) are supported.');
    }

    // Step 1: Client-side extraction for high resilience & instant topic parsing fallback
    const extractedData = await extractTextFromPdfFile(file);

    // Step 2: Prepare FormData with binary file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.name);
    formData.append('extractedText', extractedData.text);

    try {
      const response = await fetch(PDF_WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        console.warn(`PDF webhook returned status ${response.status}. Using extracted PDF model.`);
        // Return normalized model built from extracted content if server returns non-200
        return buildFallbackMaterial(file, extractedData);
      }

      const contentType = response.headers.get('content-type');
      let rawData: any;

      if (contentType && contentType.includes('application/json')) {
        rawData = await response.json();
      } else {
        const text = await response.text();
        rawData = { text, title: file.name.replace(/\.pdf$/i, '') };
      }

      const normalized = parsePdfResponse(rawData, file.name, file.size);
      if (!normalized.rawText || normalized.rawText.length === 0) {
        normalized.rawText = extractedData.text;
      }
      return normalized;

    } catch (error) {
      console.warn('PDF Webhook fetch failed, using client-side PDF parser model:', error);
      return buildFallbackMaterial(file, extractedData);
    }
  }
};

function buildFallbackMaterial(file: File, extracted: { text: string; pageCount: number }): LearningMaterial {
  const text = extracted.text;
  const fileNameClean = file.name.replace(/\.pdf$/i, '');
  
  // Extract potential topics from text
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const detectedTopics: string[] = [];
  
  // Auto detect topics from headings / capital phrases
  lines.forEach(line => {
    if (line.length < 50 && line.length > 4 && /^[A-Z0-9\s:-]+$/.test(line) && detectedTopics.length < 6) {
      if (!detectedTopics.includes(line)) detectedTopics.push(line);
    }
  });

  if (detectedTopics.length === 0) {
    detectedTopics.push('Core Concepts', 'Practice Topics', 'Key Formulas & Analysis');
  }

  return {
    id: 'mat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    fileName: file.name,
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
    title: fileNameClean,
    rawText: text,
    status: 'ready',
    topics: detectedTopics.map((t, i) => ({
      id: `top_${i}_${Date.now()}`,
      name: t,
      difficulty: i % 2 === 0 ? 'Medium' : 'Hard'
    })),
    chapters: [
      {
        id: `chap_1_${Date.now()}`,
        title: 'Document Overview',
        summary: `Parsed ${extracted.pageCount} pages of learning material.`,
        topics: detectedTopics
      }
    ]
  };
}
