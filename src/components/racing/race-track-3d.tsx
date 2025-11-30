"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Text,
  Html,
  Environment,
  Stars,
  PerspectiveCamera,
} from "@react-three/drei";
import { useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { TrackObstacle, TrackDrop, ObstacleType, DropType } from "@/lib/racing/types";
import { 
  AlertTriangle, 
  Shield, 
  Zap, 
  Snowflake, 
  Sparkles, 
  Flag,
  User
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// ============================================
// TYPES & CONFIG
// ============================================

interface RaceTrack3DProps {
  players: Array<{
    id: string;
    username: string;
    lane: number;
    position: number;
    isStunned: boolean;
    hasShield?: boolean;
    speedBoostActive?: boolean;
    answerBoostActive?: boolean;
  }>;
  trackLength: number;
  myPlayerId: string;
  finishOrder: Array<{ playerId: string; position: number }>;
  obstacles: TrackObstacle[];
  drops: TrackDrop[];
  myPosition: number;
}

const LANE_WIDTH = 3;
const TRACK_WIDTH = LANE_WIDTH * 5;
// 1 meter in game = 1 unit in Three.js? Let's say 1m = 2 units for better visibility
const UNIT_SCALE = 2; 

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
// 3D COMPONENTS
// ============================================

function Car({ 
  position, 
  lane, 
  color, 
  isMe, 
  username, 
  isStunned, 
  hasShield, 
  speedBoostActive,
  answerBoostActive,
  finishPosition
}: { 
  position: number; 
  lane: number; 
  color: string; 
  isMe: boolean;
  username: string;
  isStunned: boolean;
  hasShield?: boolean;
  speedBoostActive?: boolean;
  answerBoostActive?: boolean;
  finishPosition?: number;
}) {
  // Smooth interpolation state
  const groupRef = useRef<THREE.Group>(null);
  const [currentPos, setCurrentPos] = useState(position);
  const [currentLane, setCurrentLane] = useState(lane);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Lerp position for smooth movement
    // Forward movement
    const targetZ = -position * UNIT_SCALE;
    const newZ = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, delta * 5);
    
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
  });

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {/* Car Body */}
      <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[1.2, 0.5, 2]} />
        <meshStandardMaterial color={isStunned ? "#555" : color} roughness={0.3} metalness={0.5} />
      </mesh>
      
      {/* Cabin */}
      <mesh castShadow position={[0, 0.8, -0.2]}>
        <boxGeometry args={[0.8, 0.4, 1]} />
        <meshStandardMaterial color="#111" roughness={0.2} />
      </mesh>

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

      {/* Effects */}
      {hasShield && (
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[1.8, 16, 16]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.3} wireframe />
        </mesh>
      )}
      
      {speedBoostActive && (
        <group position={[0, 0.5, 1.2]}>
           <mesh rotation={[-Math.PI / 2, 0, 0]}>
             <coneGeometry args={[0.4, 1, 8]} />
             <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
           </mesh>
        </group>
      )}
      
      {answerBoostActive && (
        <group position={[0, 0.2, 1.2]}>
           <mesh rotation={[-Math.PI / 2, 0, 0]}>
             <coneGeometry args={[0.3, 0.8, 8]} />
             <meshBasicMaterial color="#10b981" transparent opacity={0.6} />
           </mesh>
        </group>
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

function Obstacle({ type, lane, position }: { type: ObstacleType, lane: number, position: number }) {
  const x = (lane - 3) * LANE_WIDTH;
  const z = -position * UNIT_SCALE;
  
  return (
    <group position={[x, 0, z]}>
      {type === "barrier" && (
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[LANE_WIDTH * 0.8, 1, 0.5]} />
          <meshStandardMaterial color={OBSTACLE_COLORS.barrier} stripe pattern />
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
          <meshBasicMaterial color={OBSTACLE_COLORS.pothole} />
        </mesh>
      )}
    </group>
  );
}

function Drop({ type, lane, position, collected }: { type: DropType, lane: number, position: number, collected: boolean }) {
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
           {type === "magnet" && <Sparkles size={16} className="text-purple-400" />}
        </div>
      </Html>
    </group>
  );
}

function Track({ length }: { length: number }) {
  const lengthUnits = length * UNIT_SCALE;
  
  // Create a texture for the track (optional, procedural for now)
  
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

function GameCamera({ myPosition, trackLength }: { myPosition: number, trackLength: number }) {
  const cameraRef = useRef<THREE.Camera>(null);
  
  useFrame((state, delta) => {
    // Camera follows player with smoother lerp
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

function EnvironmentScenery({ length }: { length: number }) {
  // Simple low-poly trees or rocks along the side
  const lengthUnits = length * UNIT_SCALE;
  
  const trees = useMemo(() => {
    const items = [];
    for (let z = 0; z < lengthUnits; z += 15) {
      // Left side
      items.push({ x: -TRACK_WIDTH - 5 - Math.random() * 10, z: -z, scale: 0.5 + Math.random() * 0.5 });
      // Right side
      items.push({ x: TRACK_WIDTH + 5 + Math.random() * 10, z: -z, scale: 0.5 + Math.random() * 0.5 });
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function RaceTrack3D({
  players,
  trackLength,
  myPlayerId,
  finishOrder,
  obstacles,
  drops,
  myPosition,
}: RaceTrack3DProps) {
  
  const getPlayerColor = (id: string, index: number) => {
    if (id === myPlayerId) return "#3b82f6"; // blue-500
    const colors = ["#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"];
    return colors[index % colors.length];
  };
  
  const getFinishPosition = (playerId: string) => {
    const finish = finishOrder.find(f => f.playerId === playerId);
    return finish?.position;
  };

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden bg-black relative">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[20, 50, 10]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        >
          <orthographicCamera attach="shadow-camera" args={[-50, 50, 200, -200]} />
        </directionalLight>
        
        {/* Environment */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <fog attach="fog" args={["#111827", 10, 60]} /> {/* Distance fog */}
        <EnvironmentScenery length={trackLength} />
        
        {/* Track Elements */}
        <Track length={trackLength} />
        
        {/* Players */}
        {players.map((player, i) => (
          <Car
            key={player.id}
            position={player.position}
            lane={player.lane}
            color={getPlayerColor(player.id, i)}
            isMe={player.id === myPlayerId}
            username={player.username}
            isStunned={player.isStunned}
            hasShield={player.hasShield}
            speedBoostActive={player.speedBoostActive}
            answerBoostActive={player.answerBoostActive}
            finishPosition={finishOrder.find(f => f.playerId === player.id)?.position}
          />
        ))}

        {/* Obstacles */}
        {obstacles.map((obs) => (
          <Obstacle 
            key={obs.id} 
            type={obs.type} 
            lane={obs.lane} 
            position={obs.position} 
          />
        ))}

        {/* Drops */}
        {drops.map((drop) => (
          <Drop 
            key={drop.id} 
            type={drop.type} 
            lane={drop.lane} 
            position={drop.position}
            collected={drop.collected}
          />
        ))}

        {/* Camera Controller */}
        <GameCamera myPosition={myPosition} trackLength={trackLength} />
        
        {/* Post-processing could be added here (Bloom, etc.) */}
      </Canvas>
      
      {/* HUD Overlay */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
        {/* Track info */}
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
          <div className="flex items-center gap-2 text-sm text-white">
            <Flag className="w-4 h-4 text-green-500" />
            <span className="font-mono">{Math.round(myPosition)}m / {trackLength}m</span>
          </div>
          <Progress 
            value={(myPosition / trackLength) * 100} 
            className="mt-1 h-1.5 w-24 bg-white/20"
          />
        </div>
        
        {/* Leaderboard */}
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 border border-white/10">
          <div className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Race</div>
          {[...players]
            .sort((a, b) => b.position - a.position)
            .slice(0, 5)
            .map((player, i) => {
              const finishPos = getFinishPosition(player.id);
              // We need the original index for stable colors if we want to match the cars
              // But here we don't have the original index easily accessible unless we pass it or search
              // Let's just search for now, it's small array
              const playerIndex = players.findIndex(p => p.id === player.id); 
              
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 text-xs py-0.5 ${
                    player.id === myPlayerId ? "text-blue-400 font-semibold" : "text-white/70"
                  }`}
                >
                  <span className="font-mono w-4 text-white/50">{finishPos || i + 1}.</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getPlayerColor(player.id, playerIndex) }} />
                  <span className="truncate max-w-[50px]">
                    {player.id === myPlayerId ? "You" : player.username.slice(0, 6)}
                  </span>
                  <span className="font-mono ml-auto text-white/50">{Math.round(player.position)}m</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

