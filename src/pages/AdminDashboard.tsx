import React, { useState, useEffect } from 'react';
import { Product, getProducts, addProduct, updateExistingProduct, deleteProductRecord } from '../lib/products';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Edit2, Trash2, LogOut, Package, RefreshCw, X, Search, User, ChevronDown, Home, Settings, ShoppingCart, Activity, Check, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import UsersManager from '../components/UsersManager';
import SalesManager from '../components/SalesManager';

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'sayuran': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50';
    case 'buah': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50';
    case 'daging': return 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/50';
    case 'jamur': return 'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800/50';
    case 'cemilan': return 'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800/50';
    default: return 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/50';
  }
};

const getPriceUnit = (product: any) => {
  if (product.category === 'Cemilan' && !product.name.toLowerCase().includes('kentang')) {
    return '/ pcs';
  }
  return '/ 100g';
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'products' | 'users' | 'sales'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customPhotoURL, setCustomPhotoURL] = useState<string | null>(null);
  const [customDisplayName, setCustomDisplayName] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const navigate = useNavigate();
  const currentUser = auth.currentUser;

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

  useEffect(() => {
    if (currentUser) {
      const fetchAdminProfile = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../firebase');
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCustomPhotoURL(userData.photoURL || null);
            setCustomDisplayName(userData.displayName || null);
          }
        } catch (err) {
          console.error("Gagal mengambil profil admin dari Firestore:", err);
        }
      };
      fetchAdminProfile();
    }
  }, [currentUser]);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', category: '', tgl_masuk: '', tgl_expired: '', description: '', imageUrls: [], price: 0, stock: 0
  });
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    setIsLogoutConfirmOpen(true);
  };

  const confirmLogout = async () => {
    await signOut(auth);
    setIsLogoutConfirmOpen(false);
    navigate('/');
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      id: Date.now().toString(),
      name: '', category: 'Sayuran', tgl_masuk: '', tgl_expired: '', description: '', imageUrls: [], price: 0, stock: 0
    });
    setSelectedImages([]);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData(p);
    setSelectedImages(p.imageUrls || []);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setProductToDelete(id);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      await deleteProductRecord(productToDelete);
      fetchProducts();
      setProductToDelete(null);
      showToast("Produk berhasil dihapus!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = { ...formData, imageUrls: selectedImages } as Product;
    
    if (editingProduct) {
      await updateExistingProduct(finalData);
      showToast("Produk berhasil diedit!");
    } else {
      await addProduct(finalData);
      showToast("Produk berhasil ditambahkan!");
    }
    
    setIsModalOpen(false);
    fetchProducts();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let scaleSize = 1;
        if (img.width > MAX_WIDTH) {
          scaleSize = MAX_WIDTH / img.width;
        }
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setSelectedImages(prev => [...prev, dataUrl]);
        setIsUploading(false);
      };
      img.onerror = () => {
        setIsUploading(false);
        alert('Gagal memproses gambar');
      };
    };
    reader.onerror = () => {
      setIsUploading(false);
      alert('Gagal membaca file gambar');
    };
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-br from-sky-500 to-indigo-600 dark:from-slate-900 dark:to-slate-950 text-white border-r border-sky-400/30 dark:border-slate-800 flex-col hidden md:flex">
        <div className="h-[96px] px-6 border-b border-white/20 dark:border-slate-800 flex flex-col justify-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-8 h-8 text-white" />
            DailyFresh<span className="text-sky-200 font-extrabold">Market</span>
          </h1>
          <p className="text-xs text-sky-100 font-medium uppercase tracking-wider mt-1">Admin Panel</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button 
            onClick={() => setActiveTab('products')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'products' ? 'bg-white/20 text-white shadow-lg shadow-black/10 backdrop-blur-sm' : 'text-sky-100 hover:bg-white/10'}`}
          >
            <Package className="w-5 h-5 flex-shrink-0" />
            Kelola Produk
          </button>
          <button 
            onClick={() => setActiveTab('sales')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'sales' ? 'bg-white/20 text-white shadow-lg shadow-black/10 backdrop-blur-sm' : 'text-sky-100 hover:bg-white/10'}`}
          >
            <ShoppingCart className="w-5 h-5 flex-shrink-0" />
            Kelola Penjualan
          </button>
          <button 
            onClick={() => setActiveTab('users')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-white/20 text-white shadow-lg shadow-black/10 backdrop-blur-sm' : 'text-sky-100 hover:bg-white/10'}`}
          >
            <User className="w-5 h-5 flex-shrink-0" />
            Kelola Pengguna
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-[96px] bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex justify-between items-center z-20">
          <div className="flex items-center md:hidden">
            {/* Mobile Title */}
             <h1 className="text-xl font-bold flex items-center gap-2">
                <Package className="w-6 h-6 text-sky-500" />
                DailyFresh<span className="text-sky-500">Market</span>
            </h1>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
             <h2 className="text-xl font-bold text-sky-900 dark:text-sky-100">
               {activeTab === 'products' ? 'Manajemen Produk' : activeTab === 'sales' ? 'Manajemen Penjualan' : 'Manajemen Pengguna'}
             </h2>
             {activeTab === 'products' && (
                <button onClick={fetchProducts} className="p-2 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-700 transition" title="Refresh">
                  <RefreshCw className="w-5 h-5" />
                </button>
             )}
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-auto relative">
             {/* Light and dark mode toggle */}
             <button
               onClick={() => setIsDarkMode(!isDarkMode)}
               className="p-2 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-slate-600 dark:text-slate-300 focus:outline-none bg-white dark:bg-slate-800 flex items-center justify-center cursor-pointer"
               aria-label="Toggle Dark Mode"
               title={isDarkMode ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
             >
               {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />}
             </button>

             {/* Profile Dropdown */}
             <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 p-1.5 md:p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                >
                  <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-slate-700 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold border border-sky-200 dark:border-slate-600 overflow-hidden">
                    {customPhotoURL || currentUser?.photoURL ? (
                      <img src={customPhotoURL || currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                       <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-none mb-1">{customDisplayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin'}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none">{currentUser?.email}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
                </button>

                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 overflow-hidden transform origin-top-right transition-all">
                      <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-700/50 md:hidden bg-slate-50 dark:bg-slate-800">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-slate-700 text-sky-600 flex items-center justify-center">
                             <User className="w-5 h-5" />
                           </div>
                           <div>
                             <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{customDisplayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin'}</p>
                             <p className="text-xs text-slate-500">{currentUser?.email}</p>
                           </div>
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        <button onClick={() => navigate('/')} className="w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-3 transition">
                          <Home className="w-4 h-4 text-slate-400" />
                          Landing Page
                        </button>
                        <button onClick={() => navigate('/settings')} className="w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-3 transition">
                          <Settings className="w-4 h-4 text-slate-400" />
                          Pengaturan Akun
                        </button>
                      </div>
                      <div className="px-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 mt-1">
                        <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl flex items-center gap-3 transition">
                          <LogOut className="w-4 h-4" />
                          Keluar
                        </button>
                      </div>
                    </div>
                  </>
                )}
             </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-sky-50 dark:bg-slate-900 p-4 md:p-8">
          {/* Mobile Tabs */}
          <div className="md:hidden flex gap-2 mb-6">
            <button onClick={() => setActiveTab('products')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex justify-center items-center gap-2 ${activeTab === 'products' ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-slate-700'}`}>
              <Package className="w-4 h-4" />Produk
            </button>
            <button onClick={() => setActiveTab('sales')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex justify-center items-center gap-2 ${activeTab === 'sales' ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-slate-700'}`}>
              <ShoppingCart className="w-4 h-4" />Jual
            </button>
            <button onClick={() => setActiveTab('users')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex justify-center items-center gap-2 ${activeTab === 'users' ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-slate-700'}`}>
              <User className="w-4 h-4" />User
            </button>
          </div>

          {activeTab === 'sales' ? (
            <SalesManager onShowToast={showToast} />
          ) : activeTab === 'users' ? (
            <UsersManager onShowToast={showToast} />
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 className="w-12 h-12 animate-spin text-sky-500 mb-6" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Memuat data produk...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    className="pl-10 pr-4 py-2.5 w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all font-medium shadow-sm"
                    placeholder="Cari produk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={fetchProducts} className="flex-shrink-0 md:hidden flex items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-sky-500 transition">
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    <button onClick={openAddModal} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-md shadow-sky-500/20 transition-all">
                      <Plus className="w-5 h-5" />
                      Tambah Produk
                    </button>
                </div>
              </div>
              
              <div className="bg-white/95 backdrop-blur-xl dark:bg-slate-800/95 rounded-3xl shadow-xl shadow-sky-900/10 dark:shadow-none border border-white dark:border-sky-800/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-slate-800 dark:to-slate-900 text-white shadow-sm border-b border-sky-400/30 dark:border-slate-700">
                        <th className="p-4 font-extrabold text-white uppercase text-xs tracking-wider">#</th>
                        <th className="p-4 font-extrabold text-white uppercase text-xs tracking-wider">Produk</th>
                        <th className="p-4 font-extrabold text-white uppercase text-xs tracking-wider">Kategori</th>
                        <th className="p-4 font-extrabold text-white uppercase text-xs tracking-wider">Harga (100g/pcs)</th>
                        <th className="p-4 font-extrabold text-white uppercase text-xs tracking-wider">Stok</th>
                        <th className="p-4 font-extrabold text-white uppercase text-xs tracking-wider">Tgl Masuk</th>
                        <th className="p-4 font-extrabold text-white uppercase text-xs tracking-wider">Tgl Kedaluwarsa</th>
                        <th className="p-4 font-extrabold text-white uppercase text-xs tracking-wider text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase())).map((p, idx) => (
                      <tr key={p.id} className="border-b border-sky-50 dark:border-slate-700/50 hover:bg-sky-50/50 dark:hover:bg-sky-900/10 transition-colors">
                        <td className="p-4">
                          <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center">
                            {idx + 1}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <img 
                              src={p.imageUrls[0]} 
                              alt={p.name} 
                              className="w-12 h-12 object-cover rounded-xl bg-slate-100 dark:bg-slate-900 shadow-sm cursor-pointer hover:opacity-80 transition-opacity" 
                              onClick={() => setZoomedImage(p.imageUrls[0])}
                            />
                            <div>
                              <p className="font-bold">{p.name}</p>
                              <p className="text-xs text-sky-600/70 dark:text-sky-400/70 truncate max-w-[200px] mt-0.5">{p.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getCategoryColor(p.category)}`}>{p.category}</span>
                        </td>
                        <td className="p-4 text-sm font-bold whitespace-nowrap">
                          {p.price !== undefined ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(p.price) + ' ' + getPriceUnit(p) : 'Rp -'}
                        </td>
                        <td className="p-4 text-sm font-bold whitespace-nowrap">
                          {p.stock !== undefined ? p.stock : 0}
                        </td>
                        <td className="p-4 text-sm font-medium">{p.tgl_masuk}</td>
                        <td className="p-4 text-sm font-medium">{p.tgl_expired}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditModal(p)} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition" title="Hapus">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-12 font-medium text-sky-600/70 dark:text-sky-400/60">Tidak ada data produk.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          )}

          {/* Modal Form */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
              <div className="relative bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full transition"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5 flex flex-col h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Nama Produk</label>
                      <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Harga (per 100gr / per pcs)</label>
                      <input type="number" required value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Stok Barang</label>
                      <input type="number" required value={formData.stock !== undefined ? formData.stock : 0} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Kategori</label>
                      <select required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 transition">
                        <option value="Sayuran">Sayuran</option>
                        <option value="Buah">Buah</option>
                        <option value="Jamur">Jamur</option>
                        <option value="Daging">Daging</option>
                        <option value="Cemilan">Cemilan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Tanggal Masuk (YYYY-MM-DD)</label>
                      <input type="date" required value={formData.tgl_masuk} onChange={e => setFormData({ ...formData, tgl_masuk: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Tanggal Kedaluwarsa (YYYY-MM-DD)</label>
                      <input type="date" required value={formData.tgl_expired} onChange={e => setFormData({ ...formData, tgl_expired: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 transition" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Upload Gambar Produk</label>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-3">
                        {selectedImages.map((src, idx) => (
                          <div key={idx} className="relative w-24 h-24 rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900 group">
                            <img src={src} alt="Uploaded preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button type="button" onClick={() => removeImage(idx)} className="p-1.5 bg-rose-500 rounded-full text-white hover:bg-rose-600 transition">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <label className="w-24 h-24 rounded-xl border-2 border-dashed border-sky-300 dark:border-slate-600 flex flex-col items-center justify-center text-sky-500 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-900/50 cursor-pointer transition">
                          {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                          <span className="text-[10px] sm:text-xs font-semibold mt-1">{isUploading ? 'Proses...' : 'Tambah'}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Deskripsi Produk</label>
                    <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 transition shadow-sm"></textarea>
                  </div>
                  
                  <div className="flex justify-end pt-4 mt-auto">
                    <button type="submit" className="w-full md:w-auto px-8 py-3.5 rounded-xl font-bold bg-sky-500 hover:bg-sky-600 text-white transition shadow-lg shadow-sky-500/30">
                       {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {productToDelete && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setProductToDelete(null)}></div>
              <div className="relative bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-center">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50/50 dark:ring-rose-900/10">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">Hapus Produk?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus produk ini secara permanen?</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setProductToDelete(null)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-300"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 transition-colors"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </div>
          )}

          {isLogoutConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-700/50 text-center relative animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center mb-4">
                  <LogOut className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                  Konfirmasi Keluar?
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  Apakah Anda yakin ingin keluar dari akun Anda?
                </p>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsLogoutConfirmOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={confirmLogout}
                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 transition-colors cursor-pointer"
                  >
                    Ya, Keluar
                  </button>
                </div>
              </div>
            </div>
          )}

          {zoomedImage && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-slate-900/80 backdrop-blur-sm" onClick={() => setZoomedImage(null)}>
              <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
                <button 
                  onClick={() => setZoomedImage(null)} 
                  className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
                >
                  <X className="w-6 h-6" />
                </button>
                <img 
                  src={zoomedImage} 
                  alt="Zoomed" 
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10" 
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="fixed bottom-6 right-6 z-[120] max-w-sm w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3"
              >
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl mt-0.5 shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-slate-100">Berhasil!</h4>
                  <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                    {toastMessage}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-slate-400 hover:text-slate-200 p-0.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

