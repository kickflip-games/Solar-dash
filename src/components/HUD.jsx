// ─────────────────────────────────────────────────────────────────────────────
// HUD.jsx
// Overlaid on top of the canvas. Shows score, hand tracking status, lane, speed.
// Also shows the small webcam preview with landmark overlay canvas.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';

export default function HUD({ score, handDetected, lane, fingerX, videoRef, canvasRef, speed }) {
  const [showCam, setShowCam] = useState(true);

  const laneNames = ['LEFT', 'CENTER', 'RIGHT'];

  return (
    <div style={styles.hud} aria-label="HUD">
      {/* ── Top bar ── */}
      <div style={styles.topBar}>
        <div style={styles.scoreBox}>
          <span style={styles.scoreLabel}>SCORE</span>
          <span style={styles.scoreValue}>{Math.floor(score).toLocaleString()}</span>
        </div>
        <div style={styles.statusBox}>
          <div style={handDetected ? styles.handOk : styles.handLost}>
            {handDetected ? '☝ HAND DETECTED' : '✋ NO HAND'}
          </div>
          <div style={styles.laneBox}>
            LANE: <b>{laneNames[lane] ?? '—'}</b>
          </div>
          <div style={styles.speedBox}>
            {Math.floor(speed)} u/s
          </div>
        </div>
      </div>

      {/* ── Control guide (centre bottom) ── */}
      <div style={styles.guideBar}>
        <div style={styles.guideTrack}>
          <div style={styles.guideLeft}>LEFT</div>
          <div style={styles.guideMid}>CENTRE</div>
          <div style={styles.guideRight}>RIGHT</div>
          {/* finger position indicator */}
          <div style={{ ...styles.fingerDot, left: `calc(${fingerX * 100}% - 6px)` }} />
        </div>
      </div>

      {/* ── Webcam preview toggle ── */}
      <div style={styles.camPanel}>
        <button style={styles.camToggle} onClick={() => setShowCam(v => !v)}>
          {showCam ? '🎥 Hide Cam' : '🎥 Show Cam'}
        </button>
        {showCam && (
          <div style={styles.camContainer}>
            <video
              ref={videoRef}
              style={styles.camVideo}
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} style={styles.camCanvas} width={320} height={240} />
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  hud: {
    position: 'fixed', inset: 0, pointerEvents: 'none',
    zIndex: 5,
    fontFamily: "'Segoe UI', monospace",
  },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '10px 16px',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
  },
  scoreBox: {
    display: 'flex', flexDirection: 'column',
  },
  scoreLabel: {
    fontSize: 11, letterSpacing: 3, color: '#888',
  },
  scoreValue: {
    fontSize: 30, fontWeight: 900, color: '#ffe066',
    textShadow: '0 0 12px rgba(255,200,0,0.7)',
    lineHeight: 1,
  },
  statusBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
  },
  handOk: {
    fontSize: 12, color: '#44ff88', fontWeight: 700, letterSpacing: 1,
    background: 'rgba(0,80,40,0.5)', padding: '3px 8px', borderRadius: 4,
    border: '1px solid rgba(60,200,100,0.4)',
  },
  handLost: {
    fontSize: 12, color: '#ff6644', fontWeight: 700, letterSpacing: 1,
    background: 'rgba(80,20,10,0.5)', padding: '3px 8px', borderRadius: 4,
    border: '1px solid rgba(200,80,60,0.4)',
    animation: 'pulse 1s infinite',
  },
  laneBox: {
    fontSize: 12, color: '#aabbff',
  },
  speedBox: {
    fontSize: 11, color: '#778', fontVariantNumeric: 'tabular-nums',
  },
  guideBar: {
    position: 'absolute', bottom: 20, left: '50%',
    transform: 'translateX(-50%)',
    width: 240,
  },
  guideTrack: {
    position: 'relative',
    display: 'flex', justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 20, padding: '5px 12px',
    fontSize: 11, color: '#778', userSelect: 'none',
  },
  guideLeft:  { flex: 1, textAlign: 'left'   },
  guideMid:   { flex: 1, textAlign: 'center' },
  guideRight: { flex: 1, textAlign: 'right'  },
  fingerDot: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: 12, height: 12, borderRadius: '50%',
    background: '#ffe066',
    boxShadow: '0 0 8px rgba(255,200,0,0.9)',
    transition: 'left 0.1s',
  },
  camPanel: {
    position: 'absolute', bottom: 20, right: 12,
    pointerEvents: 'all',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
  },
  camToggle: {
    background: 'rgba(30,30,60,0.8)', color: '#aabbff',
    border: '1px solid rgba(100,100,200,0.4)',
    borderRadius: 6, padding: '4px 10px', fontSize: 12,
    cursor: 'pointer',
  },
  camContainer: {
    position: 'relative', width: 160, height: 120, borderRadius: 8, overflow: 'hidden',
    border: '1px solid rgba(100,100,200,0.4)',
    boxShadow: '0 0 16px rgba(60,80,200,0.4)',
  },
  camVideo: {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',  // mirror so it feels like a selfie view
  },
  camCanvas: {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    transform: 'scaleX(-1)',  // mirror to match video
  },
};
