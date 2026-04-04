# ☀ Solar Dash

A 3D endless runner web game built with **React** + **React Three Fiber** where your only control is the real-time position of your index finger, tracked through the webcam using **MediaPipe Hands**.

Inspired by *Race the Sun* — fast, clean forward motion with obstacle dodging.

---

## Gameplay

- Your ship flies forward automatically through an endless corridor.
- Hold your **index finger** up in front of the webcam.
- Move your finger **left** or **right** to steer into one of three lanes.
- Dodge the incoming obstacles. Survive as long as possible!
- Your score increases over time. Speed ramps up as you play.

---

## Tech Stack

| Package | Purpose |
|---|---|
| `react` / `react-dom` | UI framework |
| `@react-three/fiber` | React renderer for Three.js |
| `@react-three/drei` | R3F helpers |
| `three` | 3D engine |
| `@mediapipe/hands` | Real-time hand landmark detection (loaded from CDN) |
| `vite` | Build tool |

---

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Then open `http://localhost:5173` in a browser that supports WebGL and camera access.

> **Camera permission** is required. You will be prompted when you press "Start Game".

---

## Project Structure

```
src/
├── App.jsx                     # Root component, game state machine
├── index.css                   # Global reset
├── components/
│   ├── TitleScreen.jsx         # Start screen
│   ├── GameOverScreen.jsx      # Game over + restart
│   ├── HUD.jsx                 # Score, hand status, webcam preview, lane guide
│   └── RunnerScene.jsx         # Full 3D scene (Three.js/R3F)
│       ├── GroundTiles         # Infinite tiled track
│       ├── Player              # Ship mesh + lane-change movement
│       ├── ObstacleManager     # Pool-based obstacle spawning & collision
│       └── CameraRig           # Third-person camera with tilt
├── hooks/
│   └── useHandTracking.js      # MediaPipe Hands integration
└── constants/
    └── gameConfig.js           # All tunable constants in one place
```

---

## How the controls work

### Finger → Lane mapping

1. MediaPipe Hands detects the **index fingertip** (landmark `#8`) every frame.
2. The raw `x` value (0 = left of frame, 1 = right) is fed through an **exponential moving average** smoother (`FINGER_SMOOTH_FACTOR = 0.25`).
3. The smoothed `x` is divided into thirds:
   - `x < 0.35` → **left lane**
   - `0.35 ≤ x ≤ 0.65` → **centre lane**
   - `x > 0.65` → **right lane**
4. The player's `X` position **lerps** toward the target lane each frame (`PLAYER_LERP_SPEED = 8`). No teleporting — smooth and forgiving.
5. Only finger **X** is used. Y is ignored entirely.

### Hand-lost grace period

If no hand is detected for > 800 ms (`HAND_LOST_GRACE_MS`), the target lane gently returns to centre. The HUD shows a "NO HAND" warning.

---

## How obstacles work

- A **pool** of 20 pre-created obstacle meshes is maintained.
- On a timer (`OBSTACLE_SPAWN_INTERVAL`, decaying from 1.8 s → 0.55 s), one slot is activated, placed at `z = -80`, and assigned a random lane and type.
- Each frame all active obstacles move **forward** at the current speed.
- **AABB collision** is checked when an obstacle is within `z ∈ [-4, 2]`.
- When an obstacle passes `z = +10` it is deactivated and returned to the pool.

---

## Tuning

All game feel parameters live in `src/constants/gameConfig.js`:

```js
TILE_SPEED_START          // starting forward speed
SPEED_RAMP_RATE           // units/sec added each second
PLAYER_LERP_SPEED         // how snappy lane transitions are
LANE_THRESHOLD_LOW/HIGH   // where the finger-lane boundaries sit
OBSTACLE_SPAWN_INTERVAL_*  // spawn timing
FINGER_SMOOTH_FACTOR      // EMA smoothing (0=static, 1=no smoothing)
HAND_LOST_GRACE_MS        // ms before returning to centre on lost hand
```

---

## Asset swap points

The player ship and obstacles are built from **primitive box geometries**. To swap in Kenney 3D assets:

- **Player** → replace the `<group>` inside `Player` (RunnerScene.jsx) with a `<primitive object={gltf.scene} />` from `useGLTF()`.
- **Obstacles** → replace the `<boxGeometry>` inside the pool meshes with glTF primitives.
- **Ground tiles** → replace `<boxGeometry>` segments with Kenney road/track tiles.
