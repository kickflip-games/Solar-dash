// ─────────────────────────────────────────────────────────────────────────────
// GameOverScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';

export default function GameOverScreen({ score, onRestart }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.title}>GAME OVER</div>
        <div style={styles.scoreLabel}>SCORE</div>
        <div style={styles.score}>{Math.floor(score).toLocaleString()}</div>
        <p style={styles.hint}>Keep your index finger visible and centered</p>
        <button style={styles.btn} onClick={onRestart}>
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    textAlign: 'center', color: '#ffffff',
    padding: '40px 60px',
    background: 'rgba(10,5,30,0.95)',
    border: '1px solid rgba(255,80,80,0.4)',
    borderRadius: 16,
    boxShadow: '0 0 60px rgba(255,60,60,0.3)',
    minWidth: 300,
  },
  title: {
    fontSize: 40, fontWeight: 900, letterSpacing: 5,
    color: '#ff4444', marginBottom: 12,
    textShadow: '0 0 20px rgba(255,60,60,0.8)',
  },
  scoreLabel: {
    fontSize: 13, letterSpacing: 4, color: '#888', marginBottom: 4,
  },
  score: {
    fontSize: 64, fontWeight: 900,
    background: 'linear-gradient(90deg, #ffe066, #ff9900)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    marginBottom: 16, lineHeight: 1,
  },
  hint: {
    fontSize: 13, color: '#778', marginBottom: 24,
  },
  btn: {
    background: 'linear-gradient(90deg, #3366ff, #6633ff)',
    color: '#fff', border: 'none', borderRadius: 8,
    padding: '14px 40px', fontSize: 18, fontWeight: 700,
    cursor: 'pointer', letterSpacing: 2,
    boxShadow: '0 0 24px rgba(100,100,255,0.6)',
  },
};
