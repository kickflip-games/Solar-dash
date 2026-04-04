// ─────────────────────────────────────────────────────────────────────────────
// TitleScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';

export default function TitleScreen({ onStart }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.logo}>☀ SOLAR DASH</div>
        <p style={styles.tagline}>Dodge the obstacles. Ride the light.</p>
        <div style={styles.instructions}>
          <div style={styles.instrRow}>📷 Allow camera access when prompted</div>
          <div style={styles.instrRow}>☝ Hold your <b>index finger</b> up in front of the camera</div>
          <div style={styles.instrRow}>⬅ ➡ Move your finger <b>left & right</b> to steer</div>
          <div style={styles.instrRow}>🎯 Avoid the obstacles and survive as long as possible!</div>
        </div>
        <button style={styles.btn} onClick={onStart}>
          START GAME
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'linear-gradient(135deg, #050510 0%, #0a0a2a 60%, #0d0520 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    textAlign: 'center', color: '#ffffff',
    padding: '40px 50px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16,
    maxWidth: 480,
    boxShadow: '0 0 60px rgba(60,120,255,0.3)',
  },
  logo: {
    fontSize: 42, fontWeight: 900,
    letterSpacing: 4,
    background: 'linear-gradient(90deg, #ffe066, #ff9900, #ff5050)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    marginBottom: 8,
    textShadow: 'none',
  },
  tagline: {
    fontSize: 16, color: '#aabbff', marginBottom: 24, letterSpacing: 1,
  },
  instructions: {
    textAlign: 'left', marginBottom: 28,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 10, padding: '14px 18px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  instrRow: {
    fontSize: 14, color: '#ccd', lineHeight: 2, margin: '2px 0',
  },
  btn: {
    background: 'linear-gradient(90deg, #3366ff, #6633ff)',
    color: '#fff', border: 'none', borderRadius: 8,
    padding: '14px 40px', fontSize: 18, fontWeight: 700,
    cursor: 'pointer', letterSpacing: 2,
    boxShadow: '0 0 24px rgba(100,100,255,0.6)',
    transition: 'transform 0.1s',
  },
};
