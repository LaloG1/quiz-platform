'use client';

import React, { useState } from 'react';

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
  order?: number;
  answers: Answer[];
};

type QuestionScreenProps = {
  question: Question;
  isHost?: boolean;
  onPlayerAnswer?: (answerId: string, timeMs: number) => void;
};

export default function QuestionScreen({
  question,
  isHost = false,
  onPlayerAnswer,
}: QuestionScreenProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [questionStartedAt] = useState(() => Date.now());

  const handleAnswer = (answerId: string) => {
    if (isHost || selectedAnswer || !onPlayerAnswer) {
      return;
    }

    const timeMs = Date.now() - questionStartedAt;

    setSelectedAnswer(answerId);

    onPlayerAnswer(answerId, timeMs);
  };

  return (
    <div className="w-full">

      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 text-center">
        {question.order !== undefined && (
          <p className="text-gray-500 font-bold mb-3">
            Pregunta {question.order}
          </p>
        )}

        <h2 className="text-3xl md:text-4xl font-black text-gray-800">
          {question.question_text}
        </h2>

        <p className="mt-4 text-gray-500 font-bold">
          Tiempo: {question.time_limit} segundos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[...question.answers]
          .sort((a, b) => a.order - b.order)
          .map((answer) => (
            <button
              key={answer.id}
              type="button"
              disabled={isHost || selectedAnswer !== null}
              onClick={() => handleAnswer(answer.id)}
              className={`min-h-[100px] font-black text-xl rounded-2xl shadow-lg p-6 transition-transform ${
                selectedAnswer === answer.id
                  ? 'bg-[#26890C] text-white scale-[1.02]'
                  : 'bg-white text-gray-800 hover:bg-gray-100 hover:scale-[1.02]'
              } ${
                isHost || selectedAnswer !== null
                  ? 'cursor-default'
                  : 'cursor-pointer'
              }`}
            >
              {answer.answer_text}
            </button>
          ))}
      </div>

    </div>
  );
}