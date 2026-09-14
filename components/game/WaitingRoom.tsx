'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import JoinCard from './JoinCard';

interface Player {
  id: string;
  nickname: string;
  avatar: string;
  points: number;
}

interface WaitingRoomProps {
  gameCode: string;
  isHost: boolean;
  onStartGame: () => void;
}

export default function WaitingRoom({ gameCode, isHost, onStartGame }: WaitingRoomProps) {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`room:${gameCode}`, {
      config: { presence: { key: 'player' } },
    });

    // Función helper para extraer la lista de jugadores del estado de Presence
    const extractPlayers = (state: any): Player[] => {
      const playersList: Player[] = [];
      for (const id in state) {
        const presence = state[id][0] as any;
        playersList.push({
          id: id,
          nickname: presence.nickname,
          avatar: presence.avatar,
          points: 0,
        });
      }
      return playersList;
    };

    // Escuchar TODOS los eventos de Presence
    channel
      .on('presence', { event: 'sync' }, () => {
        // Se dispara cuando el estado completo se sincroniza (al conectarse)
        const state = channel.presenceState();
        setPlayers(extractPlayers(state));
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // Se dispara cuando alguien nuevo se une
        console.log('✅ Nuevo jugador se unió:', newPresences);
        const state = channel.presenceState();
        setPlayers(extractPlayers(state));
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // Se dispara cuando alguien se desconecta
        console.log('❌ Jugador se fue:', leftPresences);
        const state = channel.presenceState();
        setPlayers(extractPlayers(state));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscrito al canal de sala:', gameCode);
          
          // Solo el jugador (NO el host) se registra en Presence
          if (!isHost) {
            await channel.track({ 
              nickname: 'Jugador Nuevo', 
              avatar: '🐶' 
            });
            console.log('✅ Jugador registrado en Presence');
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameCode, isHost]);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4">
      <JoinCard gameCode={gameCode} isHost={isHost} />
      
      <div className="mt-8 w-full">
        <h3 className="text-2xl font-black text-white mb-4 text-center">
          Jugadores en sala ({players.length})
        </h3>
        
        {players.length === 0 ? (
          <p className="text-white/70 text-center font-bold animate-pulse">
            Esperando a que alguien se una...
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {players.map((p) => (
              <div 
                key={p.id} 
                className="bg-white rounded-xl p-4 flex flex-col items-center shadow-lg transform transition hover:scale-105"
              >
                <span className="text-4xl mb-2">{p.avatar}</span>
                <span className="font-bold text-[#46178F] truncate w-full text-center">
                  {p.nickname}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isHost && (
        <button
          onClick={onStartGame}
          disabled={players.length === 0}
          className="mt-8 px-10 py-4 bg-[#26890C] hover:bg-[#1e6b0a] disabled:bg-gray-400 disabled:border-gray-500 text-white font-black text-2xl rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95 border-b-4 border-[#145206]"
        >
          ¡INICIAR JUEGO!
        </button>
      )}
    </div>
  );
}