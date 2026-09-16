import React, { useState, useEffect } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { storageService } from '../../services/storage/storageService';
import { adaptiveLearningService } from '../../services/api/adaptiveLearningService';
import { Question, LearningMaterial } from '../../types';
import { QuestionCard } from '../../components/practice/QuestionCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { BrainCircuit } from 'lucide-react';


export const PracticePage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);

  useEffect(() => {
    const loaded = storageService.getMaterials();
    setMaterials(loaded);

    if (loaded.length > 0) {
      // Dynamically generate practice questions based on uploaded material topics
      const generated: Question[] = [];
      loaded.forEach((mat, mIdx) => {
        mat.topics.forEach((top, tIdx) => {
          generated.push({
            id: `q_${mIdx}_${tIdx}_1`,
            materialId: mat.id,
            topic: top.name,
            difficulty: top.difficulty || 'Medium',
            questionText: `Which fundamental principle governs problem solving in ${top.name}?`,
            options: [
              `Systematic decomposition and formal verification of ${top.name}`,
              `Heuristic approximation without boundary constraints`,
              `Arbitrary numerical substitution`,
              `Ignoring initial edge conditions`
            ],
            correctAnswer: `Systematic decomposition and formal verification of ${top.name}`,
            explanation: `In ${top.name}, systematic decomposition ensures all boundary conditions and initial parameters are properly satisfied.`,
            hint: `Focus on formal verification and boundary conditions.`
          });
          generated.push({
            id: `q_${mIdx}_${tIdx}_2`,
            materialId: mat.id,
            topic: top.name,
            difficulty: 'Hard',
            questionText: `When analyzing performance bounds for ${top.name}, what is the primary consideration?`,
            options: [
              `Worst-case algorithmic time/space complexity analysis`,
              `Single test-case execution speed`,
              `Hardware clock speed exclusively`,
              `Visual representation density`
            ],
            correctAnswer: `Worst-case algorithmic time/space complexity analysis`,
            explanation: `Performance bounds are fundamentally derived from asymptotic upper bounds (Big-O notation) in asymptotic analysis.`,
            hint: `Consider asymptotic bounds in computer science.`
          });
        });
      });
      setQuestions(generated);
    }
  }, []);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleAttempt = (isCorrect: boolean, userAnswer: string, timeSpentSeconds: number) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const newAttempt = {
      id: 'att_' + Date.now(),
      questionId: currentQ.id,
      topic: currentQ.topic,
      difficulty: currentQ.difficulty,
      userAnswer,
      isCorrect,
      timestamp: new Date().toISOString(),
      timeSpentSeconds
    };

    storageService.savePracticeAttempt(newAttempt);
    const allAttempts = storageService.getPracticeAttempts();
    adaptiveLearningService.evaluateActivity(allAttempts).catch((err: any) => {
      console.warn('Adaptive learning evaluation warning:', err);
    });

  };


  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#F7F5FA] mb-1">
            Interactive Practice Engine
          </h2>
          <p className="text-xs text-[#A6A1B2]">
            Targeted problem solving generated directly from your active learning materials.
          </p>
        </div>

        {questions.length === 0 ? (
          <EmptyState
            icon={BrainCircuit}
            title="No practice questions available yet"
            description="Upload a PDF learning material to automatically generate contextual practice sets."
            actionLabel="Upload PDF Material"
            onAction={() => window.location.href = '/upload'}
          />
        ) : (
          <QuestionCard
            question={questions[currentIndex]}
            onNext={handleNext}
            onAttempt={handleAttempt}
          />
        )}
      </div>
    </MainLayout>
  );
};
