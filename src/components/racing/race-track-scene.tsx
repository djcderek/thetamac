"use client";

import { useFrame } from "@react-three/fiber";
import { Sparkles, Html } from "@react-three/drei";
import { useRef, useMemo, ReactNode } from "react";
import * as THREE from "three";
import { TrackObstacle, TrackDrop, ObstacleType, DropType } from "@/lib/racing/types";

// ============================================
// CONSTANTS & TYPES
// ============================================

export const LANE_WIDTH = 3;
export const TRACK_WIDTH = LANE_WIDTH * 5;
export const UNIT_SCALE = 2; 

const VEHICLE_REAR_OFFSETS: Record<string, number> = {
  car_truck: 1.55,
  car_sport: 1.15,
  car_jeep: 0.95,
  default: 1.05,
};
// Extra spacing so trail visuals fully sit behind the bumper instead of intersecting the body
const BOOST_TRAIL_OFFSET = 0.9; // for volumetric/cone style trails
const FLAT_TRAIL_OFFSET = 1.6;  // for plane/ribbon style trails

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
  coin: "#fbbf24", // amber-400
};

// Simple HTML-based label to avoid worker-based text (Troika) which is
// currently broken under Next.js 16 Turbopack module workers.
function Label3D({
  position,
  children,
  color = "#ffffff",
  fontSize = 14,
  rotation,
  fontWeight = 700,
  distanceFactor = 14,
}: {
  position: [number, number, number];
  children: ReactNode;
  color?: string;
  fontSize?: number;
  rotation?: [number, number, number];
  fontWeight?: number | string;
  distanceFactor?: number;
}) {
  return (
    <Html
      center
      transform
      position={position}
      rotation={rotation}
      distanceFactor={distanceFactor}
      style={{
        color,
        fontSize: `${fontSize}px`,
        fontWeight,
        textShadow: "0 1px 3px rgba(0,0,0,0.6)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {children}
    </Html>
  );
}

// ============================================
// COMPONENT DEFINITIONS
// ============================================

function WindEffect({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.visible = active;
      if (active) {
         // Subtle shake to simulate turbulence
         groupRef.current.position.x = (Math.random() - 0.5) * 0.03;
         groupRef.current.position.y = (Math.random() - 0.5) * 0.03;
      }
    }
  });

  // Create random wind lines
  const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  const lines = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, i) => {
        const s0 = pseudoRandom(1000 + i * 13);
        const s1 = pseudoRandom(2000 + i * 17);
        const s2 = pseudoRandom(3000 + i * 19);
        const s3 = pseudoRandom(4000 + i * 23);
        const s4 = pseudoRandom(5000 + i * 29);
        const s5 = pseudoRandom(6000 + i * 31);
        const s6 = pseudoRandom(7000 + i * 37);
        const s7 = pseudoRandom(8000 + i * 41);

        return {
          key: i,
          // Position primarily on the sides and slightly above
          x: (s0 > 0.5 ? 1 : -1) * (0.7 + s1 * 0.8),
          y: 0.2 + s2 * 1.0,
          z: -s3 * 5,
          speed: 25 + s4 * 15,
          len: 1.5 + s5 * 2.5,
          opacity: 0.2 + s6 * 0.4,
          width: 0.02 + s7 * 0.03,
        };
      }),
    []
  );

  return (
    <group ref={groupRef} visible={false}>
      {/* Streaming Lines */}
      {lines.map(({ key, ...lineProps }) => (
        <WindLine key={key} {...lineProps} active={active} />
      ))}
    </group>
  );
}

type WindLineProps = {
  x: number;
  y: number;
  z: number;
  speed: number;
  len: number;
  opacity: number;
  width: number;
  active: boolean;
};

function WindLine({ x, y, z, speed, len, opacity, width, active }: WindLineProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const zPos = useRef(z);

  useFrame((_state, delta) => {
    if (!active || !meshRef.current) return;
    
    zPos.current += speed * delta;
    if (zPos.current > 3) { // Passed the car
      zPos.current = -8 - Math.random() * 4; // Reset far ahead
    }
    meshRef.current.position.z = zPos.current;
  });

  return (
    <mesh ref={meshRef} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[width, width, len, 3]} />
      <meshBasicMaterial color="#bae6fd" transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

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
  vehicleType = "car_standard",
  wheel,
  speedEffect = false,
  forwardEffect = false,
  magnetEffect = false,
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
  wheel?: string;
  speedEffect?: boolean;
  forwardEffect?: boolean;
  magnetEffect?: boolean;
}) {
  // Smooth interpolation state
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const smoothedPosition = useRef(position);
  const fireTrailRef = useRef<THREE.Group>(null);
  const fireOuterMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const fireInnerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const magnetRef = useRef<THREE.Group>(null);
  
  // Memoize skin-based material properties to avoid allocating on every render
  const skinProps = useMemo(() => {
    // Default gray color when no skin is selected
    const defaultGray = "#94a3b8"; // slate-400
    let displayColor = skin ? color : defaultGray; // Use gray if no skin, otherwise use passed color (which should also be gray or skin-based)
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

    return { displayColor, metalness, roughness, emissive, wireframe, opacity, transparent };
  }, [skin, color]);

  const { displayColor, metalness, roughness, emissive, wireframe, opacity, transparent } = skinProps;

  const wheelType = wheel || "wheel_standard";
  const wheelPositions = useMemo<[number, number, number][]>(() => [
    [-0.6, 0.2, -0.6],
    [0.6, 0.2, -0.6],
    [-0.6, 0.2, 0.6],
    [0.6, 0.2, 0.6],
  ], []);

  // Keep boost visuals anchored to each vehicle's rear bumper
  const vehicleRear = useMemo(
    () => VEHICLE_REAR_OFFSETS[vehicleType ?? ""] ?? VEHICLE_REAR_OFFSETS.default,
    [vehicleType]
  );
  const boostAttachZ = vehicleRear + BOOST_TRAIL_OFFSET;
  const flatTrailZ = vehicleRear + FLAT_TRAIL_OFFSET;

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Smooth forward progress to avoid visible jumps from discrete updates
    smoothedPosition.current = THREE.MathUtils.damp(
      smoothedPosition.current,
      position,
      6,
      delta
    );
    
    // Lerp position for smooth movement
    // Forward movement using smoothed position
    const targetZ = -smoothedPosition.current * UNIT_SCALE;
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

    // Fire trail flicker/stretch
    if (trail === 'trail_fire' && fireTrailRef.current) {
      const t = state.clock.elapsedTime;
      const flicker = 0.85 + Math.sin(t * 17) * 0.12 + Math.sin(t * 29) * 0.08;
      const scaleX = 0.95 + Math.sin(t * 9) * 0.08;
      const scaleY = 1.15 + Math.sin(t * 13) * 0.18;
      const scaleZ = 0.95 + Math.sin(t * 11) * 0.12;

      fireTrailRef.current.scale.set(scaleX, scaleY, scaleZ);
      fireTrailRef.current.rotation.y = 0;

      if (fireOuterMatRef.current) fireOuterMatRef.current.opacity = 0.55 * flicker;
      if (fireInnerMatRef.current) fireInnerMatRef.current.opacity = 0.75 * flicker;
    }

    // Magnet swirl
    if (magnetRef.current) {
      magnetRef.current.visible = magnetEffect;
      if (magnetEffect) {
        magnetRef.current.rotation.y += delta * 1.5;
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

  const renderWheel = (wheelType: string) => {
    if (wheelType === "wheel_spinner") {
      return (
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.3, 16]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
            <meshStandardMaterial color="#e2e8f0" metalness={1} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.17, 0]} rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[0.3, 0.05, 0.02]} />
            <meshStandardMaterial color="#e2e8f0" metalness={1} roughness={0.1} />
          </mesh>
        </group>
      );
    }

    if (wheelType === "wheel_offroad") {
      return (
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.35, 0.35, 0.4, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.21, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 6]} />
            <meshStandardMaterial color="#555" metalness={0.5} />
          </mesh>
        </group>
      );
    }

    if (wheelType === "wheel_future") {
      return (
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.3, 24]} />
            <meshStandardMaterial color="#000" />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <torusGeometry args={[0.2, 0.02, 8, 24]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <circleGeometry args={[0.1]} />
            <meshStandardMaterial color="#000" />
          </mesh>
        </group>
      );
    }

    return (
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.3, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    );
  };

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {renderVehicleBody()}

      {/* Wheels */}
      {wheelPositions.map((pos, idx) => (
        <group key={idx} position={pos} scale={wheelType === "wheel_offroad" ? 1.2 : 1}>
          {renderWheel(wheelType)}
        </group>
      ))}

      {/* Boost / forward wind effect */}
      <WindEffect active={Boolean(speedEffect || forwardEffect)} />

      {/* Skin Specific Effects */}
      {skin === 'skin_galactic' && !isStunned && (
        <Sparkles count={20} scale={2.5} size={4} speed={0.4} opacity={1} color="#ffffff" />
      )}

      {/* Effects */}
      {trail === 'trail_fire' && !isStunned && !finishPosition && (
        <group ref={fireTrailRef} position={[0, 0.2, boostAttachZ]}>
           {/* Simple fire trail particles or mesh */}
           <mesh rotation={[Math.PI / 2, 0, 0]}>
             <coneGeometry args={[0.4, 1.5, 8]} />
             <meshBasicMaterial ref={fireOuterMatRef} color="#ef4444" transparent opacity={0.6} />
           </mesh>
           <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.5]}>
             <coneGeometry args={[0.2, 1, 8]} />
             <meshBasicMaterial ref={fireInnerMatRef} color="#fbbf24" transparent opacity={0.8} />
           </mesh>
        </group>
      )}

      {trail === 'trail_neon' && !isStunned && !finishPosition && (
        <group position={[0, 0.1, flatTrailZ]}>
           <mesh rotation={[Math.PI / 2, 0, 0]}>
             <planeGeometry args={[1, 3]} />
             <meshBasicMaterial color="#06b6d4" transparent opacity={0.4} side={THREE.DoubleSide} />
           </mesh>
        </group>
      )}

      {trail === 'trail_pixel' && !isStunned && !finishPosition && (
        <group position={[0, 0.1, boostAttachZ]}>
          {[0, 0.4, 0.8, 1.2].map((z, i) => {
            const offset = (i % 2 === 0 ? 1 : -1) * 0.1;
            return (
              <mesh key={i} position={[offset, -offset * 0.8, z]}>
                <boxGeometry args={[0.2, 0.2, 0.2]} />
                <meshBasicMaterial color="#22c55e" transparent opacity={0.8 - z / 2} />
              </mesh>
            );
          })}
        </group>
      )}

      {trail === 'trail_lightning' && !isStunned && !finishPosition && (
        <group position={[0, 0.1, boostAttachZ]}>
          <Sparkles count={30} scale={[0.5, 0.5, 2]} size={6} speed={2} color="#eab308" />
        </group>
      )}

      {trail === 'trail_rainbow' && !isStunned && !finishPosition && (
        <group position={[0, 0.05, flatTrailZ]}>
          <mesh position={[-0.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.2, 3]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.2, 3]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.2, 3]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {hasShield && (
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[1.8, 16, 16]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.3} wireframe />
        </mesh>
      )}

      {/* Magnet aura */}
      {magnetEffect && (
        <group ref={magnetRef} position={[0, 0.2, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.2, 0.07, 12, 32]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.6} transparent opacity={0.4} />
          </mesh>
          <Sparkles count={15} scale={[2.2, 0.4, 2.2]} size={4} speed={1} opacity={0.8} color="#22d3ee" />
        </group>
      )}

      {/* Player Label */}
      <Label3D
        position={[0, 2.2, 0]}
        fontSize={16}
        color={isMe ? "#3b82f6" : "#ffffff"}
      >
        {finishPosition ? `#${finishPosition}` : (isMe ? "YOU" : username.slice(0, 8))}
      </Label3D>
      
      {/* Stunned indicator */}
      {isStunned && (
        <Label3D position={[0, 2.7, 0]} fontSize={15} color="#ef4444">
          ⚡ STUNNED
        </Label3D>
      )}
    </group>
  );
}

export function Obstacle({ type, lane, position }: { type: ObstacleType, lane: number, position: number }) {
  const x = (lane - 3) * LANE_WIDTH;
  const z = -position * UNIT_SCALE;
  
  return (
    <group position={[x, 0, z]}>
      {type === "barrier" && (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[LANE_WIDTH * 0.8, 1, 0.5]} />
          <meshStandardMaterial color={OBSTACLE_COLORS.barrier} />
          {/* Stripes would need a texture, let's use a simple color for now with some geometry detail */}
          <mesh position={[0, 0, 0.26]}>
             <planeGeometry args={[LANE_WIDTH * 0.7, 0.8]} />
             <meshBasicMaterial color="#ffffff" />
          </mesh>
        </mesh>
      )}
      
      {type === "cone" && (
        <mesh position={[0, 0.5, 0]}>
          <coneGeometry args={[0.4, 1, 16]} />
          <meshStandardMaterial color={OBSTACLE_COLORS.cone} />
        </mesh>
      )}
      
      {type === "oil_slick" && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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

// Drop type symbols for Text labels (performance-friendly)
const DROP_SYMBOLS: Record<DropType, string> = {
  speed_boost: "⚡",
  shield: "🛡",
  freeze_others: "❄",
  magnet: "✦",
  coin: "🪙",
};

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

  // Coin-specific model for better visuals
  const renderCoin = () => (
    <group rotation={[Math.PI / 2, 0, 0]}> {/* Rotate upright to face camera/player */}
      {/* Main body - Gold */}
      <mesh>
        <cylinderGeometry args={[0.6, 0.6, 0.15, 32]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Rim - Slightly darker/shiny */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.05, 16, 32]} />
        <meshStandardMaterial color="#f59e0b" metalness={1} roughness={0.2} emissive="#fbbf24" emissiveIntensity={0.2} />
      </mesh>
      {/* Inner detail - Slightly inset */}
      <mesh position={[0, 0.08, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.02, 32]} />
        <meshStandardMaterial color="#fcd34d" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.08, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.02, 32]} />
        <meshStandardMaterial color="#fcd34d" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  );

  return (
    <group ref={groupRef} position={[x, 1, z]}>
      {type === "coin" ? (
        <>
          {renderCoin()}
          <pointLight color={color} intensity={1.2} distance={3} />
        </>
      ) : (
        <>
          <mesh>
            <octahedronGeometry args={[0.5]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} wireframe />
          </mesh>
          <mesh>
            <octahedronGeometry args={[0.3]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <pointLight color={color} intensity={1} distance={3} />
        </>
      )}

      {/* Drop type indicator (HTML-based to avoid worker issues) */}
      {/* Hide label for coins as the model is self-explanatory */}
      {type !== "coin" && (
        <Label3D position={[0, 1, 0]} fontSize={16} color={color}>
          {DROP_SYMBOLS[type]}
        </Label3D>
      )}
    </group>
  );
}

export function Track({ length }: { length: number }) {
  const lengthUnits = length * UNIT_SCALE;
  
  return (
    <group>
      {/* Soft glow underlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, -lengthUnits / 2]}>
        <planeGeometry args={[TRACK_WIDTH + 10, lengthUnits + 80]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, -lengthUnits / 2]}>
        <planeGeometry args={[TRACK_WIDTH + 4, lengthUnits + 40]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.08} />
      </mesh>

      {/* Main Track Surface - removed receiveShadow for performance */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -lengthUnits / 2]}>
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
      <Label3D position={[0, 2, 0]} fontSize={28} color="white">
        START
      </Label3D>

      {/* Finish Line */}
      <group position={[0, 0, -lengthUnits]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[TRACK_WIDTH, 2]} />
          {/* Checkerboard shader or texture would be ideal, simplifying to stripes */}
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        
        {/* Finish Arch - removed castShadow for performance */}
        <mesh position={[-TRACK_WIDTH/2 - 0.5, 2.5, 0]}>
          <boxGeometry args={[1, 5, 1]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[TRACK_WIDTH/2 + 0.5, 2.5, 0]}>
          <boxGeometry args={[1, 5, 1]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[0, 4.5, 0]}>
          <boxGeometry args={[TRACK_WIDTH + 2, 1, 1]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        
        <Label3D position={[0, 4.5, 0.51]} fontSize={24} color="white">
          FINISH
        </Label3D>
      </group>
      
      {/* Distance Markers - Every 50m for better performance */}
      {Array.from({ length: Math.floor(length / 50) }).map((_, i) => {
        const dist = (i + 1) * 50;
        if (dist >= length) return null;
        return (
          <group key={dist} position={[TRACK_WIDTH/2 + 2, 0, -dist * UNIT_SCALE]}>
            <Label3D
              position={[0, 1.2, 0]}
              fontSize={18}
              color="rgba(255,255,255,0.3)"
              rotation={[0, Math.PI / 2, 0]}
            >
              {dist}m
            </Label3D>
          </group>
        );
      })}
    </group>
  );
}

export function GameCamera({ myPosition, trackLength }: { myPosition: number, trackLength: number }) {
  // Pre-allocate vectors and a smoothed progress value to avoid jumpy motion
  const targetVec = useRef(new THREE.Vector3());
  const lookAtVec = useRef(new THREE.Vector3());
  const smoothedProgress = useRef(0);
  
  // Camera follows player with damping to smooth discrete position updates
  useFrame((state, delta) => {
    const aspect = state.size.width / Math.max(1, state.size.height);
    // In portrait / narrow viewports the horizontal FOV shrinks, which can clip track edges.
    // Compensate by slightly increasing vertical FOV and backing the camera up.
    const portraitFactor = Math.max(0, 1 - aspect); // ~0 on landscape, higher on portrait
    const targetFov = THREE.MathUtils.clamp(60 + portraitFactor * 30, 60, 85);

    const cam = state.camera as THREE.PerspectiveCamera;
    if ("fov" in cam) {
      cam.fov = THREE.MathUtils.damp(cam.fov, targetFov, 6, delta);
      cam.updateProjectionMatrix();
    }

    // Smooth the reported player progress before using it for camera targets
    smoothedProgress.current = THREE.MathUtils.damp(
      smoothedProgress.current,
      Math.min(myPosition, trackLength),
      4,
      delta
    );
    
    // Offset relative to smoothed player position
    const backOffset = 10 + portraitFactor * 10; // back up a bit more on narrow screens
    const targetZ = -smoothedProgress.current * UNIT_SCALE + backOffset; // farther back for stability
    const targetY = 6 + portraitFactor * 3; // slightly higher on narrow screens
    const targetX = 0; // centered
    
    // Look slightly ahead of player
    const lookAhead = 12 + portraitFactor * 6;
    const lookAtZ = -smoothedProgress.current * UNIT_SCALE - lookAhead;
    
    // Use pre-allocated Vector3 instead of creating new one each frame
    targetVec.current.set(targetX, targetY, targetZ);
    lookAtVec.current.set(0, 1, lookAtZ);
    
    // Damped movement per axis to avoid forward jumping when positions update in steps
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, targetVec.current.x, 4, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, targetVec.current.y, 4, delta);
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, targetVec.current.z, 4, delta);
    
    state.camera.up.set(0, 1, 0);
    state.camera.lookAt(lookAtVec.current);
  });

  return null;
}

// Visibility culling distance for trees (in world units, which is position * UNIT_SCALE)
const TREE_VISIBILITY_DISTANCE = 100 * UNIT_SCALE;

export function EnvironmentScenery({ length, myPosition }: { length: number; myPosition: number }) {
  // Simple low-poly trees or rocks along the side
  const lengthUnits = length * UNIT_SCALE;
  const myPositionUnits = myPosition * UNIT_SCALE;
  
  const allTrees = useMemo(() => {
    const items: Array<{ x: number; z: number; scale: number }> = [];
    // Use a seeded random or deterministic calculation to avoid hydration mismatch
    // Simple pseudo-random function based on index
    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // Increased spacing from 15 to 30 for better performance
    for (let z = 0; z < lengthUnits; z += 30) {
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

  // Filter trees based on visibility distance
  const visibleTrees = useMemo(() => {
    const playerZ = -myPositionUnits;
    return allTrees.filter(tree => {
      const distance = Math.abs(tree.z - playerZ);
      return distance < TREE_VISIBILITY_DISTANCE;
    });
  }, [allTrees, myPositionUnits]);

  return (
    <group>
      {visibleTrees.map((tree, i) => (
        <group key={`tree-${tree.z}-${tree.x}`} position={[tree.x, 0, tree.z]} scale={[tree.scale, tree.scale, tree.scale]}>
          {/* Trunk - removed castShadow for performance */}
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.5, 0.8, 2, 6]} />
            <meshStandardMaterial color="#5d4037" />
          </mesh>
          {/* Leaves - removed castShadow for performance */}
          <mesh position={[0, 3, 0]}>
            <coneGeometry args={[2, 4, 8]} />
            <meshStandardMaterial color="#15803d" />
          </mesh>
          <mesh position={[0, 4.5, 0]}>
            <coneGeometry args={[1.5, 3, 8]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
        </group>
      ))}
      
      {/* Floor Plane (Grass) - removed receiveShadow for performance */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -lengthUnits/2]}>
        <planeGeometry args={[200, lengthUnits + 100]} />
        <meshStandardMaterial color="#064e3b" />
      </mesh>
    </group>
  );
}
