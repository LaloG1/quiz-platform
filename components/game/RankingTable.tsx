'use client';

import React from 'react';

interface Player {
  id: string;
  nickname: string;
  avatar: string;
  points: number;
}

interface RankingTableProps {
  players: Player[];
}

export default function RankingTable({ players }: RankingTableProps) {
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-[#46178F] text-white p-4 text-center">
        <h3 className="text-2xl font-black">🏆 Ranking Completo</h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {players.map((player, index) => (
          <div 
            key={player.id}
            className={`flex items-center gap-4 p-4 transition hover:bg-gray-50 ${
              index === 0 ? 'bg-yellow-50' : 
              index === 1 ? 'bg-gray-50' : 
              index === 2 ? 'bg-orange-50' : ''
            }`}
          >
            {/* Posición */}
            <div className="w-12 text-center">
              {index < 3 ? (
                <span className="text-3xl">{medals[index]}</span>
              ) : (
                <span className="text-2xl font-black text-gray-400">#{index + 1}</span>
              )}
            </div>

            {/* Avatar */}
            <div className="text-4xl">{player.avatar}</div>

            {/* Nombre */}
            <div className="flex-1">
              <p className={`font-black text-lg truncate ${
                index === 0 ? 'text-[#46178F]' : 'text-gray-800'
              }`}>
                {player.nickname}
              </p>
            </div>

            {/* Puntos */}
            <div className="text-right">
              <p className={`font-black text-xl ${
                index === 0 ? 'text-[#D89E00]' : 
                index === 1 ? 'text-gray-500' : 
                index === 2 ? 'text-[#CD7F32]' : 'text-gray-700'
              }`}>
                {player.points}
              </p>
              <p className="text-xs text-gray-500 font-bold">puntos</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}