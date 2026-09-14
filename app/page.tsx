export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#46178F] via-[#5a21b5] to-[#1368CE] flex flex-col items-center justify-center p-6 text-white">
      
      {/* Logo / Título */}
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-black mb-4 drop-shadow-2xl tracking-tight">
          🎮 QuizArena
        </h1>
        <p className="text-xl md:text-2xl font-bold opacity-90 max-w-2xl">
          Crea tests, desafía a tus amigos y compite en tiempo real
        </p>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <a
          href="/login"
          className="flex-1 py-5 bg-white text-[#46178F] font-black text-xl rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition transform text-center border-b-4 border-gray-200"
        >
          Iniciar Sesión
        </a>
        <a
          href="/login"
          className="flex-1 py-5 bg-[#26890C] hover:bg-[#1e6b0a] text-white font-black text-xl rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition transform text-center border-b-4 border-[#145206]"
        >
          Crear Cuenta
        </a>
      </div>

      {/* Info adicional */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="font-black text-lg mb-2">Crea Tests</h3>
          <p className="text-sm opacity-80">Diseña cuestionarios con tiempos y puntos dobles</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
          <div className="text-4xl mb-3">📱</div>
          <h3 className="font-black text-lg mb-2">Juega en Vivo</h3>
          <p className="text-sm opacity-80">Únete con un código QR desde cualquier dispositivo</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
          <div className="text-4xl mb-3">🏆</div>
          <h3 className="font-black text-lg mb-2">Ranking Animado</h3>
          <p className="text-sm opacity-80">Podio con confeti y exportación a PDF</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 text-sm opacity-60">
        Hecho con ❤️ usando Next.js + Supabase
      </footer>
    </div>
  );
}