"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  Text,
  Html,
  Sparkles,
} from "@react-three/drei";
import { useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { TrackObstacle, TrackDrop, ObstacleType, DropType } from "@/lib/racing/types";
import { 
  Zap, 
  Shield, 
  Snowflake, 
  Flag,
  Sparkles as SparklesIcon,
} from "lucide-react";

// ============================================
// CONSTANTS & TYPES
// ============================================

export const LANE_WIDTH = 3;
export const TRACK_WIDTH = LANE_WIDTH * 5;
export const UNIT_SCALE = 2; 

const OBSTACLE_COLORS: Record<ObstacleType, string> = {
  barrier: "#ef4444", // red-500
  oil_slick: "#1c1917", // amber-900 equivalent visually
  cone: "#f97316", // orange-500
  pothole: "#374151", // gray-700
};

const DROP_COLORS: Record<DropType, string> = {
  speed_boost: "#facc15", // yellow-400
  shield: "#60a5fa", // blue-400
  freeze_others: "#22d3ee", // cyan-400
  magnet: "#c084fc", // purple-400
};

// ============================================
// COMPONENT DEFINITIONS
// ============================================

export function Car({ 
  position, 
  lane, 
  color, 
  isMe, 
  username, 
  isStunned, 
  hasShield, 
  finishPosition,
  skin,
  trail,
  vehicleType = "car_standard"
}: { 
  position: number; 
  lane: number; 
  color: string; 
  isMe: boolean;
  username: string;
  isStunned: boolean;
  hasShield?: boolean;
  finishPosition?: number;
  skin?: string;
  trail?: string;
  vehicleType?: string;
}) {
  // Smooth interpolation state
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  // Skin logic
  let displayColor = color;
  let metalness = 0.5;
  let roughness = 0.3;
  let emissive = new THREE.Color(0x000000);
  let wireframe = false;
  let opacity = 1;
  let transparent = false;

  if (skin === 'car_red') displayColor = '#ef4444';
  else if (skin === 'car_blue') displayColor = '#3b82f6';
  else if (skin === 'car_gold') {
      displayColor = '#fbbf24';
      metalness = 0.9;
      roughness = 0.1;
  }
  else if (skin === 'skin_galactic') {
      displayColor = '#1e1b4b'; // indigo-950
      metalness = 0.8;
      roughness = 0.2;
  }
  else if (skin === 'skin_glitch') {
      displayColor = '#22c55e';
      wireframe = true;
      emissive = new THREE.Color('#22c55e');
  }
  else if (skin === 'skin_lava') {
      displayColor = '#7f1d1d';
      emissive = new THREE.Color('#ef4444');
      roughness = 0.9;
  }
  else if (skin === 'skin_ice') {
      displayColor = '#bae6fd';
      transparent = true;
      opacity = 0.6;
      metalness = 0.9;
      roughness = 0.1;
  }
  else if (skin === 'skin_rainbow') {
      // Color set in useFrame
      metalness = 0.6;
      roughness = 0.2;
  }

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Lerp position for smooth movement
    // Forward movement
    const targetZ = -position * UNIT_SCALE;
    // Use slightly slower lerp for discrete steps to make it look like continuous travel
    const newZ = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, delta * 3);
    
    // Lane movement
    const targetX = (lane - 3) * LANE_WIDTH;
    const newX = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, delta * 8); // Faster lane switching

    groupRef.current.position.z = newZ;
    groupRef.current.position.x = newX;
    
    // Simple bobbing animation
    if (!isStunned && !finishPosition) {
      groupRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 5) * 0.05;
    }
    
    // Stunned shake effect
    if (isStunned) {
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 10) * 0.05;
    } else {
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 5);
    }

    if (materialRef.current) {
        // Animated Skins
        if (skin === 'skin_rainbow') {
            const hue = (state.clock.elapsedTime * 0.5) % 1;
            materialRef.current.color.setHSL(hue, 0.8, 0.5);
        } else if (skin === 'skin_lava') {
            const pulse = (Math.sin(state.clock.elapsedTime * 3) + 1) / 2; // 0 to 1
            materialRef.current.emissiveIntensity = 0.5 + pulse * 0.5;
        }
    }
  });

  const renderVehicleBody = () => {
    if (vehicleType === 'car_truck') {
        return (
            <>
                {/* Truck Cab */}
                <mesh castShadow receiveShadow position={[0, 0.6, -0.4]}>
                    <boxGeometry args={[1.3, 0.8, 1.2]} />
                    <meshStandardMaterial ref={materialRef} color={isStunned ? "#555" : displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
                </mesh>
                {/* Truck Bed */}
                <mesh castShadow receiveShadow position={[0, 0.4, 0.8]}>
                    <boxGeometry args={[1.3, 0.5, 1.4]} />
                    <meshStandardMaterial color={isStunned ? "#555" : displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
                </mesh>
            </>
        );
    } else if (vehicleType === 'car_jeep') {
        return (
            <>
                {/* Jeep Body */}
                <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
                    <boxGeometry args={[1.1, 0.6, 1.8]} />
                    <meshStandardMaterial ref={materialRef} color={isStunned ? "#555" : displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
                </mesh>
                {/* Roll Cage */}
                <mesh position={[0, 1.0, -0.2]}>
                    <boxGeometry args={[1.0, 0.05, 1.0]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
                {/* Supports */}
                <mesh position={[-0.5, 0.8, -0.7]} rotation={[0,0,0]}><cylinderGeometry args={[0.03, 0.03, 0.6]} /><meshStandardMaterial color="#111" /></mesh>
                <mesh position={[0.5, 0.8, -0.7]} rotation={[0,0,0]}><cylinderGeometry args={[0.03, 0.03, 0.6]} /><meshStandardMaterial color="#111" /></mesh>
                <mesh position={[-0.5, 0.8, 0.3]} rotation={[0,0,0]}><cylinderGeometry args={[0.03, 0.03, 0.6]} /><meshStandardMaterial color="#111" /></mesh>
                <mesh position={[0.5, 0.8, 0.3]} rotation={[0,0,0]}><cylinderGeometry args={[0.03, 0.03, 0.6]} /><meshStandardMaterial color="#111" /></mesh>
            </>
        );
    } else if (vehicleType === 'car_sport') {
        return (
            <>
                {/* Sleek Body */}
                <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
                    <boxGeometry args={[1.3, 0.4, 2.2]} />
                    <meshStandardMaterial ref={materialRef} color={isStunned ? "#555" : displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
                </mesh>
                {/* Cabin (low profile) */}
                <mesh castShadow position={[0, 0.6, -0.2]}>
                    <boxGeometry args={[0.9, 0.3, 1]} />
                    <meshStandardMaterial color="#111" roughness={0.2} />
                </mesh>
                {/* Spoiler */}
                <mesh position={[0, 0.6, 0.9]}>
                    <boxGeometry args={[1.4, 0.05, 0.3]} />
                    <meshStandardMaterial color={isStunned ? "#555" : displayColor} />
                </mesh>
            </>
        );
    }
    
    // Default Car
    return (
        <>
            <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
                <boxGeometry args={[1.2, 0.5, 2]} />
                <meshStandardMaterial ref={materialRef} color={isStunned ? "#555" : displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
            </mesh>
            <mesh castShadow position={[0, 0.8, -0.2]}>
                <boxGeometry args={[0.8, 0.4, 1]} />
                <meshStandardMaterial color="#111" roughness={0.2} />
            </mesh>
        </>
    );
  };

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {renderVehicleBody()}

      {/* Wheels */}
      {/* FL */} <mesh position={[-0.6, 0.2, -0.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.3, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* FR */} <mesh position={[0.6, 0.2, -0.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.3, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* RL */} <mesh position={[-0.6, 0.2, 0.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.35, 0.35, 0.35, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* RR */} <mesh position={[0.6, 0.2, 0.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.35, 0.35, 0.35, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Skin Specific Effects */}
      {skin === 'skin_galactic' && !isStunned && (
        <Sparkles count={20} scale={2.5} size={4} speed={0.4} opacity={1} color="#ffffff" />
      )}

      {/* Effects */}
      {trail === 'trail_fire' && !isStunned && !finishPosition && (
        <group position={[0, 0.2, 1.5]}>
           {/* Simple fire trail particles or mesh */}
           <mesh rotation={[Math.PI / 2, 0, 0]}>
             <coneGeometry args={[0.4, 1.5, 8]} />
             <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
           </mesh>
           <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.5]}>
             <coneGeometry args={[0.2, 1, 8]} />
             <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
           </mesh>
        </group>
      )}

      {trail === 'trail_neon' && !isStunned && !finishPosition && (
        <group position={[0, 0.1, 1.2]}>
           <mesh rotation={[Math.PI / 2, 0, 0]}>
             <planeGeometry args={[1, 3]} />
             <meshBasicMaterial color="#06b6d4" transparent opacity={0.4} side={THREE.DoubleSide} />
           </mesh>
        </group>
      )}

      {hasShield && (
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[1.8, 16, 16]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.3} wireframe />
        </mesh>
      )}

      {/* Label */}
      <Html position={[0, 2, 0]} center distanceFactor={15} zIndexRange={[100, 0]}>
        <div className={`flex flex-col items-center whitespace-nowrap transition-all ${isMe ? "scale-110" : ""}`}>
          <div className={`px-2 py-1 rounded-md text-xs font-bold text-white mb-1 shadow-sm backdrop-blur-sm
            ${isMe ? "bg-blue-600/80 border-2 border-white" : "bg-gray-800/60"}
          `}>
            {finishPosition ? `#${finishPosition}` : username}
          </div>
          {isStunned && <Zap className="w-6 h-6 text-red-500 animate-pulse drop-shadow-md" fill="currentColor" />}
        </div>
      </Html>
    </group>
  );
}

export function Obstacle({ type, lane, position }: { type: ObstacleType, lane: number, position: number }) {
  const x = (lane - 3) * LANE_WIDTH;
  const z = -position * UNIT_SCALE;
  
  return (
    <group position={[x, 0, z]}>
      {type === "barrier" && (
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[LANE_WIDTH * 0.8, 1, 0.5]} />
          <meshStandardMaterial color={OBSTACLE_COLORS.barrier} />
          {/* Stripes would need a texture, let's use a simple color for now with some geometry detail */}
          <mesh position={[0, 0, 0.26]}>
             <planeGeometry args={[LANE_WIDTH * 0.7, 0.8]} />
             <meshBasicMaterial color="#ffffff" />
             {/* In a real app, use a texture for stripes */}
          </mesh>
        </mesh>
      )}
      
      {type === "cone" && (
        <mesh position={[0, 0.5, 0]} castShadow>
          <coneGeometry args={[0.4, 1, 16]} />
          <meshStandardMaterial color={OBSTACLE_COLORS.cone} />
        </mesh>
      )}
      
      {type === "oil_slick" && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1, 16]} />
          <meshStandardMaterial color={OBSTACLE_COLORS.oil_slick} transparent opacity={0.8} roughness={0.1} metalness={0.8} />
        </mesh>
      )}
      
      {type === "pothole" && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.8, 16]} />
          <meshStandardMaterial color={OBSTACLE_COLORS.pothole} />
        </mesh>
      )}
    </group>
  );
}

export function Drop({ type, lane, position, collected }: { type: DropType, lane: number, position: number, collected: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.02;
      groupRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });

  if (collected) return null;

  const x = (lane - 3) * LANE_WIDTH;
  const z = -position * UNIT_SCALE;
  const color = DROP_COLORS[type];

  return (
    <group ref={groupRef} position={[x, 1, z]}>
      <mesh castShadow>
        <octahedronGeometry args={[0.5]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} wireframe />
      </mesh>
      <mesh>
        <octahedronGeometry args={[0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <pointLight color={color} intensity={1} distance={3} />
      
      <Html position={[0, 1, 0]} center distanceFactor={10}>
        <div className="p-1 rounded-full bg-black/30 backdrop-blur-sm">
           {type === "speed_boost" && <Zap size={16} className="text-yellow-400" />}
           {type === "shield" && <Shield size={16} className="text-blue-400" />}
           {type === "freeze_others" && <Snowflake size={16} className="text-cyan-400" />}
           {type === "magnet" && <SparklesIcon size={16} className="text-purple-400" />}
        </div>
      </Html>
    </group>
  );
}

export function Track({ length }: { length: number }) {
  const lengthUnits = length * UNIT_SCALE;
  
  return (
    <group>
      {/* Main Track Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -lengthUnits / 2]} receiveShadow>
        <planeGeometry args={[TRACK_WIDTH + 2, lengthUnits + 20]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>

      {/* Lane Lines */}
      {[1, 2, 3, 4].map((i) => {
        const x = (i - 2.5) * LANE_WIDTH;
        return (
          <mesh 
            key={i} 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[x, 0.01, -lengthUnits / 2]}
          >
            <planeGeometry args={[0.1, lengthUnits]} />
            <meshBasicMaterial color="#4b5563" />
          </mesh>
        );
      })}

      {/* Start Line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[TRACK_WIDTH, 1]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <Text
        position={[0, 2, 0]}
        fontSize={1.5}
        color="white"
        anchorX="center"
        anchorY="middle"
        
      >
        START
      </Text>

      {/* Finish Line */}
      <group position={[0, 0, -lengthUnits]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[TRACK_WIDTH, 2]} />
          {/* Checkerboard shader or texture would be ideal, simplifying to stripes */}
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        
        {/* Finish Arch */}
        <mesh position={[-TRACK_WIDTH/2 - 0.5, 2.5, 0]} castShadow>
          <boxGeometry args={[1, 5, 1]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[TRACK_WIDTH/2 + 0.5, 2.5, 0]} castShadow>
          <boxGeometry args={[1, 5, 1]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[0, 4.5, 0]} castShadow>
          <boxGeometry args={[TRACK_WIDTH + 2, 1, 1]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        
        <Text
          position={[0, 4.5, 0.51]}
          fontSize={1.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          FINISH
        </Text>
      </group>
      
      {/* Distance Markers */}
      {Array.from({ length: Math.floor(length / 10) }).map((_, i) => {
        const dist = (i + 1) * 10;
        if (dist >= length) return null;
        return (
          <group key={dist} position={[TRACK_WIDTH/2 + 2, 0, -dist * UNIT_SCALE]}>
            <Text
              rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
              position={[0, 0.05, 0]}
              fontSize={2}
              color="rgba(255,255,255,0.3)"
            >
              {dist}m
            </Text>
          </group>
        );
      })}
    </group>
  );
}

export function GameCamera({ myPosition, trackLength }: { myPosition: number, trackLength: number }) {
  // Camera follows player with smoother lerp
  useFrame((state, delta) => {
    // Offset relative to player position
    const targetZ = -myPosition * UNIT_SCALE + 8; // 8 units behind
    const targetY = 6; // 6 units up
    const targetX = 0; // Centered
    
    // Look slightly ahead of player
    const lookAtZ = -myPosition * UNIT_SCALE - 10;
    
    // Reduced lerp speed for smoother camera movement (less jittery)
    state.camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), delta * 1.5);
    state.camera.lookAt(0, 0, lookAtZ);
  });

  return null;
}

export function EnvironmentScenery({ length }: { length: number }) {
  // Simple low-poly trees or rocks along the side
  const lengthUnits = length * UNIT_SCALE;
  
  const trees = useMemo(() => {
    const items = [];
    // Use a seeded random or deterministic calculation to avoid hydration mismatch
    // Simple pseudo-random function based on index
    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    for (let z = 0; z < lengthUnits; z += 15) {
      // Left side
      items.push({ 
        x: -TRACK_WIDTH - 5 - pseudoRandom(z) * 10, 
        z: -z, 
        scale: 0.5 + pseudoRandom(z + 1) * 0.5 
      });
      // Right side
      items.push({ 
        x: TRACK_WIDTH + 5 + pseudoRandom(z + 2) * 10, 
        z: -z, 
        scale: 0.5 + pseudoRandom(z + 3) * 0.5 
      });
    }
    return items;
  }, [lengthUnits]);

  return (
    <group>
      {trees.map((tree, i) => (
        <group key={i} position={[tree.x, 0, tree.z]} scale={[tree.scale, tree.scale, tree.scale]}>
          {/* Trunk */}
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.8, 2, 6]} />
            <meshStandardMaterial color="#5d4037" />
          </mesh>
          {/* Leaves */}
          <mesh position={[0, 3, 0]} castShadow>
            <coneGeometry args={[2, 4, 8]} />
            <meshStandardMaterial color="#15803d" />
          </mesh>
          <mesh position={[0, 4.5, 0]} castShadow>
            <coneGeometry args={[1.5, 3, 8]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
        </group>
      ))}
      
      {/* Floor Plane (Grass) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -lengthUnits/2]} receiveShadow>
        <planeGeometry args={[200, lengthUnits + 100]} />
        <meshStandardMaterial color="#064e3b" />
      </mesh>
    </group>
  );
}
