import React, { useState, useEffect } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { AssessmentEngine } from '../../components/practice/AssessmentEngine';
import { adaptiveLearningService, generateSubjectCode } from '../../services/api/adaptiveLearningService';
import { assessmentHistoryService, AssessmentHistoryRecord } from '../../services/assessmentHistoryService';
import { storageService } from '../../services/storage/storageService';
import { AssessmentSuiteData } from '../../types';
import { Button } from '../../components/ui/Button';
import { Play, Sparkles, CheckCircle2, AlertCircle, FileCheck2, ArrowRight, Clock, Award, RotateCcw, XCircle, HelpCircle, BookOpen } from 'lucide-react';

interface SubjectOption {
  code: string;
  name: string;
}

const DEFAULT_SUBJECTS: SubjectOption[] = [
  { code: '23ITT201', name: 'DATA STRUCTURES' },
  { code: '23ITT202', name: 'DATABASE MANAGEMENT SYSTEMS' },
  { code: '23ITT203', name: 'OPERATING SYSTEMS' },
  { code: '23ITT204', name: 'COMPUTER NETWORKS' }
];

export const AssessmentPage: React.FC = () => {
  const [suiteData, setSuiteData] = useState<AssessmentSuiteData | null>(null);
  const [isFetchingWebhook, setIsFetchingWebhook] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [history, setHistory] = useState<AssessmentHistoryRecord[]>([]);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<AssessmentHistoryRecord | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>(DEFAULT_SUBJECTS);
  const [selectedSubject, setSelectedSubject] = useState<SubjectOption>(DEFAULT_SUBJECTS[0]);

  // Load recent assessment history & available subjects on page load (DO NOT auto-fetch questions!)
  useEffect(() => {
    loadHistory();
    initSubjects();
  }, []);

  const initSubjects = () => {
    const list: SubjectOption[] = [...DEFAULT_SUBJECTS];

    // 1. Discover uploaded subjects from stored materials
    try {
      const materials = storageService.getMaterials();
      materials.forEach(m => {
        if (m.title) {
          const upperTitle = m.title.trim().toUpperCase();
          if (!list.some(s => s.name === upperTitle)) {
            list.push({
              code: generateSubjectCode(upperTitle),
              name: upperTitle
            });
          }
        }
      });
    } catch {}

    // 2. Check URL parameters (?subject=...&code=...)
    let initialSelected = list[0];
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlSubName = params.get('subject_name') || params.get('subject') || params.get('course');
      const urlSubCode = params.get('subject_code') || params.get('code');

      if (urlSubName) {
        const upperUrlName = urlSubName.trim().toUpperCase();
        const code = (urlSubCode || generateSubjectCode(upperUrlName)).trim().toUpperCase();
        const existing = list.find(s => s.name === upperUrlName || s.code === code);
        if (existing) {
          initialSelected = existing;
        } else {
          const newSub: SubjectOption = { code, name: upperUrlName };
          list.push(newSub);
          initialSelected = newSub;
        }
      } else {
        // 3. Check session storage for user preference
        try {
          const savedStr = sessionStorage.getItem('learnivo_active_subject');
          if (savedStr) {
            const parsed = JSON.parse(savedStr);
            if (parsed.name && parsed.code) {
              const matched = list.find(s => s.code === parsed.code) || parsed;
              initialSelected = matched;
            }
          }
        } catch {}
      }
    }

    setAvailableSubjects(list);
    setSelectedSubject(initialSelected);
  };

  const handleSubjectChange = (code: string) => {
    const found = availableSubjects.find(s => s.code === code);
    if (found) {
      setSelectedSubject(found);
      try {
        sessionStorage.setItem('learnivo_active_subject', JSON.stringify(found));
      } catch {}
    }
  };

  const loadHistory = async () => {
    try {
      const records = await assessmentHistoryService.getHistory();
      setHistory(records);
    } catch (err) {
      console.warn('Error loading assessment history:', err);
    }
  };

  const handleTakeAssessment = async () => {
    setIsFetchingWebhook(true);
    setStatusMessage(null);
    setSelectedHistoryRecord(null);

    try {
      const result = await adaptiveLearningService.fetchAssessmentQuestionsFromWebhook({
        subject_code: selectedSubject.code,
        subject_name: selectedSubject.name
      });

      if (result && result.questions && result.questions.length > 0) {
        setSuiteData(result);
      } else {
        setSuiteData(null);
        setStatusMessage({
          text: 'Unable to load the assessment. Assessment service returned an invalid question set.',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Failed to fetch assessment suite:', err);
      setSuiteData(null);
      setStatusMessage({
        text: 'Unable to load the assessment. Please try again.',
        type: 'error'
      });
    } finally {
      setIsFetchingWebhook(false);
    }
  };

  const handleFinishAssessment = async (resultRecord: AssessmentHistoryRecord) => {
    setSuiteData(null);
    setSelectedHistoryRecord(null);
    await loadHistory();
    setStatusMessage({
      text: `Assessment completed successfully! Score: ${resultRecord.score}/${resultRecord.total_questions} (${resultRecord.percentage}%)`,
      type: 'success'
    });
  };

  // If Full-Screen Exam Mode is active (questions loaded), render AssessmentEngine
  if (suiteData) {
    return (
      <AssessmentEngine
        suiteData={suiteData}
        onFinishAssessment={handleFinishAssessment}
      />
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Assessment Landing Header */}
        <div className="surface-card p-8 border border-white/10 rounded-2xl bg-[#0D0B14] relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-[#C7FF4A]/10 text-[#C7FF4A] border border-[#C7FF4A]/30 uppercase">
                Evaluation Engine
              </span>
              <span className="text-[10px] font-mono text-[#A6A1B2] bg-white/5 px-2 py-0.5 rounded border border-white/10">
                {selectedSubject.code}
              </span>
            </div>
            <h2 className="text-3xl font-black text-[#F7F5FA] tracking-tight">
              Evaluation & Assessment
            </h2>
            <p className="text-xs text-[#A6A1B2] leading-relaxed">
              Test your understanding and track your learning progress with dynamic evaluation tests.
            </p>
          </div>

          <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Subject Selector */}
            <div className="relative">
              <select
                value={selectedSubject.code}
                onChange={(e) => handleSubjectChange(e.target.value)}
                disabled={isFetchingWebhook}
                className="w-full sm:w-auto bg-[#181620] border border-white/20 rounded-xl px-3.5 py-3 text-xs text-[#F7F5FA] font-medium focus:outline-none focus:border-[#C7FF4A] shadow-inner cursor-pointer"
                aria-label="Select Assessment Subject"
              >
                {availableSubjects.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              isLoading={isFetchingWebhook}
              disabled={isFetchingWebhook}
              onClick={handleTakeAssessment}
              className="bg-[#C7FF4A] text-black font-extrabold hover:bg-[#b8f533] px-6 py-3 text-sm shadow-xl shadow-[#C7FF4A]/20 whitespace-nowrap"
            >
              {isFetchingWebhook ? (
                <>Preparing Assessment...</>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Take Assessment
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status Error / Success Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 ${
              statusMessage.type === 'success'
                ? 'bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 text-[#C7FF4A]'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#C7FF4A]" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>

            {statusMessage.type === 'error' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTakeAssessment}
                isLoading={isFetchingWebhook}
                className="text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Retry
              </Button>
            )}
          </div>
        )}

        {/* View Previous Assessment Result Modal / Details Card */}
        {selectedHistoryRecord ? (
          <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-bold text-[#C7FF4A] uppercase tracking-wider">
                  Previous Assessment Result
                </span>
                <h3 className="text-xl font-bold text-white">
                  {selectedHistoryRecord.subject_name}
                </h3>
                <p className="text-xs text-[#A6A1B2]">
                  Code: {selectedHistoryRecord.subject_code} • Completed {new Date(selectedHistoryRecord.completed_at).toLocaleDateString()}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedHistoryRecord(null)}
              >
                Back to Assessments
              </Button>
            </div>

            {/* Score Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-xl bg-[#13111C] border border-white/10">
                <div className="text-2xl font-black text-[#C7FF4A]">{selectedHistoryRecord.score} / {selectedHistoryRecord.total_questions}</div>
                <div className="text-[10px] text-[#A6A1B2] uppercase font-semibold">Score</div>
              </div>

              <div className="p-4 rounded-xl bg-[#13111C] border border-white/10">
                <div className="text-2xl font-black text-white">{selectedHistoryRecord.percentage}%</div>
                <div className="text-[10px] text-[#A6A1B2] uppercase font-semibold">Percentage</div>
              </div>

              <div className="p-4 rounded-xl bg-[#13111C] border border-white/10">
                <div className="text-2xl font-black text-emerald-400">{selectedHistoryRecord.correct_answers}</div>
                <div className="text-[10px] text-[#A6A1B2] uppercase font-semibold">Correct</div>
              </div>

              <div className="p-4 rounded-xl bg-[#13111C] border border-white/10">
                <div className="text-2xl font-black text-rose-400">{selectedHistoryRecord.wrong_answers}</div>
                <div className="text-[10px] text-[#A6A1B2] uppercase font-semibold">Wrong</div>
              </div>
            </div>

            {/* Question Details List if stored */}
            {selectedHistoryRecord.details && selectedHistoryRecord.details.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-[#A6A1B2] uppercase tracking-wider">
                  Question Review
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {selectedHistoryRecord.details.map((q, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        q.is_correct
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                          : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span>Q{q.question_number}. {q.question}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          q.is_correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {q.is_correct ? '✓ Correct' : '✕ Wrong'}
                        </span>
                      </div>
                      {q.explanation && (
                        <p className="text-[11px] text-[#A6A1B2]">
                          Explanation: {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Section 7 & 10: RECENT ASSESSMENTS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C7FF4A]" />
              <span>Recent Assessments</span>
            </h3>
            {history.length > 0 && (
              <span className="text-xs text-[#A6A1B2]">
                {history.length} completed
              </span>
            )}
          </div>

          {history.length === 0 ? (
            <div className="surface-card p-8 border border-white/10 rounded-2xl text-center space-y-3 bg-[#0D0B14]">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-[#A6A1B2]">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <p className="text-xs text-[#A6A1B2]">
                No assessments completed yet. Take your first assessment to see your results here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="surface-card p-5 border border-white/10 rounded-2xl bg-[#0D0B14] hover:border-white/20 transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white group-hover:text-[#C7FF4A] transition-colors">
                      {record.subject_name}
                    </h4>
                    <p className="text-xs font-mono text-[#A6A1B2]">
                      {record.subject_code}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-xs">
                      <span className="font-extrabold text-[#C7FF4A]">
                        {record.score}/{record.total_questions}
                      </span>
                      <span className="text-white/30">•</span>
                      <span className="font-semibold text-white">
                        {record.percentage}%
                      </span>
                      <span className="text-white/30">•</span>
                      <span className="text-[11px] text-[#A6A1B2]">
                        {new Date(record.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedHistoryRecord(record)}
                    className="text-xs flex-shrink-0"
                  >
                    View <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};
