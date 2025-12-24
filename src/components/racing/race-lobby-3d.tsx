"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Sparkles, Float, Environment } from "@react-three/drei";
import { useRef, Suspense, useMemo } from "react";
import * as THREE from "three";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Wifi, Clock, Trophy, Star } from "lucide-react";

interface UserCosmetics {
  equippedSkin: string | null;
  equippedTrail: string | null;
  equippedVehicle: string | null;
  equippedWheel: string | null;
}

interface LobbyPlayer {
  id: string;
  username: string;
  rating: number;
  cosmetics?: UserCosmetics;
}

interface RaceLobby3DProps {
  players: LobbyPlayer[];
  maxPlayers: number;
  startingIn: number | null;
  currentUserId: string;
  onLeave: () => void;
}

// ============================================
// VEHICLE MODEL COMPONENT
// ============================================

function VehicleModel({ 
  skin, 
  vehicleType = "car_standard",
  isCurrentUser = false,
  position = [0, 0, 0] as [number, number, number],
}: { 
  skin?: string | null; 
  vehicleType?: string | null;
  isCurrentUser?: boolean;
  position?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const platformRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Slow rotation for showcase
      groupRef.current.rotation.y += 0.008;
    }

    // Animated platform glow for current user
    if (platformRef.current && isCurrentUser) {
      const material = platformRef.current.material as THREE.MeshStandardMaterial;
      const pulse = (Math.sin(state.clock.elapsedTime * 2) + 1) / 2;
      material.emissiveIntensity = 0.3 + pulse * 0.3;
    }

    if (materialRef.current) {
      // Animated Skins
      if (skin === 'skin_rainbow') {
        const hue = (state.clock.elapsedTime * 0.5) % 1;
        materialRef.current.color.setHSL(hue, 0.8, 0.5);
      } else if (skin === 'skin_lava') {
        const pulse = (Math.sin(state.clock.elapsedTime * 3) + 1) / 2;
        materialRef.current.emissiveIntensity = 0.5 + pulse * 0.5;
      }
    }
  });

  // Skin logic - default to gray for base vehicle
  let displayColor = "#94a3b8"; // Default Gray
  let metalness = 0.6;
  let roughness = 0.2;
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
    displayColor = '#1e1b4b';
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
  else if (skin === 'skin_hot_pink_decal') {
    displayColor = '#ff2db2';
    metalness = 0.7;
    roughness = 0.18;
    emissive = new THREE.Color('#ff2db2');
  }
  else if (skin === 'skin_rainbow') {
    metalness = 0.6;
    roughness = 0.2;
  }

  // Vehicle Geometry Selection
  const renderVehicleBody = () => {
    const type = vehicleType || "car_standard";

    if (type === 'car_truck') {
      return (
        <>
          <mesh castShadow receiveShadow position={[0, 0.2, -0.4]}>
            <boxGeometry args={[1.3, 0.8, 1.2]} />
            <meshStandardMaterial ref={materialRef} color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.0, 0.8]}>
            <boxGeometry args={[1.3, 0.5, 1.4]} />
            <meshStandardMaterial color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
          </mesh>
          <mesh position={[0, 0.35, -0.38]}>
            <boxGeometry args={[1.32, 0.3, 1.0]} />
            <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
          </mesh>
          <mesh position={[-0.45, 0.0, -1.01]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.05, 16]} />
            <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
          </mesh>
          <mesh position={[0.45, 0.0, -1.01]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.05, 16]} />
            <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
          </mesh>
        </>
      );
    } else if (type === 'car_jeep') {
      return (
        <>
          <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
            <boxGeometry args={[1.1, 0.6, 1.8]} />
            <meshStandardMaterial ref={materialRef} color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
          </mesh>
          <mesh position={[0, 0.8, -0.2]}>
            <boxGeometry args={[1.0, 0.05, 1.0]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[-0.5, 0.45, -0.7]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0.5, 0.45, -0.7]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[-0.5, 0.45, 0.3]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0.5, 0.45, 0.3]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#111" /></mesh>
        </>
      );
    } else if (type === 'car_sport') {
      return (
        <>
          <mesh castShadow receiveShadow position={[0, -0.1, 0]}>
            <boxGeometry args={[1.3, 0.4, 2.2]} />
            <meshStandardMaterial ref={materialRef} color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
          </mesh>
          <mesh castShadow position={[0, 0.2, -0.2]}>
            <boxGeometry args={[0.9, 0.3, 1]} />
            <meshStandardMaterial color="#111" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.2, 0.9]}>
            <boxGeometry args={[1.4, 0.05, 0.3]} />
            <meshStandardMaterial color={displayColor} />
          </mesh>
        </>
      );
    }
    
    // Default Car
    return (
      <>
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[1.2, 0.5, 2]} />
          <meshStandardMaterial ref={materialRef} color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
        </mesh>
        <mesh castShadow position={[0, 0.4, -0.2]}>
          <boxGeometry args={[0.8, 0.4, 1]} />
          <meshStandardMaterial color="#111" roughness={0.2} />
        </mesh>
        <mesh position={[-0.4, 0.1, -1.01]}>
          <boxGeometry args={[0.2, 0.1, 0.05]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
        </mesh>
        <mesh position={[0.4, 0.1, -1.01]}>
          <boxGeometry args={[0.2, 0.1, 0.05]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
        </mesh>
        <mesh position={[-0.4, 0.15, 1.01]}>
          <boxGeometry args={[0.25, 0.1, 0.05]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
        </mesh>
        <mesh position={[0.4, 0.15, 1.01]}>
          <boxGeometry args={[0.25, 0.1, 0.05]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
        </mesh>
      </>
    );
  };

  // Wheels
  const wheelPositions: [number, number, number][] = [
    [-0.6, -0.2, -0.6], [0.6, -0.2, -0.6],
    [-0.6, -0.2, 0.6], [0.6, -0.2, 0.6]
  ];

  return (
    <group position={position}>
      {/* Platform */}
      <mesh 
        ref={platformRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.49, 0]} 
        receiveShadow
      >
        <circleGeometry args={[2, 32]} />
        <meshStandardMaterial 
          color={isCurrentUser ? "#0f172a" : "#020617"} 
          emissive={isCurrentUser ? "#1e40af" : "#000000"}
          emissiveIntensity={isCurrentUser ? 2 : 0}
          metalness={0.9} 
          roughness={0.1} 
        />
      </mesh>

      {/* Inner Ring for style */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
        <ringGeometry args={[1.8, 1.85, 32]} />
        <meshBasicMaterial color={isCurrentUser ? "#3b82f6" : "#1e293b"} transparent opacity={0.8} />
      </mesh>


      {/* Vehicle */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.1}>
        <group ref={groupRef}>
          {renderVehicleBody()}
          {/* Wheels */}
          {wheelPositions.map((pos, i) => (
            <mesh key={i} position={pos} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.3, 0.3, 0.3, 16]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          ))}
          
          {/* Skin effects */}
          {skin === 'skin_galactic' && (
            <Sparkles count={15} scale={2.5} size={3} speed={0.3} color="#ffffff" />
          )}
        </group>
      </Float>

      {/* Spotlight on platform */}
      <spotLight
        position={[0, 5, 0]}
        angle={0.4}
        penumbra={0.5}
        intensity={isCurrentUser ? 150 : 80}
        color={isCurrentUser ? "#3b82f6" : "#ffffff"}
        castShadow
      />
    </group>
  );
}

// ============================================
// EMPTY SLOT COMPONENT
// ============================================

function EmptySlot({ position }: { position: [number, number, number] }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group position={position}>
      {/* Platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]} receiveShadow>
        <circleGeometry args={[2, 32]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.5} transparent opacity={0.5} />
      </mesh>

      {/* Dashed ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.47, 0]}>
        <ringGeometry args={[1.7, 1.9, 32]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.3} />
      </mesh>

      {/* Question mark or waiting indicator */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ============================================
// DECORATIONS
// ============================================

function BackgroundDecorations() {
  return null;
}

// ============================================
// LOBBY FLOOR
// ============================================

function LobbyFloor() {
  return (
    <group>
      {/* Dark Reflective Floor - using standard material to avoid worker issues */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial
          color="#050505"
          roughness={0.3}
          metalness={0.8}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* Subtle Grid Overlay */}
      <gridHelper 
        args={[100, 50, "#1e293b", "#0f172a"]} 
        position={[0, -0.49, 0]} 
      />
    </group>
  );
}

// ============================================
// LOBBY SCENE
// ============================================

function LobbyScene({ 
  players, 
  maxPlayers,
  currentUserId,
}: { 
  players: LobbyPlayer[];
  maxPlayers: number;
  currentUserId: string;
}) {
  // Calculate positions in a semi-circle arrangement
  // Reduce spacing for larger lobbies to keep everything in view
  const positions = useMemo(() => {
    // For 5 players: spacing=5, for 8 players: spacing ~3.5
    const spacing = maxPlayers <= 5 ? 5 : 3.5;
    const totalWidth = (maxPlayers - 1) * spacing;
    const startX = -totalWidth / 2;
    
    return Array.from({ length: maxPlayers }, (_, i) => {
      const x = startX + (i * spacing);
      return [x, 0, 0] as [number, number, number];
    });
  }, [maxPlayers]);

  return (
    <>
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 20, 90]} />
      
      {/* Ambient Light */}
      <ambientLight intensity={1.5} />
      
      {/* Main overhead lights - Cool Blue Tint */}
      <spotLight 
        position={[0, 15, 5]} 
        angle={0.5} 
        penumbra={0.5} 
        intensity={2000}
        color="#e0f2fe"
        castShadow
      />

      {/* Colored accent lights - More Vibrant */}
      <pointLight position={[-15, 5, 5]} intensity={1500} color="#a855f7" /> {/* Purple */}
      <pointLight position={[15, 5, 5]} intensity={1500} color="#06b6d4" /> {/* Cyan */}
      
      {/* Floor */}
      <LobbyFloor />

      {/* Decorations */}
      <BackgroundDecorations />

      {/* Players */}
      {positions.map((pos, index) => {
        const player = players[index];
        if (player) {
          return (
            <VehicleModel
              key={player.id}
              position={pos}
              skin={player.cosmetics?.equippedSkin}
              vehicleType={player.cosmetics?.equippedVehicle}
              isCurrentUser={player.id === currentUserId}
            />
          );
        }
        return <EmptySlot key={`empty-${index}`} position={pos} />;
      })}

      {/* Background particles */}
      <Sparkles 
        count={100} 
        scale={[40, 20, 20]} 
        size={2} 
        speed={0.3} 
        opacity={0.5}
        color="#6366f1"
      />

      {/* Environment - using local HDR file */}
      <Environment files="/hdri/city.hdr" />
    </>
  );
}

// ============================================
// PLAYER INFO CARD (HTML OVERLAY)
// ============================================

function PlayerCard({ 
  player, 
  index,
  isCurrentUser,
}: { 
  player: LobbyPlayer | null;
  index: number;
  isCurrentUser: boolean;
}) {
  if (!player) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/20 animate-pulse" />
        </div>
        <p className="text-xs text-white/40 font-medium">Waiting...</p>
        <p className="text-[10px] text-white/20">Slot {index + 1}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className={`relative w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-2 ${
        isCurrentUser 
          ? 'bg-linear-to-br from-blue-500/30 to-cyan-500/30 border-2 border-blue-400' 
          : 'bg-white/10 border border-white/20'
      }`}>
        <span className="text-lg sm:text-2xl font-bold text-white">
          {player.username.slice(0, 2).toUpperCase()}
        </span>
        {isCurrentUser && (
          <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <Star className="w-3 h-3 text-white fill-white" />
          </div>
        )}
      </div>
      <p className={`text-xs sm:text-sm font-semibold max-w-[92px] sm:max-w-[120px] truncate ${isCurrentUser ? 'text-blue-400' : 'text-white'}`}>
        {isCurrentUser ? 'You' : player.username}
      </p>
      <div className="flex items-center gap-1 mt-0.5">
        <Trophy className="w-3 h-3 text-amber-400" />
        <span className="text-xs text-white/60">{player.rating}</span>
      </div>
    </div>
  );
}

// ============================================
// CAMERA RIG
// ============================================

function CameraRig({ maxPlayers }: { maxPlayers: number }) {
  // On narrow/portrait screens, the horizontal FOV shrinks (even with the same vertical FOV),
  // which can clip vehicles placed across the lobby lineup. Compensate by widening vertical FOV
  // and backing the camera up a bit. Keep the adjustments modest so mobile isn't zoomed too far out.
  // Also adjust for larger lobbies (8 players needs more distance than 5)
  useFrame((state, delta) => {
    const aspect = state.size.width / Math.max(1, state.size.height);
    const portraitFactor = Math.max(0, 1 - aspect); // 0 on landscape-ish, higher on portrait
    
    // For larger lobbies, increase base distance
    const lobbyFactor = maxPlayers > 5 ? 1.2 : 1;

    const targetFov = THREE.MathUtils.clamp(45 + portraitFactor * 45, 45, 100);
    // Slight pull-back on portrait/mobile so the whole lineup stays visible without feeling distant.
    const targetZ = (19 * lobbyFactor) + portraitFactor * 70;
    const targetY = (6 * lobbyFactor) + portraitFactor * 14;

    const cam = state.camera as THREE.PerspectiveCamera;
    if ("fov" in cam) {
      cam.fov = THREE.MathUtils.damp(cam.fov, targetFov, 6, delta);
      cam.updateProjectionMatrix();
    }

    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, targetZ, 6, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, targetY, 6, delta);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function RaceLobby3D({ 
  players, 
  maxPlayers, 
  startingIn,
  currentUserId,
  onLeave,
}: RaceLobby3DProps) {
  const slots = Array.from({ length: maxPlayers }, (_, i) => players[i] || null);

  return (
    <div className="relative w-full h-[520px] sm:h-[600px] bg-slate-950 rounded-xl overflow-hidden border border-white/10">
      {/* 3D Canvas */}
      <Canvas shadows dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 6, 19]} fov={45} />
          <CameraRig maxPlayers={maxPlayers} />
          <LobbyScene 
            players={players}
            maxPlayers={maxPlayers}
            currentUserId={currentUserId}
          />
{/* Camera is fixed - no controls */}
        </Suspense>
      </Canvas>

      {/* Top Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 bg-linear-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pointer-events-auto">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-white/10 backdrop-blur shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white">Race Lobby</h2>
              <p className="text-sm text-white/60">
                {players.length}/{maxPlayers} players ready
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Badge variant="outline" className="border-green-500/50 text-green-400 bg-green-500/10 shrink-0">
              <Wifi className="w-3 h-3 mr-1.5" />
              Connected
            </Badge>
            
            <button 
              onClick={onLeave}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors touch-manipulation min-h-10"
            >
              Leave
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Player Cards Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6 bg-linear-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
        {/* Starting countdown */}
        {startingIn !== null && (
          <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6 pointer-events-auto">
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-linear-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 animate-pulse" />
              <span className="text-base sm:text-lg font-bold text-emerald-400">
                Race starting in {startingIn}s
              </span>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="max-w-md mx-auto mb-4 sm:mb-6 pointer-events-auto">
          <Progress value={(players.length / maxPlayers) * 100} className="h-2 bg-white/10" />
        </div>

        {/* Player cards */}
        <div className={`grid gap-3 place-items-center sm:flex sm:items-center sm:justify-center sm:gap-6 pointer-events-auto ${
          maxPlayers > 5 ? 'grid-cols-4' : 'grid-cols-3'
        }`}>
          {slots.map((player, index) => (
            <PlayerCard
              key={player?.id || `slot-${index}`}
              player={player}
              index={index}
              isCurrentUser={player?.id === currentUserId}
            />
          ))}
        </div>
      </div>

      {/* Decorative corner elements */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-white/10 rounded-tl-lg pointer-events-none" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-white/10 rounded-tr-lg pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-white/10 rounded-bl-lg pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-white/10 rounded-br-lg pointer-events-none" />
    </div>
  );
}

export default RaceLobby3D;

