import React from 'react';
import { ChefHat, Clock, Flame, ChevronRight, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { recipes } from '../lib/recipes';

export default function HealthyRecipes() {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-sky-100 dark:border-slate-700 shadow-lg shadow-sky-200/40 dark:shadow-none h-auto flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-500 dark:bg-amber-900/50 dark:text-amber-300 rounded-xl">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-sky-950 dark:text-sky-100">Inspirasi Resep Sehat</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Kreasi bernutrisi dari bahan kami</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 relative z-10 mb-6">
        {recipes.slice(0, 3).map((recipe, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: idx * 0.1 }}
            key={recipe.id} 
            onClick={() => navigate(`/recipe/${recipe.id}`)}
            className="group flex gap-4 p-3 rounded-2xl bg-slate-50 hover:bg-sky-50 dark:bg-slate-900/50 dark:hover:bg-slate-700/50 border border-slate-100 dark:border-slate-700 transition cursor-pointer items-center"
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
              <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
            </div>
            <div className="flex-1">
               <h4 className="font-bold text-sky-900 dark:text-sky-100 text-sm mb-1 leading-tight">{recipe.title}</h4>
               <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">{recipe.description}</p>
               <div className="flex items-center gap-3 text-xs font-semibold">
                 <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Flame className="w-3 h-3" /> {recipe.calories} kkal</span>
                 <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400"><Clock className="w-3 h-3" /> {recipe.time}</span>
               </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center shrink-0 text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-50 dark:group-hover:bg-slate-800 transition">
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>

      <button 
        onClick={() => navigate('/all-recipes')}
        className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-amber-600 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-slate-900/50 dark:hover:bg-slate-700 transition"
      >
        Lihat Resep Lainnya <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
