import React, { useState } from 'react';
import { Activity, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';

export default function BmiCalculator() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [activityLevel, setActivityLevel] = useState('1.2');
  
  const [bmiResult, setBmiResult] = useState<number | null>(null);
  const [calorieResult, setCalorieResult] = useState<number | null>(null);

  const calculate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);

    if (!w || !h || !a) return;

    // BMI Calculation
    const heightInMeters = h / 100;
    const bmi = w / (heightInMeters * heightInMeters);
    setBmiResult(bmi);

    // BMR Calculation (Mifflin-St Jeor)
    let bmr = 0;
    if (gender === 'male') {
      bmr = 10 * w + 6.25 * h - 5 * a + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * a - 161;
    }

    // Daily Calorie
    const dailyCalorie = bmr * parseFloat(activityLevel);
    setCalorieResult(dailyCalorie);
  };

  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return { text: 'Kekurangan Berat Badan', color: 'text-amber-500' };
    if (bmi < 24.9) return { text: 'Normal (Sehat)', color: 'text-emerald-500' };
    if (bmi < 29.9) return { text: 'Kelebihan Berat Badan', color: 'text-amber-500' };
    return { text: 'Obesitas', color: 'text-rose-500' };
  };

  const reset = () => {
    setWeight('');
    setHeight('');
    setAge('');
    setGender('male');
    setActivityLevel('1.2');
    setBmiResult(null);
    setCalorieResult(null);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-sky-100 dark:border-slate-700 shadow-lg shadow-sky-200/40 dark:shadow-none h-auto flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-rose-100 text-rose-500 dark:bg-rose-900/50 dark:text-rose-300 rounded-xl">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-sky-950 dark:text-sky-100">Kalkulator BMI & Kalori</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pantau metrik kesehatan Anda</p>
        </div>
      </div>

      {!bmiResult ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Berat (kg)</label>
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 font-medium text-slate-900 dark:text-white" placeholder="Misal: 65" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tinggi (cm)</label>
              <input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 font-medium text-slate-900 dark:text-white" placeholder="Misal: 170" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usia</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 font-medium text-slate-900 dark:text-white" placeholder="Misal: 25" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 font-medium text-slate-900 dark:text-white">
                <option value="male">Pria</option>
                <option value="female">Wanita</option>
              </select>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tingkat Aktivitas</label>
             <select value={activityLevel} onChange={e => setActivityLevel(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 font-medium text-slate-900 dark:text-white">
                <option value="1.2">Jarang Berolahraga</option>
                <option value="1.375">Olahraga Ringan (1-3 hari/minggu)</option>
                <option value="1.55">Olahraga Sedang (3-5 hari/minggu)</option>
                <option value="1.725">Olahraga Berat (6-7 hari/minggu)</option>
              </select>
          </div>

          <button onClick={calculate} disabled={!weight || !height || !age} className="w-full mt-4 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed">
            Hitung Sekarang
          </button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col justify-center space-y-6">
           <div className="text-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 pb-8">
              <p className="text-slate-500 mb-1 font-medium">Score BMI Anda</p>
              <h4 className="text-5xl font-bold text-sky-950 dark:text-sky-100 mb-2">{bmiResult.toFixed(1)}</h4>
              <p className={`font-bold text-lg ${getBmiCategory(bmiResult).color}`}>
                {getBmiCategory(bmiResult).text}
              </p>
           </div>
           
           <div className="text-center p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
              <p className="text-emerald-700 dark:text-emerald-400 mb-1 font-medium">Estimasi Kebutuhan Kalori</p>
              <h4 className="text-4xl font-bold text-emerald-600 dark:text-emerald-300 mb-1">{Math.round(calorieResult!)} <span className="text-xl font-medium">kkal/hari</span></h4>
              <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">Untuk menjaga berat badan</p>
              
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-emerald-200/50 dark:border-emerald-800/50">
                <div>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mb-1">Karbo</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">{Math.round((calorieResult! * 0.5) / 4)}g</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mb-1">Protein</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">{Math.round((calorieResult! * 0.3) / 4)}g</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mb-1">Lemak</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">{Math.round((calorieResult! * 0.2) / 9)}g</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-emerald-100/50 dark:bg-emerald-800/30 rounded-lg p-2">
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mb-1">Batas Gula</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">&lt; {Math.round((calorieResult! * 0.1) / 4)}g</p>
                </div>
                <div className="bg-emerald-100/50 dark:bg-emerald-800/30 rounded-lg p-2">
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mb-1">Batas Garam</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">&lt; 5g</p>
                </div>
              </div>
           </div>

           <button onClick={reset} className="w-full flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-xl transition">
             <RefreshCcw className="w-5 h-5" /> Hitung Ulang
           </button>
        </motion.div>
      )}
    </div>
  );
}
