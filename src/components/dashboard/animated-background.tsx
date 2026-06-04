'use client';

import { useEffect, useRef } from 'react';

const COLORS = [
  '#22d3ee', // cyan-400
  '#c084fc', // purple-400
  '#fbbf24', // amber-400
  '#34d399', // emerald-400
  '#38bdf8', // sky-400
];

class Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  life: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 4 + 1;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.speedX = (Math.random() - 0.5) * 3.5;
    this.speedY = (Math.random() - 0.5) * 3.5 - 0.5;
    this.life = 1.0; 
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life -= 0.02; // Fades out over 50 frames
    this.size *= 0.94; // Shrinks slightly
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = Math.max(this.life, 0);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.restore();
  }
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particlesArray: Particle[] = [];
    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate speed based on mouse movement
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Spawn more particles if moving faster, max 8 per event
      const numParticles = Math.min(Math.max(Math.floor(distance / 5), 2), 8);

      for (let i = 0; i < numParticles; i++) {
        // Distribute particles slightly along the path to avoid gaps
        const offsetX = lastX + dx * (i / numParticles);
        const offsetY = lastY + dy * (i / numParticles);
        particlesArray.push(new Particle(offsetX, offsetY));
      }
      
      lastX = e.clientX;
      lastY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw(ctx);
        
        if (particlesArray[i].life <= 0 || particlesArray[i].size <= 0.1) {
          particlesArray.splice(i, 1);
          i--;
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 min-h-screen bg-[#030407] overflow-hidden -z-10 pointer-events-none">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-10 mix-blend-screen" 
      />

      <div className="absolute -top-40 -left-40 w-96 h-96 glow-cyan blur-[100px] pointer-events-none opacity-60 z-0" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 glow-purple blur-[100px] pointer-events-none opacity-60 z-0" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 glow-amber blur-[100px] pointer-events-none opacity-60 z-0" />
    </div>
  );
}
