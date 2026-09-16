'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import WaitingRoom from '@/components/game/WaitingRoom';
import QuestionScreen from '@/components/game/QuestionScreen';
import Podium from '@/components/game/Podium';
import RankingTable from '@/components/game/RankingTable';
import PointsReveal from '@/components/game/PointsReveal';
import { calculatePoints } from '@/lib/score';

const AVATARS = ['🐱', '🐶', '🦊', '🐸', '🐼', '🐨', '🦁', '🐯', '🐵', '🐰', '🐷', '🐔', '🦉', '🐙', '🦄'];

interface RankedPlayer {
  id: string;
  nickname: string;
  avatar: string;
  points: number;
}

export default function JoinGamePage() {
  const params = useParams();
  const code = params.code as string;

  const [step, setStep] = useState<'join-form' | 'waiting' | 'question' | 'reveal' | 'ranking'>('join-form');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [fullRanking, setFullRanking] = useState<RankedPlayer[]>([]);

  const [currentQNumber, setCurrentQNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // 🎯 CLAVE: Guardamos los puntos ganados en CADA pregunta localmente
  const [lastPointsEarned, setLastPointsEarned] = useState(0);
  const [currentTotalScore, setCurrentTotalScore] = useState(0);
  const [currentRankPosition, setCurrentRankPosition] = useState(1);
  const [wasCorrect, setWasCorrect] = useState(false);

  // Listener de broadcast del host
  useEffect(() => {
    if (step === 'join-form') return;

    const broadcastChannel = supabase.channel(`game:${code}`);

    broadcastChannel
      .on('broadcast', { event: 'game_update' }, (payload) => {
        const { state, question, correctAnswerId, ranking, currentQNumber: qNum, totalQuestions: tQ } = payload.payload;

        if (state === 'question' && question) {
          setStep('question');
          setCurrentQuestion(question);
          setSelectedAnswerId(null);
          setLastPointsEarned(0);
          setWasCorrect(false);
          if (qNum) setCurrentQNumber(qNum);
          if (tQ) setTotalQuestions(tQ);
        } else if (state === 'reveal') {
          if (ranking && ranking.length > 0) {
            setFullRanking(ranking);
            const myIndex = ranking.findIndex((p: RankedPlayer) => p.id === playerId);

            if (myIndex !== -1) {
              setCurrentRankPosition(myIndex + 1);
              setCurrentTotalScore(ranking[myIndex].points);
            } else {
              const myPosition = ranking.filter((p: RankedPlayer) => p.points > currentTotalScore).length + 1;
              setCurrentRankPosition(myPosition);
            }
          } else {
            setFullRanking([{
              id: playerId || '',
              nickname: nickname,
              avatar: selectedAvatar,
              points: currentTotalScore
            }]);
            setCurrentRankPosition(1);
          }

          setCurrentQuestion((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              answers: prev.answers.map((a: any) => ({
                ...a,
                is_correct: a.id === correctAnswerId
              }))
            };
          });

          setStep('reveal');
        } else if (state === 'ranking') {
          setStep('ranking');
          if (ranking) setFullRanking(ranking);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
    };
  }, [step, code, playerId]);
  const handleJoin = async () => {
    if (!nickname.trim()) return;

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

    setPlayerId(player.id);
    setStep('waiting');
  };

  // 🎯 CLAVE: Guardar puntos localmente al responder (precisión absoluta)
  const handlePlayerAnswer = async (answerId: string, timeMs: number) => {
    if (!playerId || !currentQuestion || !gameId) return;

    setSelectedAnswerId(answerId);

    const selectedAnswer = currentQuestion.answers.find((a: any) => a.id === answerId);
    const isCorrect = selectedAnswer?.is_correct || false;

    // Calcular puntos exactos basados en el tiempo real de respuesta
    const pointsEarned = isCorrect
      ? calculatePoints(currentQuestion.time_limit, timeMs, currentQuestion.is_double_points)
      : 0;

    // 🎯 GUARDAR LOCALMENTE (precisión absoluta)
    setLastPointsEarned(pointsEarned);
    setWasCorrect(isCorrect);

    // Guardar en la base de datos
    await supabase.from('game_answers').insert({
      game_id: gameId,
      player_id: playerId,
      question_id: currentQuestion.id,
      answer_id: answerId,
      time_ms: timeMs,
      points_earned: pointsEarned
    });

    // Actualizar total acumulado
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

    setCurrentTotalScore(newTotalScore);

    console.log(`✅ Respuesta guardada: ${isCorrect ? 'Correcta' : 'Incorrecta'} | +${pointsEarned} pts | Total: ${newTotalScore}`);
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
                className={`text-3xl p-2 rounded-xl transition ${selectedAvatar === av
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

  // PANTALLA 2: Sala de espera
  if (step === 'waiting') {
    return (
      <div className="min-h-screen bg-[#46178F] flex flex-col items-center justify-center p-4">
        <WaitingRoom
          gameCode={code}
          isHost={false}
          onStartGame={() => { }}
          playerNickname={nickname}
          playerAvatar={selectedAvatar}
          playerId={playerId || undefined}
        />
      </div>
    );
  }

  // PANTALLA 3: Pregunta activa (solo QuestionScreen)
  if (step === 'question' && currentQuestion) {
    return (
      <div className="min-h-screen bg-[#46178F] flex flex-col items-center justify-center p-4">
        <QuestionScreen
          key={currentQuestion.id}
          question={currentQuestion}
          isHost={false}
          selectedAnswerId={selectedAnswerId}
          revealCorrect={false}
          onPlayerAnswer={handlePlayerAnswer}
          currentQNumber={currentQNumber}
          totalQuestions={totalQuestions}
        />
      </div>
    );
  }

  // 🎯 PANTALLA 4: Revelación (Muestra la pregunta con la respuesta correcta Y los puntos)
  if (step === 'reveal' && currentQuestion) {
    return (
      <div className="min-h-screen bg-[#46178F] flex flex-col items-center p-4 overflow-y-auto">

        {/* 1. Primero mostramos la pregunta con la respuesta correcta iluminada */}
        <div className="w-full max-w-5xl mb-6">
          <QuestionScreen
            key={`reveal-${currentQuestion.id}`}
            question={currentQuestion}
            isHost={false}
            selectedAnswerId={selectedAnswerId}
            revealCorrect={true}
            currentQNumber={currentQNumber}
            totalQuestions={totalQuestions}
          />
        </div>

        {/* 2. Debajo, mostramos la animación de puntos y ranking */}
        <PointsReveal
          avatar={selectedAvatar}
          pointsEarned={lastPointsEarned}
          totalScore={currentTotalScore}
          rankPosition={currentRankPosition}
          totalPlayers={fullRanking.length || 1}
          wasCorrect={wasCorrect}
        />

      </div>
    );
  }

  // PANTALLA 5: Ranking final
  if (step === 'ranking') {
    return (
      <div className="min-h-screen bg-[#46178F] flex flex-col items-center justify-center p-4">
        <div className="w-full flex flex-col items-center">
          <Podium topPlayers={fullRanking.slice(0, 3)} />
          <RankingTable players={fullRanking} />
        </div>
      </div>
    );
  }

  return null;
}