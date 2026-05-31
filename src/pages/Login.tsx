import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Lock, Mail, ArrowLeft, User, Phone, Check, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const redirectPath = params.get('redirect') || '/';

  // Registration form state
  const [isRegistering, setIsRegistering] = useState(false);
  const [isEmailReadOnly, setIsEmailReadOnly] = useState(false);
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Custom interactive error triggers (shows after user clicks Continue or on touch/blur)
  const [showErrors, setShowErrors] = useState(false);

  // Unregistered popup states
  const [showUnregisteredModal, setShowUnregisteredModal] = useState(false);
  const [unregisteredEmail, setUnregisteredEmail] = useState('');

  // Validations
  const isNameValid = name.trim().length > 0 && name.length <= 50;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 8;
  const isConfirmPasswordValid = password === confirmPassword && confirmPassword.length > 0;
  // Valid phone: 7 to 14 digits
  const isPhoneValid = /^[0-9]{7,14}$/.test(phoneNumber);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (isRegistering) {
      // Trigger all custom registration validation
      setShowErrors(true);
      if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isPhoneValid) {
        setError('Harap periksa kembali semua data pendaftaran Anda.');
        return;
      }
      
      setLoading(true);
      try {
        const { createUserWithEmailAndPassword, updateProfile, signOut } = await import('firebase/auth');
        const { doc, setDoc } = await import('firebase/firestore');
        
        sessionStorage.setItem('registering', 'true');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update user display name
        await updateProfile(userCredential.user, { displayName: name });
        
        // Save metadata to Firestore users collection
        try {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            name,
            email,
            phoneNumber: `+62${phoneNumber}`,
            createdAt: new Date().toISOString(),
            role: 'pelanggan'
          });
        } catch (fsErr) {
          console.error("Firestore save error:", fsErr);
        }
        
        // Log out immediately so they aren't auto-logged in and redirected incorrectly
        await signOut(auth);
        sessionStorage.removeItem('registering');
        
        // Clean fields, toggle state to login form, and show success message
        setPassword('');
        setConfirmPassword('');
        setName('');
        setPhoneNumber('');
        setShowErrors(false);
        setIsRegistering(false);
        setSuccessMessage('Pendaftaran berhasil! Akun Anda telah dibuat. Silakan login dengan alamat email dan kata sandi Anda.');
      } catch (err: any) {
        sessionStorage.removeItem('registering');
        if (err.code === 'auth/email-already-in-use') {
          setError('Alamat email sudah terdaftar. Silakan gunakan alamat email lain.');
        } else if (err.code === 'auth/weak-password') {
          setError('Kata sandi harus minimal 6 karakter.');
        } else if (err.code === 'auth/network-request-failed') {
          setError('Gagal mendaftar karena masalah koneksi. Ini biasanya terjadi karena Ad-blocker (uBlock, AdGuard) atau Brave Shield memblokir layanan autentikasi Firebase di dalam bingkai (iframe). Silakan nonaktifkan pemblokir iklan Anda untuk situs ini, atau buka aplikasi di tab baru dengan mengeklik ikon di kanan atas layar.');
        } else {
          setError(err.message || 'Gagal mendaftar');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Login mode
      setLoading(true);
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Fetch role from Firestore users collection to direct them correctly
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'admin') {
              navigate('/admin');
            } else {
              navigate(redirectPath);
            }
          } else {
            // Default back to redirectPath if metadata is not found
            navigate(redirectPath);
          }
        } catch (fsErr) {
          console.error("Failed to read user role from Firestore, defaulting to Landing Page:", fsErr);
          navigate(redirectPath);
        }
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          setUnregisteredEmail(email);
          setShowUnregisteredModal(true);
        } else if (err.code === 'auth/wrong-password') {
          setError('Kata sandi yang Anda masukkan salah.');
        } else if (err.code === 'auth/invalid-email') {
          setError('Format alamat email tidak valid.');
        } else if (err.code === 'auth/email-already-in-use') {
          setError('Alamat email sudah terdaftar.');
        } else if (err.code === 'auth/network-request-failed') {
          setError('Gagal masuk karena masalah koneksi. Ini biasanya terjadi karena Ad-blocker (seperti uBlock Origin, AdGuard) atau fitur keamanan penjelajah (Brave Shield) memblokir layanan autentikasi Firebase di dalam bingkai preview (iframe). Silakan nonaktifkan pemblokir iklan tersebut untuk situs ini, atau buka aplikasi ini di tab baru dengan mengeklik ikon di kanan atas layar.');
        } else {
          setError(err.message || 'Gagal masuk');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOpenRegistrationScreen = () => {
    setShowUnregisteredModal(false);
    setIsRegistering(true);
    // Prefill the email with the one they tried to login with
    setEmail(unregisteredEmail);
    setIsEmailReadOnly(true);
    // Reset other fields
    setPassword('');
    setConfirmPassword('');
    setName('');
    setPhoneNumber('');
    setShowErrors(false);
    setError('');
    setSuccessMessage('');
  };

  const handleSocialClick = (platform: string) => {
    setError(`Autentikasi dengan ${platform} akan segera hadir sebagai bagian dari update mendatang.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative selection:bg-sky-100 dark:selection:bg-sky-950/50">
      
      {/* Floating Home Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 text-sm font-bold transition-all bg-white dark:bg-slate-900 py-2.5 px-5 rounded-full shadow-md hover:shadow-lg border border-slate-200/60 dark:border-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Beranda
      </button>

      {/* Decorative Brand Circles */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Login Box Container */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-10 shadow-2xl border border-sky-100/50 dark:border-slate-800 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center mb-6">
          <h1 className="text-sky-600 dark:text-sky-500 font-extrabold text-3xl tracking-tight text-center leading-snug">
            Selamat Datang di <br className="hidden sm:block" />
            DailyFresh Market
          </h1>
        </div>

        {/* Info/Slogan Section */}
        <p className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 text-left border-l-4 border-sky-500 pl-3">
          {isRegistering 
            ? 'Silakan isi form di bawah untuk membuat akun baru.' 
            : 'Silakan masukkan alamat email & kata sandi Anda untuk melanjutkan.'
          }
        </p>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 text-xs font-bold leading-relaxed shadow-sm animate-flash">
            ⚠️ {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold leading-relaxed shadow-sm">
            ✅ {successMessage}
          </div>
        )}
                {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {!isRegistering ? (
            <>
              {/* Login Fields */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${error ? 'text-amber-500' : 'text-slate-400 focus-within:text-sky-500'}`} />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 border rounded-2xl text-slate-900 dark:text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 transition-all ${
                      error 
                        ? 'border-amber-400 dark:border-amber-950 focus:ring-amber-500' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-sky-500/20 focus:border-sky-500'
                    }`}
                    placeholder="Contoh: nama@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${error ? 'text-amber-500' : 'text-slate-400 focus-within:text-sky-500'}`} />
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 border rounded-2xl text-slate-900 dark:text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 transition-all ${
                      error 
                        ? 'border-amber-400 dark:border-amber-950 focus:ring-amber-500' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-sky-500/20 focus:border-sky-500'
                    }`}
                    placeholder="Masukkan kata sandi"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Registration Fields */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                <span className="text-sky-600 dark:text-sky-400 font-black text-sm tracking-wide uppercase">
                  Data Pribadi
                </span>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Nama
                </label>
                <div className="relative">
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${showErrors && !isNameValid ? 'text-red-500' : 'text-slate-400 focus-within:text-sky-500'}`} />
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 border rounded-2xl text-slate-900 dark:text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 transition-all ${
                      showErrors && !isNameValid 
                        ? 'border-red-400 focus:ring-red-500' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-sky-500/20 focus:border-sky-500'
                    }`}
                    placeholder="Input your name"
                  />
                </div>
                {showErrors && !isNameValid && (
                  <p className="text-[11px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Please input valid character! (50 characters maximum)
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    isEmailReadOnly 
                      ? 'text-slate-400' 
                      : showErrors && !isEmailValid 
                        ? 'text-red-500' 
                        : 'text-slate-400 focus-within:text-sky-500'
                  }`} />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => !isEmailReadOnly && setEmail(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 border rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 ${
                      isEmailReadOnly
                        ? 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold cursor-not-allowed select-none'
                        : showErrors && !isEmailValid
                          ? 'border-red-400 focus:ring-red-500 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 font-medium'
                          : 'border-slate-200 dark:border-slate-800 focus:ring-sky-500/20 focus:border-sky-500 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 font-medium'
                    }`}
                    disabled={isEmailReadOnly}
                    placeholder="Contoh: nama@gmail.com"
                  />
                </div>
                {isEmailReadOnly && (
                  <p className="text-[10px] text-sky-600 dark:text-sky-450 font-bold mt-1 tracking-wider uppercase">
                    🔒 Email Terkunci (Sedang Diverifikasi)
                  </p>
                )}
                {showErrors && !isEmailValid && (
                  <p className="text-[11px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Harap masukkan alamat email yang valid!
                  </p>
                )}
                {!isEmailReadOnly && isEmailValid && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-500" />
                    Alamat email valid
                  </p>
                )}
              </div>

              {/* Passwords */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${showErrors && !isPasswordValid ? 'text-red-500' : 'text-slate-400 focus-within:text-sky-500'}`} />
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 border rounded-2xl text-slate-900 dark:text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 transition-all ${
                      showErrors && !isPasswordValid 
                        ? 'border-red-400 focus:ring-red-500' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-sky-500/20 focus:border-sky-500'
                    }`}
                    placeholder="Input passwords"
                  />
                </div>
                {showErrors && !isPasswordValid && (
                  <p className="text-[11px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Password must be at least 8 characters long!
                  </p>
                )}
              </div>

              {/* Password Confirmation */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${showErrors && !isConfirmPasswordValid ? 'text-red-500' : 'text-slate-400 focus-within:text-sky-500'}`} />
                  <input 
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 border rounded-2xl text-slate-900 dark:text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 transition-all ${
                      showErrors && !isConfirmPasswordValid 
                        ? 'border-red-400 focus:ring-red-500' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-sky-500/20 focus:border-sky-500'
                    }`}
                    placeholder="Re-enter passwords"
                  />
                </div>
                {showErrors && !isConfirmPasswordValid && (
                  <p className="text-[11px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Passwords not match!
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Nomor Telepon
                </label>
                <div className="flex gap-2.5">
                  <div className="flex items-center justify-center px-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black text-sm rounded-2xl select-none">
                    +62
                  </div>
                  <div className="relative flex-1">
                    <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${showErrors && !isPhoneValid ? 'text-red-500' : 'text-slate-400 focus-within:text-sky-500'}`} />
                    <input 
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      className={`w-full pl-12 pr-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 border rounded-2xl text-slate-900 dark:text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 transition-all ${
                        showErrors && !isPhoneValid 
                          ? 'border-red-400 focus:ring-red-500' 
                          : 'border-slate-200 dark:border-slate-800 focus:ring-sky-500/20 focus:border-sky-500'
                      }`}
                      placeholder="Example: 81234567890"
                    />
                  </div>
                </div>
                {showErrors && !isPhoneValid && (
                  <p className="text-[11px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Please input valid phone number!
                  </p>
                )}
              </div>
            </>
          )}

          {/* Continue Action Button */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-full font-black text-sm tracking-wide text-white transition-all bg-sky-500 hover:bg-sky-600 focus:ring-4 focus:ring-sky-500/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>{isRegistering ? 'CONTINUE' : 'MASUK'}</span>
            )}
          </button>
        </form>



        {/* Footer Registration Prompts */}
        <div className="text-center space-y-1.5 mt-7 pt-5 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-black text-slate-800 dark:text-slate-200">
            {!isRegistering ? "Belum punya akun?" : "Sudah punya akun?"}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-normal max-w-[280px] mx-auto">
            {!isRegistering 
              ? "Gabung sebagai Teman DailyFresh dan dapatkan penawaran khusus!" 
              : "Akses dashboard Anda untuk mengelola produk dan memeriksa info penjualan!"
            }
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (!isRegistering) {
                  setIsRegistering(true);
                  setIsEmailReadOnly(false);
                } else {
                  setIsRegistering(false);
                  setIsEmailReadOnly(false);
                }
                setError('');
                setSuccessMessage('');
                setShowErrors(false);
              }}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-full text-xs tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              {!isRegistering ? 'DAFTAR SEKARANG' : 'MASUK DI SINI'}
            </button>
          </div>
        </div>

      </div>

      {/* Unregistered Email Dialog Modal */}
      {showUnregisteredModal && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-7 shadow-2xl border border-sky-100/50 dark:border-slate-800 antialiased animate-scale-up">
            
            {/* Modal Heading */}
            <div className="text-center">
              <h3 className="text-slate-900 dark:text-slate-100 font-extrabold text-xl tracking-tight leading-snug">
                Email belum terdaftar
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 font-medium px-2">
                Lanjutkan pendaftaran dengan email
              </p>
              
              {/* Highlighted Email */}
              <div className="mt-3 px-4 py-2 bg-sky-50 dark:bg-sky-950/20 rounded-2xl border border-sky-100/30 dark:border-sky-900/30">
                <span className="text-sky-600 dark:text-sky-450 font-bold text-sm break-all font-sans select-all">
                  {unregisteredEmail} ?
                </span>
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="flex items-center justify-stretch gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowUnregisteredModal(false)}
                className="flex-1 py-3 px-4 border border-sky-600 dark:border-sky-500 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20 rounded-full text-xs font-black tracking-wide text-center uppercase cursor-pointer transition-all active:scale-[0.98] select-none"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleOpenRegistrationScreen}
                className="flex-1 py-3 px-4 bg-sky-500 hover:bg-sky-600 text-white dark:text-slate-900 dark:bg-sky-400 dark:hover:bg-sky-300 rounded-full text-xs font-black tracking-wide text-center uppercase cursor-pointer shadow-lg shadow-sky-500/20 transition-all active:scale-[0.98] select-none"
              >
                Daftar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
