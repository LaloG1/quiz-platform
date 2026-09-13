'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, type Variants } from 'framer-motion';

export interface Player {
  id: string;
  nickname: string;
  avatar: string; // Emoji o URL de imagen
  points: number;
}

interface PodiumProps {
  // Se espera que el array venga ya ordenado de mayor a menor puntaje: [1ro, 2do, 3ro]
  topPlayers: Player[];
  onContinue?: () => void; // Opcional: para cerrar el podio o ir al dashboard
}

export default function Podium({ topPlayers, onContinue }: PodiumProps) {
  const first = topPlayers[0];
  const second = topPlayers[1];
  const third = topPlayers[2];

  // Efecto para lanzar confeti cuando aparece el ganador
  useEffect(() => {
    const timer = setTimeout(() => {
      // Confeti desde el centro hacia afuera
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#E21B3C', '#1368CE', '#D89E00', '#26890C', '#FFFFFF'],
        disableForReducedMotion: true,
      });
      
      // Un segundo estallido lateral para más emoción
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#E21B3C'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#1368CE', '#26890C'],
        });
      }, 250);
    }, 600); // Espera a que la animación del 1er lugar comience

    return () => clearTimeout(timer);
  }, []);

  // Variante de animación para la entrada escalonada
  const popIn: Variants = {
  hidden: {
    y: 100,
    opacity: 0,
    scale: 0.8,
  },
  visible: (delay: number) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 12,
      delay,
    },
  }),
};

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#46178F] p-4 text-white">
      <motion.h1 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-6xl font-black mb-8 text-center drop-shadow-lg tracking-tight"
      >
        🏆 ¡Podio de Ganadores! 🏆
      </motion.h1>

      <div className="flex items-end justify-center gap-2 md:gap-6 w-full max-w-3xl">
        
        {/* 2DO LUGAR (Izquierda) */}
        {second && (
          <motion.div
            custom={0.2}
            initial="hidden"
            animate="visible"
            variants={popIn}
            className="flex flex-col items-center w-1/3"
          >
            <div className="text-4xl md:text-6xl mb-2 drop-shadow-md">{second.avatar}</div>
            <div className="text-sm md:text-lg font-bold text-center truncate w-full px-2">
              {second.nickname}
            </div>
            <div className="text-yellow-300 font-black text-xl md:text-2xl mb-2">
              {second.points} pts
            </div>
            <div className="w-full bg-[#C0C0C0] rounded-t-xl h-32 md:h-48 flex items-start justify-center pt-4 shadow-2xl border-t-4 border-white/30">
              <span className="text-4xl md:text-5xl font-black text-gray-800 drop-shadow-sm">2</span>
            </div>
          </motion.div>
        )}

        {/* 1ER LUGAR (Centro) */}
        {first && (
          <motion.div
            custom={0.5}
            initial="hidden"
            animate="visible"
            variants={popIn}
            className="flex flex-col items-center w-1/3 relative"
          >
            {/* Corona o efecto especial para el 1ro */}
            <motion.div 
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 1, type: 'spring' }}
              className="absolute -top-8 text-4xl md:text-5xl"
            >
              👑
            </motion.div>
            
            <div className="text-5xl md:text-7xl mb-2 drop-shadow-md mt-4">{first.avatar}</div>
            <div className="text-lg md:text-2xl font-black text-center truncate w-full px-2 text-yellow-300">
              {first.nickname}
            </div>
            <div className="text-white font-black text-2xl md:text-3xl mb-2 drop-shadow-md">
              {first.points} pts
            </div>
            <div className="w-full bg-[#FFD700] rounded-t-xl h-44 md:h-64 flex items-start justify-center pt-6 shadow-2xl border-t-4 border-white/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              <span className="text-5xl md:text-7xl font-black text-yellow-900 drop-shadow-sm relative z-10">1</span>
            </div>
          </motion.div>
        )}

        {/* 3ER LUGAR (Derecha) */}
        {third && (
          <motion.div
            custom={0.8}
            initial="hidden"
            animate="visible"
            variants={popIn}
            className="flex flex-col items-center w-1/3"
          >
            <div className="text-4xl md:text-6xl mb-2 drop-shadow-md">{third.avatar}</div>
            <div className="text-sm md:text-lg font-bold text-center truncate w-full px-2">
              {third.nickname}
            </div>
            <div className="text-orange-300 font-black text-xl md:text-2xl mb-2">
              {third.points} pts
            </div>
            <div className="w-full bg-[#CD7F32] rounded-t-xl h-24 md:h-36 flex items-start justify-center pt-4 shadow-2xl border-t-4 border-white/30">
              <span className="text-4xl md:text-5xl font-black text-gray-900 drop-shadow-sm">3</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Botón de continuar (opcional) */}
      {onContinue && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          onClick={onContinue}
          className="mt-12 px-8 py-4 bg-[#E21B3C] hover:bg-[#c01530] text-white font-black text-xl rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95 border-b-4 border-[#991025]"
        >
          Continuar
        </motion.button>
      )}
    </div>
  );
}