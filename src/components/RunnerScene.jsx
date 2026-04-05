// ─────────────────────────────────────────────────────────────────────────────
// RunnerScene.jsx
//
// The entire 3D world lives here:
//  - Infinite tiled ground
//  - Player mesh (glowing "ship" made of primitives)
//  - Obstacle pool
//  - Camera rig that follows + tilts
//  - Collision detection
//  - Score accumulation
//
// How finger X becomes movement:
//   1. fingerX [0,1] is divided into thirds: <0.35=left, 0.35-0.65=centre, >0.65=right
//   2. That becomes a target lane index (0,1,2)
//   3. The player's X position lerps toward LANE_OFFSETS[targetLane] each frame
//   4. Result: smooth, forgiving steering without teleporting
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  LANE_OFFSETS,
  LANE_THRESHOLD_LOW,
  LANE_THRESHOLD_HIGH,
  PLAYER_LERP_SPEED,
  PLAYER_BOX_HALF,
  CAM_OFFSET,
  CAM_TILT_STRENGTH,
  CAM_TILT_LERP,
  TILE_LENGTH,
  TILE_COUNT,
  TILE_SPEED_START,
  TILE_SPEED_MAX,
  SPEED_RAMP_RATE,
  OBSTACLE_COLOR,
  OBSTACLE_SPAWN_INTERVAL_START,
  OBSTACLE_SPAWN_INTERVAL_MIN,
  SPAWN_INTERVAL_DECAY,
  OBSTACLE_TYPES,
  OBSTACLE_SPAWN_Z,
  OBSTACLE_DESPAWN_Z,
  PICKUP_COLOR,
  PICKUP_SIZE,
  PICKUP_SCORE_VALUE,
  PICKUP_SPAWN_INTERVAL_START,
  PICKUP_SPAWN_INTERVAL_MIN,
  PICKUP_SPAWN_INTERVAL_DECAY,
  PICKUP_POOL_SIZE,
  TRACK_WIDTH,
  FOG_COLOR,
  FOG_NEAR,
  FOG_FAR,
  SCORE_PER_SECOND,
  HAND_LOST_GRACE_MS,
} from '../constants/gameConfig';

// ─── Ground tiles ─────────────────────────────────────────────────────────────
function GroundTiles({ stateRef }) {
  const groupRef = useRef();

  useFrame((_, delta) => {
    const st = stateRef.current;
    if (st.dead) return;

    const group = groupRef.current;
    if (!group) return;

    const children = group.children;
    for (let i = 0; i < children.length; i++) {
      const tile = children[i];
      tile.position.z += st.speed * delta;
      // Recycle tile to the back when it passes the camera
      if (tile.position.z > TILE_LENGTH * 0.6) {
        tile.position.z -= TILE_LENGTH * TILE_COUNT;
      }
    }
  });

  // Build initial tiles
  const tiles = [];
  for (let i = 0; i < TILE_COUNT; i++) {
    const z = -i * TILE_LENGTH;
    tiles.push(
      <group key={i} position={[0, -0.5, z]}>
        {/* Main track */}
        <mesh receiveShadow>
          <boxGeometry args={[TRACK_WIDTH, 0.2, TILE_LENGTH - 0.2]} />
          <meshStandardMaterial color="#1a1a3a" roughness={0.8} metalness={0.2} />
        </mesh>
        {/* Lane dividers */}
        {[-2.8, 0, 2.8].map((lx, li) => (
          <mesh key={li} position={[lx, 0.12, 0]}>
            <boxGeometry args={[0.08, 0.02, TILE_LENGTH - 0.4]} />
            <meshStandardMaterial
              color="#334488" emissive="#223366" emissiveIntensity={0.5}
            />
          </mesh>
        ))}
        {/* Edge glow strips */}
        {[-TRACK_WIDTH / 2 + 0.08, TRACK_WIDTH / 2 - 0.08].map((ex, ei) => (
          <mesh key={`e${ei}`} position={[ex, 0.15, 0]}>
            <boxGeometry args={[0.15, 0.02, TILE_LENGTH - 0.2]} />
            <meshStandardMaterial
              color="#4466ff" emissive="#4466ff" emissiveIntensity={1.5}
            />
          </mesh>
        ))}
      </group>
    );
  }

  return <group ref={groupRef}>{tiles}</group>;
}

// ─── Player ───────────────────────────────────────────────────────────────────
// A simple "ship" shape built from primitives.
// Replace the contents of <group> with a Kenney glTF model when available.
function Player({ stateRef, fingerX, handDetected, lastHandRef }) {
  const groupRef = useRef();
  const glowRef  = useRef();

  useFrame((_, delta) => {
    const st = stateRef.current;
    if (st.dead) return;

    // ── Map fingerX → target lane ──────────────────────────────────────────
    // fingerX is in [0,1]; divide into thirds.
    // If the hand is lost beyond the grace period, hold last lane.
    let targetLane = st.targetLane;
    const msSinceHand = Date.now() - (lastHandRef?.current ?? 0);

    if (handDetected) {
      if (fingerX < LANE_THRESHOLD_LOW)       targetLane = 0; // left
      else if (fingerX > LANE_THRESHOLD_HIGH) targetLane = 2; // right
      else                                    targetLane = 1; // centre
    } else if (msSinceHand > HAND_LOST_GRACE_MS) {
      targetLane = 1; // gently return to centre if hand gone for too long
    }
    st.targetLane = targetLane;

    // ── Smooth player X toward target lane ────────────────────────────────
    const targetX = LANE_OFFSETS[targetLane];
    st.playerX += (targetX - st.playerX) * Math.min(1, PLAYER_LERP_SPEED * delta);

    if (groupRef.current) {
      groupRef.current.position.x = st.playerX;
      // Slight roll tilt when moving
      const leanDir = (targetX - st.playerX);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z, -leanDir * 0.18, 0.12
      );
    }

    // Animate glow emissive intensity with time
    if (glowRef.current) {
      glowRef.current.material.emissiveIntensity =
        0.8 + Math.sin(Date.now() * 0.004) * 0.4;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Body */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[0.7, 0.3, 1.2]} />
        <meshStandardMaterial color="#ccddff" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Cockpit */}
      <mesh castShadow position={[0, 0.3, -0.1]}>
        <boxGeometry args={[0.4, 0.22, 0.55]} />
        <meshStandardMaterial color="#88aaff" metalness={0.5} roughness={0.15} transparent opacity={0.85} />
      </mesh>
      {/* Left wing */}
      <mesh castShadow position={[-0.72, -0.02, 0.15]}>
        <boxGeometry args={[0.6, 0.08, 0.6]} />
        <meshStandardMaterial color="#aabbee" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Right wing */}
      <mesh castShadow position={[0.72, -0.02, 0.15]}>
        <boxGeometry args={[0.6, 0.08, 0.6]} />
        <meshStandardMaterial color="#aabbee" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Engine glow */}
      <mesh ref={glowRef} position={[0, -0.02, 0.55]}>
        <boxGeometry args={[0.3, 0.18, 0.25]} />
        <meshStandardMaterial
          color="#6699ff" emissive="#4466ff" emissiveIntensity={1.0}
          metalness={0.2} roughness={0.4}
        />
      </mesh>
      {/* Engine glow point light */}
      <pointLight position={[0, 0.1, 0.7]} color="#4466ff" intensity={1.5} distance={4} />
    </group>
  );
}

// ─── Obstacle pool ────────────────────────────────────────────────────────────
// Each obstacle is a ref-tracked mesh in the scene.
// We recycle / re-use them rather than mount/unmount for performance.
//
// Each pool slot stores refs to ALL three obstacle type meshes so we can
// switch which mesh is visible at spawn time without a ref-assignment race.
function ObstacleManager({ stateRef, onCollision }) {
  const poolRef  = useRef([]);
  const groupRef = useRef();

  // We render a fixed-size pool of meshes and hide unused ones
  const POOL_SIZE = 20;

  // Initialise pool metadata
  useEffect(() => {
    poolRef.current = Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      meshes: [null, null, null], // one mesh ref per obstacle type
      mesh:   null,               // currently active mesh
      typeIdx: 0,
    }));
  }, []);

  const spawnObstacle = useCallback((st) => {
    const slot = poolRef.current.find(s => !s.active);
    if (!slot) return;

    const lane    = Math.floor(Math.random() * 3);
    const typeIdx = Math.floor(Math.random() * OBSTACLE_TYPES.length);
    const type    = OBSTACLE_TYPES[typeIdx];

    slot.active  = true;
    slot.typeIdx = typeIdx;
    slot.lane    = lane;
    slot.z       = OBSTACLE_SPAWN_Z;
    // Select the pre-assigned mesh for this obstacle type
    slot.mesh    = slot.meshes[typeIdx];

    if (slot.mesh) {
      slot.mesh.position.set(LANE_OFFSETS[lane], type.h / 2 - 0.4, OBSTACLE_SPAWN_Z);
      slot.mesh.visible = true;
    }

    // Track in state for collision checks
    st.obstacles.push(slot);
  }, []);

  useFrame((_, delta) => {
    const st = stateRef.current;
    if (st.dead) return;

    // ── Ramp up speed over time ────────────────────────────────────────────
    st.speed = Math.min(TILE_SPEED_MAX, st.speed + SPEED_RAMP_RATE * delta);

    // ── Update score ───────────────────────────────────────────────────────
    st.score += SCORE_PER_SECOND * delta;
    st.elapsed += delta;

    // ── Spawn new obstacles ────────────────────────────────────────────────
    // spawnInterval decays over time to increase difficulty
    st.spawnInterval = Math.max(
      OBSTACLE_SPAWN_INTERVAL_MIN,
      OBSTACLE_SPAWN_INTERVAL_START - st.elapsed * SPAWN_INTERVAL_DECAY
    );
    st.timeSinceSpawn += delta;
    if (st.timeSinceSpawn >= st.spawnInterval) {
      st.timeSinceSpawn = 0;
      spawnObstacle(st);
    }

    // ── Move & check each obstacle ─────────────────────────────────────────
    for (let i = st.obstacles.length - 1; i >= 0; i--) {
      const slot = st.obstacles[i];
      if (!slot.active || !slot.mesh) continue;

      slot.mesh.position.z += st.speed * delta;
      slot.z = slot.mesh.position.z;

      // Despawn if behind camera
      if (slot.z > OBSTACLE_DESPAWN_Z) {
        slot.active = false;
        slot.mesh.visible = false;
        st.obstacles.splice(i, 1);
        continue;
      }

      // ── AABB collision with player ─────────────────────────────────────
      // Only check when obstacle is close to the player (Z near 0)
      if (slot.z > -4 && slot.z < 2) {
        const type = OBSTACLE_TYPES[slot.typeIdx];
        const obsHalfX = type.w / 2;
        const obsHalfZ = type.d / 2;
        const obsX     = slot.mesh.position.x;
        const obsZ     = slot.mesh.position.z;

        const dx = Math.abs(st.playerX - obsX);
        const dz = Math.abs(0 - obsZ); // player is at z=0

        if (dx < obsHalfX + PLAYER_BOX_HALF.x && dz < obsHalfZ + PLAYER_BOX_HALF.z) {
          st.dead = true;
          onCollision(st.score);
          return;
        }
      }
    }
  });

  // Render pool meshes: POOL_SIZE slots × OBSTACLE_TYPES meshes each.
  // All start hidden. On spawn, the correct typeIdx mesh becomes visible.
  const poolMeshes = Array.from({ length: POOL_SIZE }, (_, idx) =>
    OBSTACLE_TYPES.map((type, ti) => (
      <mesh
        key={`obs-${idx}-${ti}`}
        visible={false}
        castShadow
        ref={(mesh) => {
          // Store every type mesh so spawnObstacle can choose the right one
          if (mesh && poolRef.current[idx]) {
            poolRef.current[idx].meshes[ti] = mesh;
          }
        }}
        position={[0, type.h / 2 - 0.4, -200]}
      >
        <boxGeometry args={[type.w, type.h, type.d]} />
        <meshStandardMaterial
          color={type.color}
          emissive={type.color}
          emissiveIntensity={0.3}
          metalness={0.2}
          roughness={0.6}
        />
      </mesh>
    ))
  );

  return <group ref={groupRef}>{poolMeshes}</group>;
}

// ─── Sparkle burst effect for pickups ───────────────────────────────────────
function SparkleBurst({ position, color, onComplete }) {
  const groupRef = useRef();
  const particleRefs = useRef([]);
  const ageRef = useRef(0);
  const doneRef = useRef(false);
  const particles = useMemo(() => (
    Array.from({ length: 10 }, () => ({
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 1.7,
        Math.random() * 1.3 + 0.3,
        (Math.random() - 0.5) * 1.7,
      ),
    }))
  ), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const age = ageRef.current + delta;
    ageRef.current = age;
    const intensity = Math.max(0, 1 - age / 0.85);
    groupRef.current.rotation.y += delta * 1.6;

    particles.forEach((particle, index) => {
      const mesh = particleRefs.current[index];
      if (!mesh) return;
      mesh.position.addScaledVector(particle.velocity, delta * 2.4);
      const scale = 0.05 + intensity * 0.4;
      mesh.scale.setScalar(scale);
      if (mesh.material) {
        mesh.material.opacity = intensity;
      }
    });

    if (age > 0.8 && !doneRef.current) {
      doneRef.current = true;
      if (onComplete) onComplete();
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {particles.map((_, idx) => (
        <mesh
          key={`spark-${idx}`}
          ref={(mesh) => {
            particleRefs.current[idx] = mesh;
          }}
        >
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.2}
            metalness={0.3}
            roughness={0.2}
            transparent
            opacity={1}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Pickup manager ────────────────────────────────────────────────────────
function PickupManager({ stateRef, onPickup }) {
  const poolRef = useRef(Array.from({ length: PICKUP_POOL_SIZE }, () => ({
    active: false,
    lane: 1,
    z: OBSTACLE_SPAWN_Z,
    phase: Math.random() * Math.PI * 2,
    mesh: null,
  })));
  const [sparkleBursts, setSparkleBursts] = useState([]);

  const spawnPickup = useCallback((st) => {
    const slot = poolRef.current.find(s => !s.active && s.mesh);
    if (!slot) return;

    const lane = Math.floor(Math.random() * 3);
    slot.active = true;
    slot.lane = lane;
    slot.phase = Math.random() * Math.PI * 2;
    slot.z = OBSTACLE_SPAWN_Z;
    slot.mesh.position.set(LANE_OFFSETS[lane], 0.5, OBSTACLE_SPAWN_Z);
    slot.mesh.visible = true;
    st.pickups.push(slot);
  }, []);

  const addSparkle = useCallback((position) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setSparkleBursts(prev => [...prev, { id, position }]);
  }, []);

  const removeSparkle = useCallback((id) => {
    setSparkleBursts(prev => prev.filter(burst => burst.id !== id));
  }, []);

  useFrame((_, delta) => {
    const st = stateRef.current;
    if (st.dead) return;

    st.pickupInterval = Math.max(
      PICKUP_SPAWN_INTERVAL_MIN,
      PICKUP_SPAWN_INTERVAL_START - st.elapsed * PICKUP_SPAWN_INTERVAL_DECAY
    );
    st.pickupTimer += delta;
    if (st.pickupTimer >= st.pickupInterval) {
      st.pickupTimer = 0;
      spawnPickup(st);
    }

    for (let i = st.pickups.length - 1; i >= 0; i--) {
      const slot = st.pickups[i];
      if (!slot.active || !slot.mesh) continue;

      slot.mesh.position.z += st.speed * delta;
      slot.z = slot.mesh.position.z;
      slot.mesh.position.y = 0.5 + Math.sin(slot.phase + slot.z * 0.12) * 0.25;
      slot.mesh.rotation.y += delta * 1.8;

      if (slot.z > OBSTACLE_DESPAWN_Z) {
        slot.active = false;
        slot.mesh.visible = false;
        st.pickups.splice(i, 1);
        continue;
      }

      const dx = Math.abs(st.playerX - slot.mesh.position.x);
      const dz = Math.abs(slot.mesh.position.z);
      if (dz < 1.1 && dx < 0.9) {
        const sparklePos = [
          slot.mesh.position.x,
          slot.mesh.position.y,
          slot.mesh.position.z,
        ];
        slot.active = false;
        slot.mesh.visible = false;
        st.pickups.splice(i, 1);
        st.score += PICKUP_SCORE_VALUE;
        if (onPickup) onPickup(PICKUP_SCORE_VALUE);
        addSparkle(sparklePos);
      }
    }
  });

  const pickupMeshes = Array.from({ length: PICKUP_POOL_SIZE }, (_, idx) => (
    <mesh
      key={`pickup-${idx}`}
      visible={false}
      castShadow
      ref={(mesh) => {
        if (mesh && poolRef.current[idx]) {
          poolRef.current[idx].mesh = mesh;
        }
      }}
      position={[0, 0.45, -200]}
    >
      <octahedronGeometry args={[PICKUP_SIZE, 0]} />
      <meshStandardMaterial
        color={PICKUP_COLOR}
        emissive={PICKUP_COLOR}
        emissiveIntensity={0.85}
        metalness={0.5}
        roughness={0.25}
        transparent
        opacity={0.9}
      />
    </mesh>
  ));

  return (
    <group>
      {pickupMeshes}
      {sparkleBursts.map((burst) => (
        <SparkleBurst
          key={burst.id}
          position={burst.position}
          color={PICKUP_COLOR}
          onComplete={() => removeSparkle(burst.id)}
        />
      ))}
    </group>
  );
}

// ─── Camera rig ──────────────────────────────────────────────────────────────
// Follows the player X with a tilt when changing lanes.
// Camera is accessed via the useFrame state argument to avoid the
// react-hooks/immutability lint rule.
function CameraRig({ stateRef }) {
  const tiltRef = useRef(0);

  useFrame((state, delta) => {
    const cam = state.camera;
    const st  = stateRef.current;

    const targetX = st.playerX * 0.5; // camera follows player X with a lag
    const tiltDir = (st.playerX - cam.position.x);
    tiltRef.current = THREE.MathUtils.lerp(
      tiltRef.current, tiltDir * CAM_TILT_STRENGTH, CAM_TILT_LERP * delta
    );

    cam.position.x = THREE.MathUtils.lerp(cam.position.x, targetX + CAM_OFFSET.x, 5 * delta);
    cam.position.y = CAM_OFFSET.y;
    cam.position.z = CAM_OFFSET.z;
    cam.rotation.z = tiltRef.current;
    cam.lookAt(cam.position.x * 0.3, 0.5, -8);
  });

  return null;
}

// ─── Scene contents (must be inside Canvas) ───────────────────────────────────
function SceneContents({ stateRef, fingerX, handDetected, lastHandRef, onCollision, onPickup }) {
  return (
    <>
      {/* Fog */}
      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />

      {/* Ambient + directional light */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 12, 4]} intensity={1.2} castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-far={80} shadow-camera-left={-20} shadow-camera-right={20}
        shadow-camera-top={20} shadow-camera-bottom={-20}
      />
      {/* Cool accent light from front */}
      <pointLight position={[0, 3, -15]} color="#3344ff" intensity={2} distance={25} />

      <GroundTiles stateRef={stateRef} />
      <Player
        stateRef={stateRef}
        fingerX={fingerX}
        handDetected={handDetected}
        lastHandRef={lastHandRef}
      />
      <ObstacleManager stateRef={stateRef} onCollision={onCollision} />
      <PickupManager stateRef={stateRef} onPickup={onPickup} />
      <CameraRig stateRef={stateRef} />
    </>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function RunnerScene({
  fingerX,
  handDetected,
  lastHandRef,
  onScoreUpdate,
  onCollision,
  onSpeedUpdate,
  onPickup,
  running,
}) {
  // Game state lives in a ref (not React state) so updates don't cause re-renders
  const stateRef = useRef({
    playerX: 0,
    targetLane: 1,
    speed: TILE_SPEED_START,
    score: 0,
    elapsed: 0,
    pickups: [],
    obstacles: [],
    timeSinceSpawn: 0,
    spawnInterval: OBSTACLE_SPAWN_INTERVAL_START,
    pickupTimer: 0,
    pickupInterval: PICKUP_SPAWN_INTERVAL_START,
    dead: false,
  });

  // Tick callback to lift score/speed up to React state (throttled via RAF)
  const tickRef = useRef(0);
  useEffect(() => {
    let rafId;
    function tick() {
      tickRef.current++;
      if (tickRef.current % 6 === 0) { // ~10fps updates to parent
        if (onScoreUpdate) onScoreUpdate(stateRef.current.score);
        if (onSpeedUpdate) onSpeedUpdate(stateRef.current.speed);
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onScoreUpdate, onSpeedUpdate]);

  const handleCollision = useCallback((score) => {
    if (onCollision) onCollision(score);
  }, [onCollision]);

  if (!running) return null;

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0 }}
      shadows
      camera={{ fov: 65, near: 0.1, far: 200, position: [0, CAM_OFFSET.y, CAM_OFFSET.z] }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(FOG_COLOR);
      }}
    >
      <SceneContents
        stateRef={stateRef}
        fingerX={fingerX}
        handDetected={handDetected}
        lastHandRef={lastHandRef}
        onCollision={handleCollision}
        onPickup={onPickup}
      />
    </Canvas>
  );
}
