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
  UserX,
  Users,
  EyeOff,
  X
} from 'lucide-react';
import {
  AssessmentSuiteData,
  NormalizedAssessmentQuestion,
  UserAssessmentAnswers
} from '../../types';
import { assessmentHistoryService, AssessmentHistoryRecord, QuestionReviewDetail } from '../../services/assessmentHistoryService';
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

  // Proctored Assessment State
  const [assessmentStatus, setAssessmentStatus] = useState<'active' | 'submitted' | 'cancelled' | 'terminated'>('active');
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [warningCount, setWarningCount] = useState<number>(0);
  const [fullscreenExitCount, setFullscreenExitCount] = useState<number>(0);
  const [activeModal, setActiveModal] = useState<'none' | 'camera_permission' | 'warning' | 'terminated'>('none');
  const [currentWarningDetails, setCurrentWarningDetails] = useState<{ title: string; message: string; violationType: string } | null>(null);
  const [violationsLog, setViolationsLog] = useState<{ type: string; timestamp: string; question_number: number }[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Request Webcam Permission & Start Camera Stream
  useEffect(() => {
    let isMounted = true;
    let stream: MediaStream | null = null;

    async function requestCameraPermission() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' }
        });
        if (isMounted) {
          setMediaStream(stream);
          setCameraPermission('granted');
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('Camera permission denied or camera unavailable:', err);
        if (isMounted) {
          setCameraPermission('denied');
          setActiveModal('camera_permission');
        }
      }
    }

    requestCameraPermission();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update video element srcObject when mediaStream is set
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, activeModal]);

  // 2. Fullscreen API Request & Exit Monitoring
  useEffect(() => {
    if (assessmentStatus !== 'active') return;

    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn('Fullscreen API request prevented or unsupported:', err);
      }
    };

    enterFullscreen();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && assessmentStatus === 'active') {
        setFullscreenExitCount(prev => {
          const nextExit = prev + 1;
          if (nextExit === 1) {
            triggerViolation('Fullscreen Exit', 'Warning: You exited full-screen mode. Please return to full-screen to continue your assessment.');
          } else if (nextExit >= 2) {
            terminateAssessment('Assessment terminated due to repeated full-screen violations.');
          }
          return nextExit;
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [assessmentStatus]);

  // 3. Real-time Anti-cheating & Attention Monitoring via Canvas
  useEffect(() => {
    if (assessmentStatus !== 'active' || cameraPermission !== 'granted') return;

    let consecutiveAbsenceCount = 0;
    let consecutiveOffCenterCount = 0;
    let consecutiveMultipleFacesCount = 0;

    const intervalId = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState !== 4) return;

      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, 160, 120);
      const imageData = ctx.getImageData(0, 0, 160, 120);
      const data = imageData.data;

      let skinPixelCount = 0;
      let leftSkinPixels = 0;
      let rightSkinPixels = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Standard YCbCr skin tone detection logic
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;

        if (r > 60 && g > 40 && b > 20 && cr > 133 && cr < 173 && cb > 77 && cb < 127) {
          skinPixelCount++;
          const pixelIdx = i / 4;
          const x = pixelIdx % 160;
          if (x < 55) leftSkinPixels++;
          else if (x > 105) rightSkinPixels++;
        }
      }

      // 1. Check if face is missing from frame (< 350 skin pixels)
      if (skinPixelCount < 350) {
        consecutiveAbsenceCount++;
        if (consecutiveAbsenceCount >= 7) { // ~3.5 continuous seconds
          consecutiveAbsenceCount = 0;
          triggerViolation('Face Missing', 'Student left the camera frame or face is not visible. Please keep your face clearly visible.');
        }
      } else {
        consecutiveAbsenceCount = 0;
      }

      // 2. Check if student is looking significantly away / head turned away
      const sideRatio = (leftSkinPixels + 1) / (rightSkinPixels + 1);
      if (sideRatio > 4.2 || sideRatio < 0.23) {
        consecutiveOffCenterCount++;
        if (consecutiveOffCenterCount >= 7) { // ~3.5 continuous seconds
          consecutiveOffCenterCount = 0;
          triggerViolation('Sustained Gaze Shift', 'Sustained head movement / looking away from screen detected. Please keep your eyes focused on the assessment.');
        }
      } else {
        consecutiveOffCenterCount = 0;
      }

      // 3. Check for multiple faces
      if (skinPixelCount > 6800 && leftSkinPixels > 2200 && rightSkinPixels > 2200) {
        consecutiveMultipleFacesCount++;
        if (consecutiveMultipleFacesCount >= 7) {
          consecutiveMultipleFacesCount = 0;
          triggerViolation('Multiple Faces Detected', 'Multiple faces detected in the camera frame. The assessment must be taken alone.');
        }
      } else {
        consecutiveMultipleFacesCount = 0;
      }
    }, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [assessmentStatus, cameraPermission, currentIndex]);

  // Centralized Warning Trigger
  const triggerViolation = (type: string, message: string) => {
    if (assessmentStatus !== 'active') return;

    const currentQNum = suiteData.questions[currentIndex]?.question_number || currentIndex + 1;

    setViolationsLog(prev => [
      ...prev,
      { type, timestamp: new Date().toISOString(), question_number: currentQNum }
    ]);

    setWarningCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 4) {
        terminateAssessment('Assessment terminated due to repeated violations.');
        return newCount;
      }

      setCurrentWarningDetails({
        title: `Warning ${newCount}/3`,
        message: message,
        violationType: type
      });
      setActiveModal('warning');

      return newCount;
    });
  };

  // Terminate Assessment
  const terminateAssessment = async (reason: string) => {
    setAssessmentStatus('terminated');
    setActiveModal('terminated');

    // Stop camera stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
    }

    // Exit fullscreen
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
      warning_count: warningCount + 1,
      violations: violationsLog
    });

    setCompletedRecord(record);
  };

  const requestReentryFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setActiveModal('none');
    } catch (err) {
      console.warn('Re-entry fullscreen error:', err);
      setActiveModal('none');
    }
  };

  const { questions, subject_code, subject_name, total_questions } = suiteData;
  const currentQ: NormalizedAssessmentQuestion = questions[currentIndex] || questions[0];
  const qNum = currentQ.question_number;
  const selectedKey = userAnswers[qNum];

  const handleSelectOption = (optionKey: string) => {
    if (isSubmitted || isSubmitting || assessmentStatus === 'terminated') return;
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

  const handleFinishAssessment = async () => {
    if (isSubmitting || assessmentStatus === 'terminated') return;
    setIsSubmitting(true);

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
    const score = correctCount;

    // Stop camera stream completely
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

    // Save result to Supabase & localStorage
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
    setAssessmentStatus('submitted');
    setIsSubmitting(false);
  };

  // 1. RESULT SCREEN (After Finishing)
  if (isSubmitted && completedRecord) {
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

  // 2. ACTIVE EXAM MODE INTERFACE (FULL-SCREEN VIEWPORT)
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(userAnswers).length;
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-[#08090D] text-[#F7F5FA] flex flex-col overflow-y-auto min-h-screen">
      
      {/* Floating Webcam Preview (Top-Right, Non-Intrusive) */}
      {assessmentStatus === 'active' && cameraPermission === 'granted' && (
        <div className="fixed top-16 right-6 w-36 h-28 rounded-xl border border-white/20 bg-black/90 shadow-2xl z-40 overflow-hidden flex flex-col group transition-all">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
          <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[9px] bg-black/70 px-1.5 py-0.5 rounded text-white font-mono">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CAM ACTIVE
            </span>
            <span className="text-[#A6A1B2]">Warns: {warningCount}/3</span>
          </div>
        </div>
      )}

      {/* Hidden Canvas for Canvas Image Sampling */}
      <canvas ref={canvasRef} className="hidden" />

      {/* MODAL 1: CAMERA PERMISSION DENIED */}
      {activeModal === 'camera_permission' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#13111C] border border-red-500/40 rounded-2xl p-8 max-w-md text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <CameraOff className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Camera Access Required</h3>
              <p className="text-xs text-[#A6A1B2] leading-relaxed">
                Webcam monitoring is required for this proctored assessment. Please allow camera access in your browser settings to begin your test.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
              className="bg-[#C7FF4A] text-black font-bold hover:bg-[#b8f533] w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              Grant Camera Access & Retry
            </Button>
          </div>
        </div>
      )}

      {/* MODAL 2: CENTRALIZED WARNING MODAL (WARNING 1..3) */}
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

      {/* MODAL 3: ASSESSMENT TERMINATED (4TH VIOLATION OR 2ND FULLSCREEN EXIT) */}
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
                Attempt Cancelled
              </h3>
              <p className="text-xs text-[#A6A1B2] leading-relaxed">
                Assessment terminated due to repeated violations. Your answers up to this point have been saved.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => completedRecord && onFinishAssessment(completedRecord)}
              className="bg-[#C7FF4A] text-black font-bold hover:bg-[#b8f533] w-full"
            >
              View Assessment Summary
            </Button>
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
                    disabled={assessmentStatus === 'terminated'}
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
            disabled={currentIndex === 0 || assessmentStatus === 'terminated'}
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
              disabled={assessmentStatus === 'terminated'}
              className="bg-[#C7FF4A] text-black font-bold hover:bg-[#b8f533] shadow-lg shadow-[#C7FF4A]/20"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Finish Assessment
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={assessmentStatus === 'terminated'}
              className="text-xs"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};
