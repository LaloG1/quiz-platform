'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import WaitingRoom from '@/components/game/WaitingRoom';
import QuestionScreen from '@/components/game/QuestionScreen';
import Podium from '@/components/game/Podium';
import ExportRankingPDF from '@/components/export/ExportRankingPDF';

interface RankedPlayer {
  id: string;
  nickname: string;
  avatar: string;
  points: number;
}

export default function HostGamePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [gameState, setGameState] = useState<'loading' | 'waiting' | 'question' | 'ranking'>('loading');
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [fullRanking, setFullRanking] = useState<RankedPlayer[]>([]);

  // Usamos useRef para manejar el canal de forma segura ante re-renderizados de Next.js
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // 1. Limpieza preventiva por si el HMR o Strict Mode deja un canal colgado
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // 2. Crear una instancia nueva del canal
    const channel = supabase.channel(`game:${code}`);
    channelRef.current = channel;

    // 3. Cargar datos del juego
    const loadData = async () => {
      const { data: game, error } = await supabase
        .from('games')
        .select('*, quizzes(title, questions(*, answers(*)))')
        .eq('code', code)
        .single();

      if (error || !game) {
        alert('Juego no encontrado o código inválido');
        router.push('/dashboard');
        return;
      }

      const quizData = game.quizzes as any;

      if (quizData?.questions) {
        quizData.questions = [...quizData.questions].sort(
          (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
        );
      }

      setQuiz(quizData);
      setGameState('waiting');
    };
    
    loadData();

    // 4. Suscribirse al canal
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Host suscrito al canal del juego:', code);
      }
    });

    // 5. Cleanup al desmontar
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [code, router]);

  // Función para enviar actualizaciones a los jugadores
  const broadcastState = (payload: any) => {
    if (channelRef.current) {
      channelRef.current.send({ 
        type: 'broadcast', 
        event: 'game_update', 
        payload 
      });
    }
  };

  const handleStartGame = () => {
    if (!quiz || !quiz.questions) return;
    setGameState('question');
    const firstQ = quiz.questions[currentQIndex];
    setCurrentQuestion(firstQ);
    broadcastState({ state: 'question', questionId: firstQ.id });
  };

  const handleNext = async () => {
    if (!quiz || !quiz.questions) return;

    if (currentQIndex < quiz.questions.length - 1) {
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      setCurrentQuestion(quiz.questions[nextIdx]);
      broadcastState({ state: 'question', questionId: quiz.questions[nextIdx].id });
    } else {
      // ¡ÚLTIMA PREGUNTA! Calcular y mostrar ranking
      setGameState('ranking');
      broadcastState({ state: 'ranking' });
      
      const { data: game } = await supabase.from('games').select('id').eq('code', code).single();
      if (game) {
        await supabase.from('games').update({ status: 'finished' }).eq('id', game.id);

        const { data: rankingData, error } = await supabase
          .from('game_players')
          .select('id, nickname, avatar, total_score')
          .eq('game_id', game.id)
          .order('total_score', { ascending: false })
          .limit(10);

        if (!error && rankingData) {
          const mappedRanking: RankedPlayer[] = rankingData.map(p => ({
            id: p.id,
            nickname: p.nickname,
            avatar: p.avatar,
            points: p.total_score || 0
          }));
          setFullRanking(mappedRanking);
        }
      }
    }
  };

  if (gameState === 'loading') {
    return (
      <div className="min-h-screen bg-[#46178F] flex items-center justify-center text-white font-black text-2xl animate-pulse">
        Cargando partida...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#46178F] flex flex-col items-center py-8">
      <header className="text-white font-black text-2xl mb-8 drop-shadow-md">
        {quiz?.title} <span className="text-[#D89E00]">({code})</span>
      </header>
      
      {gameState === 'waiting' && (
        <WaitingRoom gameCode={code} isHost={true} onStartGame={handleStartGame} />
      )}

      {gameState === 'question' && currentQuestion && (
        <div className="w-full max-w-5xl px-4">
          <QuestionScreen question={currentQuestion} isHost={true} />
          <div className="flex justify-center mt-8">
            <button
              onClick={handleNext}
              className="px-8 py-4 bg-[#D89E00] hover:bg-[#b38300] text-white font-black text-xl rounded-xl shadow-lg border-b-4 border-[#8c6700] transition transform hover:scale-105 active:scale-95"
            >
              {currentQIndex < (quiz?.questions?.length || 0) - 1 ? 'Mostrar Siguiente Pregunta' : '🏆 Ver Resultados Finales'}
            </button>
          </div>
        </div>
      )}

      {gameState === 'ranking' && (
        <div className="flex flex-col items-center w-full px-4">
          <Podium topPlayers={fullRanking.slice(0, 3)} />
          
          <div className="mt-8 flex flex-col items-center gap-4">
            {fullRanking.length > 0 && (
              <ExportRankingPDF 
                gameCode={code} 
                quizTitle={quiz?.title || 'Quiz'} 
                players={fullRanking} 
              />
            )}
            
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-xl shadow-lg transition"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}