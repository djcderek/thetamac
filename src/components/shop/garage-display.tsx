"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, MeshReflectorMaterial, Sparkles, Environment } from "@react-three/drei";
import { useRef, Suspense, useMemo } from "react";
import * as THREE from "three";
import { useHydrated } from "@/hooks/use-hydrated";

const VEHICLE_REAR_OFFSETS: Record<string, number> = {
  car_truck: 1.55,
  car_sport: 1.15,
  car_jeep: 0.95,
  default: 1.05,
};
const BOOST_TRAIL_OFFSET = 0.9;
const FLAT_TRAIL_OFFSET = 1.6;

interface GarageDisplayProps {
  equippedSkin?: string | null;
  equippedTrail?: string | null;
  equippedVehicle?: string | null;
  equippedWheel?: string | null;
}

function GarageProps() {
    return (
        <group>
            {/* Workbench Area - Moved to Left Wall */}
            <group position={[-7, -0.5, -2]} rotation={[0, Math.PI/2, 0]}>
                {/* Table Top with improved material */}
                <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
                    <boxGeometry args={[3, 0.1, 1]} />
                    <meshStandardMaterial color="#5c4033" roughness={0.7} />
                </mesh>
                {/* Legs */}
                <mesh position={[-1.4, 0.45, 0.4]} castShadow>
                    <boxGeometry args={[0.1, 0.9, 0.1]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
                <mesh position={[1.4, 0.45, 0.4]} castShadow>
                    <boxGeometry args={[0.1, 0.9, 0.1]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
                <mesh position={[-1.4, 0.45, -0.4]} castShadow>
                    <boxGeometry args={[0.1, 0.9, 0.1]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
                <mesh position={[1.4, 0.45, -0.4]} castShadow>
                    <boxGeometry args={[0.1, 0.9, 0.1]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
                
                {/* Tool Chest on Workbench */}
                <group position={[0.8, 1.25, 0]}>
                    <mesh castShadow>
                        <boxGeometry args={[0.8, 0.6, 0.5]} />
                        <meshStandardMaterial color="#b91c1c" roughness={0.2} metalness={0.6} />
                    </mesh>
                    {/* Drawers with Handles */}
                    {[0.1, 0.0, -0.1, -0.2].map((y, i) => (
                        <group key={i} position={[0, y, 0.26]}>
                             <mesh>
                                <planeGeometry args={[0.7, 0.08]} />
                                <meshStandardMaterial color="#111" />
                             </mesh>
                             <mesh position={[0, 0, 0.01]}>
                                 <planeGeometry args={[0.3, 0.02]} />
                                 <meshStandardMaterial color="#ccc" metalness={0.8} />
                             </mesh>
                        </group>
                    ))}
                </group>

                {/* Simple Vice */}
                <group position={[-1.2, 1, 0.3]}>
                    <mesh castShadow>
                        <boxGeometry args={[0.3, 0.2, 0.3]} />
                        <meshStandardMaterial color="#333" metalness={0.7} />
                    </mesh>
                    <mesh position={[0, 0.15, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
                        <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
                        <meshStandardMaterial color="#555" />
                    </mesh>
                </group>
            </group>

            {/* Large Tool Cabinet - Moved to Right Wall */}
            <group position={[7, -0.5, -4]} rotation={[0, -Math.PI/2, 0]}>
                 <mesh position={[0, 1.2, 0]} castShadow>
                    <boxGeometry args={[1.5, 2.4, 1]} />
                    <meshStandardMaterial color="#b91c1c" roughness={0.2} metalness={0.6} />
                 </mesh>
                 {/* Drawers */}
                 {Array.from({ length: 8 }).map((_, i) => (
                     <mesh key={i} position={[0, 0.4 + (i * 0.25) - 1.2, 0.51]}>
                         <planeGeometry args={[1.3, 0.2]} />
                         <meshStandardMaterial color="#991b1b" />
                         {/* Handle */}
                         <mesh position={[0, 0, 0.01]}>
                            <planeGeometry args={[0.8, 0.05]} />
                            <meshStandardMaterial color="#ccc" metalness={0.8} />
                         </mesh>
                     </mesh>
                 ))}
                 {/* Casters/Wheels */}
                 {[-0.6, 0.6].map(x => [-0.4, 0.4].map(z => (
                     <mesh key={`${x}-${z}`} position={[x, -1.3, z]} rotation={[0, 0, Math.PI/2]}>
                         <cylinderGeometry args={[0.1, 0.1, 0.1]} />
                         <meshStandardMaterial color="#111" />
                     </mesh>
                 )))}
            </group>

            {/* Tire Stack - Moved closer to corner */}
            <group position={[7, -0.5, 0]}>
                 {[0, 1, 2].map((i) => (
                    <group key={i} position={[0, 0.2 + (i * 0.35), 0]} rotation={[Math.PI/2, 0, 0]}>
                        {/* Tire Rubber with tread texture hints */}
                        <mesh castShadow receiveShadow>
                            <torusGeometry args={[0.35, 0.15, 16, 32]} />
                            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
                        </mesh>
                        {/* Rim Detail */}
                        <mesh rotation={[0, 0, 0]}>
                             <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
                             <meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} />
                        </mesh>
                        <mesh position={[0, 0.06, 0]}>
                             <cylinderGeometry args={[0.05, 0.05, 0.02]} />
                             <meshStandardMaterial color="#111" />
                        </mesh>
                    </group>
                 ))}
            </group>

            {/* Oil Drums - Added Spigot */}
            <group position={[6, -0.5, 3]}>
                <group>
                    <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
                        <cylinderGeometry args={[0.4, 0.4, 1.2, 32]} />
                        <meshStandardMaterial color="#2563eb" metalness={0.3} roughness={0.4} />
                    </mesh>
                    {/* Ribs */}
                    {[-0.3, 0, 0.3].map((y, i) => (
                        <mesh key={i} position={[0, 0.6 + y, 0]} rotation={[Math.PI/2, 0, 0]}>
                            <torusGeometry args={[0.41, 0.02, 8, 32]} />
                            <meshStandardMaterial color="#1d4ed8" />
                        </mesh>
                    ))}
                    {/* Spigot */}
                    <mesh position={[0.35, 0.2, 0]} rotation={[0, 0, -Math.PI/4]}>
                         <cylinderGeometry args={[0.03, 0.03, 0.2]} />
                         <meshStandardMaterial color="#999" metalness={0.8} />
                    </mesh>
                </group>
                <group position={[0.9, 0, 0.2]} rotation={[0, 1, 0]}>
                     <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
                        <cylinderGeometry args={[0.4, 0.4, 1.2, 32]} />
                        <meshStandardMaterial color="#dc2626" metalness={0.3} roughness={0.4} />
                    </mesh>
                </group>
            </group>

            {/* Ventilation Duct System */}
            <group position={[0, 4.2, -6]}>
                {/* Main Duct */}
                <mesh castShadow rotation={[0, 0, Math.PI/2]}>
                    <cylinderGeometry args={[0.4, 0.4, 16, 16]} />
                    <meshStandardMaterial color="#aaa" metalness={0.6} roughness={0.3} />
                </mesh>
                {/* Vertical Vents */}
                {[-4, 0, 4].map((x, i) => (
                     <mesh key={i} position={[x, -0.5, 0]}>
                        <cylinderGeometry args={[0.25, 0.15, 1, 16]} />
                        <meshStandardMaterial color="#aaa" metalness={0.6} roughness={0.3} />
                     </mesh>
                ))}
            </group>

            {/* Wall Shelves - Lowered for realism */}
            <group position={[-7.8, 1.5, 0]}>
                <mesh receiveShadow castShadow>
                    <boxGeometry args={[0.4, 0.1, 6]} />
                    <meshStandardMaterial color="#444" />
                </mesh>
                {/* Random boxes on shelf */}
                <mesh position={[0, 0.3, -1]} castShadow>
                    <boxGeometry args={[0.3, 0.5, 0.8]} />
                    <meshStandardMaterial color="#8B4513" />
                </mesh>
                <mesh position={[0, 0.2, 1.5]} castShadow>
                    <boxGeometry args={[0.3, 0.3, 0.3]} />
                    <meshStandardMaterial color="#1e3a8a" />
                </mesh>
            </group>
        </group>
    );
}

function GarageStructure() {
    // Columns positions
    const columns = [
        [-7.8, -7.8], [7.8, -7.8], // Back corners
        [-7.8, 7.8], [7.8, 7.8],   // Front corners
        [-7.8, 0], [7.8, 0]        // Side mid-points
    ];

    return (
    <group>
      {/* Floor with reflections */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <MeshReflectorMaterial
            blur={[400, 100]}
            resolution={1024}
            mixBlur={1}
            mixStrength={1.5}
            roughness={1}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#1a1a1a" // Slightly darker concrete
            metalness={0.5}
            mirror={0.5}
        />
      </mesh>
      
      {/* Walls */}
      <group position={[0, 2.5, 0]}>
          {/* Back Wall - Solid again */}
          <mesh position={[0, 0, -8]} receiveShadow>
            <planeGeometry args={[16, 6]} />
            <meshStandardMaterial color="#e5e5e5" roughness={0.8} />
          </mesh>
          {/* Wall Trim/Baseboard */}
          <mesh position={[0, -2.9, -7.9]} receiveShadow>
            <boxGeometry args={[16, 0.2, 0.2]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          
          {/* Side Walls */}
          <mesh position={[-8, 0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[16, 6]} />
            <meshStandardMaterial color="#e5e5e5" roughness={0.8} />
          </mesh>
           <mesh position={[-7.9, -2.9, 0]} receiveShadow>
            <boxGeometry args={[0.2, 0.2, 16]} />
            <meshStandardMaterial color="#333" />
          </mesh>

          <mesh position={[8, 0, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[16, 6]} />
            <meshStandardMaterial color="#e5e5e5" roughness={0.8} />
          </mesh>
          <mesh position={[7.9, -2.9, 0]} receiveShadow>
            <boxGeometry args={[0.2, 0.2, 16]} />
            <meshStandardMaterial color="#333" />
          </mesh>

          {/* Front Wall - Garage Door (Opposite side) */}
          <group position={[0, 0, 8]} rotation={[0, Math.PI, 0]}>
             {/* Door Frame */}
             <mesh position={[0, 0, 0]}>
                <planeGeometry args={[16, 6]} />
                <meshStandardMaterial color="#333" roughness={0.8} />
             </mesh>
             
             {/* The Door Panels */}
             <group position={[0, -0.5, 0.1]}>
                 {Array.from({ length: 12 }).map((_, i) => (
                     <mesh key={i} position={[0, (i * 0.4) - 2, 0]} receiveShadow castShadow>
                         <boxGeometry args={[10, 0.35, 0.05]} />
                         <meshStandardMaterial color="#9ca3af" metalness={0.4} roughness={0.3} />
                         {/* Panel Grooves */}
                         <mesh position={[0, 0, 0.02]}>
                            <boxGeometry args={[9.8, 0.02, 0.02]} />
                            <meshStandardMaterial color="#4b5563" />
                         </mesh>
                     </mesh>
                 ))}
             </group>

             {/* Door Tracks */}
             <mesh position={[-5.2, 0, 0.2]}>
                 <boxGeometry args={[0.2, 5, 0.2]} />
                 <meshStandardMaterial color="#1f2937" metalness={0.8} />
             </mesh>
             <mesh position={[5.2, 0, 0.2]}>
                 <boxGeometry args={[0.2, 5, 0.2]} />
                 <meshStandardMaterial color="#1f2937" metalness={0.8} />
             </mesh>

             {/* Exit Sign */}
             <group position={[0, 2.2, 0.2]}>
                <mesh>
                    <boxGeometry args={[1, 0.4, 0.1]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
                <mesh position={[0, 0, 0.06]}>
                     <planeGeometry args={[0.8, 0.25]} />
                     <meshBasicMaterial color="#22c55e" toneMapped={false} />
                </mesh>
             </group>
          </group>
      </group>


      {/* Structural Columns */}
      {columns.map(([x, z], i) => (
          <mesh key={i} position={[x, 2.5, z]} castShadow receiveShadow>
              <boxGeometry args={[0.8, 6, 0.8]} />
              <meshStandardMaterial color="#d4d4d4" roughness={0.5} />
          </mesh>
      ))}
      
      {/* Ceiling Beams */}
      {[ -4, 0, 4 ].map((z, i) => (
          <mesh key={`beam-${i}`} position={[0, 5, z]} receiveShadow castShadow>
              <boxGeometry args={[16, 0.4, 0.6]} />
              <meshStandardMaterial color="#333" roughness={0.9} />
          </mesh>
      ))}

      {/* Ceiling Lights (Visual only, real lights are separate) */}
      <group position={[0, 5.2, 0]}>
          {/* Light Strips hanging from beams */}
          {[ -4, 0, 4 ].map((z, i) => (
               <group key={`light-${i}`} position={[0, -0.3, z]}>
                   <mesh rotation={[0, 0, 0]}>
                        <boxGeometry args={[4, 0.1, 0.4]} />
                        <meshStandardMaterial color="#111" emissive="#111" />
                   </mesh>
                   <mesh position={[0, -0.06, 0]} rotation={[Math.PI/2, 0, 0]}>
                        <planeGeometry args={[3.8, 0.3]} />
                        <meshBasicMaterial color="#ffffff" toneMapped={false} />
                   </mesh>
               </group>
          ))}
      </group>
      
      {/* Safety Floor Markings */}
      <group position={[0, -0.49, 0]} rotation={[-Math.PI/2, 0, 0]}>
           {/* Left Line */}
           <mesh position={[-1.5, 0, 0]}>
               <planeGeometry args={[0.1, 4]} />
               <meshBasicMaterial color="#fbbf24" />
           </mesh>
           {/* Right Line */}
           <mesh position={[1.5, 0, 0]}>
               <planeGeometry args={[0.1, 4]} />
               <meshBasicMaterial color="#fbbf24" />
           </mesh>
           {/* Back Line */}
           <mesh position={[0, -2, 0]} rotation={[0, 0, Math.PI/2]}>
               <planeGeometry args={[0.1, 3.1]} />
               <meshBasicMaterial color="#fbbf24" />
           </mesh>
           {/* Front Line */}
           <mesh position={[0, 2, 0]} rotation={[0, 0, Math.PI/2]}>
               <planeGeometry args={[0.1, 3.1]} />
               <meshBasicMaterial color="#fbbf24" />
           </mesh>
      </group>
    </group>
  );
}

function CarModel({ 
  skin, 
  trail,
  vehicleType = "car_standard",
  wheel
}: { 
  skin?: string | null; 
  trail?: string | null;
  vehicleType?: string | null;
  wheel?: string | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const fireTrailRef = useRef<THREE.Group>(null);
  const fireOuterMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const fireInnerMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Generate positions for pixel trail using deterministic randomness
  const pixelChunks = useMemo(() => {
    return [0, 0.4, 0.8, 1.2].map((z, i) => {
      // Simple deterministic pseudo-random based on index to avoid impure render
      const r1 = Math.abs(Math.sin(i + 1) * 10000) % 1;
      const r2 = Math.abs(Math.cos(i + 1) * 10000) % 1;
      
      return {
        z,
        position: [(r1 - 0.5) * 0.3, (r2 - 0.5) * 0.3, z] as [number, number, number]
      };
    });
  }, []);

  useFrame((state) => {
    // Very subtle idle movement, grounded feel
    if (groupRef.current) {
      // Removed the bobbing for a more grounded "parked" feel, or keep it very minimal
      // groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02; 
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
  let displayColor = "#94a3b8"; // Default Gray (slate-400)
  let metalness = 0.6;
  let roughness = 0.2; // Shinier for showroom
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
      // Keep it subtle; show-room lighting already pops
  }
  else if (skin === 'skin_rainbow') {
      // Color set in useFrame
      metalness = 0.6;
      roughness = 0.2;
  }

  const vehicleRear = VEHICLE_REAR_OFFSETS[vehicleType || ""] ?? VEHICLE_REAR_OFFSETS.default;
  const boostAttachZ = vehicleRear + BOOST_TRAIL_OFFSET;
  const flatTrailZ = vehicleRear + FLAT_TRAIL_OFFSET;

  // Vehicle Geometry Selection
  const renderVehicleBody = () => {
    const type = vehicleType || "car_standard";

    if (type === 'car_truck') {
        return (
            <>
                {/* Truck Cab */}
                <mesh castShadow receiveShadow position={[0, 0.2, -0.4]}>
                    <boxGeometry args={[1.3, 0.8, 1.2]} />
                    <meshStandardMaterial ref={materialRef} color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
                </mesh>
                {/* Truck Bed */}
                <mesh castShadow receiveShadow position={[0, 0.0, 0.8]}>
                    <boxGeometry args={[1.3, 0.5, 1.4]} />
                    <meshStandardMaterial color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
                </mesh>
                {/* Side Windows */}
                <mesh position={[0, 0.35, -0.38]}>
                    <boxGeometry args={[1.32, 0.3, 1.0]} />
                    <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
                </mesh>
                {/* Front Windshield */}
                <mesh position={[0, 0.35, -1.01]}>
                    <boxGeometry args={[1.1, 0.3, 0.05]} />
                    <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
                </mesh>
                {/* Headlights (Round) */}
                <mesh position={[-0.45, 0.0, -1.01]} rotation={[Math.PI/2, 0, 0]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.05, 16]} />
                    <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
                </mesh>
                <mesh position={[0.45, 0.0, -1.01]} rotation={[Math.PI/2, 0, 0]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.05, 16]} />
                    <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
                </mesh>
                {/* Grill */}
                <mesh position={[0, -0.15, -1.01]}>
                    <boxGeometry args={[0.5, 0.2, 0.05]} />
                    <meshStandardMaterial color="#222" roughness={0.8} />
                </mesh>
                {/* Tail lights */}
                <mesh position={[-0.5, 0.0, 1.51]}>
                    <boxGeometry args={[0.2, 0.3, 0.05]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                </mesh>
                <mesh position={[0.5, 0.0, 1.51]}>
                    <boxGeometry args={[0.2, 0.3, 0.05]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                </mesh>
            </>
        );
    } else if (type === 'car_jeep') {
        return (
            <>
                {/* Jeep Body */}
                <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
                    <boxGeometry args={[1.1, 0.6, 1.8]} />
                    <meshStandardMaterial ref={materialRef} color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
                </mesh>
                {/* Roll Cage - Taller */}
                <mesh position={[0, 0.8, -0.2]}>
                    <boxGeometry args={[1.0, 0.05, 1.0]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
                {/* Supports - Taller */}
                <mesh position={[-0.5, 0.45, -0.7]} rotation={[0,0,0]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#111" /></mesh>
                <mesh position={[0.5, 0.45, -0.7]} rotation={[0,0,0]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#111" /></mesh>
                <mesh position={[-0.5, 0.45, 0.3]} rotation={[0,0,0]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#111" /></mesh>
                <mesh position={[0.5, 0.45, 0.3]} rotation={[0,0,0]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#111" /></mesh>
                {/* Headlights (Round) */}
                <mesh position={[-0.35, 0.15, -0.91]} rotation={[Math.PI/2, 0, 0]}>
                    <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
                    <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
                </mesh>
                <mesh position={[0.35, 0.15, -0.91]} rotation={[Math.PI/2, 0, 0]}>
                    <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
                    <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
                </mesh>
                {/* Grill */}
                <mesh position={[0, 0.15, -0.91]}>
                    <boxGeometry args={[0.4, 0.2, 0.05]} />
                    <meshStandardMaterial color="#222" roughness={0.8} />
                </mesh>
                {/* Tail lights */}
                <mesh position={[-0.4, 0.1, 0.91]}>
                    <boxGeometry args={[0.15, 0.25, 0.05]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                </mesh>
                <mesh position={[0.4, 0.1, 0.91]}>
                    <boxGeometry args={[0.15, 0.25, 0.05]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                </mesh>
            </>
        );
    } else if (type === 'car_sport') {
        return (
            <>
                {/* Sleek Body */}
                <mesh castShadow receiveShadow position={[0, -0.1, 0]}>
                    <boxGeometry args={[1.3, 0.4, 2.2]} />
                    <meshStandardMaterial ref={materialRef} color={displayColor} roughness={roughness} metalness={metalness} emissive={emissive} wireframe={wireframe} transparent={transparent} opacity={opacity} />
                </mesh>
                {/* Cabin (low profile) */}
                <mesh castShadow position={[0, 0.2, -0.2]}>
                    <boxGeometry args={[0.9, 0.3, 1]} />
                    <meshStandardMaterial color="#111" roughness={0.2} />
                </mesh>
                {/* Spoiler */}
                <mesh position={[0, 0.2, 0.9]}>
                    <boxGeometry args={[1.4, 0.05, 0.3]} />
                    <meshStandardMaterial color={displayColor} />
                </mesh>
                {/* Headlights - Standard Sport */}
                <mesh position={[-0.45, 0.0, -1.11]}>
                    <boxGeometry args={[0.35, 0.1, 0.05]} />
                    <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
                </mesh>
                <mesh position={[0.45, 0.0, -1.11]}>
                    <boxGeometry args={[0.35, 0.1, 0.05]} />
                    <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
                </mesh>
                {/* Low Grill */}
                <mesh position={[0, -0.2, -1.11]}>
                    <boxGeometry args={[0.6, 0.1, 0.05]} />
                    <meshStandardMaterial color="#111" roughness={0.5} />
                </mesh>
                {/* Tail light strip */}
                <mesh position={[0, 0.0, 1.11]}>
                    <boxGeometry args={[1.1, 0.05, 0.05]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                </mesh>
            </>
        );
    }
    
    // Default Car (Standard)
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
            {/* Headlights */}
            <mesh position={[-0.4, 0.1, -1.01]}>
                <boxGeometry args={[0.2, 0.1, 0.05]} />
                <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
            </mesh>
            <mesh position={[0.4, 0.1, -1.01]}>
                <boxGeometry args={[0.2, 0.1, 0.05]} />
                <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
            </mesh>
            {/* Grill */}
            <mesh position={[0, -0.1, -1.01]}>
                <boxGeometry args={[0.5, 0.15, 0.05]} />
                <meshStandardMaterial color="#222" roughness={0.8} />
            </mesh>
            {/* Tail lights */}
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

  // Wheel positions
  const wheelPositions: [number, number, number][] = [
      [-0.6, -0.2, -0.6], [0.6, -0.2, -0.6], // Front
      [-0.6, -0.2, 0.6], [0.6, -0.2, 0.6]   // Rear
  ];

  return (
    <group ref={groupRef}>
      {renderVehicleBody()}

      {/* Wheels */}
      {wheelPositions.map((pos, i) => {
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
        <group ref={fireTrailRef} position={[0, -0.2, boostAttachZ]}>
           <mesh rotation={[Math.PI / 2, 0, 0]}>
             <coneGeometry args={[0.3, 1.5, 8]} />
             <meshBasicMaterial ref={fireOuterMatRef} color="#ef4444" transparent opacity={0.8} />
           </mesh>
           <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.5]}>
             <coneGeometry args={[0.15, 1, 8]} />
             <meshBasicMaterial ref={fireInnerMatRef} color="#fbbf24" transparent opacity={0.9} />
           </mesh>
        </group>
      )}

      {trail === 'trail_neon' && (
        <group position={[0, -0.45, flatTrailZ]}>
           <mesh rotation={[Math.PI / 2, 0, 0]}>
             <planeGeometry args={[0.8, 3]} />
             <meshBasicMaterial color="#06b6d4" transparent opacity={0.6} side={THREE.DoubleSide} />
           </mesh>
        </group>
      )}

      {/* New Boosts */}
      {trail === 'trail_pixel' && (
        <group position={[0, -0.2, boostAttachZ]}>
           {/* Pixel chunks */}
           {pixelChunks.map((chunk, i) => (
              <mesh key={i} position={chunk.position}>
                 <boxGeometry args={[0.2, 0.2, 0.2]} />
                 <meshBasicMaterial color="#22c55e" transparent opacity={0.8 - (chunk.z/2)} />
              </mesh>
           ))}
        </group>
      )}
      
      {trail === 'trail_lightning' && (
        <group position={[0, -0.2, boostAttachZ]}>
           <Sparkles count={30} scale={[0.5, 0.5, 2]} size={6} speed={2} color="#eab308" />
        </group>
      )}
      
      {trail === 'trail_rainbow' && (
        <group position={[0, -0.45, flatTrailZ]}>
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

export function GarageDisplay({ equippedSkin, equippedTrail, equippedVehicle, equippedWheel }: GarageDisplayProps) {
  const mounted = useHydrated();

  if (!mounted) {
    return (
      <div className="relative flex h-full min-h-[400px] w-full items-center justify-center overflow-hidden bg-secondary/40">
        <div className="text-sm text-muted-foreground">Loading garage...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[400px] w-full overflow-hidden bg-neutral-900">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [5, 3, 6], fov: 45 }}>
        <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[5, 3, 6]} fov={45} />
            
            {/* Strong Ambient for visibility */}
            <ambientLight intensity={1.5} />
            
            {/* Main Overhead Light - High Intensity */}
            <spotLight 
                position={[5, 10, 5]} 
                angle={0.5} 
                penumbra={0.5} 
                castShadow 
                intensity={400} 
                shadow-bias={-0.0001}
                color="#ffffff"
                distance={30}
                decay={2}
            />

            {/* Fill Light - Left */}
            <spotLight 
                position={[-10, 5, 0]} 
                angle={0.5} 
                penumbra={1} 
                intensity={200} 
                color="#4f46e5" 
                distance={30}
                decay={2}
            />

             {/* Fill Light - Right */}
             <spotLight 
                position={[10, 5, 0]} 
                angle={0.5} 
                penumbra={1} 
                intensity={200} 
                color="#f43f5e" 
                distance={30}
                decay={2}
            />

            {/* Back Rim Light */}
            <spotLight 
                position={[0, 5, -10]} 
                angle={0.8} 
                penumbra={1} 
                intensity={300} 
                color="#ffffff"
                distance={30}
                decay={2}
            />
            
            <GarageStructure />
            <GarageProps />

            {/* Car Positioned on floor */}
            <group position={[0, 0, 0]}>
                <CarModel 
                    skin={equippedSkin} 
                    trail={equippedTrail}
                    vehicleType={equippedVehicle} 
                    wheel={equippedWheel}
                />
            </group>

            <OrbitControls 
                enableZoom={true} 
                minDistance={4} 
                maxDistance={12} 
                autoRotate={true} 
                autoRotateSpeed={0.5}
                enablePan={false}
                minPolarAngle={0}
                maxPolarAngle={Math.PI / 2 - 0.05} // Don't go below floor
                target={[0, 0, 0]}
            />
            
            <Environment files="/hdri/warehouse.hdr" background={false} />
        </Suspense>
      </Canvas>
      
      <div className="absolute bottom-4 left-4 pointer-events-none">
        {/* Overlay sits on the dark 3D scene, so it keeps fixed scene colors */}
        <div className="flex items-center gap-2 rounded-2xl bg-black/80 px-3 py-1.5 text-white">
            <div className="h-1.5 w-1.5 bg-green-500 [animation:ascii-blink_1.2s_steps(1)_infinite]" />
            <span className="text-[12px] font-medium tracking-[0.14em] text-white/80">Showroom Live</span>
        </div>
      </div>
    </div>
  );
}
