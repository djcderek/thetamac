"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Sparkles, Environment } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";

const VEHICLE_REAR_OFFSETS: Record<string, number> = {
  car_truck: 1.55,
  car_sport: 1.15,
  car_jeep: 0.95,
  default: 1.05,
};
const BOOST_TRAIL_OFFSET = 0.9;
const FLAT_TRAIL_OFFSET = 1.6;

interface ItemPreview3DProps {
  type: "skin" | "trail" | "vehicle" | "wheel" | "base";
  assetId?: string; 
}

function CarModel({ 
  color = "#3b82f6", 
  skin, 
  trail,
  wheel,
  vehicleType = "car_standard"
}: { 
  color?: string; 
  skin?: string; 
  trail?: string;
  wheel?: string;
  vehicleType?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const fireTrailRef = useRef<THREE.Group>(null);
  const fireOuterMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const fireInnerMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Slow rotation for showcase
      groupRef.current.rotation.y += 0.01;
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
  });

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
  else if (skin === 'skin_hot_pink_decal') {
      displayColor = '#ff2db2';
      metalness = 0.7;
      roughness = 0.18;
      emissive = new THREE.Color('#ff2db2');
      // subtle glow, keep it classy
      // emissiveIntensity is controlled by material settings; use a small base via emissive
  }
  else if (skin === 'skin_rainbow') {
      // Color set in useFrame
      metalness = 0.6;
      roughness = 0.2;
  }

  const vehicleRear = VEHICLE_REAR_OFFSETS[vehicleType] ?? VEHICLE_REAR_OFFSETS.default;
  const boostAttachZ = vehicleRear + BOOST_TRAIL_OFFSET;
  const flatTrailZ = vehicleRear + FLAT_TRAIL_OFFSET;

  // Vehicle Geometry Selection
  const renderVehicleBody = () => {
    if (vehicleType === 'car_truck') {
        return (
            <>
                {/* Truck Cab */}
                <mesh castShadow receiveShadow position={[0, 0.6, -0.4]}>
                    <boxGeometry args={[1.3, 0.8, 1.2]} />
                    <meshStandardMaterial ref={materialRef} color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
                </mesh>
                {/* Truck Bed */}
                <mesh castShadow receiveShadow position={[0, 0.4, 0.8]}>
                    <boxGeometry args={[1.3, 0.5, 1.4]} />
                    <meshStandardMaterial color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
                </mesh>
                {/* Windows */}
                <mesh position={[0, 0.75, -0.38]}>
                    <boxGeometry args={[1.32, 0.3, 1.0]} />
                    <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
                </mesh>
                {/* Front Windshield */}
                <mesh position={[0, 0.75, -1.01]}>
                    <boxGeometry args={[1.1, 0.3, 0.05]} />
                    <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
                </mesh>
                {/* Headlights (Round) */}
                <mesh position={[-0.45, 0.4, -1.01]} rotation={[Math.PI/2, 0, 0]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.05, 16]} />
                    <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
                </mesh>
                <mesh position={[0.45, 0.4, -1.01]} rotation={[Math.PI/2, 0, 0]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.05, 16]} />
                    <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
                </mesh>
                {/* Grill */}
                <mesh position={[0, 0.25, -1.01]}>
                    <boxGeometry args={[0.5, 0.2, 0.05]} />
                    <meshStandardMaterial color="#222" roughness={0.8} />
                </mesh>
                {/* Tail lights */}
                <mesh position={[-0.5, 0.4, 1.51]}>
                    <boxGeometry args={[0.2, 0.3, 0.05]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                </mesh>
                <mesh position={[0.5, 0.4, 1.51]}>
                    <boxGeometry args={[0.2, 0.3, 0.05]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                </mesh>
            </>
        );
    } else if (vehicleType === 'car_jeep') {
        return (
            <>
                {/* Jeep Body */}
                <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
                    <boxGeometry args={[1.1, 0.6, 1.8]} />
                    <meshStandardMaterial ref={materialRef} color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
                </mesh>
                {/* Roll Cage - Taller */}
                <mesh position={[0, 1.2, -0.2]}>
                    <boxGeometry args={[1.0, 0.05, 1.0]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
                {/* Supports - Taller */}
                <mesh position={[-0.5, 0.85, -0.7]} rotation={[0,0,0]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#111" /></mesh>
                <mesh position={[0.5, 0.85, -0.7]} rotation={[0,0,0]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#111" /></mesh>
                <mesh position={[-0.5, 0.85, 0.3]} rotation={[0,0,0]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#111" /></mesh>
                <mesh position={[0.5, 0.85, 0.3]} rotation={[0,0,0]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#111" /></mesh>
                {/* Headlights (Round) */}
                <mesh position={[-0.35, 0.55, -0.91]} rotation={[Math.PI/2, 0, 0]}>
                    <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
                    <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
                </mesh>
                <mesh position={[0.35, 0.55, -0.91]} rotation={[Math.PI/2, 0, 0]}>
                    <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
                    <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
                </mesh>
                {/* Grill */}
                <mesh position={[0, 0.55, -0.91]}>
                    <boxGeometry args={[0.4, 0.2, 0.05]} />
                    <meshStandardMaterial color="#222" roughness={0.8} />
                </mesh>
                {/* Tail lights */}
                <mesh position={[-0.4, 0.5, 0.91]}>
                    <boxGeometry args={[0.15, 0.25, 0.05]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                </mesh>
                <mesh position={[0.4, 0.5, 0.91]}>
                    <boxGeometry args={[0.15, 0.25, 0.05]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                </mesh>
            </>
        );
    } else if (vehicleType === 'car_sport') {
        return (
            <>
                {/* Sleek Body */}
                <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
                    <boxGeometry args={[1.3, 0.4, 2.2]} />
                    <meshStandardMaterial ref={materialRef} color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
                </mesh>
                {/* Cabin (low profile) */}
                <mesh castShadow position={[0, 0.6, -0.2]}>
                    <boxGeometry args={[0.9, 0.3, 1]} />
                    <meshStandardMaterial color="#111" roughness={0.2} />
                </mesh>
                {/* Spoiler */}
                <mesh position={[0, 0.6, 0.9]}>
                    <boxGeometry args={[1.4, 0.05, 0.3]} />
                    <meshStandardMaterial color={displayColor} />
                </mesh>
                {/* Headlights - Standard Sport */}
                <mesh position={[-0.45, 0.4, -1.11]}>
                    <boxGeometry args={[0.35, 0.1, 0.05]} />
                    <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
                </mesh>
                <mesh position={[0.45, 0.4, -1.11]}>
                    <boxGeometry args={[0.35, 0.1, 0.05]} />
                    <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
                </mesh>
                {/* Low Grill */}
                <mesh position={[0, 0.2, -1.11]}>
                    <boxGeometry args={[0.6, 0.1, 0.05]} />
                    <meshStandardMaterial color="#111" roughness={0.5} />
                </mesh>
                {/* Tail light strip */}
                <mesh position={[0, 0.4, 1.11]}>
                    <boxGeometry args={[1.1, 0.05, 0.05]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                </mesh>
            </>
        );
    }
    
    // Default Car
    return (
        <>
            <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
                <boxGeometry args={[1.2, 0.5, 2]} />
                <meshStandardMaterial ref={materialRef} color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
            </mesh>
            <mesh castShadow position={[0, 0.8, -0.2]}>
                <boxGeometry args={[0.8, 0.4, 1]} />
                <meshStandardMaterial color="#111" roughness={0.2} />
            </mesh>
            {/* Headlights */}
            <mesh position={[-0.4, 0.5, -1.01]}>
                <boxGeometry args={[0.2, 0.1, 0.05]} />
                <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
            </mesh>
            <mesh position={[0.4, 0.5, -1.01]}>
                <boxGeometry args={[0.2, 0.1, 0.05]} />
                <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
            </mesh>
            {/* Grill */}
            <mesh position={[0, 0.3, -1.01]}>
                <boxGeometry args={[0.5, 0.15, 0.05]} />
                <meshStandardMaterial color="#222" roughness={0.8} />
            </mesh>
            {/* Tail lights */}
             <mesh position={[-0.4, 0.55, 1.01]}>
                <boxGeometry args={[0.25, 0.1, 0.05]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
            </mesh>
            <mesh position={[0.4, 0.55, 1.01]}>
                <boxGeometry args={[0.25, 0.1, 0.05]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
            </mesh>
        </>
    );
  };

  // Wheel positions
  const wheelPositions: [number, number, number][] = [
      [-0.6, 0.2, -0.6], [0.6, 0.2, -0.6], // Front
      [-0.6, 0.2, 0.6], [0.6, 0.2, 0.6]   // Rear
  ];

  return (
    <group ref={groupRef}>
      {renderVehicleBody()}

      {/* Wheels */}
      {wheelPositions.map((pos, i) => {
          const isRear = i > 1;
          // Adjust size for offroad
          const scale = wheel === 'wheel_offroad' ? 1.2 : 1;
          
          return (
            <group key={i} position={pos} scale={scale}>
                {/* Wheel Geometry based on type */}
                {wheel === 'wheel_spinner' ? (
                    <group rotation={[0, 0, Math.PI / 2]}>
                         {/* Tire */}
                        <mesh>
                            <cylinderGeometry args={[0.3, 0.3, 0.3, 16]} />
                            <meshStandardMaterial color="#111" />
                        </mesh>
                        {/* Chrome Rim */}
                        <mesh position={[0, 0.16, 0]}>
                             <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
                             <meshStandardMaterial color="#e2e8f0" metalness={1} roughness={0.1} />
                        </mesh>
                         {/* Spinner Element - simplified */}
                         <mesh position={[0, 0.17, 0]} rotation={[0, Math.PI/4, 0]}>
                             <boxGeometry args={[0.3, 0.05, 0.02]} />
                             <meshStandardMaterial color="#e2e8f0" metalness={1} roughness={0.1} />
                        </mesh>
                    </group>
                ) : wheel === 'wheel_offroad' ? (
                    <group rotation={[0, 0, Math.PI / 2]}>
                        {/* Big Tire */}
                        <mesh>
                            <cylinderGeometry args={[0.35, 0.35, 0.4, 8]} />
                            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
                        </mesh>
                        {/* Rim */}
                        <mesh position={[0, 0.21, 0]}>
                             <cylinderGeometry args={[0.15, 0.15, 0.02, 6]} />
                             <meshStandardMaterial color="#555" metalness={0.5} />
                        </mesh>
                    </group>
                ) : wheel === 'wheel_future' ? (
                     <group rotation={[0, 0, Math.PI / 2]}>
                        {/* Tire */}
                        <mesh>
                            <cylinderGeometry args={[0.3, 0.3, 0.3, 24]} />
                            <meshStandardMaterial color="#000" />
                        </mesh>
                        {/* Neon Rim */}
                        <mesh position={[0, 0.16, 0]}>
                             <torusGeometry args={[0.2, 0.02, 8, 24]} />
                             <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2} />
                        </mesh>
                        <mesh position={[0, 0.16, 0]}>
                             <circleGeometry args={[0.1]} />
                             <meshStandardMaterial color="#000" />
                        </mesh>
                    </group>
                ) : (
                    // Standard / Default
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.3, 0.3, 0.3, 16]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                )}
            </group>
          );
      })}
      
      {/* Skin Specific Effects */}
      {skin === 'skin_galactic' && (
        <Sparkles count={20} scale={2.5} size={4} speed={0.4} opacity={1} color="#ffffff" />
      )}

      {/* Effects */}
      {trail === 'trail_fire' && (
        <group ref={fireTrailRef} position={[0, 0.2, boostAttachZ]}>
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

      {trail === 'trail_neon' && (
        <group position={[0, 0.1, flatTrailZ]}>
           <mesh rotation={[Math.PI / 2, 0, 0]}>
             <planeGeometry args={[1, 3]} />
             <meshBasicMaterial color="#06b6d4" transparent opacity={0.4} side={THREE.DoubleSide} />
           </mesh>
        </group>
      )}

      {/* New Boosts */}
      {trail === 'trail_pixel' && (
        <group position={[0, 0.2, boostAttachZ]}>
           {/* Pixel chunks */}
           {[0, 0.4, 0.8, 1.2].map((z, i) => {
              // Use deterministic values based on index instead of random
              const offset = (i % 2 === 0 ? 1 : -1) * 0.1;
              return (
                <mesh key={i} position={[offset, -offset, z]}>
                   <boxGeometry args={[0.2, 0.2, 0.2]} />
                   <meshBasicMaterial color="#22c55e" transparent opacity={0.8 - (z/2)} />
                </mesh>
              );
           })}
        </group>
      )}
      
      {trail === 'trail_lightning' && (
        <group position={[0, 0.2, boostAttachZ]}>
           <Sparkles count={30} scale={[0.5, 0.5, 2]} size={6} speed={2} color="#eab308" />
        </group>
      )}
      
      {trail === 'trail_rainbow' && (
        <group position={[0, 0.1, flatTrailZ]}>
            {/* Multi-colored trail strips */}
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
    </group>
  );
}

export default function ItemPreview3D({ type, assetId }: ItemPreview3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  const isSkin = type === 'skin';
  const isTrail = type === 'trail';
  const isVehicle = type === 'vehicle';
  const isWheel = type === 'wheel';
  const isBase = type === 'base';
  
  const skinId = (isSkin || isBase) ? assetId : undefined;
  const trailId = isTrail ? assetId : undefined;
  const wheelId = isWheel ? assetId : undefined;
  const vehicleType = isVehicle ? assetId : "car_standard"; 

  // Use Intersection Observer to only render Canvas when visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Start loading slightly before entering viewport
      }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Get color for the 2D placeholder based on type
  const getPlaceholderColor = () => {
    if (isSkin) {
      if (assetId === 'car_red') return 'bg-red-500';
      if (assetId === 'car_blue') return 'bg-blue-500';
      if (assetId === 'car_gold') return 'bg-amber-400';
      if (assetId === 'skin_galactic') return 'bg-indigo-950';
      if (assetId === 'skin_glitch') return 'bg-green-500';
      if (assetId === 'skin_lava') return 'bg-red-800';
      if (assetId === 'skin_ice') return 'bg-sky-200';
      if (assetId === 'skin_hot_pink_decal') return 'bg-pink-500';
      if (assetId === 'skin_rainbow') return 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500';
      return 'bg-blue-500';
    }
    if (isTrail) return 'bg-orange-500';
    if (isVehicle) return 'bg-emerald-500';
    if (isWheel) return 'bg-slate-500';
    return 'bg-slate-400';
  };

  return (
    <div ref={containerRef} className="w-full h-full">
      {isVisible ? (
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[3, 3, 3]} fov={50} />
          <ambientLight intensity={0.7} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} castShadow intensity={1.5} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          
          <group position={[0, -0.5, 0]}>
              <CarModel 
                  skin={skinId} 
                  trail={trailId}
                  wheel={wheelId}
                  vehicleType={vehicleType} 
                  color={isBase ? "#94a3b8" : undefined} // Default gray for base
              />
          </group>

          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={4} />
          <Environment files="/hdri/city.hdr" />
        </Canvas>
      ) : (
        // Placeholder when not visible - lightweight 2D fallback
        <div className={`w-full h-full flex items-center justify-center ${getPlaceholderColor()} opacity-30 animate-pulse`}>
          <div className="w-8 h-8 border-2 border-white/50 rounded" />
        </div>
      )}
    </div>
  );
}
