'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import WaitingRoom from '@/components/game/WaitingRoom';
import QuestionScreen from '@/components/game/QuestionScreen';
import Podium from '@/components/game/Podium';
import ExportRankingPDF from '@/components/export/ExportRankingPDF';

// Mock de datos (en producción, haz un fetch a Supabase usando el code)
const MOCK_QUIZ = {
  title: 'Historia de México',
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

export default function HostGamePage() {
  const params = useParams();
  const code = params.code as string;
  
  const [gameState, setGameState] = useState<'waiting' | 'question' | 'ranking'>('waiting');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [players, setPlayers] = useState<any[]>([]); // En prod, llena esto desde game_answers

  const channel = supabase.channel(`game:${code}`);

  useEffect(() => {
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [code]);

  // Función para emitir cambios de estado a los jugadores
  const broadcastState = (state: any) => {
    channel.send({
      type: 'broadcast',
      event: 'game_update',
      payload: state,
    });
  };

  const handleStartGame = () => {
    setGameState('question');
    broadcastState({ state: 'question', questionIndex: 0 });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < MOCK_QUIZ.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      broadcastState({ state: 'question', questionIndex: nextIdx });
    } else {
      setGameState('ranking');
      broadcastState({ state: 'ranking' });
    }
  };

  return (
    <div className="min-h-screen bg-[#46178F] flex flex-col items-center py-8">
      <header className="text-white font-black text-2xl mb-8">Modo Creador: {code}</header>
      
      {gameState === 'waiting' && (
        <WaitingRoom gameCode={code} isHost={true} onStartGame={handleStartGame} />
      )}

      {gameState === 'question' && (
        <div className="w-full max-w-5xl px-4">
          <QuestionScreen 
            question={MOCK_QUIZ.questions[currentQuestionIndex]} 
            isHost={true} 
          />
          <div className="flex justify-center mt-8">
            <button
              onClick={handleNextQuestion}
              className="px-8 py-4 bg-[#D89E00] hover:bg-[#b38300] text-white font-black text-xl rounded-xl shadow-lg border-b-4 border-[#8c6700] transition transform hover:scale-105"
            >
              {currentQuestionIndex < MOCK_QUIZ.questions.length - 1 ? 'Siguiente Pregunta' : 'Ver Resultados'}
            </button>
          </div>
        </div>
      )}

      {gameState === 'ranking' && (
        <div className="flex flex-col items-center w-full">
          <Podium topPlayers={players.slice(0, 3)} />
          <div className="mt-8">
            <ExportRankingPDF gameCode={code} quizTitle={MOCK_QUIZ.title} players={players} />
          </div>
        </div>
      )}
    </div>
  );
}