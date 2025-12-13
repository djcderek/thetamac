"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Stars,
  PerspectiveCamera,
  Environment,
} from "@react-three/drei";
import { TrackObstacle, TrackDrop } from "@/lib/racing/types";
import { Flag } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Car,
  Obstacle,
  Drop,
  Track,
  GameCamera,
  EnvironmentScenery,
  TRACK_WIDTH,
  UNIT_SCALE,
} from "./race-track-scene";

// Visibility culling distance in meters
const VISIBILITY_DISTANCE = 100;

// ============================================
// TYPES
// ============================================

interface RaceTrack3DProps {
  players: Array<{
    id: string;
    username: string;
    lane: number;
    position: number;
    isStunned: boolean;
    hasShield?: boolean;
    coinsEarned?: number;
    selectedSkin?: string;
    selectedTrail?: string;
    selectedVehicle?: string;
    selectedWheel?: string;
    speedFxUntil?: number;
    forwardFxUntil?: number;
    magnetFxUntil?: number;
  }>;
  trackLength: number;
  myPlayerId: string;
  finishOrder: Array<{ playerId: string; position: number }>;
  obstacles: TrackObstacle[];
  drops: TrackDrop[];
  myPosition: number;
}

// ============================================
// SKIN COLOR MAPPING
// ============================================

// Maps skin assetId to its display color
const SKIN_COLORS: Record<string, string> = {
  car_red: "#ef4444",
  car_blue: "#3b82f6",
  car_gold: "#fbbf24",
  skin_galactic: "#1e1b4b",
  skin_glitch: "#22c55e",
  skin_lava: "#7f1d1d",
  skin_ice: "#bae6fd",
  skin_rainbow: "#a855f7", // Use purple as a static representation for rainbow
};

// Default gray color when no skin is selected
const DEFAULT_CAR_COLOR = "#94a3b8"; // slate-400

// Get the display color for a player's car based on their selected skin
function getCarColorFromSkin(skin?: string): string {
  if (!skin) return DEFAULT_CAR_COLOR;
  return SKIN_COLORS[skin] || DEFAULT_CAR_COLOR;
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
  
  const getFinishPosition = (playerId: string) => {
    const finish = finishOrder.find(f => f.playerId === playerId);
    return finish?.position;
  };

  const myPlayer = players.find(p => p.id === myPlayerId);
  const myCoins = myPlayer?.coinsEarned || 0;

  return (
    <div className="w-full h-[280px] sm:h-[400px] rounded-xl overflow-hidden bg-black relative">
      <Canvas shadows dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <SceneContent 
            players={players}
            trackLength={trackLength}
            myPlayerId={myPlayerId}
            finishOrder={finishOrder}
            obstacles={obstacles}
            drops={drops}
            myPosition={myPosition}
          />
        </Suspense>
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
          <div className="flex items-center gap-2 text-sm text-amber-400 mt-2 border-t border-white/10 pt-2 font-bold">
             <span className="text-lg leading-none">🪙</span>
             <span className="font-mono">{myCoins}</span>
          </div>
        </div>
        
        {/* Leaderboard */}
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 border border-white/10">
          <div className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Race</div>
          {[...players]
            .sort((a, b) => b.position - a.position)
            .slice(0, 5)
            .map((player, i) => {
              const finishPos = getFinishPosition(player.id);
              
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 text-xs py-0.5 ${
                    player.id === myPlayerId ? "text-blue-400 font-semibold" : "text-white/70"
                  }`}
                >
                  <span className="font-mono w-4 text-white/50">{finishPos || i + 1}.</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCarColorFromSkin(player.selectedSkin) }} />
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

function SceneContent({
  players,
  trackLength,
  myPlayerId,
  finishOrder,
  obstacles,
  drops,
  myPosition,
}: RaceTrack3DProps) {
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();

    const intervalId = setInterval(updateNow, 250);
    return () => clearInterval(intervalId);
  }, []);
  // Filter obstacles and drops based on visibility distance for performance
  const visibleObstacles = useMemo(() => {
    return obstacles.filter(obs => {
      const distance = Math.abs(obs.position - myPosition);
      return distance < VISIBILITY_DISTANCE;
    });
  }, [obstacles, myPosition]);

  const visibleDrops = useMemo(() => {
    return drops.filter(drop => {
      if (drop.collected) return false;
      const distance = Math.abs(drop.position - myPosition);
      return distance < VISIBILITY_DISTANCE;
    });
  }, [drops, myPosition]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
      
      <color attach="background" args={['#0f172a']} />

      {/* Lighting */}
      <ambientLight intensity={0.65} color="#e2e8f0" />
      <hemisphereLight
        args={["#f8fafc", "#0f172a", 0.9]}
        position={[0, 60, 0]}
      />
      <directionalLight 
        position={[-30, 80, 40]} 
        intensity={1.6} 
        color="#fff7ed"
        castShadow 
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.001}
      >
        <orthographicCamera attach="shadow-camera" args={[-60, 60, 220, -220]} />
      </directionalLight>

      {/* Moving fill lights that follow the player to add depth */}
      <pointLight position={[TRACK_WIDTH * 0.7, 6, -myPosition * UNIT_SCALE - 8]} intensity={0.55} color="#22d3ee" distance={60} />
      <pointLight position={[-TRACK_WIDTH * 0.7, 6, -myPosition * UNIT_SCALE - 8]} intensity={0.55} color="#a855f7" distance={60} />
      
      {/* Environment - Reduced star count for performance */}
      <Environment files="/hdri/city.hdr" />
      <Stars radius={100} depth={50} count={300} factor={4} saturation={0} fade speed={1} />
      <fog attach="fog" args={["#0f172a", 8, 140]} />
      <EnvironmentScenery length={trackLength} myPosition={myPosition} />
      
      {/* Track Elements */}
      <Track length={trackLength} />
      
      {/* Players */}
      {players.map((player) => (
        <Car
          key={player.id}
          position={player.position}
          lane={player.lane}
          color={getCarColorFromSkin(player.selectedSkin)}
          isMe={player.id === myPlayerId}
          username={player.username}
          isStunned={player.isStunned}
          hasShield={player.hasShield}
          finishPosition={finishOrder.find(f => f.playerId === player.id)?.position}
          skin={player.selectedSkin}
          trail={player.selectedTrail}
          vehicleType={player.selectedVehicle}
          wheel={player.selectedWheel}
          speedEffect={Boolean(player.speedFxUntil && player.speedFxUntil > now)}
          forwardEffect={Boolean(player.forwardFxUntil && player.forwardFxUntil > now)}
          magnetEffect={Boolean(player.magnetFxUntil && player.magnetFxUntil > now)}
        />
      ))}

      {/* Obstacles - Only render visible ones */}
      {visibleObstacles.map((obs) => (
        <Obstacle 
          key={obs.id} 
          type={obs.type} 
          lane={obs.lane} 
          position={obs.position} 
        />
      ))}

      {/* Drops - Only render visible ones */}
      {visibleDrops.map((drop) => (
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
    </>
  );
}
