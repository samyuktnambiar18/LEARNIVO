export type CameraStatus =
  | 'uninitialized'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unavailable'
  | 'disconnected'
  | 'error';

export type FaceStatus = 'no-face' | 'single-face' | 'multiple-faces' | 'low-confidence' | 'obstructed';

export type GazeStatus = 'center' | 'gaze-away';

export type MouthStatus = 'normal' | 'speaking';

export type DetectionState =
  | 'NORMAL'
  | 'MONITORING'
  | 'POTENTIAL_VIOLATION'
  | 'CONFIRMED_VIOLATION'
  | 'WARNING_SHOWN'
  | 'COOLDOWN'
  | 'CAMERA_ERROR'
  | 'ASSESSMENT_TERMINATED';

export type ViolationType =
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'SUSTAINED_GAZE_AWAY'
  | 'SUSTAINED_MOUTH_MOVEMENT'
  | 'CAMERA_OBSTRUCTED'
  | 'CAMERA_INTERRUPTED'
  | 'TAB_SWITCH'
  | 'FULLSCREEN_EXIT';

export interface ProctoringViolationEvent {
  type: ViolationType;
  timestamp: string;
  question_number: number;
  warning_number: number;
  message: string;
  confidence: number;
}

export interface ProctoringDebugInfo {
  cameraStatus: CameraStatus;
  faceStatus: FaceStatus;
  detectionState: DetectionState;
  detectedFaceCount: number;
  faceConfidence: number;
  gazeStatus: GazeStatus;
  mouthStatus: MouthStatus;
  luminance: number;
  consecutiveNoFace: number;
  consecutiveMultiFace: number;
  consecutiveGazeAway: number;
  consecutiveMouth: number;
  warningCount: number;
  cooldownRemainingMs: number;
  activeViolationType: ViolationType | null;
  fps: number;
  isLowLight: boolean;
}

export interface ProctoringConfig {
  maxWarnings: number;
  sampleIntervalMs: number;
  noFaceThresholdMs: number;
  multipleFacesThresholdMs: number;
  gazeThresholdMs: number;
  mouthThresholdMs: number;
  cooldownMs: number;
  minFaceConfidence: number;
  multiFaceMinConfidence: number;
}

const DEFAULT_CONFIG: ProctoringConfig = {
  maxWarnings: 3,
  sampleIntervalMs: 750,              // Controlled sampling (~1.3 fps) for smooth UI & high stability
  noFaceThresholdMs: 6000,            // 6.0s continuous missing face -> grace period prevents false positives
  multipleFacesThresholdMs: 4500,     // 4.5s continuous 2+ distinct high-confidence faces -> warning
  gazeThresholdMs: 6000,              // 6.0s continuous extreme gaze/head orientation away -> warning
  mouthThresholdMs: 6000,             // 6.0s continuous speaking motion -> warning
  cooldownMs: 15000,                  // 15s cooldown after any warning
  minFaceConfidence: 0.65,            // Min confidence threshold to validate primary face
  multiFaceMinConfidence: 0.72,       // Higher confidence requirement for secondary face to prevent false positives
};

interface SpatialCluster {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  pixelCount: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  aspectRatio: number;
  confidence: number;
}

export class ProctoringManager {
  private stream: MediaStream | null = null;
  private cameraStatus: CameraStatus = 'uninitialized';
  private faceStatus: FaceStatus = 'no-face';
  private gazeStatus: GazeStatus = 'center';
  private mouthStatus: MouthStatus = 'normal';
  private detectionState: DetectionState = 'NORMAL';
  private warningCount: number = 0;
  private isTerminated: boolean = false;
  private isPaused: boolean = false;
  private config: ProctoringConfig;

  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;
  private sampleTimer: number | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private isProcessingFrame: boolean = false;

  // Native Browser FaceDetector (if available in Chromium/Edge)
  private nativeFaceDetector: any = null;

  // Metrics for Debugging & Telemetry
  private detectedFaceCount: number = 0;
  private faceConfidence: number = 0;
  private meanLuminance: number = 128;
  private isLowLight: boolean = false;
  private lastFrameTime: number = Date.now();
  private measuredFps: number = 0;

  // Temporal Counters (Consecutive Validated Frames)
  private consecutiveNoFaceFrames: number = 0;
  private consecutiveMultipleFacesFrames: number = 0;
  private consecutiveGazeAwayFrames: number = 0;
  private consecutiveMouthMovementFrames: number = 0;
  private consecutiveNormalFrames: number = 0;

  // Active Violation Locks & Cooldowns
  private activeViolationType: ViolationType | null = null;
  private lastWarningTimestamp: number = 0;
  private activeViolationLock: Record<string, boolean> = {};

  // Previous Frame Mouth Region Cache for optical motion analysis
  private prevMouthData: Uint8ClampedArray | null = null;

  // Callbacks
  private onStatusChange?: (status: { cameraStatus: CameraStatus; faceStatus: FaceStatus; warningCount: number }) => void;
  private onViolation?: (event: ProctoringViolationEvent) => void;
  private onCameraInterrupted?: (reason: string) => void;
  private onDebugUpdate?: (debugInfo: ProctoringDebugInfo) => void;

  constructor(customConfig?: Partial<ProctoringConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 160;
    this.offscreenCanvas.height = 120;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    // Initialize Native FaceDetector if supported
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        const FaceDetectorClass = (window as any).FaceDetector;
        this.nativeFaceDetector = new FaceDetectorClass({ maxDetectedFaces: 5, fastMode: false });
      } catch (e) {
        this.nativeFaceDetector = null;
      }
    }
  }

  /**
   * Request webcam permission, verify stream, video dimensions, and frame reception
   */
  public async requestCamera(): Promise<MediaStream> {
    this.cameraStatus = 'requesting';
    this.notifyStatus();

    try {
      if (this.stream && this.stream.active) {
        const tracks = this.stream.getVideoTracks();
        if (tracks.length > 0 && tracks[0].readyState === 'live') {
          this.cameraStatus = 'active';
          this.notifyStatus();
          return this.stream;
        }
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.cameraStatus = 'unavailable';
        this.notifyStatus();
        throw new Error('Camera device API is not supported in this browser environment.');
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

      if (!stream || !stream.active || stream.getVideoTracks().length === 0) {
        this.cameraStatus = 'unavailable';
        this.notifyStatus();
        throw new Error('Camera stream could not be established.');
      }

      this.stream = stream;
      this.cameraStatus = 'active';

      // Bind track disconnection & mute listeners
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.handleCameraFailure('Camera connection lost or stream ended.');
        };
        videoTrack.onmute = () => {
          this.handleCameraFailure('Camera track muted or interrupted by hardware.');
        };
      }

      this.notifyStatus();
      return stream;
    } catch (err: any) {
      console.warn('ProctoringManager: Camera initialization error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'PermissionDismissedError') {
        this.cameraStatus = 'denied';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.cameraStatus = 'unavailable';
      } else {
        this.cameraStatus = 'error';
      }
      this.notifyStatus();
      throw err;
    }
  }

  /**
   * Attach video element for canvas frame sampling
   */
  public attachVideoElement(video: HTMLVideoElement) {
    this.videoElement = video;
    if (this.stream) {
      video.srcObject = this.stream;
      video.play().catch(e => console.warn('ProctoringManager video play error:', e));
    }
  }

  /**
   * Start continuous frame analysis monitoring loop
   */
  public startMonitoring(
    callbacks: {
      onStatusChange?: (status: { cameraStatus: CameraStatus; faceStatus: FaceStatus; warningCount: number }) => void;
      onViolation?: (event: ProctoringViolationEvent) => void;
      onCameraInterrupted?: (reason: string) => void;
      onDebugUpdate?: (debugInfo: ProctoringDebugInfo) => void;
    }
  ) {
    this.onStatusChange = callbacks.onStatusChange;
    this.onViolation = callbacks.onViolation;
    this.onCameraInterrupted = callbacks.onCameraInterrupted;
    this.onDebugUpdate = callbacks.onDebugUpdate;

    this.stopMonitoring();

    this.detectionState = 'MONITORING';
    this.sampleTimer = window.setInterval(() => {
      this.processFrameSafely();
    }, this.config.sampleIntervalMs);
  }

  /**
   * Stop frame monitoring loop
   */
  public stopMonitoring() {
    if (this.sampleTimer !== null) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    this.isProcessingFrame = false;
  }

  /**
   * Stop camera tracks and release resources
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
   * Async Safe Frame Processor Guard
   */
  private async processFrameSafely() {
    if (this.isProcessingFrame) return; // Prevent overlapping inferences
    this.isProcessingFrame = true;

    try {
      await this.processFrame();
    } catch (err) {
      console.warn('ProctoringManager frame processing error:', err);
    } finally {
      this.isProcessingFrame = false;
    }
  }

  /**
   * Core Computer Vision Detection Pipeline
   */
  private async processFrame() {
    if (this.isTerminated || this.isPaused || this.cameraStatus !== 'active' || !this.stream) {
      return;
    }

    // 1. Verify Camera Stream Health
    const tracks = this.stream.getVideoTracks();
    if (!tracks.length || tracks[0].readyState !== 'live' || !tracks[0].enabled) {
      this.handleCameraFailure('Camera connection lost or stream disabled.');
      return;
    }

    const video = this.videoElement;
    if (!video || video.readyState < 2 || video.paused || video.ended || video.videoWidth === 0) {
      return;
    }

    if (!this.offscreenCtx) return;

    // Measure FPS
    const now = Date.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    if (delta > 0) {
      this.measuredFps = Math.round(1000 / delta);
    }

    const w = this.offscreenCanvas.width;
    const h = this.offscreenCanvas.height;
    this.offscreenCtx.drawImage(video, 0, 0, w, h);

    // 2. Primary Native Face Detector Attempt (if available)
    let nativeFaceResults: any[] | null = null;
    if (this.nativeFaceDetector) {
      try {
        nativeFaceResults = await this.nativeFaceDetector.detect(this.offscreenCanvas);
      } catch (e) {
        nativeFaceResults = null;
      }
    }

    const imageData = this.offscreenCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // 3. Luminance & Exposure Check
    let totalLuminance = 0;
    const totalPixels = w * h;
    for (let i = 0; i < data.length; i += 4) {
      totalLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    this.meanLuminance = Math.round(totalLuminance / totalPixels);

    // Check camera obstruction / low light
    if (this.meanLuminance < 10) {
      // Extremely dark frame (camera lens covered or pitch black)
      this.faceStatus = 'obstructed';
      this.detectedFaceCount = 0;
      this.faceConfidence = 0;
      this.evaluateTemporalViolation('CAMERA_OBSTRUCTED');
      this.notifyDebugInfo();
      return;
    }

    this.isLowLight = this.meanLuminance >= 10 && this.meanLuminance < 35;

    // 4. Spatial Feature & Blob Clustering Analysis
    const gridCols = 8;
    const gridRows = 6;
    const cellW = w / gridCols;
    const cellH = h / gridRows;
    const gridSkinCount = new Array(gridCols * gridRows).fill(0);

    let totalSkinPixels = 0;
    let sumSkinX = 0;
    let sumSkinY = 0;
    let leftSkin = 0;
    let rightSkin = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // YCbCr Skin Tone Transformation
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;

      if (r > 45 && g > 30 && b > 15 && cr > 133 && cr < 173 && cb > 77 && cb < 127) {
        totalSkinPixels++;
        const pixelIdx = i / 4;
        const x = pixelIdx % w;
        const y = Math.floor(pixelIdx / w);

        sumSkinX += x;
        sumSkinY += y;

        if (x < w * 0.45) leftSkin++;
        else if (x > w * 0.55) rightSkin++;

        const col = Math.min(gridCols - 1, Math.floor(x / cellW));
        const row = Math.min(gridRows - 1, Math.floor(y / cellH));
        gridSkinCount[row * gridCols + col]++;
      }
    }

    // 5. Quad Grid Cluster Labeling (Group adjacent skin cells into distinct face candidates)
    const activeCells: boolean[] = gridSkinCount.map(count => count >= 60);
    const visitedCells: boolean[] = new Array(gridCols * gridRows).fill(false);
    const clusters: SpatialCluster[] = [];

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const idx = row * gridCols + col;
        if (activeCells[idx] && !visitedCells[idx]) {
          // Perform Flood Fill / BFS for this cluster
          const queue = [idx];
          visitedCells[idx] = true;

          let cMinX = col * cellW;
          let cMaxX = (col + 1) * cellW;
          let cMinY = row * cellH;
          let cMaxY = (row + 1) * cellH;
          let clusterSkinPixels = gridSkinCount[idx];

          while (queue.length > 0) {
            const curr = queue.shift()!;
            const r = Math.floor(curr / gridCols);
            const c = curr % gridCols;

            cMinX = Math.min(cMinX, c * cellW);
            cMaxX = Math.max(cMaxX, (c + 1) * cellW);
            cMinY = Math.min(cMinY, r * cellH);
            cMaxY = Math.max(cMaxY, (r + 1) * cellH);
            clusterSkinPixels += gridSkinCount[curr];

            // 4-neighbor lookup
            const neighbors = [
              r > 0 ? (r - 1) * gridCols + c : -1,
              r < gridRows - 1 ? (r + 1) * gridCols + c : -1,
              c > 0 ? r * gridCols + (c - 1) : -1,
              c < gridCols - 1 ? r * gridCols + (c + 1) : -1,
            ];

            for (const nIdx of neighbors) {
              if (nIdx >= 0 && activeCells[nIdx] && !visitedCells[nIdx]) {
                visitedCells[nIdx] = true;
                queue.push(nIdx);
              }
            }
          }

          const cW = cMaxX - cMinX;
          const cH = cMaxY - cMinY;
          const area = cW * cH;
          const aspectRatio = cH / (cW || 1);

          // Evaluate confidence for candidate face cluster
          let confidence = 0.50;
          if (clusterSkinPixels > 800) confidence += 0.20;
          if (aspectRatio >= 0.85 && aspectRatio <= 2.3) confidence += 0.15;
          if (area >= 1200) confidence += 0.10;

          if (clusterSkinPixels >= 400 && area >= 600) {
            clusters.push({
              minX: cMinX,
              maxX: cMaxX,
              minY: cMinY,
              maxY: cMaxY,
              pixelCount: clusterSkinPixels,
              centerX: (cMinX + cMaxX) / 2,
              centerY: (cMinY + cMaxY) / 2,
              width: cW,
              height: cH,
              aspectRatio,
              confidence: Math.min(0.98, confidence)
            });
          }
        }
      }
    }

    // 6. Combine Native FaceDetector results with Spatial Clustering
    let validFaces: number = 0;
    let primaryConfidence: number = 0;

    if (nativeFaceResults && nativeFaceResults.length > 0) {
      // Native Face Detector available and reported faces
      const highConfFaces = nativeFaceResults.filter((f: any) => {
        const box = f.boundingBox;
        const faceArea = (box.width || 0) * (box.height || 0);
        return faceArea > 400; // Ignore tiny distant noise artifacts
      });

      validFaces = highConfFaces.length;
      primaryConfidence = validFaces > 0 ? 0.95 : 0;
    } else {
      // Use Spatial Cluster Classifier
      // Filter distinct spatial face clusters
      const validatedFaceClusters = clusters.filter(c => c.confidence >= this.config.minFaceConfidence);

      if (validatedFaceClusters.length === 0) {
        validFaces = 0;
        primaryConfidence = 0;
      } else if (validatedFaceClusters.length === 1) {
        validFaces = 1;
        primaryConfidence = validatedFaceClusters[0].confidence;
      } else {
        // Multi-cluster check: ensure second cluster is a DISTINCT high-confidence face, not a neck/shoulder
        validatedFaceClusters.sort((a, b) => b.pixelCount - a.pixelCount);
        const primary = validatedFaceClusters[0];

        const secondaryFaces = validatedFaceClusters.slice(1).filter(sec => {
          const dist = Math.hypot(sec.centerX - primary.centerX, sec.centerY - primary.centerY);
          return dist > 35 && sec.confidence >= this.config.multiFaceMinConfidence && sec.pixelCount > 750;
        });

        if (secondaryFaces.length > 0) {
          validFaces = 1 + secondaryFaces.length;
          primaryConfidence = Math.max(primary.confidence, secondaryFaces[0].confidence);
        } else {
          validFaces = 1;
          primaryConfidence = primary.confidence;
        }
      }
    }

    this.detectedFaceCount = validFaces;
    this.faceConfidence = primaryConfidence;

    // Update Face Status
    if (validFaces === 0) {
      this.faceStatus = 'no-face';
    } else if (validFaces === 1) {
      this.faceStatus = 'single-face';
    } else {
      this.faceStatus = 'multiple-faces';
    }

    // 7. Gaze Orientation Analysis (When single face visible)
    if (validFaces === 1 && totalSkinPixels > 0) {
      const avgX = sumSkinX / totalSkinPixels;
      const leftRightRatio = (leftSkin + 1) / (rightSkin + 1);

      // Extreme lateral position or severe side ratio imbalance = gaze away
      const isExtremeGaze = leftRightRatio > 6.0 || leftRightRatio < 0.16 || avgX < 24 || avgX > 136;
      this.gazeStatus = isExtremeGaze ? 'gaze-away' : 'center';
    } else {
      this.gazeStatus = 'center';
    }

    // 8. Mouth / Speaking Movement Analysis (When single face visible)
    if (validFaces === 1) {
      const mouthYStart = Math.floor(h * 0.62);
      const mouthYEnd = Math.floor(h * 0.88);
      const mouthXStart = Math.floor(w * 0.32);
      const mouthXEnd = Math.floor(w * 0.68);

      const mouthPixelsLength = (mouthXEnd - mouthXStart) * (mouthYEnd - mouthYStart) * 4;
      const currentMouthData = new Uint8ClampedArray(mouthPixelsLength);

      let idx = 0;
      for (let y = mouthYStart; y < mouthYEnd; y++) {
        for (let x = mouthXStart; x < mouthXEnd; x++) {
          const pIdx = (y * w + x) * 4;
          currentMouthData[idx++] = data[pIdx];
          currentMouthData[idx++] = data[pIdx + 1];
          currentMouthData[idx++] = data[pIdx + 2];
          currentMouthData[idx++] = data[pIdx + 3];
        }
      }

      if (this.prevMouthData && this.prevMouthData.length === currentMouthData.length) {
        let diffSum = 0;
        for (let j = 0; j < currentMouthData.length; j += 4) {
          diffSum += Math.abs(currentMouthData[j] - this.prevMouthData[j]);
        }
        const avgMouthDiff = diffSum / (currentMouthData.length / 4);
        this.mouthStatus = avgMouthDiff > 32 ? 'speaking' : 'normal';
      } else {
        this.mouthStatus = 'normal';
      }
      this.prevMouthData = currentMouthData;
    } else {
      this.mouthStatus = 'normal';
    }

    // 9. Evaluate Temporal Persistence & Issue Warning
    this.evaluateTemporalViolation();
    this.notifyStatus();
    this.notifyDebugInfo();
  }

  /**
   * Centralized Temporal Validation Engine
   */
  private evaluateTemporalViolation(overrideViolation?: ViolationType) {
    if (this.isTerminated || this.isPaused) return;

    const frameInterval = this.config.sampleIntervalMs;
    const requiredNoFaceFrames = Math.ceil(this.config.noFaceThresholdMs / frameInterval);
    const requiredMultiFaceFrames = Math.ceil(this.config.multipleFacesThresholdMs / frameInterval);
    const requiredGazeFrames = Math.ceil(this.config.gazeThresholdMs / frameInterval);
    const requiredMouthFrames = Math.ceil(this.config.mouthThresholdMs / frameInterval);

    // Explicit Obstruction
    if (overrideViolation === 'CAMERA_OBSTRUCTED') {
      if (!this.activeViolationLock['CAMERA_OBSTRUCTED']) {
        this.issueWarning('CAMERA_OBSTRUCTED', 'Camera view is completely obstructed or dark. Please ensure your camera lens is clear.', 0.95);
        this.activeViolationLock['CAMERA_OBSTRUCTED'] = true;
      }
      return;
    }

    // --- EVALUATION 1: NO FACE DETECTED ---
    if (this.faceStatus === 'no-face') {
      this.consecutiveNoFaceFrames++;
      this.consecutiveMultipleFacesFrames = 0;
      this.consecutiveGazeAwayFrames = 0;
      this.consecutiveMouthMovementFrames = 0;
      this.consecutiveNormalFrames = 0;

      if (
        this.consecutiveNoFaceFrames >= requiredNoFaceFrames &&
        !this.activeViolationLock['NO_FACE']
      ) {
        this.issueWarning('NO_FACE', 'No face detected in video stream. Please remain clearly visible to the camera.', 0.90);
        this.activeViolationLock['NO_FACE'] = true;
      }
      return;
    } else {
      this.consecutiveNoFaceFrames = 0;
      this.activeViolationLock['NO_FACE'] = false;
    }

    // --- EVALUATION 2: MULTIPLE FACES DETECTED ---
    if (this.faceStatus === 'multiple-faces') {
      this.consecutiveMultipleFacesFrames++;
      this.consecutiveGazeAwayFrames = 0;
      this.consecutiveMouthMovementFrames = 0;
      this.consecutiveNormalFrames = 0;

      if (
        this.consecutiveMultipleFacesFrames >= requiredMultiFaceFrames &&
        !this.activeViolationLock['MULTIPLE_FACES']
      ) {
        this.issueWarning('MULTIPLE_FACES', 'Multiple faces detected in the camera frame. Please ensure you are the only person visible.', 0.95);
        this.activeViolationLock['MULTIPLE_FACES'] = true;
      }
      return;
    } else {
      this.consecutiveMultipleFacesFrames = 0;
      if (this.faceStatus === 'single-face') {
        this.consecutiveNormalFrames++;
        if (this.consecutiveNormalFrames >= 4) {
          this.activeViolationLock['MULTIPLE_FACES'] = false;
        }
      }
    }

    // --- EVALUATION 3 & 4: SINGLE FACE DETECTED (GAZE & MOUTH) ---
    if (this.faceStatus === 'single-face') {
      // Gaze Shift
      if (this.gazeStatus === 'gaze-away') {
        this.consecutiveGazeAwayFrames++;
        if (
          this.consecutiveGazeAwayFrames >= requiredGazeFrames &&
          !this.activeViolationLock['SUSTAINED_GAZE_AWAY']
        ) {
          this.issueWarning('SUSTAINED_GAZE_AWAY', 'Your face orientation was away from the assessment area for an extended period. Please look directly at the screen.', 0.88);
          this.activeViolationLock['SUSTAINED_GAZE_AWAY'] = true;
        }
      } else {
        this.consecutiveGazeAwayFrames = 0;
        this.activeViolationLock['SUSTAINED_GAZE_AWAY'] = false;
      }

      // Mouth Movement
      if (this.mouthStatus === 'speaking') {
        this.consecutiveMouthMovementFrames++;
        if (
          this.consecutiveMouthMovementFrames >= requiredMouthFrames &&
          !this.activeViolationLock['SUSTAINED_MOUTH_MOVEMENT']
        ) {
          this.issueWarning('SUSTAINED_MOUTH_MOVEMENT', 'Continuous mouth movement detected. Please refrain from speaking or reading aloud during the exam.', 0.85);
          this.activeViolationLock['SUSTAINED_MOUTH_MOVEMENT'] = true;
        }
      } else {
        this.consecutiveMouthMovementFrames = 0;
        this.activeViolationLock['SUSTAINED_MOUTH_MOVEMENT'] = false;
      }
    }
  }

  /**
   * Triggers a confirmed proctoring warning with mandatory cooldown protection
   */
  public issueWarning(type: ViolationType, message: string, confidence: number = 0.90, questionNumber: number = 1) {
    if (this.isTerminated) return;

    const now = Date.now();
    const elapsedSinceLastWarning = now - this.lastWarningTimestamp;

    // Cooldown check (Ensure at least 15s separation between distinct warnings)
    if (this.lastWarningTimestamp > 0 && elapsedSinceLastWarning < this.config.cooldownMs) {
      return;
    }

    this.lastWarningTimestamp = now;
    this.warningCount += 1;
    this.activeViolationType = type;
    this.detectionState = this.warningCount >= this.config.maxWarnings ? 'ASSESSMENT_TERMINATED' : 'WARNING_SHOWN';

    const event: ProctoringViolationEvent = {
      type,
      timestamp: new Date().toISOString(),
      question_number: questionNumber,
      warning_number: this.warningCount,
      message,
      confidence
    };

    if (this.onViolation) {
      this.onViolation(event);
    }

    if (this.warningCount >= this.config.maxWarnings) {
      this.isTerminated = true;
      this.stopMonitoring();
    }

    this.notifyStatus();
    this.notifyDebugInfo();
  }

  /**
   * Handle camera stream disconnection or hardware failure
   */
  private handleCameraFailure(reason: string) {
    this.cameraStatus = 'disconnected';
    this.isPaused = true;
    this.detectionState = 'CAMERA_ERROR';
    this.notifyStatus();
    this.notifyDebugInfo();
    if (this.onCameraInterrupted) {
      this.onCameraInterrupted(reason);
    }
  }

  public resumeMonitoring() {
    this.isPaused = false;
    this.detectionState = 'MONITORING';
    this.notifyStatus();
    this.notifyDebugInfo();
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

  public getDetectionState(): DetectionState {
    return this.detectionState;
  }

  public isExamTerminated(): boolean {
    return this.isTerminated;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public getDebugInfo(): ProctoringDebugInfo {
    const now = Date.now();
    const elapsed = now - this.lastWarningTimestamp;
    const cooldownRemainingMs = Math.max(0, this.config.cooldownMs - elapsed);

    return {
      cameraStatus: this.cameraStatus,
      faceStatus: this.faceStatus,
      detectionState: this.detectionState,
      detectedFaceCount: this.detectedFaceCount,
      faceConfidence: this.faceConfidence,
      gazeStatus: this.gazeStatus,
      mouthStatus: this.mouthStatus,
      luminance: this.meanLuminance,
      consecutiveNoFace: this.consecutiveNoFaceFrames,
      consecutiveMultiFace: this.consecutiveMultipleFacesFrames,
      consecutiveGazeAway: this.consecutiveGazeAwayFrames,
      consecutiveMouth: this.consecutiveMouthMovementFrames,
      warningCount: this.warningCount,
      cooldownRemainingMs,
      activeViolationType: this.activeViolationType,
      fps: this.measuredFps,
      isLowLight: this.isLowLight
    };
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

  private notifyDebugInfo() {
    if (this.onDebugUpdate) {
      this.onDebugUpdate(this.getDebugInfo());
    }
  }
}
