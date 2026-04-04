// ─────────────────────────────────────────────────────────────────────────────
// App.jsx  –  Root component for Solar Dash
//
// Game states:
//   'title'    → TitleScreen
//   'playing'  → RunnerScene + HUD
//   'gameover' → GameOverScreen (rendered over paused scene)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useCallback, useEffect } from 'react';
import TitleScreen    from './components/TitleScreen';
import GameOverScreen from './components/GameOverScreen';
import HUD            from './components/HUD';
import RunnerScene    from './components/RunnerScene';
import { useHandTracking } from './hooks/useHandTracking';

export default function App() {
  const [gameState, setGameState] = useState('title'); // 'title' | 'playing' | 'gameover'
  const [score,     setScore]     = useState(0);
  const [speed,     setSpeed]     = useState(14);

  // sceneKey forces RunnerScene to remount (full reset) on restart
  const [sceneKey, setSceneKey] = useState(0);

  // Hand tracking is active once we leave the title screen
  const trackingEnabled = gameState !== 'title';
  const { fingerX, handDetected, videoRef, canvasRef } = useHandTracking({ enabled: trackingEnabled });

  // Timestamp of last hand detection; passed to RunnerScene for grace-period logic.
  // Updated via effect so we don't call Date.now() during render.
  const lastHandRef = useRef(0);
  useEffect(() => {
    if (handDetected) {
      lastHandRef.current = performance.now();
    }
  });

  // Lane derived from fingerX for HUD display
  const displayLane =
    fingerX < 0.35 ? 0 :
    fingerX > 0.65 ? 2 : 1;

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    setGameState('playing');
  }, []);

  const handleCollision = useCallback((finalScore) => {
    setScore(finalScore);
    setGameState('gameover');
  }, []);

  const handleRestart = useCallback(() => {
    setScore(0);
    setSpeed(14);
    setSceneKey(k => k + 1);
    setGameState('playing');
  }, []);

  const handleScoreUpdate = useCallback((s) => setScore(s), []);
  const handleSpeedUpdate = useCallback((s) => setSpeed(s), []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a0a1a' }}>
      {/* 3D scene is rendered whenever we are past the title screen */}
      {gameState !== 'title' && (
        <RunnerScene
          key={sceneKey}
          fingerX={fingerX}
          handDetected={handDetected}
          lastHandRef={lastHandRef}
          onScoreUpdate={handleScoreUpdate}
          onCollision={handleCollision}
          onSpeedUpdate={handleSpeedUpdate}
          running={gameState === 'playing'}
        />
      )}

      {/* HUD only shown while actively playing */}
      {gameState === 'playing' && (
        <HUD
          score={score}
          handDetected={handDetected}
          lane={displayLane}
          fingerX={fingerX}
          videoRef={videoRef}
          canvasRef={canvasRef}
          speed={speed}
        />
      )}

      {/* Screen overlays */}
      {gameState === 'title'    && <TitleScreen    onStart={handleStart} />}
      {gameState === 'gameover' && <GameOverScreen score={score} onRestart={handleRestart} />}
    </div>
  );
}
