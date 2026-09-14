'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useEffect } from 'react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      router.push('/dashboard'); // Si ya está logueado, al dashboard
    }
  };
  checkUser();
}, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push('/dashboard');
    } else {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { username } } // El trigger usará el email si no hay username en metadata, pero lo guardamos
      });
      if (error) setError(error.message);
      else {
        alert('¡Registro exitoso! Revisa tu correo o inicia sesión.');
        setIsLogin(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#46178F] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-black text-[#46178F] text-center mb-6">
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h1>
        
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Nombre de usuario"
              className="w-full p-3 text-black border-2 border-gray-200 rounded-xl font-bold focus:border-[#46178F] outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Correo electrónico"
            className="w-full p-3 text-black border-2 border-gray-200 rounded-xl font-bold focus:border-[#46178F] outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full p-3 text-black border-2 border-gray-200 rounded-xl font-bold focus:border-[#46178F] outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-red-500 font-bold text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full py-4 bg-[#1368CE] hover:bg-[#0f52a3] text-white font-black text-xl rounded-xl shadow-lg border-b-4 border-[#0a3d7a] transition transform hover:scale-[1.02] active:scale-95"
          >
            {isLogin ? 'Entrar' : 'Registrarse'}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-4 text-[#46178F] font-bold hover:underline"
        >
          {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
}