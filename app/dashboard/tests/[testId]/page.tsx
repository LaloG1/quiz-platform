'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const ANSWER_COLORS = [
  { bg: 'bg-[#E21B3C]', border: 'border-[#b31530]', placeholder: 'Rojo' },
  { bg: 'bg-[#1368CE]', border: 'border-[#0f52a3]', placeholder: 'Azul' },
  { bg: 'bg-[#D89E00]', border: 'border-[#b38300]', placeholder: 'Amarillo' },
  { bg: 'bg-[#26890C]', border: 'border-[#1e6b0a]', placeholder: 'Verde' },
];

type Answer = { id: string; text: string; is_correct: boolean };
type Question = { id: string; text: string; time_limit: number; is_double_points: boolean; answers: Answer[] };

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.testId as string;

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadQuiz = async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('title, questions(id, question_text, time_limit, is_double_points, answers(id, answer_text, is_correct))')
        .eq('id', quizId)
        .single();

      if (error || !data) {
        alert('Test no encontrado');
        router.push('/dashboard');
        return;
      }

      setTitle(data.title);
      
      const loadedQuestions: Question[] = data.questions.map((q: any) => ({
        id: q.id,
        text: q.question_text,
        time_limit: q.time_limit,
        is_double_points: q.is_double_points,
        answers: q.answers.map((a: any) => ({
          id: a.id,
          text: a.answer_text,
          is_correct: a.is_correct
        }))
      }));
      
      setQuestions(loadedQuestions);
      setLoading(false);
    };

    loadQuiz();
  }, [quizId, router]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: uuidv4(),
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
    setQuestions(questions.map(q => q.id === qId ? { ...q, [field]: value } : q));
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

  const handleSave = async () => {
    if (!title.trim()) return alert('Por favor, dale un título al test.');
    if (questions.some(q => !q.text.trim() || q.answers.some(a => !a.text.trim()))) {
      return alert('Por favor, completa todas las preguntas y respuestas.');
    }
    if (questions.some(q => !q.answers.some(a => a.is_correct))) {
      return alert('Cada pregunta debe tener una respuesta correcta marcada.');
    }

    setIsSaving(true);
    try {
      // 1. Actualizar título
      await supabase.from('quizzes').update({ title }).eq('id', quizId);

      // 2. Borrar preguntas antiguas (las respuestas se borran solas por ON DELETE CASCADE)
      await supabase.from('questions').delete().eq('quiz_id', quizId);

      // 3. Insertar las preguntas y respuestas actualizadas
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: question, error: qError } = await supabase
          .from('questions')
          .insert({ 
            quiz_id: quizId, 
            question_text: q.text, 
            time_limit: q.time_limit, 
            is_double_points: q.is_double_points, 
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

      alert('¡Test actualizado con éxito!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center font-bold text-gray-500">Cargando test...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-[#46178F] text-white p-4 sticky top-0 z-10 shadow-lg flex justify-between items-center">
        <button onClick={() => router.back()} className="font-bold hover:underline">← Volver</button>
        <h1 className="text-xl font-black">Editar Test</h1>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-[#26890C] hover:bg-[#1e6b0a] disabled:bg-gray-400 text-white font-black rounded-lg shadow-md border-b-4 border-[#145206] transition active:scale-95"
        >
          {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <label className="block text-sm font-black text-gray-500 uppercase mb-2">Título del Test</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl font-black text-[#46178F] border-b-2 border-gray-200 focus:border-[#46178F] outline-none pb-2"
          />
        </div>

        {questions.map((q, qIndex) => (
          <div key={q.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
              <span className="font-black text-gray-400 text-lg">Pregunta {qIndex + 1}</span>
              <div className="flex items-center gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.answers.map((a, aIndex) => {
                  const color = ANSWER_COLORS[aIndex];
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
                          a.is_correct 
                            ? 'bg-white border-white text-green-600' 
                            : 'border-white/50 text-transparent hover:bg-white/20'
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