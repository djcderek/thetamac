"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import {
  Stars,
  PerspectiveCamera,
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
    selectedSkin?: string;
    selectedTrail?: string;
    selectedVehicle?: string;
    selectedWheel?: string;
  }>;
  trackLength: number;
  myPlayerId: string;
  finishOrder: Array<{ playerId: string; position: number }>;
  obstacles: TrackObstacle[];
  drops: TrackDrop[];
  myPosition: number;
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
        <Suspense fallback={null}>
          <SceneContent 
            players={players}
            trackLength={trackLength}
            myPlayerId={myPlayerId}
            finishOrder={finishOrder}
            obstacles={obstacles}
            drops={drops}
            myPosition={myPosition}
            getPlayerColor={getPlayerColor}
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
        </div>
        
        {/* Leaderboard */}
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 border border-white/10">
          <div className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Race</div>
          {[...players]
            .sort((a, b) => b.position - a.position)
            .slice(0, 5)
            .map((player, i) => {
              const finishPos = getFinishPosition(player.id);
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

function SceneContent({
  players,
  trackLength,
  myPlayerId,
  finishOrder,
  obstacles,
  drops,
  myPosition,
  getPlayerColor
}: RaceTrack3DProps & { getPlayerColor: (id: string, index: number) => string }) {
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
      
      {/* Environment - Reduced star count for performance */}
      <Stars radius={100} depth={50} count={500} factor={4} saturation={0} fade speed={1} />
      <fog attach="fog" args={["#0f172a", 8, 140]} />
      <EnvironmentScenery length={trackLength} myPosition={myPosition} />
      
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
          finishPosition={finishOrder.find(f => f.playerId === player.id)?.position}
          skin={player.selectedSkin}
          trail={player.selectedTrail}
          vehicleType={player.selectedVehicle}
          wheel={player.selectedWheel}
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
