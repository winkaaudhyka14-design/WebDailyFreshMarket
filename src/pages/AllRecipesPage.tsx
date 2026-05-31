import React, { useEffect, useState } from 'react';
import { ArrowLeft, Flame, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { recipes } from '../lib/recipes';

export default function AllRecipesPage() {
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
    <div className={`${isDarkMode ? 'dark' : 'light-mode'} min-h-screen bg-[#FAF7F2] dark:bg-slate-950 text-slate-800 dark:text-slate-300 transition-colors duration-300 font-sans flex flex-col`}>
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FAF7F2]/80 dark:bg-slate-900/80 border-b border-amber-900/5 dark:border-slate-800 shadow-sm">
        <div className="w-full max-w-none px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                  Nutri<span className="text-amber-500">AI</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-none px-4 sm:px-8 lg:px-12 py-8 lg:py-12">
        <div className="mb-10 text-center md:text-left">
           <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
             Koleksi Resep Sehat
           </h1>
           <p className="text-slate-600 dark:text-slate-400 max-w-2xl text-lg">
             Temukan 10 pilihan resep bernutrisi tinggi, mudah dibuat, dan pastinya mendukung gaya hidup sehat Anda.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recipes.map(recipe => (
            <div 
              key={recipe.id}
              onClick={() => navigate(`/recipe/${recipe.id}`)}
              className="group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col"
            >
               <div className="aspect-video relative overflow-hidden">
                 <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                 <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur text-xs font-bold px-3 py-1 rounded-full text-amber-600 dark:text-amber-400">
                   {recipe.category}
                 </div>
               </div>
               <div className="p-5 flex-1 flex flex-col">
                 <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-amber-500 transition-colors">
                   {recipe.title}
                 </h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
                   {recipe.description}
                 </p>
                 <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4 mt-auto">
                   <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-rose-500" /> {recipe.calories} kkal</span>
                   <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-sky-500" /> {recipe.time}</span>
                 </div>
               </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
