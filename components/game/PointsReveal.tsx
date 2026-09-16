'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PointsRevealProps {
  avatar: string;
  pointsEarned: number;
  totalScore: number;
  rankPosition: number;
  totalPlayers: number;
  wasCorrect: boolean; // 🎯 Nueva prop
}

export default function PointsReveal({ 
  avatar, 
  pointsEarned, 
  totalScore, 
  rankPosition, 
  totalPlayers,
  wasCorrect
}: PointsRevealProps) {
  const [displayedPoints, setDisplayedPoints] = useState(0);
  const [displayedTotal, setDisplayedTotal] = useState(0);

  // Animación de conteo de puntos
  useEffect(() => {
    if (!wasCorrect || pointsEarned === 0) return;
    
    const duration = 1500;
    const steps = 30;
    const increment = pointsEarned / steps;
    const totalIncrement = totalScore / steps;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      setDisplayedPoints(Math.min(Math.round(increment * current), pointsEarned));
      setDisplayedTotal(Math.min(Math.round(totalIncrement * current), totalScore));
      
      if (current >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [pointsEarned, totalScore, wasCorrect]);

  // Si no fue correcta, mostrar total directamente
  useEffect(() => {
    if (!wasCorrect) {
      setDisplayedTotal(totalScore);
    }
  }, [totalScore, wasCorrect]);

  const getRankEmoji = (pos: number) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `#${pos}`;
  };

  const getRankColor = (pos: number) => {
    if (pos === 1) return 'text-[#D89E00]';
    if (pos === 2) return 'text-gray-300';
    if (pos === 3) return 'text-[#CD7F32]';
    return 'text-white';
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-white">
      {/* Avatar grande */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-9xl mb-6 drop-shadow-2xl"
      >
        {avatar}
      </motion.div>

      {/* Resultado de la respuesta */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-center mb-4"
      >
        {wasCorrect && pointsEarned > 0 ? (
          <>
            <p className="text-xl font-bold opacity-80 mb-2">¡Respuesta correcta!</p>
            <p className="text-6xl md:text-7xl font-black text-[#D89E00] drop-shadow-lg">
              +{displayedPoints}
            </p>
            <p className="text-2xl font-bold mt-1">puntos</p>
          </>
        ) : (
          <>
            <p className="text-4xl md:text-5xl font-black text-red-400 mb-2">
              ¡Sin puntos!
            </p>
            <p className="text-xl opacity-80">Respuesta incorrecta o tiempo agotado</p>
          </>
        )}
      </motion.div>

      {/* Total acumulado */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, type: 'spring' }}
        className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/20"
      >
        <p className="text-sm font-bold opacity-70 text-center">Total acumulado</p>
        <p className="text-4xl font-black text-center">{displayedTotal}</p>
      </motion.div>

      {/* Posición en ranking */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-6 text-center"
      >
        <p className="text-lg font-bold opacity-80 mb-1">Vas en</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-5xl">{getRankEmoji(rankPosition)}</span>
          <span className={`text-3xl font-black ${getRankColor(rankPosition)}`}>
            {rankPosition}° lugar
          </span>
          <span className="text-lg opacity-70 self-end mb-1">de {totalPlayers}</span>
        </div>
      </motion.div>
    </div>
  );
}