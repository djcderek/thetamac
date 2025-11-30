"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, Stars, Sparkles } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

interface ItemPreview3DProps {
  type: "skin" | "trail" | "vehicle" | "base";
  assetId?: string; 
}

function CarModel({ 
  color = "#3b82f6", 
  skin, 
  trail,
  vehicleType = "car_standard"
}: { 
  color?: string; 
  skin?: string; 
  trail?: string;
  vehicleType?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

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
  else if (skin === 'skin_rainbow') {
      // Color set in useFrame
      metalness = 0.6;
      roughness = 0.2;
  }

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
        </>
    );
  };

  return (
    <group ref={groupRef}>
      {renderVehicleBody()}

      {/* Wheels */}
      {/* Adjust wheel positions based on vehicle type if needed, keeping standard for now */}
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
      {skin === 'skin_galactic' && (
        <Sparkles count={20} scale={2.5} size={4} speed={0.4} opacity={1} color="#ffffff" />
      )}

      {/* Effects */}
      {trail === 'trail_fire' && (
        <group position={[0, 0.2, 1.5]}>
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

      {trail === 'trail_neon' && (
        <group position={[0, 0.1, 1.2]}>
           <mesh rotation={[Math.PI / 2, 0, 0]}>
             <planeGeometry args={[1, 3]} />
             <meshBasicMaterial color="#06b6d4" transparent opacity={0.4} side={THREE.DoubleSide} />
           </mesh>
        </group>
      )}
    </group>
  );
}

export default function ItemPreview3D({ type, assetId }: ItemPreview3DProps) {
  const isSkin = type === 'skin';
  const isTrail = type === 'trail';
  const isVehicle = type === 'vehicle';
  const isBase = type === 'base';
  
  const skinId = (isSkin || isBase) ? assetId : undefined;
  const trailId = isTrail ? assetId : undefined;
  // If previewing a vehicle, use that ID. If previewing a skin/trail, use standard car or maybe eventually currently equipped
  const vehicleType = isVehicle ? assetId : "car_standard"; 

  return (
    <div className="w-full h-full">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[3, 3, 3]} fov={50} />
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} castShadow intensity={1.5} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <group position={[0, -0.5, 0]}>
            <CarModel 
                skin={skinId} 
                trail={trailId}
                vehicleType={vehicleType} 
                color={isBase ? "#94a3b8" : undefined} // Default gray for base
            />
        </group>

        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={4} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
