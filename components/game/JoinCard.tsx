'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeSVG),
  {
    ssr: false,
  }
);

interface JoinCardProps {
  gameCode: string;
  isHost?: boolean;
}

export default function JoinCard({ gameCode, isHost = false }: JoinCardProps) {
  const joinUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/join/${gameCode}` 
    : '';

  if (isHost) {
    return (
      <div className="flex flex-col items-center bg-white rounded-2xl p-8 shadow-2xl text-gray-800">
        <h2 className="text-2xl font-black mb-4 text-[#46178F]">¡Escanea para unirte!</h2>
        <div className="bg-white p-4 rounded-xl border-4 border-[#46178F] mb-6">
          <QRCodeSVG value={joinUrl} size={200} level="H" />
        </div>
        <p className="text-lg font-bold mb-2">O ingresa el código en la web:</p>
        <div className="text-5xl font-black tracking-widest text-[#46178F] bg-gray-100 px-8 py-4 rounded-xl border-2 border-dashed border-gray-300">
          {gameCode}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-white rounded-2xl p-8 shadow-2xl w-full max-w-md">
      <h2 className="text-3xl font-black mb-6 text-[#46178F]">Unirse al juego</h2>
      <div className="text-4xl font-black tracking-widest text-[#46178F] mb-8 bg-gray-100 w-full text-center py-4 rounded-xl">
        {gameCode}
      </div>
      <p className="text-gray-500 text-center">Ingresa este código en la pantalla principal del host.</p>
    </div>
  );
}