'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import WaitingRoom from '@/components/game/WaitingRoom';
import QuestionScreen from '@/components/game/QuestionScreen';
import Podium from '@/components/game/Podium';
import { calculatePoints } from '@/lib/score';

const AVATARS = ['🐱', '🐶', '🦊', '🐸', '🐼', '🐨', '🦁', '🐯', '🐵', '🐰', '🐷', '🐔', '🦉', '🐙', '🦄'];

export default function JoinGamePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [step, setStep] = useState<'join-form' | 'waiting' | 'question' | 'ranking'>('join-form');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);

  // Listener de broadcast del host
  useEffect(() => {
    if (step === 'join-form') return;

    const broadcastChannel = supabase.channel(`game:${code}`);

    broadcastChannel
      .on('broadcast', { event: 'game_update' }, async (payload) => {
        const { state, questionId } = payload.payload;

        if (state === 'question' && questionId) {
          setStep('question');
          // Mock temporal - en prod hacer fetch real
          setCurrentQuestion({
            id: questionId,
            question_text: '¿Cuál es la capital de México?',
            time_limit: 15,
            is_double_points: false,
            answers: [
              { id: 'a1', answer_text: 'Guadalajara', is_correct: false, order: 1 },
              { id: 'a2', answer_text: 'Monterrey', is_correct: false, order: 2 },
              { id: 'a3', answer_text: 'Ciudad de México', is_correct: true, order: 3 },
              { id: 'a4', answer_text: 'Puebla', is_correct: false, order: 4 },
            ]
          });
        } else if (state === 'ranking') {
          setStep('ranking');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
    };
  }, [step, code]);

  const handleJoin = async () => {
    if (!nickname.trim()) return;
    
    // 1. Buscar el juego por código
    const { data: game } = await supabase
      .from('games')
      .select('id')
      .eq('code', code)
      .single();
      
    if (!game) { 
      alert('Juego no encontrado. Verifica el código.'); 
      return; 
    }

    setGameId(game.id);

    // 2. Registrar al jugador en la BD
    const { data: player, error } = await supabase
      .from('game_players')
      .insert({
        game_id: game.id,
        nickname: nickname.trim(),
        avatar: selectedAvatar,
        total_score: 0
      })
      .select()
      .single();

    if (error) { 
      console.error(error); 
      alert('Error al unirse: ' + error.message);
      return; 
    }
    
    // 3. Guardar el ID del jugador y pasar a la sala de espera
    setPlayerId(player.id);
    setStep('waiting');
  };

  const handlePlayerAnswer = async (answerId: string, timeMs: number) => {
    if (!playerId || !currentQuestion || !gameId) return;

    const isCorrect = currentQuestion.answers.find((a: any) => a.id === answerId)?.is_correct;
    const pointsEarned = isCorrect 
      ? calculatePoints(currentQuestion.time_limit, timeMs, currentQuestion.is_double_points) 
      : 0;

    await supabase.from('game_answers').insert({
      game_id: gameId,
      player_id: playerId,
      question_id: currentQuestion.id,
      answer_id: answerId,
      time_ms: timeMs,
      points_earned: pointsEarned
    });

    // Sumar puntos al total
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
  };

  // PANTALLA 1: Formulario de unión
  if (step === 'join-form') {
    return (
      <div className="min-h-screen bg-[#46178F] flex flex-col items-center justify-center p-4 text-white">
        <h1 className="text-4xl font-black mb-2">Unirse al juego</h1>
        <p className="text-white/70 font-bold mb-8">Código: {code}</p>
        
        <div className="bg-white text-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <input
            type="text"
            placeholder="Tu apodo"
            maxLength={15}
            className="w-full p-4 text-xl font-black text-center border-4 border-[#46178F] rounded-xl mb-6 outline-none focus:ring-4 ring-[#46178F]/30"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          
          <p className="font-bold text-center mb-4 text-[#46178F]">Elige tu avatar:</p>
          <div className="grid grid-cols-5 gap-2 mb-6">
            {AVATARS.map((av) => (
              <button
                key={av}
                onClick={() => setSelectedAvatar(av)}
                className={`text-3xl p-2 rounded-xl transition ${
                  selectedAvatar === av 
                    ? 'bg-[#46178F] scale-110 shadow-lg' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {av}
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

  // PANTALLAS DEL JUEGO
  return (
    <div className="min-h-screen bg-[#46178F] flex flex-col items-center justify-center p-4">
      {step === 'waiting' && (
        <WaitingRoom 
          gameCode={code} 
          isHost={false} 
          onStartGame={() => {}}
          playerNickname={nickname}
          playerAvatar={selectedAvatar}
          playerId={playerId || undefined}
        />
      )}
      
      {step === 'question' && currentQuestion && (
        <QuestionScreen 
          question={currentQuestion} 
          isHost={false} 
          onPlayerAnswer={handlePlayerAnswer} 
        />
      )}
      
      {step === 'ranking' && <Podium topPlayers={[]} />}
    </div>
  );
}