'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import WaitingRoom from '@/components/game/WaitingRoom';
import QuestionScreen from '@/components/game/QuestionScreen';
import Podium from '@/components/game/Podium';
import RankingTable from '@/components/game/RankingTable';
import ExportRankingPDF from '@/components/export/ExportRankingPDF';
import { formatQuestion } from '@/lib/format';

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

  const [gameState, setGameState] = useState<'loading' | 'waiting' | 'question' | 'reveal' | 'ranking'>('loading');
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [fullRanking, setFullRanking] = useState<RankedPlayer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [revealTimer, setRevealTimer] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameIdRef = useRef<string | null>(null);
  
  // 🎯 CLAVE: Usar refs para acceder siempre al valor más reciente
  const currentQuestionRef = useRef<any>(null);
  const currentQIndexRef = useRef<number>(0);
  const quizRef = useRef<any>(null);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    currentQIndexRef.current = currentQIndex;
  }, [currentQIndex]);

  useEffect(() => {
    quizRef.current = quiz;
  }, [quiz]);

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`game:${code}`);
    channelRef.current = channel;

    const loadData = async () => {
      // 🎯 CORRECCIÓN: Quitamos el .order() del string de Supabase para evitar el error de TypeScript
      const { data: game, error } = await supabase
        .from('games')
        .select(`
          *,
          quizzes (
            title,
            questions (
              id,
              question_text,
              time_limit,
              is_double_points,
              order,
              answers (
                id,
                answer_text,
                is_correct,
                order
              )
            )
          )
        `)
        .eq('code', code)
        .single();

      if (error || !game) {
        alert('Juego no encontrado o código inválido');
        router.push('/dashboard');
        return;
      }

      // 🎯 CORRECCIÓN: Ordenamos las preguntas y respuestas en JavaScript
      if (game.quizzes && game.quizzes.questions) {
        game.quizzes.questions.sort((a: any, b: any) => a.order - b.order);
        game.quizzes.questions.forEach((q: any) => {
          if (q.answers) {
            q.answers.sort((a: any, b: any) => a.order - b.order);
          }
        });
      }

      gameIdRef.current = game.id;
      setQuiz(game.quizzes);
      quizRef.current = game.quizzes;
      setGameState('waiting');
    };
    
    loadData();
    channel.subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    };
  }, [code, router]);

  const broadcast = (payload: any) => {
    if (channelRef.current) {
      channelRef.current.send({ 
        type: 'broadcast', 
        event: 'game_update', 
        payload 
      });
    }
  };

  const fetchCurrentRanking = async (): Promise<RankedPlayer[]> => {
    if (!gameIdRef.current) return [];
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { data: rankingData, error } = await supabase
        .from('game_players')
        .select('id, nickname, avatar, total_score')
        .eq('game_id', gameIdRef.current)
        .order('total_score', { ascending: false });

      if (error) {
        console.error(`❌ [Host] Intento ${attempt} falló:`, error);
        continue;
      }

      if (!rankingData || rankingData.length === 0) {
        console.warn(`⚠️ [Host] Intento ${attempt}: Ranking vacío, esperando...`);
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        continue;
      }

      console.log(`✅ [Host] Intento ${attempt} exitoso. Jugadores:`, rankingData.length);
      
      return rankingData.map(p => ({
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        points: p.total_score || 0
      }));
    }

    console.error('❌ [Host] Todos los intentos fallaron');
    return [];
  };

  const startQuestionTimer = (seconds: number) => {
    console.log('⏱️ [Host] Iniciando timer con', seconds, 'segundos');
    
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(seconds);
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        console.log('⏱️ [Host] Timer tick:', prev - 1);
        
        if (prev <= 1) {
          console.log('⏱️ [Host] Timer llegó a 0, llamando handleTimeUp');
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRevealTimer = () => {
    if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    setRevealTimer(4);
    
    revealTimerRef.current = setInterval(() => {
      setRevealTimer((prev) => {
        if (prev <= 1) {
          if (revealTimerRef.current) clearInterval(revealTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = async () => {
    console.log('🔥 [Host] handleTimeUp ejecutado');
    console.log('⏳ [Host] Esperando 2 segundos...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ [Host] Delay completado, llamando handleRevealAnswer');
    await handleRevealAnswer();
  };

  const handleRevealAnswer = async () => {
    console.log('🎬 [Host] handleRevealAnswer ejecutado');
    
    const question = currentQuestionRef.current;
    console.log('🎬 [Host] currentQuestionRef.current:', question);
    
    if (!question) {
      console.error('❌ [Host] currentQuestion es null/undefined');
      return;
    }
    
    if (timerRef.current) {
      console.log('🎬 [Host] Limpiando timer');
      clearInterval(timerRef.current);
    }
    
    console.log('📊 [Host] Obteniendo ranking...');
    const updatedRanking = await fetchCurrentRanking();
    console.log('📊 [Host] Ranking obtenido:', updatedRanking);
    
    setFullRanking(updatedRanking);
    
    console.log('🎬 [Host] Cambiando gameState a reveal');
    setGameState('reveal');
    
    const correctAnswer = question.answers.find((a: any) => a.is_correct);
    console.log('✅ [Host] Respuesta correcta:', correctAnswer);
    
    const payload = { 
      state: 'reveal', 
      correctAnswerId: correctAnswer?.id,
      ranking: updatedRanking
    };
    
    console.log('📡 [Host] Enviando broadcast:', payload);
    broadcast(payload);
    console.log('✅ [Host] Broadcast enviado');
    
    console.log('⏱️ [Host] Iniciando revealTimer');
    startRevealTimer();
  };

  const handleStartGame = () => {
    const quizData = quizRef.current;
    if (!quizData || !quizData.questions) return;
    
    setGameState('question');
    const firstQ = quizData.questions[0];
    setCurrentQuestion(firstQ);
    currentQuestionRef.current = firstQ;
    setCurrentQIndex(0);
    currentQIndexRef.current = 0;
    
    const formatted = formatQuestion(firstQ);
    broadcast({ state: 'question', question: formatted });
    startQuestionTimer(firstQ.time_limit);
  };

  const handleNext = async () => {
    const quizData = quizRef.current;
    const qIndex = currentQIndexRef.current;
    
    if (!quizData || !quizData.questions) return;

    if (qIndex < quizData.questions.length - 1) {
      const nextIdx = qIndex + 1;
      const nextQ = quizData.questions[nextIdx];
      
      setCurrentQIndex(nextIdx);
      currentQIndexRef.current = nextIdx;
      setCurrentQuestion(nextQ);
      currentQuestionRef.current = nextQ;
      
      setGameState('question');
      const formatted = formatQuestion(nextQ);
      broadcast({ state: 'question', question: formatted });
      startQuestionTimer(nextQ.time_limit);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
      setGameState('ranking');
      
      if (gameIdRef.current) {
        await supabase.from('games').update({ status: 'finished' }).eq('id', gameIdRef.current);

        const finalRanking = await fetchCurrentRanking();
        setFullRanking(finalRanking);

        broadcast({ state: 'ranking', ranking: finalRanking });
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
      <header className="text-white font-black text-2xl mb-4 drop-shadow-md">
        {quiz?.title} <span className="text-[#D89E00]">({code})</span>
      </header>
      
      {(gameState === 'question' || gameState === 'reveal') && (
        <div className="mb-4 bg-white rounded-full px-6 py-2 shadow-lg flex items-center gap-3">
          {gameState === 'question' ? (
            <span className="font-black text-2xl text-[#46178F]">⏱️ {timeLeft}s</span>
          ) : (
            <>
              <span className="font-black text-2xl text-[#26890C]">✨ Respuesta revelada</span>
              {revealTimer > 0 && (
                <span className="text-sm font-bold text-gray-500">({revealTimer}s)</span>
              )}
            </>
          )}
        </div>
      )}

      {gameState === 'waiting' && (
        <WaitingRoom gameCode={code} isHost={true} onStartGame={handleStartGame} />
      )}

      {(gameState === 'question' || gameState === 'reveal') && currentQuestion && (
        <div className="w-full max-w-5xl px-4">
          <QuestionScreen 
            key={currentQuestion.id}
            question={formatQuestion(currentQuestion)} 
            isHost={true}
            revealCorrect={gameState === 'reveal'}
          />
          
          <div className="flex justify-center mt-8">
            <button
              onClick={handleNext}
              disabled={revealTimer > 0}
              className="px-8 py-4 bg-[#D89E00] hover:bg-[#b38300] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-black text-xl rounded-xl shadow-lg border-b-4 border-[#8c6700] transition transform hover:scale-105 active:scale-95"
            >
              {currentQIndex < (quiz?.questions?.length || 0) - 1 
                ? 'Siguiente Pregunta →' 
                : '🏆 Ver Resultados Finales'}
            </button>
          </div>
        </div>
      )}

      {gameState === 'ranking' && (
        <div className="flex flex-col items-center w-full px-4">
          <Podium topPlayers={fullRanking.slice(0, 3)} />
          <RankingTable players={fullRanking} />
          
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