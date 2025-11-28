import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Icosahedron, Box, Octahedron, Torus, Sphere } from '@react-three/drei';

const SmartMesh = () => {
    const ref = useRef<any>(null);
    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.x = state.clock.getElapsedTime() * 0.5;
            ref.current.rotation.y = state.clock.getElapsedTime() * 0.8;
            ref.current.scale.setScalar(1 + Math.sin(state.clock.getElapsedTime() * 2) * 0.1);
        }
    });
    return (
        <group ref={ref}>
            <Icosahedron args={[1, 0]}>
                <meshStandardMaterial color="#00f3ff" wireframe />
            </Icosahedron>
            <Sphere args={[0.5, 16, 16]}>
                 <meshStandardMaterial color="#ffffff" emissive="#00f3ff" emissiveIntensity={2} />
            </Sphere>
        </group>
    );
}

const BizMesh = () => {
    const ref = useRef<any>(null);
    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y = state.clock.getElapsedTime() * 0.6;
            ref.current.rotation.z = Math.sin(state.clock.getElapsedTime()) * 0.2;
        }
    });
    return (
        <group ref={ref}>
             <Box args={[1.4, 1.4, 1.4]}>
                <meshStandardMaterial color="#FFD700" wireframe />
            </Box>
             <Box args={[0.9, 0.9, 0.9]}>
                <meshStandardMaterial color="#111" transparent opacity={0.8} />
            </Box>
        </group>
    );
}

const EduMesh = () => {
    const ref = useRef<any>(null);
    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.x = state.clock.getElapsedTime();
            ref.current.rotation.y = state.clock.getElapsedTime();
        }
    });
    return (
        <group ref={ref}>
            <Octahedron args={[1.2, 0]}>
                <meshStandardMaterial color="#a855f7" wireframe />
            </Octahedron>
            <Torus args={[0.6, 0.1, 16, 32]}>
                 <meshStandardMaterial color="#ffffff" />
            </Torus>
        </group>
    );
}

const CommonCanvas = ({ children }: { children: React.ReactNode }) => (
    <div className="w-8 h-8">
        <Canvas camera={{ position: [0, 0, 3] }}>
            <ambientLight intensity={1} />
            <pointLight position={[5, 5, 5]} />
            {children}
        </Canvas>
    </div>
);

export const SmartLogo = () => <CommonCanvas><SmartMesh /></CommonCanvas>;
export const BizLogo = () => <CommonCanvas><BizMesh /></CommonCanvas>;
export const EduLogo = () => <CommonCanvas><EduMesh /></CommonCanvas>;
