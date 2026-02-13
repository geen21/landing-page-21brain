'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Overlay from '@/components/Overlay';

const Scene = dynamic(() => import('@/components/Scene'), { ssr: false });

export default function Home() {
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    setScrollProgress(Math.min(1, Math.max(0, progress)));
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <main className="relative" style={{ height: '600vh' }}>
      {/* Fixed 3D canvas */}
      <div className="fixed inset-0 z-0">
        <Scene scrollProgress={scrollProgress} />
      </div>

      {/* Fixed text overlay — driven by scroll progress */}
      <Overlay scrollProgress={scrollProgress} />
    </main>
  );
}
