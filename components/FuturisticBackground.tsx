import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const CyberGrid = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#00f3ff') }
    }), []);

    const vertexShader = `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
            vUv = uv;
            vec3 pos = position;
            // Rolling wave effect on the grid floor
            float wave = sin(pos.x * 0.2 + uTime) * cos(pos.y * 0.2 + uTime) * 2.0;
            pos.z += wave;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `;

    const fragmentShader = `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
            // Grid lines
            float grid = step(0.95, fract(vUv.x * 50.0)) + step(0.95, fract(vUv.y * 50.0));
            float alpha = grid * (1.0 - length(vUv - 0.5) * 1.5); // Fade at edges
            
            // Pulse
            float pulse = sin(uTime * 2.0 - length(vUv - 0.5) * 10.0) * 0.5 + 0.5;
            
            gl_FragColor = vec4(uColor * pulse, alpha * 0.6); 
        }
    `;

    useFrame((state) => {
        if (meshRef.current) {
            (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime() * 0.5;
        }
    });

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -15, -40]}>
            <planeGeometry args={[200, 200, 100, 100]} />
            <shaderMaterial
                uniforms={uniforms}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                transparent
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
    );
};

const DataParticles = () => {
    const count = 800;
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            temp.push({
                speed: 0.05 + Math.random() * 0.1,
                x: (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 50,
                z: (Math.random() - 0.5) * 50 - 20,
                scale: Math.random()
            });
        }
        return temp;
    }, [count]);

    useFrame((state) => {
        if (!mesh.current) return;
        const time = state.clock.getElapsedTime();
        
        particles.forEach((particle, i) => {
            // Float upwards
            particle.y += particle.speed;
            if (particle.y > 25) particle.y = -25;
            
            dummy.position.set(particle.x, particle.y, particle.z);
            dummy.rotation.x = time * particle.speed;
            dummy.rotation.y = time * particle.speed;
            
            // Pulse size
            const pulse = 1 + Math.sin(time * 3 + i) * 0.3;
            dummy.scale.setScalar(particle.scale * 0.15 * pulse);
            
            dummy.updateMatrix();
            mesh.current!.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#00f3ff" transparent opacity={0.6} />
        </instancedMesh>
    );
};

export const FuturisticBackground: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10 bg-gradient-to-b from-[#000510] to-[#000000]">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 20]} fov={50} />
        <fog attach="fog" args={['#000510', 10, 80]} />
        <ambientLight intensity={0.5} />
        
        <CyberGrid />
        <DataParticles />
        <Stars radius={150} depth={50} count={5000} factor={4} saturation={1} fade speed={0.5} />
      </Canvas>
    </div>
  );
};
