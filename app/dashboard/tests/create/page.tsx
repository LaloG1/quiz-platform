'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

type QuestionType = 'quiz' | 'true_false';
type Answer = { id: string; text: string; is_correct: boolean };
type Question = { 
  id: string; 
  type: QuestionType;
  text: string; 
  time_limit: number; 
  is_double_points: boolean; 
  answers: Answer[] 
};

const QUIZ_COLORS = [
  { bg: 'bg-[#E21B3C]', border: 'border-[#b31530]', placeholder: 'Rojo' },
  { bg: 'bg-[#1368CE]', border: 'border-[#0f52a3]', placeholder: 'Azul' },
  { bg: 'bg-[#D89E00]', border: 'border-[#b38300]', placeholder: 'Amarillo' },
  { bg: 'bg-[#26890C]', border: 'border-[#1e6b0a]', placeholder: 'Verde' },
];

const TF_COLORS = [
  { bg: 'bg-[#26890C]', border: 'border-[#1e6b0a]', text: 'VERDADERO', shape: '✓' },
  { bg: 'bg-[#E21B3C]', border: 'border-[#b31530]', text: 'FALSO', shape: '✕' },
];

export default function CreateQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: uuidv4(),
      type: 'quiz',
      text: '',
      time_limit: 15,
      is_double_points: false,
      answers: [
        { id: uuidv4(), text: '', is_correct: false },
        { id: uuidv4(), text: '', is_correct: false },
        { id: uuidv4(), text: '', is_correct: false },
        { id: uuidv4(), text: '', is_correct: false },
      ],
    },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: uuidv4(),
        type: 'quiz',
        text: '',
        time_limit: 15,
        is_double_points: false,
        answers: [
          { id: uuidv4(), text: '', is_correct: false },
          { id: uuidv4(), text: '', is_correct: false },
          { id: uuidv4(), text: '', is_correct: false },
          { id: uuidv4(), text: '', is_correct: false },
        ],
      },
    ]);
  };

  const updateQuestion = (qId: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const updatedQ = { ...q, [field]: value };
        // Si cambia a true_false, resetear respuestas a 2
        if (field === 'type' && value === 'true_false') {
          updatedQ.answers = [
            { id: uuidv4(), text: 'VERDADERO', is_correct: false },
            { id: uuidv4(), text: 'FALSO', is_correct: false },
          ];
        }
        // Si cambia a quiz, resetear a 4
        if (field === 'type' && value === 'quiz') {
          updatedQ.answers = [
            { id: uuidv4(), text: '', is_correct: false },
            { id: uuidv4(), text: '', is_correct: false },
            { id: uuidv4(), text: '', is_correct: false },
            { id: uuidv4(), text: '', is_correct: false },
          ];
        }
        return updatedQ;
      }
      return q;
    }));
  };

  const updateAnswer = (qId: string, aId: string, text: string) => {
    setQuestions(questions.map(q => 
      q.id === qId ? {
        ...q,
        answers: q.answers.map(a => a.id === aId ? { ...a, text } : a)
      } : q
    ));
  };

  const setCorrectAnswer = (qId: string, aId: string) => {
    setQuestions(questions.map(q => 
      q.id === qId ? {
        ...q,
        answers: q.answers.map(a => ({ ...a, is_correct: a.id === aId }))
      } : q
    ));
  };

  const generateGameCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleSaveAndStart = async () => {
    if (!title.trim()) return alert('Por favor, dale un título al test.');
    if (questions.some(q => !q.text.trim() || q.answers.some(a => !a.text.trim()))) {
      return alert('Por favor, completa todas las preguntas y respuestas.');
    }
    if (questions.some(q => !q.answers.some(a => a.is_correct))) {
      return alert('Cada pregunta debe tener una respuesta correcta marcada.');
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No estás autenticado.');

      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({ creator_id: user.id, title })
        .select()
        .single();
      if (quizError) throw quizError;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: question, error: qError } = await supabase
          .from('questions')
          .insert({ 
            quiz_id: quiz.id, 
            question_text: q.text, 
            time_limit: q.time_limit, 
            is_double_points: q.is_double_points, 
            question_type: q.type, // <-- NUEVO
            order: i + 1 
          })
          .select()
          .single();
        if (qError) throw qError;

        for (let j = 0; j < q.answers.length; j++) {
          const a = q.answers[j];
          await supabase.from('answers').insert({
            question_id: question.id,
            answer_text: a.text,
            is_correct: a.is_correct,
            order: j + 1
          });
        }
      }

      const gameCode = generateGameCode();
      await supabase.from('games').insert({ quiz_id: quiz.id, code: gameCode, status: 'waiting' });

      router.push(`/game/${gameCode}`);
    } catch (error: any) {
      console.error(error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-[#46178F] text-white p-4 sticky top-0 z-10 shadow-lg flex justify-between items-center">
        <button onClick={() => router.back()} className="font-bold hover:underline">← Volver</button>
        <h1 className="text-xl font-black">Crear Nuevo Test</h1>
        <button
          onClick={handleSaveAndStart}
          disabled={isSaving}
          className="px-6 py-2 bg-[#26890C] hover:bg-[#1e6b0a] disabled:bg-gray-400 text-white font-black rounded-lg shadow-md border-b-4 border-[#145206] transition active:scale-95"
        >
          {isSaving ? 'Guardando...' : '💾 Guardar e Iniciar'}
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <label className="block text-sm font-black text-gray-500 uppercase mb-2">Título del Test</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Historia de México - Examen Rápido"
            className="w-full text-2xl font-black text-[#46178F] border-b-2 border-gray-200 focus:border-[#46178F] outline-none pb-2 placeholder-gray-300"
          />
        </div>

        {questions.map((q, qIndex) => (
          <div key={q.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
              <span className="font-black text-gray-400 text-lg">Pregunta {qIndex + 1}</span>
              
              <div className="flex items-center gap-4">
                {/* Selector de Tipo de Pregunta */}
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-1 font-bold text-gray-700 outline-none focus:border-[#46178F]"
                >
                  <option value="quiz">Opción Múltiple</option>
                  <option value="true_false">Verdadero o Falso</option>
                </select>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={q.is_double_points}
                    onChange={(e) => updateQuestion(q.id, 'is_double_points', e.target.checked)}
                    className="w-5 h-5 text-[#D89E00] rounded focus:ring-[#D89E00]"
                  />
                  <span className="font-bold text-[#D89E00] text-sm">Puntos x2</span>
                </label>
                
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-500 text-sm">Tiempo:</span>
                  <select
                    value={q.time_limit}
                    onChange={(e) => updateQuestion(q.id, 'time_limit', Number(e.target.value))}
                    className="bg-white border border-gray-300 rounded-lg px-2 py-1 font-bold text-gray-700 outline-none focus:border-[#46178F]"
                  >
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                    <option value={20}>20s</option>
                    <option value={30}>30s</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6">
              <input
                type="text"
                value={q.text}
                onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                placeholder="Escribe tu pregunta aquí..."
                className="w-full text-xl font-bold text-gray-800 border-2 border-gray-200 rounded-xl p-4 focus:border-[#46178F] outline-none mb-6"
              />

              <div className={`grid gap-4 ${q.type === 'true_false' ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
                {q.answers.map((a, aIndex) => {
                  if (q.type === 'true_false') {
                    const tfStyle = TF_COLORS[aIndex];
                    return (
                      <button
                        key={a.id}
                        onClick={() => setCorrectAnswer(q.id, a.id)}
                        className={`${tfStyle.bg} ${tfStyle.border} border-b-8 rounded-xl p-6 flex items-center justify-center gap-4 text-white font-black text-2xl shadow-lg transition transform hover:scale-[1.02] active:scale-95 ${
                          a.is_correct ? 'ring-4 ring-white brightness-110' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        <span className="text-4xl">{tfStyle.shape}</span>
                        <span>{tfStyle.text}</span>
                      </button>
                    );
                  }

                  const color = QUIZ_COLORS[aIndex];
                  return (
                    <div key={a.id} className="relative group">
                      <input
                        type="text"
                        value={a.text}
                        onChange={(e) => updateAnswer(q.id, a.id, e.target.value)}
                        placeholder={`Respuesta ${color.placeholder}`}
                        className={`w-full ${color.bg} text-white font-bold text-lg rounded-xl p-4 pr-12 outline-none border-b-4 ${color.border} focus:brightness-110 placeholder-white/60`}
                      />
                      <button
                        onClick={() => setCorrectAnswer(q.id, a.id)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center transition ${
                          a.is_correct ? 'bg-white border-white text-green-600' : 'border-white/50 text-transparent hover:bg-white/20'
                        }`}
                        title="Marcar como correcta"
                      >
                        ✓
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addQuestion}
          className="w-full py-4 border-4 border-dashed border-gray-300 text-gray-500 font-black text-xl rounded-2xl hover:border-[#46178F] hover:text-[#46178F] transition flex items-center justify-center gap-2"
        >
          <span className="text-3xl">+</span> Agregar otra pregunta
        </button>
      </div>
    </div>
  );
}