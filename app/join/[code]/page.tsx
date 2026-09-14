'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import WaitingRoom from '@/components/game/WaitingRoom';
import QuestionScreen from '@/components/game/QuestionScreen';
import Podium from '@/components/game/Podium';
import { calculatePoints } from '@/lib/score';

const AVATARS = [
  '🐱',
  '🐶',
  '🦊',
  '🐸',
  '🐼',
  '🐨',
  '🦁',
  '🐯',
  '🐵',
  '🐰',
  '🐷',
  '🐔',
  '🦉',
  '🐙',
  '🦄',
];

type Answer = {
  id: string;
  answer_text: string;
  is_correct: boolean;
  order: number;
};

type Question = {
  id: string;
  question_text: string;
  time_limit: number;
  is_double_points: boolean;
  order: number;
  answers: Answer[];
};

export default function JoinGamePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [step, setStep] = useState<
    'join-form' | 'waiting' | 'question' | 'ranking'
  >('join-form');

  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  const [currentQuestion, setCurrentQuestion] =
    useState<Question | null>(null);

  useEffect(() => {
    if (step !== 'waiting') {
      return;
    }

    const roomChannel = supabase.channel(`room:${code}`, {
      config: {
        presence: {
          key: playerId ?? 'player',
        },
      },
    });

    const broadcastChannel = supabase.channel(`game:${code}`);

    roomChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await roomChannel.track({
          playerId,
          nickname,
          avatar: selectedAvatar,
        });
      }
    });

    broadcastChannel
      .on(
        'broadcast',
        { event: 'game_update' },
        async ({ payload }) => {
          const { state, questionId } = payload;

          if (state === 'question' && questionId) {
            const { data: question, error } = await supabase
              .from('questions')
              .select(`
                id,
                question_text,
                time_limit,
                is_double_points,
                "order",
                answers (
                  id,
                  answer_text,
                  is_correct,
                  "order"
                )
              `)
              .eq('id', questionId)
              .single();

            if (error || !question) {
              console.error(
                'Error cargando pregunta:',
                error
              );
              return;
            }

            setCurrentQuestion(question as unknown as Question);
            setStep('question');
          }

          if (state === 'ranking') {
            setStep('ranking');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [step, code, nickname, selectedAvatar, playerId]);

  const handleJoin = async () => {
    if (!nickname.trim()) {
      return;
    }

    // Buscar el juego
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('code', code)
      .single();

    if (gameError || !game) {
      console.error('Error buscando juego:', gameError);
      alert('Juego no encontrado');
      return;
    }

    // Guardar el ID del juego
    setGameId(game.id);

    // Crear jugador
    const { data: player, error: playerError } = await supabase
      .from('game_players')
      .insert({
        game_id: game.id,
        nickname: nickname.trim(),
        avatar: selectedAvatar,
        total_score: 0,
      })
      .select('id')
      .single();

    if (playerError || !player) {
      console.error('Error creando jugador:', playerError);
      alert('No se pudo unir al juego');
      return;
    }

    setPlayerId(player.id);
    setStep('waiting');
  };

    const handlePlayerAnswer = async (answerId: string, timeMs: number) => {
    if (!playerId || !currentQuestion) return;

    // 1. Calcular puntos (usando la función que ya creamos)
    const isCorrect = currentQuestion.answers.find((a: any) => a.id === answerId)?.is_correct;
    const pointsEarned = isCorrect 
      ? calculatePoints(currentQuestion.time_limit, timeMs, currentQuestion.is_double_points) 
      : 0;

    // 2. Guardar el detalle de la respuesta
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('code', code)
      .single();

    if (gameError || !game) {
      console.error('Error obteniendo el juego:', gameError);
      alert('No se pudo encontrar el juego');
      return;
    }

    await supabase.from('game_answers').insert({
      game_id: game.id,
      player_id: playerId,
      question_id: currentQuestion.id,
      answer_id: answerId,
      time_ms: timeMs,
      points_earned: pointsEarned
    });

    // 3. ACTUALIZAR EL PUNTAJE TOTAL (Sumar, no sobrescribir)
    const { data: currentPlayer } = await supabase
      .from('game_players')
      .select('total_score')
      .eq('id', playerId)
      .single();

    const newTotalScore = (currentPlayer?.total_score || 0) + pointsEarned;

    await supabase
      .from('game_players')
      .update({ total_score: newTotalScore })
      .eq('id', playerId);
      
    console.log(`✅ Respuesta guardada. Puntos ganados: ${pointsEarned}. Total: ${newTotalScore}`);
  };

  // Formulario para unirse
  if (step === 'join-form') {
    return (
      <div className="min-h-screen bg-[#46178F] flex flex-col items-center justify-center p-4 text-white">

        <h1 className="text-4xl font-black mb-8">
          Unirse al juego
        </h1>

        <div className="bg-white text-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">

          <input
            type="text"
            placeholder="Tu apodo"
            maxLength={15}
            className="w-full p-4 text-xl font-black text-center border-4 border-[#46178F] rounded-xl mb-6 outline-none focus:ring-4 ring-[#46178F]/30"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />

          <p className="font-bold text-center mb-4 text-[#46178F]">
            Elige tu avatar:
          </p>

          <div className="grid grid-cols-5 gap-2 mb-6">
            {AVATARS.map((avatar) => (
              <button
                key={avatar}
                type="button"
                onClick={() => setSelectedAvatar(avatar)}
                className={`text-3xl p-2 rounded-xl transition ${
                  selectedAvatar === avatar
                    ? 'bg-[#46178F] scale-110'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {avatar}
              </button>
            ))}
          </div>

          <button
            onClick={handleJoin}
            disabled={!nickname.trim()}
            className="w-full py-4 bg-[#26890C] hover:bg-[#1e6b0a] disabled:bg-gray-300 text-white font-black text-xl rounded-xl shadow-lg border-b-4 border-[#145206] transition transform active:scale-95"
          >
            ¡ENTRAR!
          </button>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#46178F] flex flex-col items-center justify-center p-4">

      {step === 'waiting' && (
        <WaitingRoom
          gameCode={code}
          isHost={false}
          onStartGame={() => {}}
        />
      )}

      {step === 'question' && currentQuestion && (
        <QuestionScreen
          question={currentQuestion}
          isHost={false}
          onPlayerAnswer={handlePlayerAnswer}
        />
      )}

      {step === 'ranking' && (
        <Podium topPlayers={[]} />
      )}

    </div>
  );
}