import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BmiCalculator from '../components/BmiCalculator';

export default function BmiPage() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches) || document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDarkMode]);

  return (
    <div className={`${isDarkMode ? 'dark' : 'light-mode'} min-h-screen font-sans flex flex-col relative`}>
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=2000" 
          alt="Healthy Activity" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-sky-900/70 dark:bg-slate-900/80 backdrop-blur-sm"></div>
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/10 dark:bg-slate-900/50 border-b border-white/20 shadow-sm">
        <div className="w-full max-w-none px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="p-2 border border-white/30 rounded-full hover:bg-white/20 transition-colors text-white bg-white/10 backdrop-blur-md"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white drop-shadow-md">
                  Nutri<span className="text-sky-300">AI</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-none px-4 sm:px-8 lg:px-12 py-12 relative z-10 flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 text-white">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 drop-shadow-lg leading-tight">
            Pahami Tubuhmu,<br />Raih Versi <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-emerald-300">Terbaikmu!</span>
          </h1>
          <p className="text-lg md:text-xl text-sky-50 dark:text-slate-300 leading-relaxed max-w-xl drop-shadow mb-8">
            Setiap perjalanan sehat dimulai dengan satu langkah kecil. Gunakan Kalkulator BMI & Kalori kami untuk memantau metrik kesehatan Anda dan wujudkan gaya hidup aktif yang selalu Anda impikan.
          </p>
          <div className="grid grid-cols-2 gap-6 max-w-md">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg">
              <h4 className="font-bold text-sky-200 mb-1">Akurasi Tinggi</h4>
              <p className="text-sm text-sky-50">Menggunakan formula teruji untuk hasil yang tepat</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg">
              <h4 className="font-bold text-emerald-200 mb-1">Mudah Digunakan</h4>
              <p className="text-sm text-sky-50">Desain intuitif yang memanjakan mata Anda</p>
            </div>
          </div>
        </div>
        
        <div className="w-full max-w-md shadow-2xl shadow-sky-900/50 rounded-3xl">
          <BmiCalculator />
        </div>
      </main>
    </div>
  );
}
