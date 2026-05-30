'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

export default function GlowBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#05050a] pointer-events-none z-0">
      {/* Dynamic Mouse Spotlight Glow */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.12] transition-transform duration-300 pointer-events-none bg-indigo-500"
        style={{
          transform: `translate(${mousePos.x - 250}px, ${mousePos.y - 250}px)`,
        }}
      />

      {/* Cyber Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]" />

      {/* Nebula Giant Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-500/10 blur-[130px] animate-pulse duration-[8000s]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-fuchsia-500/10 blur-[150px] animate-pulse duration-[12000s]" />
      <div className="absolute top-[40%] right-[20%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse duration-[10000s]" />
      
      {/* Noise dust textures for ultra glass feel */}
      <div className="absolute inset-0 bg-noise opacity-[0.01]" />
    </div>
  );
}
