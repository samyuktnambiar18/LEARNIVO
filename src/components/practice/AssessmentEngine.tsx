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
  X,
  ShieldCheck,
  Check
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

  // Assessment Stage & Monitoring State
  const [stage, setStage] = useState<'pre_check' | 'active' | 'submitted' | 'terminated'>('pre_check');
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isStreamActive, setIsStreamActive] = useState<boolean>(false);
  const [isFaceDetectedPreCheck, setIsFaceDetectedPreCheck] = useState<boolean>(false);
  const [preCheckError, setPreCheckError] = useState<string | null>(null);

  // Violation & Warning State
  const [warningCount, setWarningCount] = useState<number>(0);
  const [activeModal, setActiveModal] = useState<'none' | 'camera_permission' | 'warning' | 'terminated'>('none');
  const [currentWarningDetails, setCurrentWarningDetails] = useState<{ title: string; message: string; violationType: string } | null>(null);
  const [violationsLog, setViolationsLog] = useState<{ type: string; timestamp: string; question_number: number; warning_number: number }[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const preCheckVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cooldown & Persistence Refs (Prevent double-counting violations)
  const cooldownUntilRef = useRef<number>(0); // Timestamp until which new violations are suppressed
  const warningCountRef = useRef<number>(0); // Keep ref synced with warningCount state for async callbacks
  const stageRef = useRef<'pre_check' | 'active' | 'submitted' | 'terminated'>('pre_check');

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    warningCountRef.current = warningCount;
  }, [warningCount]);

  // 1. Initial Camera Permission & Pre-check Stream Acquisition
  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      setPreCheckError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' }
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        setMediaStream(stream);
        setCameraPermission('granted');
        setIsStreamActive(true);

        // Bind camera disconnect/ended listener
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            if (isMounted) {
              setIsStreamActive(false);
              setPreCheckError('Camera stream disconnected or stopped.');
              if (stageRef.current === 'active') {
                setActiveModal('camera_permission');
              }
            }
          };
        }

        if (preCheckVideoRef.current) {
          preCheckVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera access denied or unavailable:', err);
        if (isMounted) {
          setCameraPermission('denied');
          setIsStreamActive(false);
          setPreCheckError('Camera access is required to attend this assessment.');
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync video elements when mediaStream updates
  useEffect(() => {
    if (mediaStream) {
      if (preCheckVideoRef.current && stage === 'pre_check') {
        preCheckVideoRef.current.srcObject = mediaStream;
      }
      if (videoRef.current && stage === 'active') {
        videoRef.current.srcObject = mediaStream;
      }
    }
  }, [mediaStream, stage]);

  // Clean up media tracks on component unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [mediaStream]);

  // 2. Pre-Check Verification Loop (Runs until usable face detected)
  useEffect(() => {
    if (stage !== 'pre_check' || !mediaStream || !isStreamActive) return;

    const intervalId = setInterval(() => {
      const video = preCheckVideoRef.current;
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
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;

        if (r > 60 && g > 40 && b > 20 && cr > 133 && cr < 173 && cb > 77 && cb < 127) {
          skinPixelCount++;
        }
      }

      // Usable face check threshold
      if (skinPixelCount >= 350) {
        setIsFaceDetectedPreCheck(true);
      } else {
        setIsFaceDetectedPreCheck(false);
      }
    }, 400);

    return () => clearInterval(intervalId);
  }, [stage, mediaStream, isStreamActive]);

  // Handler: Start Active Assessment & Request Fullscreen
  const handleStartActiveAssessment = async () => {
    if (cameraPermission !== 'granted' || !isStreamActive || !isFaceDetectedPreCheck) return;

    setStage('active');

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request note:', err);
    }
  };

  // 3. Fullscreen Exit Event Listener during Active Stage
  useEffect(() => {
    if (stage !== 'active') return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && stageRef.current === 'active') {
        // Enforce cooldown so single exit doesn't double-trigger
        if (Date.now() < cooldownUntilRef.current) return;

        triggerViolation(
          'Fullscreen Exit',
          'You exited fullscreen mode. Please return to fullscreen to continue your assessment.'
        );
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [stage]);

  // 4. Real-Time Camera Monitoring (Active Stage) with Temporal Smoothing & Cooldown
  useEffect(() => {
    if (stage !== 'active' || cameraPermission !== 'granted' || !mediaStream) return;

    let consecutiveAbsenceCount = 0;
    let consecutiveOffCenterCount = 0;
    let consecutiveMultipleFacesCount = 0;

    const intervalId = setInterval(() => {
      if (stageRef.current !== 'active') return;

      const video = videoRef.current;
      if (!video || video.readyState !== 4) return;

      // Check stream video track status
      const tracks = mediaStream.getVideoTracks();
      if (!tracks.length || tracks[0].readyState !== 'live' || !tracks[0].enabled) {
        setIsStreamActive(false);
        setActiveModal('camera_permission');
        return;
      }

      // If currently under violation cooldown period, skip processing frame
      if (Date.now() < cooldownUntilRef.current) return;

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

      // Signal 1: Face Missing (Skin pixels < 300)
      // Persistence requirement: 8 consecutive frames (~3.2 - ~4.0 seconds)
      if (skinPixelCount < 300) {
        consecutiveAbsenceCount++;
        if (consecutiveAbsenceCount >= 8) {
          consecutiveAbsenceCount = 0;
          triggerViolation(
            'Face Missing',
            'Your face was not detected in frame. Please remain visible to the camera.'
          );
          return;
        }
      } else {
        consecutiveAbsenceCount = 0;
      }

      // Signal 2: Sustained Gaze / Head Shift Away (Side ratio > 4.8 or < 0.20)
      // Persistence requirement: 8 consecutive frames (~3.2 - ~4.0 seconds)
      const sideRatio = (leftSkinPixels + 1) / (rightSkinPixels + 1);
      if (sideRatio > 4.8 || sideRatio < 0.20) {
        consecutiveOffCenterCount++;
        if (consecutiveOffCenterCount >= 8) {
          consecutiveOffCenterCount = 0;
          triggerViolation(
            'Sustained Gaze Shift',
            'Please keep your attention on the assessment screen.'
          );
          return;
        }
      } else {
        consecutiveOffCenterCount = 0;
      }

      // Signal 3: Multiple Clear Human Faces (Skin pixels > 7200 and dense in both left & right sections)
      // Persistence requirement: 7 consecutive frames (~2.8 - ~3.5 seconds)
      if (skinPixelCount > 7200 && leftSkinPixels > 2400 && rightSkinPixels > 2400) {
        consecutiveMultipleFacesCount++;
        if (consecutiveMultipleFacesCount >= 7) {
          consecutiveMultipleFacesCount = 0;
          triggerViolation(
            'Multiple Faces Detected',
            'More than one face was detected. Please ensure you are the only person visible to the camera.'
          );
          return;
        }
      } else {
        consecutiveMultipleFacesCount = 0;
      }
    }, 400);

    return () => clearInterval(intervalId);
  }, [stage, cameraPermission, mediaStream, currentIndex]);

  // Centralized Violation Trigger & Cooldown Manager
  const triggerViolation = (type: string, message: string) => {
    if (stageRef.current !== 'active') return;

    // Start 12-second violation cooldown period to avoid double-counting continuous events
    cooldownUntilRef.current = Date.now() + 12000;

    const currentQNum = suiteData.questions[currentIndex]?.question_number || currentIndex + 1;
    const nextWarning = warningCountRef.current + 1;

    setViolationsLog(prev => [
      ...prev,
      {
        type,
        timestamp: new Date().toISOString(),
        question_number: currentQNum,
        warning_number: nextWarning
      }
    ]);

    setWarningCount(nextWarning);

    // Strict Escalation Policy: 3 warnings max
    // Violation 1 -> Warning 1/3 Modal
    // Violation 2 -> Warning 2/3 Modal
    // Violation 3 -> Immediate Termination Modal & Exam Halt
    if (nextWarning >= 3) {
      terminateAssessment('Assessment terminated due to repeated monitoring violations.');
    } else {
      let title = `Warning ${nextWarning}/3`;
      let formattedMsg = message;

      if (nextWarning === 2) {
        formattedMsg = `Warning 2/3 — Continued suspicious behavior may terminate your assessment. (${type})`;
      } else if (!formattedMsg.startsWith('Warning')) {
        formattedMsg = `Warning ${nextWarning}/3 — ${message}`;
      }

      setCurrentWarningDetails({
        title,
        message: formattedMsg,
        violationType: type
      });
      setActiveModal('warning');
    }
  };

  // Terminate Assessment Execution
  const terminateAssessment = async (reason: string) => {
    setStage('terminated');
    setActiveModal('terminated');

    // Stop webcam tracks immediately
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
    }

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

  const handleFinishAssessment = async () => {
    if (isSubmitting || stage === 'terminated') return;
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

  // Hidden Canvas Element for Camera Pixel Sampling
  const hiddenCanvas = <canvas ref={canvasRef} className="hidden" />;

  // --------------------------------------------------------------------------
  // STAGE 0: PRE-CHECK STAGE (CAMERA & FACE MANDATORY BEFORE STARTING TEST)
  // --------------------------------------------------------------------------
  if (stage === 'pre_check') {
    const isReadyToStart = cameraPermission === 'granted' && isStreamActive && isFaceDetectedPreCheck;

    return (
      <div className="fixed inset-0 z-50 bg-[#08090D] text-[#F7F5FA] flex items-center justify-center p-6 overflow-y-auto min-h-screen">
        {hiddenCanvas}
        <div className="surface-card p-8 border border-white/10 rounded-2xl bg-[#0D0B14] max-w-xl w-full space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C7FF4A]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-[#C7FF4A]/10 text-[#C7FF4A] border border-[#C7FF4A]/30 uppercase">
                Proctored Exam Security Setup
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

          {/* Video Preview & Status Overlay */}
          <div className="relative w-full h-56 rounded-xl border border-white/15 bg-black/90 overflow-hidden flex items-center justify-center shadow-inner">
            {cameraPermission === 'granted' && isStreamActive ? (
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
                  Camera access is required to attend this assessment.
                </p>
              </div>
            )}

            {/* Live Camera Badge */}
            {cameraPermission === 'granted' && isStreamActive && (
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                WEBCAM READY
              </div>
            )}
          </div>

          {/* Verification Checklist */}
          <div className="space-y-3 bg-[#13111C] p-5 rounded-xl border border-white/10">
            <h4 className="text-xs font-semibold text-[#A6A1B2] uppercase tracking-wider">
              Environment Verification Checklist
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white">
                  <Camera className="w-4 h-4 text-[#C7FF4A]" />
                  Webcam Permission
                </span>
                {cameraPermission === 'granted' ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Granted
                  </span>
                ) : (
                  <span className="font-bold text-rose-400">Denied / Pending</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white">
                  <Sparkles className="w-4 h-4 text-[#C7FF4A]" />
                  Video Stream Quality
                </span>
                {isStreamActive ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Active
                  </span>
                ) : (
                  <span className="font-bold text-rose-400">Unavailable</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white">
                  <Users className="w-4 h-4 text-[#C7FF4A]" />
                  Face Detection
                </span>
                {isFaceDetectedPreCheck ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Face Verified
                  </span>
                ) : (
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Detecting Face...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Error Message callout if denied */}
          {preCheckError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{preCheckError}</span>
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
              Start Assessment & Enter Fullscreen
            </Button>

            {!isReadyToStart && (
              <p className="text-[11px] text-center text-[#A6A1B2]">
                Please ensure your face is clearly visible in the camera preview to activate the assessment.
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
        {hiddenCanvas}
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
      {hiddenCanvas}

      {/* Floating Webcam Preview (Top-Right, Away from question content) */}
      {stage === 'active' && cameraPermission === 'granted' && (
        <div className="fixed top-16 right-6 w-36 h-28 rounded-xl border border-white/20 bg-black/90 shadow-2xl z-40 overflow-hidden flex flex-col group transition-all">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
          <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[9px] bg-black/75 px-1.5 py-0.5 rounded text-white font-mono">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              MONITORING ACTIVE
            </span>
            <span className="text-[#A6A1B2]">Warns: {warningCount}/3</span>
          </div>
        </div>
      )}

      {/* MODAL 1: CAMERA PERMISSION DENIED OR DISCONNECTED */}
      {activeModal === 'camera_permission' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#13111C] border border-red-500/40 rounded-2xl p-8 max-w-md text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <CameraOff className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Camera Access Required</h3>
              <p className="text-xs text-[#A6A1B2] leading-relaxed">
                Camera access is required to attend this assessment. Please allow camera access to continue.
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

      {/* MODAL 2: CENTRALIZED WARNING MODAL (WARNING 1..2) */}
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
                Your assessment was terminated because the maximum number of monitoring violations was reached.
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
