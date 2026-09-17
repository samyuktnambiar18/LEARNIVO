export type CameraStatus = 'requesting' | 'active' | 'denied' | 'error' | 'disconnected';
export type FaceStatus = 'no-face' | 'single-face' | 'multiple-faces';
export type ViolationType =
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'PROLONGED_GAZE_AWAY'
  | 'SUSPICIOUS_MOUTH_MOVEMENT'
  | 'CAMERA_INTERRUPTED'
  | 'TAB_SWITCH'
  | 'FULLSCREEN_EXIT';

export interface ProctoringViolationEvent {
  type: ViolationType;
  timestamp: string;
  question_number: number;
  warning_number: number;
  message: string;
}

export interface ProctoringConfig {
  maxWarnings: number;
  noFaceThresholdMs: number;
  multipleFacesThresholdMs: number;
  gazeThresholdMs: number;
  mouthThresholdMs: number;
  cooldownMs: number;
  sampleIntervalMs: number;
}

const DEFAULT_CONFIG: ProctoringConfig = {
  maxWarnings: 3,
  noFaceThresholdMs: 2500,        // 2.5s continuous no face -> warning
  multipleFacesThresholdMs: 1800, // 1.8s continuous multiple faces -> warning
  gazeThresholdMs: 3800,          // 3.8s continuous gaze away -> warning
  mouthThresholdMs: 3200,         // 3.2s continuous rapid mouth variance -> warning
  cooldownMs: 8000,               // 8s cooldown before same violation type can re-trigger
  sampleIntervalMs: 250,          // Sample 4 frames per second for high efficiency
};

export class ProctoringManager {
  private stream: MediaStream | null = null;
  private cameraStatus: CameraStatus = 'requesting';
  private faceStatus: FaceStatus = 'no-face';
  private warningCount: number = 0;
  private isTerminated: boolean = false;
  private isPaused: boolean = false;
  private config: ProctoringConfig;

  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;
  private sampleTimer: number | null = null;
  private videoElement: HTMLVideoElement | null = null;

  // Temporal counters (Conforming frames)
  private consecutiveNoFaceFrames: number = 0;
  private consecutiveMultipleFacesFrames: number = 0;
  private consecutiveGazeAwayFrames: number = 0;
  private consecutiveMouthMovementFrames: number = 0;
  private consecutiveNormalFrames: number = 0;

  // Active Violation Locks & Cooldowns
  private activeViolationType: ViolationType | null = null;
  private lastWarningTimestamp: number = 0;
  private activeViolationLock: Record<string, boolean> = {};

  // Previous Frame Mouth Region Cache for optical delta analysis
  private prevMouthData: Uint8ClampedArray | null = null;

  // Event Callbacks
  private onStatusChange?: (status: { cameraStatus: CameraStatus; faceStatus: FaceStatus; warningCount: number }) => void;
  private onViolation?: (event: ProctoringViolationEvent) => void;
  private onCameraInterrupted?: (reason: string) => void;

  constructor(customConfig?: Partial<ProctoringConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 160;
    this.offscreenCanvas.height = 120;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Request webcam permission and establish persistent stream
   */
  public async requestCamera(): Promise<MediaStream> {
    this.cameraStatus = 'requesting';
    this.notifyStatus();

    try {
      if (this.stream && this.stream.active) {
        this.cameraStatus = 'active';
        this.notifyStatus();
        return this.stream;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false
      });

      this.stream = stream;
      this.cameraStatus = 'active';

      // Bind track disconnection handler
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.handleCameraFailure('Camera stream ended unexpectedly.');
        };
      }

      this.notifyStatus();
      return stream;
    } catch (err: any) {
      console.warn('ProctoringManager: Camera access failed:', err);
      this.cameraStatus = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' ? 'denied' : 'error';
      this.notifyStatus();
      throw err;
    }
  }

  /**
   * Attach video element for canvas sampling
   */
  public attachVideoElement(video: HTMLVideoElement) {
    this.videoElement = video;
    if (this.stream) {
      video.srcObject = this.stream;
      video.play().catch(e => console.warn('Video play error:', e));
    }
  }

  /**
   * Start continuous proctoring frame analysis loop
   */
  public startMonitoring(
    callbacks: {
      onStatusChange?: (status: { cameraStatus: CameraStatus; faceStatus: FaceStatus; warningCount: number }) => void;
      onViolation?: (event: ProctoringViolationEvent) => void;
      onCameraInterrupted?: (reason: string) => void;
    }
  ) {
    this.onStatusChange = callbacks.onStatusChange;
    this.onViolation = callbacks.onViolation;
    this.onCameraInterrupted = callbacks.onCameraInterrupted;

    if (this.sampleTimer !== null) {
      clearInterval(this.sampleTimer);
    }

    this.sampleTimer = window.setInterval(() => {
      this.processFrame();
    }, this.config.sampleIntervalMs);
  }

  /**
   * Stop frame monitoring loop (Leaves camera stream open if needed)
   */
  public stopMonitoring() {
    if (this.sampleTimer !== null) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
  }

  /**
   * Complete cleanup of stream & timers
   */
  public stopCamera() {
    this.stopMonitoring();
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.cameraStatus = 'disconnected';
    this.notifyStatus();
  }

  /**
   * Frame Processor: Analyzes camera feed using spatial skin segmentation & feature clustering
   */
  private processFrame() {
    if (this.isTerminated || this.isPaused || this.cameraStatus !== 'active' || !this.stream) return;

    // Check live track health
    const tracks = this.stream.getVideoTracks();
    if (!tracks.length || tracks[0].readyState !== 'live' || !tracks[0].enabled) {
      this.handleCameraFailure('Camera track is inactive or disabled.');
      return;
    }

    const video = this.videoElement;
    if (!video || video.readyState < 2 || video.paused || video.ended) {
      return;
    }

    if (!this.offscreenCtx) return;

    const w = 160;
    const h = 120;
    this.offscreenCtx.drawImage(video, 0, 0, w, h);
    const imageData = this.offscreenCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    let skinPixelCount = 0;
    let sumX = 0;
    let sumY = 0;

    // Spatial quadrant counters for multi-face detection
    let leftSkinPixels = 0;
    let rightSkinPixels = 0;
    let topSkinPixels = 0;
    let bottomSkinPixels = 0;

    // Grid-based spatial density maps (4x4 grid)
    const gridCols = 4;
    const gridRows = 4;
    const gridCounts = new Array(gridCols * gridRows).fill(0);
    const cellW = w / gridCols;
    const cellH = h / gridRows;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // YCbCr skin tone detection transformation
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;

      if (r > 50 && g > 35 && b > 20 && cr > 132 && cr < 173 && cb > 77 && cb < 127) {
        skinPixelCount++;
        const pixelIdx = i / 4;
        const x = pixelIdx % w;
        const y = Math.floor(pixelIdx / w);

        sumX += x;
        sumY += y;

        if (x < w * 0.42) leftSkinPixels++;
        else if (x > w * 0.58) rightSkinPixels++;

        if (y < h * 0.45) topSkinPixels++;
        else bottomSkinPixels++;

        const col = Math.min(gridCols - 1, Math.floor(x / cellW));
        const row = Math.min(gridRows - 1, Math.floor(y / cellH));
        gridCounts[row * gridCols + col]++;
      }
    }

    // Determine Face Count & Spatial Distribution
    let detectedFaces: 'none' | 'single' | 'multiple' = 'none';

    // Count dense skin clusters across non-adjacent grid sectors
    let denseGridSectorCount = 0;
    for (let i = 0; i < gridCounts.length; i++) {
      if (gridCounts[i] > 350) denseGridSectorCount++;
    }

    if (skinPixelCount < 320) {
      detectedFaces = 'none';
    } else if (skinPixelCount > 6800 && leftSkinPixels > 2200 && rightSkinPixels > 2200 && denseGridSectorCount >= 6) {
      // Multiple separate face clusters detected in frame
      detectedFaces = 'multiple';
    } else {
      detectedFaces = 'single';
    }

    // Update face status
    if (detectedFaces === 'none') {
      this.faceStatus = 'no-face';
    } else if (detectedFaces === 'multiple') {
      this.faceStatus = 'multiple-faces';
    } else {
      this.faceStatus = 'single-face';
    }

    this.notifyStatus();

    // Check temporal frame thresholds
    const frameInterval = this.config.sampleIntervalMs;
    const requiredNoFaceFrames = Math.ceil(this.config.noFaceThresholdMs / frameInterval);
    const requiredMultipleFaceFrames = Math.ceil(this.config.multipleFacesThresholdMs / frameInterval);
    const requiredGazeAwayFrames = Math.ceil(this.config.gazeThresholdMs / frameInterval);
    const requiredMouthFrames = Math.ceil(this.config.mouthThresholdMs / frameInterval);

    // ------------------------------------------------------------------------
    // EVALUATION 1: NO FACE DETECTED
    // ------------------------------------------------------------------------
    if (detectedFaces === 'none') {
      this.consecutiveNoFaceFrames++;
      this.consecutiveMultipleFacesFrames = 0;
      this.consecutiveGazeAwayFrames = 0;
      this.consecutiveMouthMovementFrames = 0;
      this.consecutiveNormalFrames = 0;

      if (
        this.consecutiveNoFaceFrames >= requiredNoFaceFrames &&
        !this.activeViolationLock['NO_FACE']
      ) {
        this.issueWarning(
          'NO_FACE',
          'No face detected. Please remain visible to the camera.'
        );
        this.activeViolationLock['NO_FACE'] = true;
      }
      return;
    } else {
      this.consecutiveNoFaceFrames = 0;
      this.activeViolationLock['NO_FACE'] = false;
    }

    // ------------------------------------------------------------------------
    // EVALUATION 2: MULTIPLE FACES DETECTED
    // ------------------------------------------------------------------------
    if (detectedFaces === 'multiple') {
      this.consecutiveMultipleFacesFrames++;
      this.consecutiveGazeAwayFrames = 0;
      this.consecutiveMouthMovementFrames = 0;
      this.consecutiveNormalFrames = 0;

      if (
        this.consecutiveMultipleFacesFrames >= requiredMultipleFaceFrames &&
        !this.activeViolationLock['MULTIPLE_FACES']
      ) {
        this.issueWarning(
          'MULTIPLE_FACES',
          'Multiple faces detected. Please ensure you are the only person visible.'
        );
        this.activeViolationLock['MULTIPLE_FACES'] = true;
      }
      return;
    } else {
      this.consecutiveMultipleFacesFrames = 0;
      // Clear multiple face lock when state returns to single face consistently
      if (detectedFaces === 'single') {
        this.consecutiveNormalFrames++;
        if (this.consecutiveNormalFrames >= 6) {
          this.activeViolationLock['MULTIPLE_FACES'] = false;
        }
      }
    }

    // ------------------------------------------------------------------------
    // EVALUATION 3: PROLONGED GAZE / HEAD SHIFT AWAY
    // ------------------------------------------------------------------------
    if (detectedFaces === 'single') {
      const avgX = sumX / skinPixelCount;
      const sideRatio = (leftSkinPixels + 1) / (rightSkinPixels + 1);

      // Gaze shift threshold: centroid shifted to extreme margins or severe ratio imbalance
      const isOffCenter = sideRatio > 5.2 || sideRatio < 0.18 || avgX < 20 || avgX > 140;

      if (isOffCenter) {
        this.consecutiveGazeAwayFrames++;
        if (
          this.consecutiveGazeAwayFrames >= requiredGazeAwayFrames &&
          !this.activeViolationLock['PROLONGED_GAZE_AWAY']
        ) {
          this.issueWarning(
            'PROLONGED_GAZE_AWAY',
            'Please keep your attention on the examination screen.'
          );
          this.activeViolationLock['PROLONGED_GAZE_AWAY'] = true;
        }
      } else {
        this.consecutiveGazeAwayFrames = 0;
        this.activeViolationLock['PROLONGED_GAZE_AWAY'] = false;
      }

      // ------------------------------------------------------------------------
      // EVALUATION 4: SUSPICIOUS MOUTH / SPEECH MOVEMENT
      // ------------------------------------------------------------------------
      // Sample lower-third face region (Mouth ROI)
      const mouthYStart = Math.floor(h * 0.60);
      const mouthYEnd = Math.floor(h * 0.88);
      const mouthXStart = Math.floor(w * 0.30);
      const mouthXEnd = Math.floor(w * 0.70);

      const mouthPixelsLength = (mouthXEnd - mouthXStart) * (mouthYEnd - mouthYStart) * 4;
      const currentMouthData = new Uint8ClampedArray(mouthPixelsLength);

      let mouthDataIdx = 0;
      for (let y = mouthYStart; y < mouthYEnd; y++) {
        for (let x = mouthXStart; x < mouthXEnd; x++) {
          const idx = (y * w + x) * 4;
          currentMouthData[mouthDataIdx++] = data[idx];     // R
          currentMouthData[mouthDataIdx++] = data[idx + 1]; // G
          currentMouthData[mouthDataIdx++] = data[idx + 2]; // B
          currentMouthData[mouthDataIdx++] = data[idx + 3]; // A
        }
      }

      if (this.prevMouthData && this.prevMouthData.length === currentMouthData.length) {
        let diffSum = 0;
        for (let j = 0; j < currentMouthData.length; j += 4) {
          diffSum += Math.abs(currentMouthData[j] - this.prevMouthData[j]);
        }
        const avgMouthDiff = diffSum / (currentMouthData.length / 4);

        if (avgMouthDiff > 28) {
          this.consecutiveMouthMovementFrames++;
          if (
            this.consecutiveMouthMovementFrames >= requiredMouthFrames &&
            !this.activeViolationLock['SUSPICIOUS_MOUTH_MOVEMENT']
          ) {
            this.issueWarning(
              'SUSPICIOUS_MOUTH_MOVEMENT',
              'Suspicious mouth movement detected. Please remain quiet during the exam.'
            );
            this.activeViolationLock['SUSPICIOUS_MOUTH_MOVEMENT'] = true;
          }
        } else {
          this.consecutiveMouthMovementFrames = 0;
          this.activeViolationLock['SUSPICIOUS_MOUTH_MOVEMENT'] = false;
        }
      }
      this.prevMouthData = currentMouthData;
    }
  }

  /**
   * Triggers a proctoring warning with cooldown protection and max threshold escalation
   */
  public issueWarning(type: ViolationType, message: string, questionNumber: number = 1) {
    if (this.isTerminated) return;

    const now = Date.now();
    if (now - this.lastWarningTimestamp < this.config.cooldownMs) {
      return; // Cooldown active, ignore duplicate triggers
    }

    this.lastWarningTimestamp = now;
    this.warningCount += 1;

    const event: ProctoringViolationEvent = {
      type,
      timestamp: new Date().toISOString(),
      question_number: questionNumber,
      warning_number: this.warningCount,
      message
    };

    if (this.onViolation) {
      this.onViolation(event);
    }

    if (this.warningCount >= this.config.maxWarnings) {
      this.isTerminated = true;
      this.stopMonitoring();
    }

    this.notifyStatus();
  }

  /**
   * Handle camera stream disconnection or failure
   */
  private handleCameraFailure(reason: string) {
    this.cameraStatus = 'disconnected';
    this.isPaused = true;
    this.notifyStatus();
    if (this.onCameraInterrupted) {
      this.onCameraInterrupted(reason);
    }
  }

  public resumeMonitoring() {
    this.isPaused = false;
    this.notifyStatus();
  }

  public getWarningCount(): number {
    return this.warningCount;
  }

  public getCameraStatus(): CameraStatus {
    return this.cameraStatus;
  }

  public getFaceStatus(): FaceStatus {
    return this.faceStatus;
  }

  public isExamTerminated(): boolean {
    return this.isTerminated;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  private notifyStatus() {
    if (this.onStatusChange) {
      this.onStatusChange({
        cameraStatus: this.cameraStatus,
        faceStatus: this.faceStatus,
        warningCount: this.warningCount
      });
    }
  }
}
