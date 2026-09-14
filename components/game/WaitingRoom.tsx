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
  // Nuevas props para el jugador
  playerNickname?: string;
  playerAvatar?: string;
  playerId?: string; // ID único del jugador en la BD
}

export default function WaitingRoom({ 
  gameCode, 
  isHost, 
  onStartGame,
  playerNickname,
  playerAvatar,
  playerId
}: WaitingRoomProps) {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    // ⚠️ CLAVE: Usar un nombre de canal consistente
    const channelName = `waiting-room:${gameCode}`;
    
    const channel = supabase.channel(channelName, {
      config: { 
        presence: { 
          // ⚠️ CLAVE: Cada jugador necesita una key ÚNICA
          // Usamos el playerId de la BD, o generamos uno aleatorio
          key: playerId || crypto.randomUUID() 
        } 
      },
    });

    const extractPlayers = (state: any): Player[] => {
      const playersList: Player[] = [];
      for (const key in state) {
        // state[key] es un array de presencias con esa key
        const presence = state[key][0] as any;
        if (presence && presence.nickname) {
          playersList.push({
            id: key,
            nickname: presence.nickname,
            avatar: presence.avatar || '🐱',
            points: 0,
          });
        }
      }
      return playersList;
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('🔄 Sync completo. Estado:', state);
        setPlayers(extractPlayers(state));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('✅ Se unió:', key, newPresences);
        const state = channel.presenceState();
        setPlayers(extractPlayers(state));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('❌ Se fue:', key, leftPresences);
        const state = channel.presenceState();
        setPlayers(extractPlayers(state));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado al canal:', channelName);
          
          // Solo el jugador se registra (NO el host)
          if (!isHost && playerNickname) {
            await channel.track({ 
              nickname: playerNickname, 
              avatar: playerAvatar || '🐱'
            });
            console.log('✅ Registrado como:', playerNickname, playerAvatar);
          }
        }
      });

    return () => {
      console.log('🔌 Desconectando del canal:', channelName);
      supabase.removeChannel(channel);
    };
  }, [gameCode, isHost, playerId, playerNickname, playerAvatar]);

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
                <span className="font-bold text-[#46178F] truncate w-full text-center text-sm">
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