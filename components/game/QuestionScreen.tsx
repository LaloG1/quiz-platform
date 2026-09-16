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
  selectedAnswerId?: string | null;
  revealCorrect?: boolean;
  onPlayerAnswer?: (answerId: string, timeMs: number) => void;
  currentQNumber?: number; // 🎯 Nuevo
  totalQuestions?: number; // 🎯 Nuevo
}

const COLORS = [
  { bg: 'bg-[#E21B3C]', border: 'border-[#b31530]', shape: '▲' },
  { bg: 'bg-[#1368CE]', border: 'border-[#0f52a3]', shape: '◆' },
  { bg: 'bg-[#D89E00]', border: 'border-[#b38300]', shape: '●' },
  { bg: 'bg-[#26890C]', border: 'border-[#1e6b0a]', shape: '■' },
];

export default function QuestionScreen({ 
  question, 
  isHost, 
  selectedAnswerId = null,
  revealCorrect = false,
  onPlayerAnswer,
  currentQNumber,
  totalQuestions
}: QuestionScreenProps) {
  const [timeLeft, setTimeLeft] = useState(question.time_limit);
  const [localAnswered, setLocalAnswered] = useState(false);

  useEffect(() => {
    if (isHost) return;
    
    setTimeLeft(question.time_limit);
    setLocalAnswered(false);
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [question.id, question.time_limit, isHost]);

  const handleAnswer = (answerId: string) => {
    if (localAnswered || isHost || revealCorrect) return;
    setLocalAnswered(true);
    const timeMs = (question.time_limit - timeLeft) * 1000;
    if (onPlayerAnswer) onPlayerAnswer(answerId, timeMs);
  };

  if (!question || !question.answers || question.answers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white font-bold text-xl">
        Cargando pregunta...
      </div>
    );
  }

  const getAnswerStyle = (ans: Answer, idx: number) => {
    const color = COLORS[idx];
    const isSelected = ans.id === selectedAnswerId;
    const isCorrect = ans.is_correct;
    
    let opacity = 'opacity-100';
    let scale = '';
    let ring = '';
    let extra = '';

    if (selectedAnswerId && !revealCorrect) {
      if (isSelected) {
        scale = 'scale-105';
        ring = 'ring-4 ring-white';
      } else {
        opacity = 'opacity-40';
      }
    }

    if (revealCorrect) {
      if (isCorrect) {
        scale = 'scale-105';
        ring = 'ring-4 ring-white';
        extra = 'animate-pulse';
      } else {
        opacity = 'opacity-40';
      }
    }

    return `${color.bg} ${color.border} ${opacity} ${scale} ${ring} ${extra}`;
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto p-4 h-full">
      {/* Pregunta y timer */}
      <div className="w-full bg-white rounded-2xl p-6 mb-6 shadow-xl text-center relative overflow-hidden">
        
        {/* 🎯 Indicador de pregunta */}
        {currentQNumber && totalQuestions && (
          <div className="absolute top-3 left-3 bg-[#46178F] text-white px-3 py-1 rounded-full font-black text-xs md:text-sm shadow-md z-10">
            Pregunta {currentQNumber} de {totalQuestions}
          </div>
        )}

        {!isHost && (
          <div 
            className="absolute top-0 left-0 h-2 bg-[#46178F] transition-all duration-1000" 
            style={{ width: `${(timeLeft / question.time_limit) * 100}%` }} 
          />
        )}
        <h2 className="text-2xl md:text-4xl font-black text-[#46178F] mt-2 md:mt-6">
          {question.question}
        </h2>
        {!isHost && !revealCorrect && (
          <p className="text-xl font-bold text-gray-500 mt-2">{timeLeft}s</p>
        )}
        {question.is_double_points && (
          <div className="absolute top-3 right-3 bg-[#D89E00] text-white px-3 py-1 rounded-full font-black text-sm shadow-md z-10">
            x2 Puntos
          </div>
        )}
      </div>

      {/* Respuestas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full flex-1">
        {question.answers.map((ans, idx) => (
          <button
            key={ans.id}
            onClick={() => handleAnswer(ans.id)}
            disabled={localAnswered || isHost || revealCorrect}
            className={`${getAnswerStyle(ans, idx)} 
              border-b-8 transition-all duration-500
              rounded-xl p-6 flex items-center gap-4 text-white font-black text-xl md:text-2xl shadow-lg
              ${!localAnswered && !revealCorrect && !isHost ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
          >
            <span className="text-3xl opacity-80">{COLORS[idx].shape}</span>
            <span className="truncate">{ans.text}</span>
          </button>
        ))}
      </div>
      
      {isHost && (
        <p className="mt-6 text-white font-bold text-xl animate-pulse">
          {revealCorrect ? '✨ Respuesta revelada' : 'Esperando respuestas de los jugadores...'}
        </p>
      )}
    </div>
  );
}