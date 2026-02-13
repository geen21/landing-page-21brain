'use client';

import { Canvas } from '@react-three/fiber';
import NeuralNetwork from './NeuralNetwork';

interface SceneProps {
  scrollProgress: number;
}

export default function Scene({ scrollProgress }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 28], fov: 50, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      style={{ background: '#fafafa' }}
      dpr={[1, 1]}
    >
      <NeuralNetwork scrollProgress={scrollProgress} />
    </Canvas>
  );
}
