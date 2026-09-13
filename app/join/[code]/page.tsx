'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import WaitingRoom from '@/components/game/WaitingRoom';
import QuestionScreen from '@/components/game/QuestionScreen';
import Podium from '@/components/game/Podium';

// Mock (en prod, haz fetch de la pregunta actual basada en el questionIndex que envía el host)
const MOCK_QUIZ = {
  questions: [
    {
      id: 'q1',
      question: '¿Cuál es la capital de México?',
      time_limit: 15,
      answers: [
        { id: 'a1', text: 'Guadalajara', is_correct: false },
        { id: 'a2', text: 'Monterrey', is_correct: false },
        { id: 'a3', text: 'Ciudad de México', is_correct: true },
        { id: 'a4', text: 'Puebla', is_correct: false },
      ],
    },
  ],
};

export default function JoinGamePage() {
  const params = useParams();
  const code = params.code as string;

  const [gameState, setGameState] = useState<
    'waiting' | 'question' | 'ranking'
  >('waiting');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    const channel = supabase.channel(`room:${code}`, {
      config: {
        presence: {
          key: 'player',
        },
      },
    });

    // 1. Unirse a la sala (Presence)
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          nickname: 'Jugador Nuevo',
          avatar: '🐶',
        });
      }
    });

    // 2. Escuchar cambios de estado del Host (Broadcast)
    const broadcastChannel = supabase.channel(`game:${code}`);

    broadcastChannel
      .on('broadcast', { event: 'game_update' }, (payload) => {
        const { state, questionIndex } = payload.payload;

        setGameState(state);

        if (questionIndex !== undefined) {
          setCurrentQuestionIndex(questionIndex);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [code]);

  const handlePlayerAnswer = async (
    answerId: string,
    timeMs: number
  ) => {
    // Guardar la respuesta en Supabase
    await supabase.from('game_answers').insert({
      game_code: code,
      answer_id: answerId,
      time_ms: timeMs,
      // player_id se obtiene de la sesión de Supabase Auth en producción
    });
  };

  return (
    <div className="min-h-screen bg-[#46178F] flex flex-col items-center justify-center p-4">
      {gameState === 'waiting' && (
        <WaitingRoom
          gameCode={code}
          isHost={false}
          onStartGame={() => {}}
        />
      )}

      {gameState === 'question' && (
        <QuestionScreen
          question={MOCK_QUIZ.questions[currentQuestionIndex]}
          isHost={false}
          onPlayerAnswer={handlePlayerAnswer}
        />
      )}

      {gameState === 'ranking' && (
        <>
          <Podium topPlayers={[]} />
          {/* En producción, pasa el ranking real obtenido de la DB */}
        </>
      )}
    </div>
  );
}