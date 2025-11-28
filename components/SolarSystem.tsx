import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere } from '@react-three/drei';
import * as THREE from 'three';

const Planet = ({ position, size, color, speed, distance }: { position?: [number, number, number], size: number, color: string, speed: number, distance: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (orbitRef.current) {
        orbitRef.current.rotation.y += speed * 0.01;
    }
    if (meshRef.current) {
        meshRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group ref={orbitRef}>
        <mesh ref={meshRef} position={[distance, 0, 0]}>
            <sphereGeometry args={[size, 32, 32]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.5} />
        </mesh>
    </group>
  );
};

const Sun = () => {
    return (
        <mesh>
            <sphereGeometry args={[2.5, 64, 64]} />
            <meshBasicMaterial color="#FFD700" />
            <pointLight intensity={2} distance={100} decay={2} color="#ffffff" />
        </mesh>
    )
}

const Scene = () => {
    return (
        <>
            <ambientLight intensity={0.1} />
            <Stars radius={300} depth={60} count={20000} factor={7} saturation={0} fade speed={1} />
            <Sun />
            {/* Mercury */}
            <Planet size={0.4} color="#A5A5A5" distance={4} speed={0.8} />
            {/* Venus */}
            <Planet size={0.7} color="#E3BB76" distance={6} speed={0.6} />
            {/* Earth */}
            <Planet size={0.75} color="#22A6F2" distance={8.5} speed={0.4} />
            {/* Mars */}
            <Planet size={0.5} color="#FF5733" distance={11} speed={0.35} />
            {/* Jupiter */}
            <Planet size={1.8} color="#D8CA9D" distance={16} speed={0.2} />
            {/* Saturn */}
            <Planet size={1.5} color="#C5AB6E" distance={22} speed={0.15} />
            {/* Uranus */}
            <Planet size={1.0} color="#C6D3E3" distance={28} speed={0.1} />
             {/* Neptune */}
             <Planet size={1.0} color="#4b70dd" distance={33} speed={0.08} />

            <OrbitControls enableZoom={true} enablePan={true} autoRotate={true} autoRotateSpeed={0.2} />
        </>
    )
}

export const SolarSystem: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10">
      <Canvas camera={{ position: [0, 20, 35], fov: 45 }}>
        <Scene />
      </Canvas>
    </div>
  );
};
