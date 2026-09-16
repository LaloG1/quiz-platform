'use client';

import React, { useState, useEffect } from 'react';

interface Answer {
  id: string;
  text: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  question: string;
  answers: Answer[];
  time_limit: number;
  is_double_points?: boolean;
}

interface QuestionScreenProps {
  question: Question;
  isHost: boolean;
  onPlayerAnswer?: (answerId: string, timeMs: number) => void;
}

const COLORS = [
  { bg: 'bg-[#E21B3C]', border: 'border-[#b31530]', hover: 'hover:bg-[#c01530]', shape: '▲' },
  { bg: 'bg-[#1368CE]', border: 'border-[#0f52a3]', hover: 'hover:bg-[#0f52a3]', shape: '◆' },
  { bg: 'bg-[#D89E00]', border: 'border-[#b38300]', hover: 'hover:bg-[#b38300]', shape: '●' },
  { bg: 'bg-[#26890C]', border: 'border-[#1e6b0a]', hover: 'hover:bg-[#1e6b0a]', shape: '■' },
];

export default function QuestionScreen({ question, isHost, onPlayerAnswer }: QuestionScreenProps) {
  const [timeLeft, setTimeLeft] = useState(question.time_limit);
  const [answered, setAnswered] = useState(false);

  // Log para debuggear
  useEffect(() => {
    console.log('📝 QuestionScreen recibió:', question);
  }, [question]);

  // Temporizador corregido
  useEffect(() => {
    if (isHost) return; // El host no muestra timer

    // Resetear estado al montar/nueva pregunta
    setTimeLeft(question.time_limit);
    setAnswered(false);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [question.id, question.time_limit, isHost]); // Solo depende del ID de la pregunta

  const handleAnswer = (index: number, answerId: string) => {
    if (answered || isHost) return;
    setAnswered(true);
    const timeMs = (question.time_limit - timeLeft) * 1000;
    if (onPlayerAnswer) onPlayerAnswer(answerId, timeMs);
  };

  // Validación de datos
  if (!question || !question.answers || question.answers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white font-bold text-xl">
        Cargando pregunta...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto p-4 h-full">
      {/* Barra de tiempo y pregunta */}
      <div className="w-full bg-white rounded-2xl p-6 mb-6 shadow-xl text-center relative overflow-hidden">
        {!isHost && (
          <div
            className="absolute top-0 left-0 h-2 bg-[#46178F] transition-all duration-1000"
            style={{ width: `${(timeLeft / question.time_limit) * 100}%` }}
          />
        )}
        <h2 className="text-2xl md:text-4xl font-black text-[#46178F] mt-2">
          {question.question || 'Pregunta no disponible'}
        </h2>
        {!isHost && (
          <p className="text-xl font-bold text-gray-500 mt-2">
            {timeLeft}s
          </p>
        )}
        {question.is_double_points && (
          <div className="absolute top-2 right-2 bg-[#D89E00] text-white px-3 py-1 rounded-full font-black text-sm">
            x2
          </div>
        )}
      </div>

      {/* Grid de respuestas (2x2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full flex-1">
        {question.answers.map((ans, idx) => (
          <button
            key={ans.id}
            onClick={() => handleAnswer(idx, ans.id)}
            disabled={answered || isHost}
            className={`${COLORS[idx].bg} ${COLORS[idx].border} ${COLORS[idx].hover} 
              border-b-8 active:border-b-0 active:translate-y-2 transition-all 
              rounded-xl p-6 flex items-center gap-4 text-white font-black text-xl md:text-2xl shadow-lg
              ${answered ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="text-3xl opacity-80">{COLORS[idx].shape}</span>
            <span className="truncate">{ans.text || 'Respuesta vacía'}</span>
          </button>
        ))}
      </div>

      {isHost && (
        <p className="mt-6 text-white font-bold text-xl animate-pulse">
          Esperando respuestas de los jugadores...
        </p>
      )}
    </div>
  );
}