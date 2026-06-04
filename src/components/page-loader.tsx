'use client';

import { useState, useEffect } from 'react';
import { Logo } from '@/components/icons';
import { motion, AnimatePresence } from 'framer-motion';

export function PageLoader() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Small delay to ensure hydration is complete and we show the animation briefly
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f0f0f]"
        >
          {/* Background Mesh Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative flex flex-col items-center gap-10">
            {/* Animated Logo Container */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotateY: -20 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ 
                duration: 1, 
                ease: "easeOut",
                scale: { type: "spring", damping: 20, stiffness: 120 }
              }}
              className="relative h-28 w-28 rounded-[2.5rem] flex items-center justify-center bg-gradient-to-br from-sky-400 via-blue-500 to-violet-600 shadow-[0_0_60px_rgba(56,189,248,0.4)]"
            >
              <div className="absolute inset-0 rounded-[2.5rem] bg-white/10 backdrop-blur-md border border-white/20" />
              <Logo className="relative z-10 h-16 w-16 text-white drop-shadow-lg" />
              
              {/* Spinning Outer Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-12px] rounded-[3rem] border-t-2 border-l-2 border-transparent border-t-sky-400/30 border-l-sky-400/10"
              />
              
              {/* Inner Pulse */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-[2.5rem] bg-sky-400/20 blur-xl"
              />
            </motion.div>

            {/* Branding */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="flex flex-col items-center gap-3"
            >
              <h2 className="text-3xl font-black tracking-[0.4em] text-white">FALAQ</h2>
              <div className="flex items-center gap-2">
                 <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-sky-400/50" />
                 <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Studio Workspace</span>
                 <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-sky-400/50" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
