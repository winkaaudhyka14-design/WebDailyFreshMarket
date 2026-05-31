import React, { useState, useEffect } from 'react';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowLeft, Loader2, Save, Key, ShieldCheck, X, Camera } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const [displayName, setDisplayName] = useState(currentUser?.displayName || currentUser?.email?.split('@')[0] || '');
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (currentUser) {
      const fetchProfile = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../firebase');
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.displayName) setDisplayName(userData.displayName);
            if (userData.photoURL) setPhotoURL(userData.photoURL);
          }
        } catch (err) {
          console.error("Gagal mengambil profil dari Firestore:", err);
        }
      };
      fetchProfile();
    }
  }, [currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileMessage({ type: 'error', text: 'Format file harus berupa gambar.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setPhotoURL(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage({ type: '', text: '' });
    
    if (currentUser) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        
        // Save to users collection in Firestore
        await setDoc(doc(db, 'users', currentUser.uid), {
          displayName,
          photoURL
        }, { merge: true });

        // Update display name in Firebase Auth without updating photoURL if it's base64 or too long
        const isBase64 = photoURL.startsWith('data:');
        const profilePayload: { displayName: string, photoURL?: string } = { displayName };
        if (!isBase64) {
          profilePayload.photoURL = photoURL;
        }

        await updateProfile(currentUser, profilePayload);
        setProfileMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
      } catch (error: any) {
        setProfileMessage({ type: 'error', text: error.message || 'Gagal memperbarui profil.' });
      }
    }
    setProfileLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Konfirmasi sandi tidak cocok.' });
      return;
    }
    
    setPasswordLoading(true);
    setPasswordMessage({ type: '', text: '' });
    
    if (currentUser && currentUser.email) {
      try {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        
        await updatePassword(currentUser, newPassword);
        setPasswordMessage({ type: 'success', text: 'Sandi berhasil diperbarui!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setIsPasswordModalOpen(false), 1500);
      } catch (error: any) {
        if (error.code === 'auth/invalid-credential') {
          setPasswordMessage({ type: 'error', text: 'Sandi saat ini salah.' });
        } else {
          setPasswordMessage({ type: 'error', text: error.message || 'Gagal memperbarui sandi.' });
        }
      }
    }
    setPasswordLoading(false);
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-200 via-sky-200 to-emerald-200 dark:from-indigo-950 dark:via-sky-900/40 dark:to-emerald-950 text-slate-900 dark:text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-4 mb-8 pb-6 border-b border-sky-800/10 dark:border-sky-100/10">
          <button onClick={() => navigate('/')} className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-sky-600 transition shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <ShieldCheck className="w-6 h-6 text-sky-600 dark:text-sky-400" />
              Pengaturan Akun
            </h1>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">Kelola profil dan keamanan akun Anda</p>
          </div>
        </header>

        <div className="flex flex-col gap-8">
          {/* Profile Section */}
          <div className="bg-white/90 backdrop-blur-xl dark:bg-slate-800/90 rounded-3xl p-6 md:p-8 shadow-xl shadow-sky-900/10 dark:shadow-none border border-white dark:border-sky-800/30">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-sky-100 dark:border-sky-800/30">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center font-bold shadow-md shadow-sky-500/30">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-extrabold text-sky-900 dark:text-sky-100">Profil Pengguna</h2>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-sky-900 dark:text-sky-200 mb-2">Email</label>
                <input 
                  type="email" 
                  disabled 
                  value={currentUser.email || ''} 
                  className="w-full px-4 py-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed font-medium shadow-inner" 
                />
                <p className="text-xs text-slate-400 mt-1.5 ml-1">Email tidak dapat diubah.</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-sky-900 dark:text-sky-200 mb-2">Nama Tampilan (Username)</label>
                <input 
                  type="text" 
                  required
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-sky-50/50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-900 font-medium transition-all shadow-inner text-sky-900 dark:text-sky-100" 
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-sky-900 dark:text-sky-200">Foto Profil Anda</label>
                <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-sky-50/20 dark:bg-sky-900/10 border border-sky-100/30 dark:border-sky-800/20 shadow-inner">
                  <div className="relative group w-20 h-20 rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-md">
                    {photoURL ? (
                      <img src={photoURL} alt="Foto Profil" className="w-full h-full object-cover transition group-hover:scale-105" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-black">
                        {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-opacity duration-200">
                      <Camera className="w-4 h-4 mb-0.5" />
                      Unggah
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <label className="inline-block py-2 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 cursor-pointer text-white text-xs font-bold transition-all shadow-sm active:scale-95">
                      Pilih Foto Baru
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">PNG, JPG, JPEG (Maks. 5 MB). Gambar akan dipersiapkan otomatis untuk profil Anda.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-sky-900 dark:text-sky-200 mb-2">Keamanan</label>
                <button 
                  type="button" 
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-violet-50/50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/50 hover:bg-violet-100/50 dark:hover:bg-violet-900/40 text-left font-medium transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                    <Key className="w-5 h-5 text-violet-500" />
                    <span>Ubah Sandi Akun</span>
                  </div>
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/50 px-2 py-1 rounded">Perbarui</span>
                </button>
              </div>

              {profileMessage.text && (
                <div className={`p-4 rounded-xl text-sm font-bold ${profileMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                  {profileMessage.text}
                </div>
              )}

              <button disabled={profileLoading} type="submit" className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-white bg-sky-500 hover:bg-sky-600 shadow-md shadow-sky-500/20 transition-all disabled:opacity-70 mt-6">
                {profileLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Simpan Profil
              </button>
            </form>
          </div>
        </div>

        {/* Password Modal */}
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)}></div>
            <div className="relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/50 dark:border-slate-700">
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-slate-700 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">Ubah Sandi</h2>
              </div>
              
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Sandi Saat Ini</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      type="password" 
                      required
                      value={currentPassword} 
                      onChange={e => setCurrentPassword(e.target.value)} 
                      className="pl-10 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium transition-all" 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Sandi Baru</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      type="password" 
                      required
                      minLength={6}
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      className="pl-10 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium transition-all" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Konfirmasi Sandi Baru</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      type="password" 
                      required
                      minLength={6}
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      className="pl-10 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium transition-all" 
                    />
                  </div>
                </div>

                {passwordMessage.text && (
                  <div className={`p-4 rounded-xl text-sm font-bold ${passwordMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                    {passwordMessage.text}
                  </div>
                )}

                <button disabled={passwordLoading} type="submit" className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-500/20 transition-all disabled:opacity-70 mt-6">
                  {passwordLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Perbarui Sandi
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
