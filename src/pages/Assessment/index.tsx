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
      },
      {
        id: 'eval_q4',
        topic: 'Probability & Statistics',
        difficulty: 'Easy',
        questionText: 'What is the expected value of rolling a single fair six-sided die?',
        options: [
          '3.5',
          '3.0',
          '4.0',
          '2.5'
        ],
        correctAnswer: '3.5',
        explanation: 'The expected value is (1 + 2 + 3 + 4 + 5 + 6) / 6 = 21 / 6 = 3.5.'
      },
      {
        id: 'eval_q5',
        topic: 'Data Structures',
        difficulty: 'Medium',
        questionText: 'What is the average-case time complexity for searching an element in a Hash Table?',
        options: [
          'O(1)',
          'O(n)',
          'O(log n)',
          'O(n log n)'
        ],
        correctAnswer: 'O(1)',
        explanation: 'With a uniform hash function, average hash table lookups take constant time O(1).'
      },
      {
        id: 'eval_q6',
        topic: 'Operating Systems',
        difficulty: 'Hard',
        questionText: 'Which memory management technique allows the execution of processes that are not completely in physical memory?',
        options: [
          'Virtual Memory',
          'Dynamic Linking',
          'Static Segmentation',
          'Paging without Swapping'
        ],
        correctAnswer: 'Virtual Memory',
        explanation: 'Virtual memory decouples logical user memory from physical memory via demand paging.'
      },
      {
        id: 'eval_q7',
        topic: 'Machine Learning',
        difficulty: 'Medium',
        questionText: 'Which regularization technique randomly drops neurons during training to prevent overfitting?',
        options: [
          'Dropout',
          'Batch Normalization',
          'Gradient Clipping',
          'L1 Regularization'
        ],
        correctAnswer: 'Dropout',
        explanation: 'Dropout randomly deactivates sub-networks during training to improve generalization.'
      },
      {
        id: 'eval_q8',
        topic: 'Computer Networks',
        difficulty: 'Easy',
        questionText: 'Which transport layer protocol provides reliable, connection-oriented, and byte-stream service?',
        options: [
          'TCP',
          'UDP',
          'IP',
          'ICMP'
        ],
        correctAnswer: 'TCP',
        explanation: 'Transmission Control Protocol (TCP) ensures reliable sequence delivery via handshake.'
      },
      {
        id: 'eval_q9',
        topic: 'Database Systems',
        difficulty: 'Medium',
        questionText: 'In DBMS ACID properties, what does Atomicity guarantee?',
        options: [
          'All operations in a transaction execute completely or none do',
          'Data remains consistent across system crashes',
          'Transactions run in complete isolation',
          'Updates are permanently saved to persistent storage'
        ],
        correctAnswer: 'All operations in a transaction execute completely or none do',
        explanation: 'Atomicity treats a transaction as an indivisible unit of work (all-or-nothing).'
      },
      {
        id: 'eval_q10',
        topic: 'Discrete Mathematics',
        difficulty: 'Hard',
        questionText: 'In Proof by Mathematical Induction, what step assumes the statement P(k) is true for an arbitrary integer k?',
        options: [
          'Inductive Hypothesis',
          'Base Case',
          'Proof by Contradiction',
          'Contrapositive Assumption'
        ],
        correctAnswer: 'Inductive Hypothesis',
        explanation: 'The inductive hypothesis assumes P(k) holds to prove P(k+1).'
      }
    ];

    if (materials.length > 0) {
      // Build test suite from uploaded material topics
      const custom: Question[] = [];
      materials.forEach((mat, mIdx) => {
        mat.topics.forEach((t, tIdx) => {
          custom.push({
            id: `eval_${mat.id || mIdx}_${tIdx}`,
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

      if (custom.length >= 10) {
        setQuestions(custom.slice(0, 10));
      } else {
        // Fill remaining up to 10 questions using defaults
        const filled = [...custom];
        for (let i = custom.length; i < 10; i++) {
          filled.push(defaultAssessmentQuestions[i]);
        }
        setQuestions(filled);
      }
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
