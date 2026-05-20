'use client';

import { Logo } from '@/components/icons';
import { motion } from 'framer-motion';

export function PageSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full w-full flex flex-col items-center justify-center bg-[#0f0f0f] relative overflow-hidden"
    >
      {/* Background Mesh Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative flex flex-col items-center gap-8">
        {/* Animated Logo Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 0.5, 
            ease: "easeOut"
          }}
          className="relative h-24 w-24 rounded-[2rem] flex items-center justify-center bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl"
        >
          <Logo className="relative z-10 h-12 w-12 text-white opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
          
          {/* Spinning Outer Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-10px] rounded-[2.5rem] border-t-2 border-l-2 border-transparent border-t-sky-400/30 border-l-sky-400/10"
          />
          
          {/* Inner Pulse Glow */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-[2rem] bg-sky-400/20 blur-xl"
          />
        </motion.div>

        {/* Loading Text */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">Initializing</span>
          <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
        </motion.div>
      </div>
    </motion.div>
  );
}
