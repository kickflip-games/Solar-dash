// ─────────────────────────────────────────────────────────────────────────────
// gameConfig.js  –  Central tuning knobs for Solar Dash
// ─────────────────────────────────────────────────────────────────────────────

// Lane layout
export const LANE_COUNT   = 3;
export const LANE_WIDTH   = 2.8;   // world-space gap between lane centres
export const LANE_OFFSETS = [-LANE_WIDTH, 0, LANE_WIDTH]; // left=0, mid=1, right=2

// Player
export const PLAYER_LERP_SPEED    = 8;   // higher = snappier lane transitions
export const PLAYER_BOX_HALF      = { x: 0.45, y: 0.45, z: 0.6 }; // collision half-extents

// Camera rig
export const CAM_OFFSET           = { x: 0, y: 3.2, z: 6 };
export const CAM_TILT_STRENGTH    = 0.08;  // how much the camera tilts when changing lanes
export const CAM_TILT_LERP        = 4;

// World / track
export const TRACK_WIDTH          = LANE_WIDTH * LANE_COUNT + LANE_WIDTH;
export const TILE_LENGTH          = 40;   // length of one ground tile
export const TILE_COUNT           = 6;    // how many tiles in the pool
export const TILE_SPEED_START     = 14;   // initial forward speed (units / sec)
export const TILE_SPEED_MAX       = 40;
export const SPEED_RAMP_RATE      = 0.8;  // units added to speed per second

// Obstacles
export const OBSTACLE_SPAWN_INTERVAL_START = 1.8;  // seconds between spawns
export const OBSTACLE_SPAWN_INTERVAL_MIN   = 0.55;
export const SPAWN_INTERVAL_DECAY          = 0.003; // subtracted per second
export const OBSTACLE_TYPES = [
  { id: 'wall',   w: 1.4, h: 2.0, d: 0.8, color: '#e05050' },
  { id: 'pillar', w: 1.0, h: 3.0, d: 1.0, color: '#d06030' },
  { id: 'low',    w: 2.2, h: 0.7, d: 1.2, color: '#4090e0' },
];
export const OBSTACLE_SPAWN_Z   = -80;    // how far ahead obstacles spawn
export const OBSTACLE_DESPAWN_Z =  10;    // remove when behind camera

// Hand tracking / input
// The finger X from MediaPipe is in [0,1] (mirrored so left=0, right=1).
// We divide that range into thirds to select lanes.
export const LANE_THRESHOLD_LOW  = 0.35;  // x < LOW  → left lane
export const LANE_THRESHOLD_HIGH = 0.65;  // x > HIGH → right lane
// (LANE_THRESHOLD_LOW to HIGH = centre lane)

// Finger smoothing: exponential moving average factor (0–1, higher = less smooth)
export const FINGER_SMOOTH_FACTOR = 0.25;

// If no hand is detected for this many ms, gently snap back to centre lane
export const HAND_LOST_GRACE_MS   = 800;

// Score
export const SCORE_PER_SECOND = 10;

// Background / fog
export const FOG_COLOR  = '#0a0a1a';
export const FOG_NEAR   = 20;
export const FOG_FAR    = 90;
