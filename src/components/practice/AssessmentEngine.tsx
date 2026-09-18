import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCheck2,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Loader2,
  Maximize2,
  ShieldAlert,
  Camera,
  CameraOff,
  AlertTriangle,
  Users,
  EyeOff,
  ShieldCheck,
  Check,
  RefreshCw,
  Bug,
  SunMedium
} from 'lucide-react';
import {
  AssessmentSuiteData,
  NormalizedAssessmentQuestion,
  UserAssessmentAnswers,
  AssessmentSubmissionPayload,
  AssessmentSubmissionAnswer
} from '../../types';
import { adaptiveLearningService } from '../../services/api/adaptiveLearningService';
import { assessmentHistoryService, AssessmentHistoryRecord, QuestionReviewDetail } from '../../services/assessmentHistoryService';
import {
  ProctoringManager,
  CameraStatus,
  FaceStatus,
  ProctoringViolationEvent,
  ViolationType,
  ProctoringDebugInfo
} from '../../services/proctoring/ProctoringManager';
import { Button } from '../ui/Button';

interface AssessmentEngineProps {
  suiteData: AssessmentSuiteData;
  onFinishAssessment: (resultRecord: AssessmentHistoryRecord) => void;
}

export const AssessmentEngine: React.FC<AssessmentEngineProps> = ({
  suiteData,
  onFinishAssessment
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<UserAssessmentAnswers>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedRecord, setCompletedRecord] = useState<AssessmentHistoryRecord | null>(null);

  // Assessment Stage & Monitoring State
  const [stage, setStage] = useState<'pre_check' | 'active' | 'submitted' | 'terminated'>('pre_check');
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('uninitialized');
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('no-face');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [preCheckError, setPreCheckError] = useState<string | null>(null);

  // Violation & Warning State
  const [warningCount, setWarningCount] = useState<number>(0);
  const [activeModal, setActiveModal] = useState<'none' | 'camera_permission' | 'warning' | 'terminated'>('none');
  const [currentWarningDetails, setCurrentWarningDetails] = useState<{ title: string; message: string; violationType: string } | null>(null);
  const [violationsLog, setViolationsLog] = useState<{ type: string; timestamp: string; question_number: number; warning_number: number }[]>([]);

  // Debug Panel State
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<ProctoringDebugInfo | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const preCheckVideoRef = useRef<HTMLVideoElement | null>(null);
  const proctoringRef = useRef<ProctoringManager | null>(null);

  if (!proctoringRef.current) {
    proctoringRef.current = new ProctoringManager();
  }
  const proctoringManager = proctoringRef.current;

  const stageRef = useRef<'pre_check' | 'active' | 'submitted' | 'terminated'>('pre_check');
  const currentIndexRef = useRef<number>(0);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Keyboard Hotkey Ctrl+Shift+D to toggle Debug Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowDebugPanel(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check if session was previously terminated
  useEffect(() => {
    const sessionTerminatedKey = `learnivo_terminated_${suiteData.subject_code}`;
    const savedTerminated = sessionStorage.getItem(sessionTerminatedKey);
    if (savedTerminated) {
      try {
        const record = JSON.parse(savedTerminated);
        setCompletedRecord(record);
        setStage('terminated');
        setActiveModal('terminated');
        setWarningCount(3);
        return;
      } catch (e) {
        console.warn('Failed to parse terminated session data:', e);
      }
    }
  }, [suiteData.subject_code]);

  // 1. Initial Camera Request & Monitoring Setup
  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      setPreCheckError(null);
      try {
        const stream = await proctoringManager.requestCamera();
        if (!isMounted) return;

        setMediaStream(stream);
        setCameraStatus(proctoringManager.getCameraStatus());

        if (preCheckVideoRef.current) {
          proctoringManager.attachVideoElement(preCheckVideoRef.current);
        }

        // Start frame monitoring
        proctoringManager.startMonitoring({
          onStatusChange: (status) => {
            if (!isMounted) return;
            setCameraStatus(status.cameraStatus);
            setFaceStatus(status.faceStatus);
            setWarningCount(status.warningCount);
          },
          onViolation: (evt) => {
            if (!isMounted || stageRef.current !== 'active') return;
            handleViolationEvent(evt);
          },
          onCameraInterrupted: (reason) => {
            if (!isMounted) return;
            setPreCheckError(reason);
            setCameraStatus('disconnected');
            if (stageRef.current === 'active') {
              setActiveModal('camera_permission');
            }
          },
          onDebugUpdate: (info) => {
            if (!isMounted) return;
            setDebugInfo(info);
          }
        });

      } catch (err: any) {
        console.warn('Proctoring camera init error:', err);
        if (isMounted) {
          setCameraStatus('denied');
          setPreCheckError('Camera access is required for Proctored Exam Mode.');
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync video elements when mediaStream updates or stage switches
  useEffect(() => {
    if (mediaStream && proctoringManager) {
      if (preCheckVideoRef.current && stage === 'pre_check') {
        proctoringManager.attachVideoElement(preCheckVideoRef.current);
      }
      if (videoRef.current && stage === 'active') {
        proctoringManager.attachVideoElement(videoRef.current);
      }
    }
  }, [mediaStream, stage]);

  // Clean up proctoring manager on unmount
  useEffect(() => {
    return () => {
      if (proctoringRef.current) {
        proctoringRef.current.stopCamera();
      }
    };
  }, []);

  // 2. Tab Visibility Change Listener during Active Assessment (Tracked Independently)
  useEffect(() => {
    if (stage !== 'active') return;

    const handleVisibilityChange = () => {
      if (document.hidden && stageRef.current === 'active') {
        proctoringManager.issueWarning(
          'TAB_SWITCH',
          'You left the examination tab. Please remain on the assessment page.',
          0.99,
          suiteData.questions[currentIndexRef.current]?.question_number || currentIndexRef.current + 1
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stage, suiteData]);

  // 3. Fullscreen Exit Listener during Active Assessment (Tracked Independently)
  useEffect(() => {
    if (stage !== 'active') return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && stageRef.current === 'active') {
        proctoringManager.issueWarning(
          'FULLSCREEN_EXIT',
          'You exited fullscreen mode. Please return to fullscreen to continue your assessment.',
          0.99,
          suiteData.questions[currentIndexRef.current]?.question_number || currentIndexRef.current + 1
        );
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [stage, suiteData]);

  // Centralized Violation Processor
  const handleViolationEvent = (evt: ProctoringViolationEvent) => {
    setViolationsLog(prev => [
      ...prev,
      {
        type: evt.type,
        timestamp: evt.timestamp,
        question_number: evt.question_number,
        warning_number: evt.warning_number
      }
    ]);

    setWarningCount(evt.warning_number);

    if (evt.warning_number >= 3) {
      terminateAssessment('Examination terminated after 3 confirmed proctoring warnings.');
    } else {
      let title = `⚠️ PROCTORING WARNING (Warning ${evt.warning_number}/3)`;
      let formattedMsg = evt.message;

      if (evt.warning_number === 2) {
        formattedMsg = `Warning 2/3 — Continued violations will terminate your exam. (${evt.type.replace(/_/g, ' ')})`;
      }

      setCurrentWarningDetails({
        title,
        message: formattedMsg,
        violationType: evt.type.replace(/_/g, ' ')
      });
      setActiveModal('warning');
    }
  };

  // Handler: Retry Camera Request if denied or interrupted
  const handleRetryCamera = async () => {
    setPreCheckError(null);
    try {
      const stream = await proctoringManager.requestCamera();
      setMediaStream(stream);
      setCameraStatus('active');
      setActiveModal('none');
      proctoringManager.resumeMonitoring();

      if (preCheckVideoRef.current && stage === 'pre_check') {
        proctoringManager.attachVideoElement(preCheckVideoRef.current);
      } else if (videoRef.current && stage === 'active') {
        proctoringManager.attachVideoElement(videoRef.current);
      }
    } catch (err) {
      setCameraStatus('denied');
      setPreCheckError('Camera access is required for Proctored Exam Mode.');
    }
  };

  // Handler: Start Active Assessment & Request Fullscreen
  const handleStartActiveAssessment = async () => {
    if (cameraStatus !== 'active' || faceStatus !== 'single-face' || !mediaStream || !mediaStream.active) return;

    setStage('active');

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request note:', err);
    }
  };

  // Terminate Assessment Execution
  const terminateAssessment = async (reason: string) => {
    setStage('terminated');
    setActiveModal('terminated');

    // Stop camera monitoring & tracks
    proctoringManager.stopCamera();
    setMediaStream(null);

    // Exit browser fullscreen
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}

    const { questions, subject_code, subject_name, total_questions } = suiteData;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const questionDetails: QuestionReviewDetail[] = questions.map(q => {
      const userChoice = userAnswers[q.question_number];
      const isAns = Boolean(userChoice);
      const isCorrect = isAns && userChoice.toUpperCase() === q.correct_answer.toUpperCase();

      if (!isAns) unansweredCount++;
      else if (isCorrect) correctCount++;
      else wrongCount++;

      return {
        question_number: q.question_number,
        unit: q.unit,
        topic: q.topic,
        difficulty: q.difficulty,
        question: q.question,
        user_answer: userChoice || '',
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation
      };
    });

    const total = total_questions || questions.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    const record = await assessmentHistoryService.saveResult({
      subject_code,
      subject_name,
      total_questions: total,
      correct_answers: correctCount,
      wrong_answers: wrongCount,
      unanswered: unansweredCount,
      score: correctCount,
      percentage,
      completed_at: new Date().toISOString(),
      details: questionDetails,
      status: 'terminated',
      warning_count: 3,
      violations: violationsLog
    });

    setCompletedRecord(record);

    // Save terminated session persistence key so refresh cannot bypass termination
    sessionStorage.setItem(`learnivo_terminated_${subject_code}`, JSON.stringify(record));
  };

  const requestReentryFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setActiveModal('none');
    } catch (err) {
      console.warn('Re-entry fullscreen note:', err);
      setActiveModal('none');
    }
  };

  const { questions, subject_code, subject_name, total_questions } = suiteData;
  const currentQ: NormalizedAssessmentQuestion = questions[currentIndex] || questions[0];
  const qNum = currentQ.question_number;
  const selectedKey = userAnswers[qNum];

  const handleSelectOption = (optionKey: string) => {
    if (stage === 'submitted' || stage === 'terminated') return;
    setUserAnswers(prev => ({
      ...prev,
      [qNum]: optionKey
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const hasSubmittedRef = useRef<boolean>(false);

  const handleFinishAssessment = async () => {
    if (isSubmitting || hasSubmittedRef.current || stage === 'terminated') return;
    setIsSubmitting(true);
    hasSubmittedRef.current = true;

    const total = total_questions || questions.length;

    // 1. Build dynamic answers array for every question
    const submissionAnswers: AssessmentSubmissionAnswer[] = questions.map(q => {
      const userChoice = userAnswers[q.question_number];
      return {
        question_number: q.question_number,
        selected_answer: userChoice !== undefined && userChoice !== null ? String(userChoice) : ''
      };
    });

    // 2. Dispatch ONE dynamic final submission request to SNS Workbench webhook
    const submissionPayload: AssessmentSubmissionPayload = {
      action: 'submit_assessment',
      subject_code,
      subject_name,
      total_questions: total,
      answers: submissionAnswers
    };

    console.log('DISPATCHING FINAL ASSESSMENT SUBMISSION TO SNS WORKBENCH:', JSON.stringify(submissionPayload, null, 2));

    try {
      await adaptiveLearningService.submitAssessment(submissionPayload);
    } catch (submitErr) {
      console.warn('SNS Workbench submission webhook note:', submitErr);
    }

    // 3. Compute local evaluation details for immediate, consistent UI result display
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const questionDetails: QuestionReviewDetail[] = questions.map(q => {
      const userChoice = userAnswers[q.question_number];
      const isAns = Boolean(userChoice);
      const isCorrect = isAns && userChoice.toUpperCase() === q.correct_answer.toUpperCase();

      if (!isAns) unansweredCount++;
      else if (isCorrect) correctCount++;
      else wrongCount++;

      return {
        question_number: q.question_number,
        unit: q.unit,
        topic: q.topic,
        difficulty: q.difficulty,
        question: q.question,
        user_answer: userChoice || '',
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation
      };
    });

    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const score = correctCount;

    // Stop camera stream completely upon finishing
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
    }

    // Exit browser fullscreen
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Exit fullscreen note:', err);
    }

    const record = await assessmentHistoryService.saveResult({
      subject_code,
      subject_name,
      total_questions: total,
      correct_answers: correctCount,
      wrong_answers: wrongCount,
      unanswered: unansweredCount,
      score,
      percentage,
      completed_at: new Date().toISOString(),
      details: questionDetails,
      status: 'completed',
      warning_count: warningCount,
      violations: violationsLog
    });

    setCompletedRecord(record);
    setIsSubmitted(true);
    setStage('submitted');
    setIsSubmitting(false);
  };

  // --------------------------------------------------------------------------
  // STAGE 0: PRE-CHECK STAGE (CAMERA READINESS MANDATORY BEFORE STARTING TEST)
  // --------------------------------------------------------------------------
  if (stage === 'pre_check') {
    const isReadyToStart = cameraStatus === 'active' && faceStatus === 'single-face' && Boolean(mediaStream && mediaStream.active);

    return (
      <div className="fixed inset-0 z-50 bg-[#08090D] text-[#F7F5FA] flex items-center justify-center p-6 overflow-y-auto min-h-screen">
        <div className="surface-card p-8 border border-white/10 rounded-2xl bg-[#0D0B14] max-w-xl w-full space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C7FF4A]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-[#C7FF4A]/10 text-[#C7FF4A] border border-[#C7FF4A]/30 uppercase">
                CAMERA CHECK
              </span>
              <h2 className="text-2xl font-black text-white pt-1">
                {subject_name}
              </h2>
              <p className="text-xs text-[#A6A1B2]">
                Code: {subject_code} • {questions.length} Questions
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center text-[#C7FF4A]">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Video Preview Box */}
          <div className="relative w-full h-56 rounded-xl border border-white/15 bg-black/90 overflow-hidden flex items-center justify-center shadow-inner">
            {cameraStatus === 'active' && mediaStream && mediaStream.active ? (
              <video
                ref={preCheckVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                <CameraOff className="w-10 h-10 text-rose-400 animate-pulse" />
                <p className="text-xs font-semibold text-rose-300">
                  Camera access is required for Proctored Exam Mode.
                </p>
              </div>
            )}

            {/* Status Overlay Badge */}
            {cameraStatus === 'active' && mediaStream && mediaStream.active ? (
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                MONITORING ACTIVE
              </div>
            ) : (
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-rose-400 flex items-center gap-1.5 border border-rose-500/30">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                CAMERA OFFLINE
              </div>
            )}
          </div>

          {/* Verification Checklist */}
          <div className="space-y-3 bg-[#13111C] p-5 rounded-xl border border-white/10">
            <h4 className="text-xs font-semibold text-[#A6A1B2] uppercase tracking-wider">
              Camera Verification Status
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white">
                  <Camera className="w-4 h-4 text-[#C7FF4A]" />
                  Webcam Permission
                </span>
                {cameraStatus === 'active' ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Camera Detected
                  </span>
                ) : (
                  <span className="font-bold text-rose-400">Permission Required</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white">
                  <Sparkles className="w-4 h-4 text-[#C7FF4A]" />
                  Video Stream State
                </span>
                {cameraStatus === 'active' && mediaStream && mediaStream.active ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Stream Active
                  </span>
                ) : (
                  <span className="font-bold text-rose-400">Offline / Disabled</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white">
                  <Users className="w-4 h-4 text-[#C7FF4A]" />
                  Face Detection
                </span>
                {faceStatus === 'single-face' ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Face Detected
                  </span>
                ) : faceStatus === 'multiple-faces' ? (
                  <span className="font-bold text-rose-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Multiple Faces Detected
                  </span>
                ) : (
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Detecting Face...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Refused Permission / Error Banner */}
          {(preCheckError || cameraStatus === 'denied' || cameraStatus === 'unavailable') && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{preCheckError || "Camera access is required for Proctored Exam Mode."}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryCamera}
                className="text-xs text-rose-300 border-rose-500/40 hover:bg-rose-500/20 whitespace-nowrap"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Allow Camera Access
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              disabled={!isReadyToStart}
              onClick={handleStartActiveAssessment}
              className="w-full bg-[#C7FF4A] text-black font-extrabold hover:bg-[#b8f533] py-3.5 text-sm shadow-xl shadow-[#C7FF4A]/20 disabled:opacity-40"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              START ASSESSMENT
            </Button>

            {!isReadyToStart && (
              <p className="text-[11px] text-center text-[#A6A1B2]">
                Please allow camera access and ensure your face is clearly visible in the preview to start the assessment.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STAGE 1: RESULT SCREEN (After Finishing or Submitting)
  // --------------------------------------------------------------------------
  if ((stage === 'submitted' || isSubmitted) && completedRecord) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto py-8">
        {/* Header / Summary Card */}
        <div className="surface-card p-8 border border-white/10 rounded-2xl bg-[#0D0B14] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C7FF4A]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-[#C7FF4A]/10 text-[#C7FF4A] border border-[#C7FF4A]/30 uppercase">
                  Assessment Completed
                </span>
                {completedRecord.warning_count !== undefined && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-white/5 text-[#A6A1B2] border border-white/10">
                    Warnings: {completedRecord.warning_count}/3
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-[#F7F5FA] tracking-tight">
                {completedRecord.subject_name}
              </h2>
              <p className="text-xs text-[#A6A1B2] mt-1 font-mono">
                Code: {completedRecord.subject_code} • {completedRecord.total_questions} Questions Evaluated
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => onFinishAssessment(completedRecord)}
              className="bg-[#C7FF4A] text-black font-bold hover:bg-[#b8f533] shadow-lg shadow-[#C7FF4A]/20"
            >
              Back to Assessments
            </Button>
          </div>

          {/* Score Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 items-center">
            <div className="col-span-1 md:col-span-1 bg-[#13111C] p-6 rounded-xl border border-white/10 text-center space-y-2">
              <div className="text-xs text-[#A6A1B2] font-medium uppercase tracking-wider">
                Overall Score
              </div>
              <div className="text-5xl font-black text-[#C7FF4A] tracking-tight">
                {completedRecord.score} <span className="text-2xl font-normal text-[#A6A1B2]">/ {completedRecord.total_questions}</span>
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-[#C7FF4A]/10 text-[#C7FF4A] border border-[#C7FF4A]/30">
                {completedRecord.percentage}% Score
              </div>
            </div>

            <div className="col-span-1 md:col-span-1 bg-[#13111C] p-6 rounded-xl border border-white/10 flex flex-col items-center justify-center space-y-3">
              <div className="text-xs text-[#A6A1B2] font-medium uppercase tracking-wider">
                Performance Summary
              </div>
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#C7FF4A] transition-all duration-1000 ease-out"
                    strokeDasharray={`${completedRecord.percentage}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white">{completedRecord.percentage}%</span>
                  <span className="text-[9px] text-[#A6A1B2] uppercase font-semibold">Accuracy</span>
                </div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-1 bg-[#13111C] p-6 rounded-xl border border-white/10 space-y-3">
              <div className="text-xs text-[#A6A1B2] font-medium uppercase tracking-wider mb-2">
                Answer Distribution
              </div>
              
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-emerald-300">Correct</span>
                </div>
                <span className="font-bold text-emerald-400">{completedRecord.correct_answers}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span className="font-semibold text-rose-300">Wrong</span>
                </div>
                <span className="font-bold text-rose-400">{completedRecord.wrong_answers}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-amber-300">Unanswered</span>
                </div>
                <span className="font-bold text-amber-400">{completedRecord.unanswered}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STAGE 2: ACTIVE EXAM MODE INTERFACE & MODALS
  // --------------------------------------------------------------------------
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(userAnswers).length;
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-[#08090D] text-[#F7F5FA] flex flex-col overflow-y-auto min-h-screen">
      {/* Floating Webcam Preview (Top-Right) */}
      {stage === 'active' && (
        <div className="fixed top-16 right-6 w-36 h-28 rounded-xl border border-white/20 bg-black/90 shadow-2xl z-40 overflow-hidden flex flex-col group transition-all">
          {cameraStatus === 'active' && mediaStream && mediaStream.active ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="w-full h-full bg-black flex flex-col items-center justify-center p-2 text-center text-rose-400">
              <CameraOff className="w-6 h-6 mb-1 animate-pulse" />
              <span className="text-[9px] font-bold">OFFLINE</span>
            </div>
          )}

          <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[9px] bg-black/80 px-1.5 py-0.5 rounded text-white font-mono border border-white/10">
            {cameraStatus === 'active' && mediaStream && mediaStream.active ? (
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                MONITORING ACTIVE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                CAMERA OFFLINE
              </span>
            )}
            <span className="text-[#A6A1B2]">Warns: {warningCount}/3</span>
          </div>
        </div>
      )}

      {/* Low Light Non-Intrusive Notice Banner */}
      {stage === 'active' && debugInfo && debugInfo.isLowLight && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2 sticky top-0 z-40">
          <SunMedium className="w-4 h-4 text-amber-400" />
          <span>Lighting is too low for reliable monitoring. Please ensure your environment is lit properly.</span>
        </div>
      )}

      {/* MODAL 1: CAMERA DISCONNECTED OR HARDWARE INTERRUPTED (Pauses Assessment, No Cheating Penalty) */}
      {activeModal === 'camera_permission' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#13111C] border border-red-500/40 rounded-2xl p-8 max-w-md text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <CameraOff className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Camera Connection Lost</h3>
              <p className="text-xs text-[#A6A1B2] leading-relaxed">
                Your camera connection was interrupted. Please reconnect your camera to continue your assessment.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleRetryCamera}
              className="bg-[#C7FF4A] text-black font-bold hover:bg-[#b8f533] w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Camera
            </Button>
          </div>
        </div>
      )}

      {/* MODAL 2: CENTRALIZED WARNING MODAL (WARNING 1/3 and 2/3) */}
      {activeModal === 'warning' && currentWarningDetails && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#13111C] border border-amber-500/40 rounded-2xl p-8 max-w-md text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {currentWarningDetails.title}
              </span>
              <h3 className="text-lg font-bold text-white pt-2">
                {currentWarningDetails.violationType}
              </h3>
              <p className="text-xs text-[#A6A1B2] leading-relaxed">
                {currentWarningDetails.message}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={requestReentryFullscreen}
              className="bg-[#C7FF4A] text-black font-bold hover:bg-[#b8f533] w-full"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              Acknowledge & Continue Assessment
            </Button>
          </div>
        </div>
      )}

      {/* MODAL 3: ASSESSMENT TERMINATED (3RD VIOLATION REACHED) */}
      {activeModal === 'terminated' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#13111C] border border-red-500/50 rounded-2xl p-8 max-w-md text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/30">
                Assessment Terminated
              </span>
              <h3 className="text-xl font-bold text-white pt-1">
                Warning 3/3 — Test Cancelled
              </h3>
              <p className="text-xs text-[#A6A1B2] leading-relaxed">
                Your assessment was terminated because the maximum number of confirmed monitoring violations was reached.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => completedRecord && onFinishAssessment(completedRecord)}
              className="bg-[#C7FF4A] text-black font-bold hover:bg-[#b8f533] w-full"
            >
              View Final Assessment Summary
            </Button>
          </div>
        </div>
      )}

      {/* FRONTEND TELEMETRY & DEBUG PANEL OVERLAY */}
      {showDebugPanel && debugInfo && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#0D0B14]/95 border border-[#C7FF4A]/40 rounded-xl p-4 w-80 shadow-2xl backdrop-blur-md text-xs font-mono text-white space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[#C7FF4A] font-bold">
            <span className="flex items-center gap-1.5">
              <Bug className="w-3.5 h-3.5" /> Proctoring Debug Engine
            </span>
            <button onClick={() => setShowDebugPanel(false)} className="text-[#A6A1B2] hover:text-white">✕</button>
          </div>
          <div className="space-y-1 text-[11px] text-[#A6A1B2]">
            <div className="flex justify-between"><span>Camera State:</span> <span className="text-white">{debugInfo.cameraStatus}</span></div>
            <div className="flex justify-between"><span>Face Status:</span> <span className="text-white">{debugInfo.faceStatus}</span></div>
            <div className="flex justify-between"><span>Detected Faces:</span> <span className="text-white">{debugInfo.detectedFaceCount} (Conf: {(debugInfo.faceConfidence * 100).toFixed(0)}%)</span></div>
            <div className="flex justify-between"><span>Gaze State:</span> <span className="text-white">{debugInfo.gazeStatus}</span></div>
            <div className="flex justify-between"><span>Mouth State:</span> <span className="text-white">{debugInfo.mouthStatus}</span></div>
            <div className="flex justify-between"><span>Mean Luminance:</span> <span className="text-white">{debugInfo.luminance}</span></div>
            <div className="flex justify-between"><span>Consecutive Buffers:</span> <span className="text-[#C7FF4A]">NF:{debugInfo.consecutiveNoFace} MF:{debugInfo.consecutiveMultiFace} GZ:{debugInfo.consecutiveGazeAway} MT:{debugInfo.consecutiveMouth}</span></div>
            <div className="flex justify-between"><span>Warnings / Cooldown:</span> <span className="text-amber-400">{debugInfo.warningCount}/3 ({Math.ceil(debugInfo.cooldownRemainingMs / 1000)}s)</span></div>
            <div className="flex justify-between"><span>Frame Rate:</span> <span className="text-emerald-400">{debugInfo.fps} FPS</span></div>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="bg-[#0D0B14] border-b border-white/10 px-6 py-4 flex items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center text-[#C7FF4A] font-black text-sm">
            L
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-wider uppercase">
              {subject_name}
            </h1>
            <p className="text-[11px] font-mono text-[#A6A1B2] flex items-center gap-2">
              <span>Code: {subject_code}</span>
              <span>•</span>
              <span className="text-[#C7FF4A] font-semibold flex items-center gap-1">
                <Camera className="w-3 h-3" /> Proctored Exam Mode
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Debug Toggle Button */}
          <button
            onClick={() => setShowDebugPanel(prev => !prev)}
            className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-[#A6A1B2] hover:text-white flex items-center gap-1 transition-all"
            title="Toggle Proctoring Telemetry Debug Overlay (Ctrl+Shift+D)"
          >
            <Bug className="w-3 h-3 text-[#C7FF4A]" />
            Debug
          </button>

          <div className="text-right">
            <div className="text-xs font-bold text-white">
              Question {currentIndex + 1} of {questions.length}
            </div>
            <div className="text-[10px] text-[#C7FF4A] font-semibold">
              Answered: {answeredCount} / {questions.length}
            </div>
          </div>

          <div className="w-24 bg-white/10 h-2 rounded-full overflow-hidden hidden sm:block">
            <div
              className="bg-[#C7FF4A] h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Progress Dots Bar */}
          <div className="flex items-center gap-1.5 justify-center py-2 overflow-x-auto">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAns = Boolean(userAnswers[q.question_number]);

              return (
                <button
                  key={q.question_number}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${
                    isCurrent
                      ? 'bg-[#C7FF4A] text-black scale-110 shadow-lg shadow-[#C7FF4A]/20 ring-2 ring-white'
                      : isAns
                      ? 'bg-[#C7FF4A]/20 text-[#C7FF4A] border border-[#C7FF4A]/40'
                      : 'bg-[#13111C] text-[#A6A1B2] border border-white/10 hover:border-white/30'
                  }`}
                >
                  {q.question_number}
                </button>
              );
            })}
          </div>

          {/* Active Question Card */}
          <div className="surface-card p-8 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-6 shadow-2xl">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-3 py-1 rounded-full bg-[#C7FF4A]/10 text-[#C7FF4A] border border-[#C7FF4A]/30 font-bold">
                  Question {currentQ.question_number}
                </span>
                <span className="text-[#A6A1B2] font-mono">
                  {currentQ.unit} • {currentQ.topic} • {currentQ.difficulty}
                </span>
              </div>

              <h3 className="text-xl font-bold text-[#F7F5FA] leading-relaxed pt-2">
                {currentQ.question}
              </h3>
            </div>

            {/* Options Radio List */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((opt) => {
                const isSelected = selectedKey?.toUpperCase() === opt.key.toUpperCase();

                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSelectOption(opt.key)}
                    disabled={stage === 'terminated'}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 group ${
                      isSelected
                        ? 'bg-[#C7FF4A]/10 border-[#C7FF4A] text-[#F7F5FA] shadow-lg shadow-[#C7FF4A]/5 ring-1 ring-[#C7FF4A]'
                        : 'bg-[#13111C] border-white/10 text-[#A6A1B2] hover:border-white/20 hover:text-[#F7F5FA] hover:bg-[#181624]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                        isSelected
                          ? 'border-[#C7FF4A] bg-[#C7FF4A]'
                          : 'border-white/30 group-hover:border-white/50'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                    </div>

                    <div className="text-sm leading-relaxed">
                      <span className={`font-bold mr-1.5 ${isSelected ? 'text-[#C7FF4A]' : 'text-white'}`}>
                        {opt.key}.
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0 || stage === 'terminated'}
            className="text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {isLastQuestion ? (
            <Button
              variant="primary"
              isLoading={isSubmitting}
              onClick={handleFinishAssessment}
              disabled={stage === 'terminated'}
              className="bg-[#C7FF4A] text-black font-bold hover:bg-[#b8f533] shadow-lg shadow-[#C7FF4A]/20"
            >
              Submit Assessment
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={stage === 'terminated'}
              className="bg-[#C7FF4A] text-black font-bold hover:bg-[#b8f533] shadow-lg shadow-[#C7FF4A]/20 text-xs"
            >
              Next Question
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};
