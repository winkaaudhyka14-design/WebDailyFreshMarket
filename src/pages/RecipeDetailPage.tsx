import React, { useEffect, useState } from 'react';
import { ArrowLeft, Flame, Clock, CheckCircle2, ShoppingCart, X, Plus, Minus, Trash2, Check } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { recipes } from '../lib/recipes';
import { Product, getProducts } from '../lib/products';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

const formatCurrency = (val: number | undefined) => {
  if (val === undefined) return 'Rp -';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
};

export default function RecipeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const recipe = recipes.find(r => r.id === Number(id));
  const [productsData, setProductsData] = useState<Product[]>([]);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [cartItems, setCartItems] = useState<{product: Product, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const [showRecipeToast, setShowRecipeToast] = useState<string | null>(null);

  useEffect(() => {
    getProducts().then(setProductsData).catch(console.error);
  }, []);

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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const syncAuthCart = async () => {
      if (currentUser) {
        try {
          const { doc, getDoc, setDoc } = await import('firebase/firestore');
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          let dbCart: {product: Product, quantity: number}[] = [];
          if (userDoc.exists()) {
            const userData = userDoc.data();
            dbCart = (userData.cart || []) as {product: Product, quantity: number}[];
          }
          
          // Get current local cart items from localStorage (guest cart)
          const localCartStr = localStorage.getItem('guest_cart');
          let localCart: {product: Product, quantity: number}[] = [];
          if (localCartStr) {
            try {
              localCart = JSON.parse(localCartStr);
            } catch (e) {
              localCart = [];
            }
          }
          
          if (localCart.length > 0) {
            // Merge local guest cart into dbCart
            const merged = [...dbCart];
            localCart.forEach(localItem => {
              const existingIdx = merged.findIndex(item => item.product.id === localItem.product.id);
              if (existingIdx > -1) {
                merged[existingIdx].quantity = Math.max(merged[existingIdx].quantity, localItem.quantity);
              } else {
                merged.push(localItem);
              }
            });
            
            // Save merged cart back to Firestore
            await setDoc(doc(db, 'users', currentUser.uid), { cart: merged }, { merge: true });
            setCartItems(merged);
            localStorage.setItem('guest_cart', JSON.stringify(merged));
          } else {
            setCartItems(dbCart);
            localStorage.setItem('guest_cart', JSON.stringify(dbCart));
          }
        } catch (err) {
          console.error("Gagal sinkronisasi keranjang saat login:", err);
        }
      } else {
        // User logged out: load guest cart from localStorage
        const localCartStr = localStorage.getItem('guest_cart');
        if (localCartStr) {
          try {
            setCartItems(JSON.parse(localCartStr));
          } catch {
            setCartItems([]);
          }
        } else {
          setCartItems([]);
        }
      }
    };

    syncAuthCart();
  }, [currentUser]);

  const updateCartAndSync = async (newItems: {product: Product, quantity: number}[]) => {
    setCartItems(newItems);
    localStorage.setItem('guest_cart', JSON.stringify(newItems));
    const activeUser = auth.currentUser;
    if (activeUser) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', activeUser.uid), {
          cart: newItems.map(item => ({
            product: {
              id: item.product.id,
              name: item.product.name,
              category: item.product.category,
              price: item.product.price,
              imageUrls: item.product.imageUrls,
              tgl_masuk: item.product.tgl_masuk || '',
              tgl_expired: item.product.tgl_expired || ''
            },
            quantity: item.quantity
          }))
        }, { merge: true });
      } catch (err) {
        console.error("Gagal sinkronisasi keranjang ke Firestore:", err);
      }
    }
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    const updated = cartItems.map(item => {
      if (item.product.id === productId) {
        return { ...item, quantity: item.quantity + delta };
      }
      return item;
    }).filter(item => item.quantity > 0);
    updateCartAndSync(updated);
  };

  const removeFromCart = (productId: string) => {
    const updated = cartItems.filter(item => item.product.id !== productId);
    updateCartAndSync(updated);
  };

  const clearCart = () => {
    updateCartAndSync([]);
  };

  const checkoutWhatsApp = () => {
    if (cartItems.length === 0) return;
    let message = `Halo DailyFresh Market, saya ingin memesan (Pengiriman Same Day):\n\n`;
    let total = 0;
    cartItems.forEach(item => {
      message += `- ${item.product.name} (x${item.quantity}) - ${formatCurrency(item.product.price! * item.quantity)}\n`;
      total += (item.product.price! * item.quantity);
    });
    message += `\nTotal Belanja: ${formatCurrency(total)}\n\nMohon informasi ongkos kirim dan cara pembayaran. Terima kasih.`;
    
    const waNumber = '0000000000'; // Gunakan nomor asli Anda jika merilis web ini
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleAddToCart = (product: Product) => {
    let updated = [...cartItems];
    const existingIdx = updated.findIndex(item => item.product.id === product.id);
    if (existingIdx > -1) {
      updated = updated.map((item, idx) => idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item);
    } else {
      updated = [...updated, { product, quantity: 1 }];
    }
    updateCartAndSync(updated);
    setIsCartOpen(true);
    setShowRecipeToast(`"${product.name}" berhasil ditambahkan ke keranjang belanja Anda.`);
    setTimeout(() => setShowRecipeToast(null), 4000);
  };

  const handleBuyAllIngredients = () => {
    if (!recipe) return;
    if (productsData.length === 0) return;
    const user = auth.currentUser;
    if (!user) {
      navigate(`/login?redirect=/recipe/${recipe.id}`);
      return;
    }
    
    // Add all linked products to the cart as requested!
    if (recipe.linkedProducts && recipe.linkedProducts.length > 0) {
      let updated = [...cartItems];
      const matchedProds = recipe.linkedProducts
        .map(pId => productsData.find(p => p.id === pId))
        .filter((p): p is Product => !!p);
      
      if (matchedProds.length > 0) {
        matchedProds.forEach(product => {
          const existingIdx = updated.findIndex(item => item.product.id === product.id);
          if (existingIdx > -1) {
            updated = updated.map((item, idx) => idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item);
          } else {
            updated = [...updated, { product, quantity: 1 }];
          }
        });
        updateCartAndSync(updated);
        setIsCartOpen(true);
        setShowRecipeToast(`Berhasil memasukkan ${matchedProds.length} bahan untuk resep "${recipe.title}" ke keranjang!`);
        setTimeout(() => setShowRecipeToast(null), 4000);
      }
    }
  };

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 dark:text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Resep tidak ditemukan</h2>
          <button onClick={() => navigate('/all-recipes')} className="text-amber-500 hover:underline">Kembali ke Daftar Resep</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'dark' : 'light-mode'} min-h-screen bg-[#FAF7F2] dark:bg-slate-950 text-slate-800 dark:text-slate-300 transition-colors duration-300 font-sans flex flex-col`}>
      
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FAF7F2]/80 dark:bg-slate-900/80 border-b border-amber-900/5 dark:border-slate-800 shadow-sm">
        <div className="w-full max-w-none px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/all-recipes')}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                  Nutri<span className="text-amber-500">AI</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex items-center justify-center shadow-sm"
                aria-label="Buka Keranjang"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#FAF7F2] dark:border-slate-900 animate-none">
                    {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-none px-4 sm:px-8 lg:px-12 py-8 lg:py-12 flex flex-col-reverse lg:flex-row gap-12 lg:gap-20">
        
        {/* Left Column: Content */}
        <div className="w-full lg:w-3/5 pb-12">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-bold text-sm mb-6">
              {recipe.category}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-6 leading-tight">
              {recipe.title}
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
              {recipe.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-12 pb-12 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl">
                <Flame className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-0.5">Kalori</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{recipe.calories} kkal</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="p-2 bg-sky-50 dark:bg-sky-900/30 rounded-xl">
                <Clock className="w-6 h-6 text-sky-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-0.5">Estimasi Waktu</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{recipe.time}</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-1 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                Bahan-Bahan
              </h3>
              <ul className="grid sm:grid-cols-2 gap-4">
                {recipe.ingredients.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              
              {recipe.linkedProducts && recipe.linkedProducts.length > 0 && productsData.length > 0 && (
                <div className="mt-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">Mulai Masak? Beli Bahannya:</h4>
                    <button
                      id="buy-all-ingredients-btn"
                      onClick={handleBuyAllIngredients}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/10 transition-all cursor-pointer w-full sm:w-auto"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Beli Semua Bahan ({recipe.linkedProducts.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {recipe.linkedProducts.map(productId => {
                      const product = productsData.find(p => p.id === productId);
                      if (!product) return null;
                      return (
                        <div key={product.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex flex-col hover:border-amber-500/50 transition-colors shadow-sm">
                          <div className="w-full aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden mb-3">
                            <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mt-auto">{product.name}</h5>
                          <button 
                            onClick={() => handleAddToCart(product)}
                            className="mt-3 w-full py-2 bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> Tambah Bahan
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Cara Membuat</h3>
              <ol className="space-y-6">
                {recipe.instructions.map((step, idx) => (
                  <li key={idx} className="flex gap-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="flex items-center justify-center w-10 h-10 text-lg rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-black shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed pt-1.5">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* Right Column: Image */}
        <div className="w-full lg:w-2/5">
          <div className="sticky top-32 w-full aspect-[4/5] lg:h-[700px] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 transform rotate-1 hover:rotate-0 transition-transform duration-500">
            <img 
              src={recipe.image} 
              alt={recipe.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
          </div>
        </div>
      </main>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsCartOpen(false)}
            ></motion.div>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl h-full flex flex-col relative z-10 border-l border-sky-100 dark:border-slate-800"
            >
              <div className="p-5 sm:p-6 border-b border-sky-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6 text-sky-500" />
                  <h3 className="text-xl font-bold text-sky-950 dark:text-white">Keranjang</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {cartItems.length > 0 && (
                    <button
                      id="clear-cart-btn"
                      onClick={() => setShowClearCartConfirm(true)}
                      className="text-xs font-bold text-red-500 hover:text-white bg-transparent hover:bg-red-500 dark:hover:bg-red-600 border border-red-200 dark:border-red-900/50 hover:border-red-500 dark:hover:border-red-600 px-3 py-1.5 rounded-full transition-all cursor-pointer mr-1"
                    >
                      Kosongkan
                    </button>
                  )}
                  <button
                    id="close-cart-btn"
                    onClick={() => setIsCartOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-center">Keranjang Anda masih kosong.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map(item => (
                      <div key={item.product.id} className="flex gap-4 p-3 bg-sky-50/50 dark:bg-slate-800/50 rounded-xl border border-sky-100/50 dark:border-slate-700/50">
                        <img src={item.product.imageUrls[0]} alt={item.product.name} className="w-16 h-16 rounded-lg object-cover" />
                        <div className="flex-1 flex flex-col">
                          <h4 className="font-bold text-sm text-sky-950 dark:text-sky-100 line-clamp-1">{item.product.name}</h4>
                          <p className="text-sky-600 dark:text-sky-400 font-medium text-sm">{formatCurrency(item.product.price)}</p>
                          <div className="flex items-center justify-between mt-auto pt-2">
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-lg px-2 py-1">
                              <button onClick={() => updateCartQuantity(item.product.id, -1)} className="text-slate-400 hover:text-sky-500">-</button>
                              <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateCartQuantity(item.product.id, 1)} className="text-slate-400 hover:text-sky-500">+</button>
                            </div>
                            <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 hover:text-red-500 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="p-5 sm:p-6 border-t border-sky-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between font-bold text-sky-950 dark:text-white mb-4">
                    <span>Total</span>
                    <span className="text-xl text-sky-500">{formatCurrency(cartItems.reduce((acc, item) => acc + ((item.product.price || 0) * item.quantity), 0))}</span>
                  </div>
                  <button
                    onClick={checkoutWhatsApp}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all outline-none focus:ring-4 focus:ring-emerald-500/20 cursor-pointer"
                  >
                    Pesan via WhatsApp (Same Day)
                  </button>
                  <p className="text-xs text-center text-slate-500 mt-3">*Hanya melayani pengiriman Same Day terdekat.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Cart Confirmation Modal */}
      <AnimatePresence>
        {showClearCartConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => setShowClearCartConfirm(false)}
            ></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 z-10 text-center"
            >
              <button 
                onClick={() => setShowClearCartConfirm(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors pointer-events-auto cursor-pointer border-none"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                Hapus Semua Produk?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Apakah Anda yakin ingin menghapus seluruh produk yang ada di dalam keranjang belanja Anda? Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearCartConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    clearCart();
                    setShowClearCartConfirm(false);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white shadow-lg shadow-red-500/10 transition-colors cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showRecipeToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-[120] max-w-sm w-full bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3"
          >
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl mt-0.5 shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-slate-100">Berhasil!</h4>
              <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                {showRecipeToast}
              </p>
            </div>
            <button
              onClick={() => setShowRecipeToast(null)}
              className="text-slate-400 hover:text-slate-200 p-0.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
