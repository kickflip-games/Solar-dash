// ─────────────────────────────────────────────────────────────────────────────
// useHandTracking.js
//
// React hook that:
//  1. Starts the webcam via getUserMedia.
//  2. Loads MediaPipe Hands via CDN script tags (no bundler woes).
//  3. Feeds each video frame to the detector.
//  4. Exposes { fingerX, handDetected, videoRef, canvasRef }
//
// fingerX is in [0, 1], mirrored so moving your hand LEFT gives a LOWER value
// and moving RIGHT gives a HIGHER value (mirrors the physical intuition).
//
// Only the index-finger TIP (landmark 8) X is used.
// Y is intentionally ignored as specified in the design.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { FINGER_SMOOTH_FACTOR } from '../constants/gameConfig';

// MediaPipe Hands CDN urls – loaded once via <script> tags
const MEDIAPIPE_HANDS_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
const MEDIAPIPE_DRAWING_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js';
const MEDIAPIPE_CAM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(); return;
    }
    const s = document.createElement('script');
    s.src = src; s.crossOrigin = 'anonymous';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

export function useHandTracking({ enabled = true } = {}) {
  const videoRef  = useRef(null);   // <video> element
  const canvasRef = useRef(null);   // <canvas> overlay for landmarks

  // smoothed finger X [0,1]
  const rawXRef     = useRef(0.5);
  const smoothXRef  = useRef(0.5);
  const [fingerX, setFingerX]       = useState(0.5);
  const [handDetected, setHandDetected] = useState(false);

  const lastHandRef = useRef(Date.now());
  const handsRef    = useRef(null);
  const mountedRef  = useRef(true);

  // Draw landmarks on the overlay canvas
  const drawLandmarks = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.multiHandLandmarks?.length) return;

    const landmarks = results.multiHandLandmarks[0];

    // Draw connectors (grey lines)
    ctx.strokeStyle = 'rgba(200,200,255,0.5)';
    ctx.lineWidth = 1.5;
    const CONNECTIONS = window.HAND_CONNECTIONS || [];
    for (const [a, b] of CONNECTIONS) {
      const la = landmarks[a], lb = landmarks[b];
      ctx.beginPath();
      // Note: canvas is mirrored via CSS, so we don't re-flip here
      ctx.moveTo(la.x * canvas.width, la.y * canvas.height);
      ctx.lineTo(lb.x * canvas.width, lb.y * canvas.height);
      ctx.stroke();
    }

    // Draw all landmarks (small dots)
    for (const lm of landmarks) {
      ctx.beginPath();
      ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100,180,255,0.8)';
      ctx.fill();
    }

    // Highlight index fingertip (landmark 8) with a bigger circle
    const tip = landmarks[8];
    ctx.beginPath();
    ctx.arc(tip.x * canvas.width, tip.y * canvas.height, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcc00';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    mountedRef.current = true;
    let animFrameId = null;
    // Capture the video element reference now so cleanup can use it safely
    const videoEl = videoRef.current;

    async function init() {
      try {
        // 1. Load scripts
        await loadScript(MEDIAPIPE_HANDS_URL);
        await loadScript(MEDIAPIPE_DRAWING_URL);
        await loadScript(MEDIAPIPE_CAM_URL);

        if (!mountedRef.current) return;

        // 2. Start webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false,
        });
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.play();

        // 3. Create MediaPipe Hands instance
        const hands = new window.Hands({
          locateFile: (f) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
        });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,   // 0 = lite, faster
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results) => {
          if (!mountedRef.current) return;

          drawLandmarks(results);

          if (results.multiHandLandmarks?.length) {
            const tip = results.multiHandLandmarks[0][8]; // index fingertip
            // MediaPipe X is mirrored by default in selfie mode – 0=left, 1=right
            // We keep it as-is: left side of screen = 0, right = 1.
            rawXRef.current = tip.x;
            lastHandRef.current = Date.now();

            if (!handDetected && mountedRef.current) setHandDetected(true);
          } else {
            if (handDetected && mountedRef.current) setHandDetected(false);
          }
        });

        handsRef.current = hands;

        // 4. Drive hand detection from the video frame loop
        // We use requestAnimationFrame instead of Camera util for more control.
        async function processFrame() {
          if (!mountedRef.current) return;
          if (video.readyState >= 2) {
            await handsRef.current.send({ image: video });
          }
          // Exponential moving average smoothing of fingerX
          smoothXRef.current =
            smoothXRef.current * (1 - FINGER_SMOOTH_FACTOR) +
            rawXRef.current * FINGER_SMOOTH_FACTOR;
          setFingerX(smoothXRef.current);

          animFrameId = requestAnimationFrame(processFrame);
        }
        animFrameId = requestAnimationFrame(processFrame);

      } catch (err) {
        console.warn('Hand tracking init error:', err);
      }
    }

    init();

    return () => {
      mountedRef.current = false;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (handsRef.current) handsRef.current.close();
      if (videoEl?.srcObject) {
        videoEl.srcObject.getTracks().forEach(t => t.stop());
        videoEl.srcObject = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { fingerX, handDetected, videoRef, canvasRef };
}
