'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizzes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('quizzes')
        .select('id, title, created_at, questions(count)')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) setQuizzes(data);
      setLoading(false);
    };

    fetchQuizzes();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDelete = async (quizId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este test? Esta acción no se puede deshacer.')) return;
    
    // Gracias a ON DELETE CASCADE en la BD, esto borra también preguntas y respuestas automáticamente
    const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      setQuizzes(quizzes.filter(q => q.id !== quizId));
    }
  };

  const handlePlay = async (quizId: string) => {
    // 1. Generar código único de 6 caracteres
    const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // 2. Crear la partida en la base de datos
    const { error } = await supabase.from('games').insert({
      quiz_id: quizId,
      code: gameCode,
      status: 'waiting'
    });

    if (error) {
      alert('Error al iniciar el juego: ' + error.message);
    } else {
      // 3. Redirigir al host a la sala de espera
      router.push(`/game/${gameCode}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#46178F] text-white p-4 shadow-lg flex justify-between items-center">
        <h1 className="text-2xl font-black tracking-tight">🎮 QuizArena Dashboard</h1>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-[#E21B3C] hover:bg-[#c01530] rounded-lg font-bold text-sm transition"
        >
          Cerrar Sesión
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-gray-800">Mis Tests</h2>
          <button
            onClick={() => router.push('/dashboard/tests/create')}
            className="px-6 py-3 bg-[#26890C] hover:bg-[#1e6b0a] text-white font-black text-lg rounded-xl shadow-lg border-b-4 border-[#145206] transition transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span className="text-2xl">+</span> Crear Nuevo Test
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 font-bold text-center py-10">Cargando tus tests...</p>
        ) : quizzes.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border-2 border-dashed border-gray-300">
            <p className="text-4xl mb-4">📝</p>
            <p className="text-xl font-bold text-gray-600">Aún no has creado ningún test.</p>
            <p className="text-gray-500 mb-6">¡Crea tu primer quiz y desafía a tus amigos!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition border-l-8 border-[#46178F] flex flex-col">
                <h3 className="text-xl font-black text-gray-800 mb-2 truncate">{quiz.title}</h3>
                <p className="text-sm text-gray-500 font-bold mb-4">
                  {quiz.questions?.[0]?.count || 0} preguntas
                </p>
                
                <div className="mt-auto flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/tests/${quiz.id}`)}
                      className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition text-sm"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handlePlay(quiz.id)}
                      className="flex-1 py-2 bg-[#1368CE] hover:bg-[#0f52a3] text-white font-bold rounded-lg transition text-sm"
                    >
                      ▶️ Jugar
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(quiz.id)}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition text-sm border border-red-200"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}