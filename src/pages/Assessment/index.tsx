import React, { useState, useEffect } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { AssessmentEngine } from '../../components/practice/AssessmentEngine';
import { storageService } from '../../services/storage/storageService';
import { Question } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';
import { FileCheck2 } from 'lucide-react';

export const AssessmentPage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const materials = storageService.getMaterials();
    const defaultAssessmentQuestions: Question[] = [
      {
        id: 'eval_q1',
        topic: 'Linear Algebra',
        difficulty: 'Medium',
        questionText: 'Given an n × n matrix A, what condition guarantees that A is invertible?',
        options: [
          'The determinant det(A) ≠ 0',
          'The determinant det(A) = 0',
          'All diagonal elements are zero',
          'A is a symmetric matrix'
        ],
        correctAnswer: 'The determinant det(A) ≠ 0',
        explanation: 'A matrix is non-singular and invertible if and only if its determinant is non-zero.'
      },
      {
        id: 'eval_q2',
        topic: 'Algorithms',
        difficulty: 'Hard',
        questionText: 'What is the tight worst-case time complexity of Mergesort on an array of size n?',
        options: [
          'O(n log n)',
          'O(n²)',
          'O(n)',
          'O(log n)'
        ],
        correctAnswer: 'O(n log n)',
        explanation: 'Mergesort divides the problem into halves at log n levels, performing O(n) work per level.'
      },
      {
        id: 'eval_q3',
        topic: 'Calculus',
        difficulty: 'Medium',
        questionText: 'What is the derivative of f(x) = e^(3x) with respect to x?',
        options: [
          '3 e^(3x)',
          'e^(3x)',
          '3x e^(3x)',
          '1/3 e^(3x)'
        ],
        correctAnswer: '3 e^(3x)',
        explanation: 'Applying the chain rule: d/dx(e^u) = e^u * du/dx, where u = 3x.'
      }
    ];

    if (materials.length > 0) {
      // Build test suite from uploaded material topics
      const custom: Question[] = [];
      materials.forEach((mat, mIdx) => {
        mat.topics.forEach((t, tIdx) => {
          custom.push({
            id: `eval_${mIdx}_${tIdx}`,
            materialId: mat.id,
            topic: t.name,
            difficulty: 'Hard',
            questionText: `Formal Evaluation: Validate the fundamental theorem regarding ${t.name}.`,
            options: [
              `Correct application of initial conditions and boundary values for ${t.name}`,
              `Disregarding asymptotic constraints`,
              `Assuming linear dependence unconditionally`,
              `Non-convergent iterative approximation`
            ],
            correctAnswer: `Correct application of initial conditions and boundary values for ${t.name}`,
            explanation: `Formal evaluation requires rigorous adherence to initial boundary parameters in ${t.name}.`
          });
        });
      });
      setQuestions(custom.length > 0 ? custom : defaultAssessmentQuestions);
    } else {
      setQuestions(defaultAssessmentQuestions);
    }
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#F7F5FA] mb-1">
            Diagnostic Assessment Suite
          </h2>
          <p className="text-xs text-[#A6A1B2]">
            Comprehensive evaluation testing mathematical and technical mastery.
          </p>
        </div>

        <AssessmentEngine questions={questions} />
      </div>
    </MainLayout>
  );
};
