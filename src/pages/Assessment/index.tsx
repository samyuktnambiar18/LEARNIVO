import React, { useState } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { AssessmentEngine } from '../../components/practice/AssessmentEngine';
import { adaptiveLearningService } from '../../services/api/adaptiveLearningService';
import { AssessmentSuiteData } from '../../types';
import { Button } from '../../components/ui/Button';
import { Play, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export const AssessmentPage: React.FC = () => {
  const [suiteData, setSuiteData] = useState<AssessmentSuiteData | null>(null);
  const [isFetchingWebhook, setIsFetchingWebhook] = useState<boolean>(false);
  const [engineKey, setEngineKey] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleAttendAssessment = async () => {
    setIsFetchingWebhook(true);
    setStatusMessage(null);

    try {
      const result = await adaptiveLearningService.fetchAssessmentQuestionsFromWebhook();

      if (result && result.questions && result.questions.length > 0) {
        setSuiteData(result);
        setStatusMessage({
          text: `Successfully loaded ${result.questions.length} assessment questions for ${result.subject_name} (${result.subject_code})!`,
          type: 'success'
        });
      } else {
        setSuiteData(null);
        setStatusMessage({
          text: 'Webhook endpoint returned no questions or workflow is inactive.',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Failed to fetch assessment suite:', err);
      setSuiteData(null);
      setStatusMessage({
        text: 'Failed to connect to assessment webhook. Please try again.',
        type: 'error'
      });
    } finally {
      setEngineKey(prev => prev + 1);
      setIsFetchingWebhook(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-[#F7F5FA] mb-1 flex items-center gap-2">
              <span>Evaluation & Assessment</span>
              <Sparkles className="w-5 h-5 text-[#C7FF4A]" />
            </h2>
            <p className="text-xs text-[#A6A1B2]">
              Trigger the assessment webhook to load dynamic evaluation questions and attempt your test.
            </p>
          </div>

          <Button
            variant="primary"
            isLoading={isFetchingWebhook}
            onClick={handleAttendAssessment}
            className="shadow-lg shadow-[#C7FF4A]/10 flex-shrink-0"
          >
            <Play className="w-4 h-4 mr-2" />
            Attend Assessment
          </Button>
        </div>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 text-[#C7FF4A]'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#C7FF4A]" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <AssessmentEngine
          key={engineKey}
          suiteData={suiteData}
          onAttendClick={handleAttendAssessment}
          isFetchingWebhook={isFetchingWebhook}
        />
      </div>
    </MainLayout>
  );
};
