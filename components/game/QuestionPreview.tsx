'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

interface QuestionPreviewProps {
  type: 'quiz' | 'true_false';
  isDouble: boolean;
}

export default function QuestionPreview({ type, isDouble }: QuestionPreviewProps) {
  useEffect(() => {
    // Efecto de confeti sutil si es puntos dobles
    if (isDouble) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#D89E00', '#FFFFFF'],
        disableForReducedMotion: true,
      });
    }
  }, [isDouble]);

  return (
    <div className="min-h-screen bg-[#46178F] flex flex-col items-center justify-center p-6 text-white">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-center"
      >
        {isDouble && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <span className="text-6xl md:text-8xl font-black text-[#D89E00] drop-shadow-lg animate-pulse">
              ¡PUNTOS DOBLES!
            </span>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {type === 'true_false' ? (
            <div className="flex flex-col items-center gap-4">
              <span className="text-5xl md:text-7xl font-black text-white drop-shadow-lg">
                VERDADERO O FALSO
              </span>
              <div className="flex gap-4 mt-4">
                <div className="w-24 h-24 bg-[#26890C] rounded-2xl flex items-center justify-center text-5xl shadow-lg border-b-8 border-[#145206]">
                  ✓
                </div>
                <div className="w-24 h-24 bg-[#E21B3C] rounded-2xl flex items-center justify-center text-5xl shadow-lg border-b-8 border-[#991025]">
                  ✕
                </div>
              </div>
            </div>
          ) : (
            <span className="text-5xl md:text-7xl font-black text-white drop-shadow-lg">
              PREGUNTA
            </span>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-xl font-bold opacity-70"
        >
          Prepárate...
        </motion.div>
      </motion.div>
    </div>
  );
}