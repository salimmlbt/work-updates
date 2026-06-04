'use client'

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import React, { MouseEvent } from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
}

export function GlassCard({
  children,
  className,
  gradientFrom = "rgba(255, 255, 255, 0.03)",
  gradientVia = "transparent",
  gradientTo = "rgba(255, 255, 255, 0)",
  ...props
}: GlassCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      className={cn(
        "group relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#09090b]/40 backdrop-blur-3xl shadow-2xl transition-all duration-300 hover:border-white/10",
        className
      )}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100 z-0"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              ${gradientFrom},
              ${gradientVia},
              ${gradientTo}
            )
          `,
        }}
      />
      
      {/* Subtle top inner shadow */}
      <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] pointer-events-none z-0" />
      
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}
