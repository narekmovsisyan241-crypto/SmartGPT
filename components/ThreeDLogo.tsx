import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Torus } from '@react-three/drei';

const AICore = () => {
  const outerRing = useRef<any>(null);
  const innerRing = useRef<any>(null);
  const core = useRef<any>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (outerRing.current) {
        outerRing.current.rotation.x = t * 0.2;
        outerRing.current.rotation.y = t * 0.5;
    }
    if (innerRing.current) {
        innerRing.current.rotation.x = -t * 0.4;
        innerRing.current.rotation.z = t * 0.2;
    }
    if (core.current) {
        core.current.scale.setScalar(1 + Math.sin(t * 3) * 0.1);
    }
  });

  return (
    <group>
        {/* Outer Ring */}
        <group ref={outerRing}>
            <Torus args={[1.5, 0.05, 16, 100]}>
                <meshStandardMaterial color="#00f3ff" emissive="#00f3ff" emissiveIntensity={0.5} wireframe />
            </Torus>
        </group>
        
        {/* Inner Ring */}
        <group ref={innerRing}>
            <Torus args={[1, 0.05, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
                <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={0.5} wireframe />
            </Torus>
        </group>

        {/* Core Sphere */}
        <mesh ref={core}>
            <sphereGeometry args={[0.6, 32, 32]} />
            <meshStandardMaterial color="#ffffff" emissive="#00f3ff" emissiveIntensity={2} />
        </mesh>
    </group>
  );
};

export const ThreeDLogo: React.FC = () => {
  return (
    <div className="w-24 h-24">
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <AICore />
      </Canvas>
    </div>
  );
};