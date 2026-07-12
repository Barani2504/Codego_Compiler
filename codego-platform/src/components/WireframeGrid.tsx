import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';

const CODE_SYMBOLS = ['{ }', '< >', '( )', '[ ]', '=>', '</>', 'const', 'let', 'def', 'import', 'return', '==', '!='];

function FloatingSymbols({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useMemo(() => {
    const handler = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 60; i++) {
      const text = CODE_SYMBOLS[Math.floor(Math.random() * CODE_SYMBOLS.length)];
      const position = [
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 15 - 5
      ];
      const rotation = [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      ];
      const scale = Math.random() * 0.8 + 0.3;
      const speedX = (Math.random() - 0.5) * 0.01;
      const speedY = (Math.random() - 0.5) * 0.01;
      temp.push({ text, position, rotation, scale, speedX, speedY });
    }
    return temp;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle global rotation
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y, mouse.current.x * 0.15 + state.clock.elapsedTime * 0.05, 0.05
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x, mouse.current.y * 0.15, 0.05
      );

      // Individual particle rotation
      groupRef.current.children.forEach((child: any, i) => {
        child.rotation.x += particles[i].speedX;
        child.rotation.y += particles[i].speedY;
        child.position.y += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.005;
      });
    }
  });

  const baseColor = isDark ? '#6366f1' : '#8b5cf6';
  const glowColor = isDark ? '#06b6d4' : '#e879f9';
  const opacity = isDark ? 0.4 : 0.6;

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <Text
          key={i}
          position={p.position as any}
          rotation={p.rotation as any}
          fontSize={p.scale}
          color={i % 3 === 0 ? glowColor : baseColor}
          fillOpacity={opacity}
          anchorX="center"
          anchorY="middle"
          outlineWidth={isDark ? 0.02 : 0}
          outlineColor={isDark ? '#000' : 'transparent'}
        >
          {p.text}
        </Text>
      ))}
    </group>
  );
}

function AbstractShapes({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      groupRef.current.rotation.x = state.clock.elapsedTime * 0.05;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
    }
  });

  const mainColor = isDark ? '#4f46e5' : '#818cf8';
  const accentColor = isDark ? '#06b6d4' : '#e879f9';

  return (
    <group ref={groupRef} position={[0, 0, -5]}>
      {/* Central glowing core */}
      <mesh>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial color={mainColor} wireframe transparent opacity={isDark ? 0.1 : 0.2} />
      </mesh>

      {/* Outer rotating rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.5, 0.02, 16, 100]} />
        <meshBasicMaterial color={accentColor} transparent opacity={isDark ? 0.3 : 0.5} />
      </mesh>

      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[4.5, 0.02, 16, 100]} />
        <meshBasicMaterial color={mainColor} transparent opacity={isDark ? 0.3 : 0.5} />
      </mesh>
    </group>
  );
}

export default function WireframeGrid() {
  const { isDark } = useTheme();
  return (
    <div id="wireframe-bg" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
        <fog attach="fog" args={[isDark ? '#0a0e1a' : '#f8fafc', 5, 25]} />
        <ambientLight intensity={isDark ? 0.8 : 1.2} />
        <AbstractShapes isDark={isDark} />
        <FloatingSymbols isDark={isDark} />
      </Canvas>
    </div>
  );
}
