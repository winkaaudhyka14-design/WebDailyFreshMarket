import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Store, ShoppingCart, Loader2, Sparkles, Plus, Minus, Trash2, Calendar, LayoutGrid, Info, Tag, Lightbulb, Search, Activity, Droplet, Flame, Wheat, X, Eye, ZoomIn, LogIn, User, LogOut, Settings, Home, LayoutDashboard, ArrowRight, Sprout, Mail, MapPin, Facebook, Instagram, Twitter, ChevronRight, ShieldCheck, Award, Clock, Heart, ChefHat, Utensils, Users, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../lib/products';
import { recipes } from '../lib/recipes';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../firebase';



// No longer using BmiCalculator/HealthyRecipes directly here

// --- Types for AI State ---
type AIState = 'idle' | 'loading' | 'success';
type Tab = 'home' | 'products' | 'about' | 'special_nutrition';

interface AIOutput {
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  sugar: string;
  micronutrients: string[];
  recipeIdea?: {
    title: string;
    prepTime: string;
    instructions: string[];
    nutrition: {
      calories: number;
      protein: string;
      carbs: string;
      fat: string;
    };
  };
}

const formatCurrency = (val: number | undefined) => {
  if (val === undefined) return 'Rp -';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
};

const getPriceUnit = (product: any) => {
  if (product.category === 'Cemilan' && !product.name.toLowerCase().includes('kentang')) {
    return '/ pcs';
  }
  return '/ 100gr';
};

export default function App() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches) || document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [aboutTabState, setAboutTabState] = useState<'visimisi' | 'produk' | 'nutriai'>('visimisi');
  const [kitchenActiveSubTab, setKitchenActiveSubTab] = useState<'recipes' | 'tips' | 'planner'>('recipes');
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState<string>('Semua');
  const [recipeSearchQuery, setRecipeSearchQuery] = useState<string>('');
  const [plannerFamilySize, setPlannerFamilySize] = useState<number>(2);
  const [plannerPreference, setPlannerPreference] = useState<'hemat' | 'praktis' | 'gizi'>('praktis');
  const [showRecipeToast, setShowRecipeToast] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<(Product & { quantity?: number })[]>([]);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [productsData, setProductsData] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [customPhotoURL, setCustomPhotoURL] = useState<string | null>(null);
  const [customDisplayName, setCustomDisplayName] = useState<string | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [cartItems, setCartItems] = useState<{product: Product, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Dapur Virtual Sisa states
  const [aiDrawerMode, setAiDrawerMode] = useState<'store' | 'kitchen'>('store');
  const [leftoverInput, setLeftoverInput] = useState('');
  const [kitchenRecipes, setKitchenRecipes] = useState<any[]>([]);
  const [kitchenAiState, setKitchenAiState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [kitchenAiError, setKitchenAiError] = useState('');

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
        console.error("Gagal menyinkronkan keranjang ke database:", err);
      }
    }
  };

  const addToCart = (product: Product) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    const existingIdx = cartItems.findIndex(item => item.product.id === product.id);
    let updated: {product: Product, quantity: number}[];
    if (existingIdx > -1) {
      updated = cartItems.map((item, idx) => idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item);
    } else {
      updated = [...cartItems, { product, quantity: 1 }];
    }
    updateCartAndSync(updated);

    // Close the product detail modal if it's currently open for this product
    if (selectedProduct && selectedProduct.id === product.id) {
      setSelectedProduct(null);
    }

    setShowRecipeToast(`"${product.name}" berhasil ditambahkan ke keranjang belanja Anda.`);
    const timer = setTimeout(() => setShowRecipeToast(null), 4000);
    return () => clearTimeout(timer);
  };

  const addMultipleToCart = (productsToAdd: Product[], messageOnSuccess?: string) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    let updated = [...cartItems];
    productsToAdd.forEach(product => {
      const existingIdx = updated.findIndex(item => item.product.id === product.id);
      if (existingIdx > -1) {
        updated = updated.map((item, idx) => idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        updated = [...updated, { product, quantity: 1 }];
      }
    });
    updateCartAndSync(updated);
    setIsCartOpen(true);
    if (messageOnSuccess) {
      setShowRecipeToast(messageOnSuccess);
      setTimeout(() => setShowRecipeToast(null), 4000);
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

  const handleLogout = () => {
    setIsProfileDropdownOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await signOut(auth);
    setShowLogoutConfirm(false);
  };

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
            let currentRole = userData.role || 'pelanggan';
            if (currentUser.email === 'admin@naturachill.com') {
              currentRole = 'admin';
            }
            setUserRole(currentRole);
            setCustomPhotoURL(userData.photoURL || null);
            setCustomDisplayName(userData.displayName || null);
          } else {
            let currentRole = 'pelanggan';
            if (currentUser.email === 'admin@naturachill.com') {
              currentRole = 'admin';
            }
            setUserRole(currentRole);
            setCustomPhotoURL(null);
            setCustomDisplayName(null);
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
        setUserRole(null);
        setCustomPhotoURL(null);
        setCustomDisplayName(null);
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

  useEffect(() => {
    import('../lib/products').then(({ getProducts }) => {
      getProducts().then(data => {
        setProductsData(data);
        const params = new URLSearchParams(window.location.search);
        const pid = params.get('productId');
        const s = params.get('search');
        if (pid) {
          const product = data.find((p: any) => p.id === pid);
          if (product) {
            setSelectedProduct(product);
            setActiveTab('products');
          }
        } else if (s) {
          setActiveTab('products');
        }
      }).catch(err => {
        console.error("Failed to fetch products:", err);
      }).finally(() => {
        setLoadingProducts(false);
      });
    });
  }, []);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('search') || '';

  const [aiState, setAiState] = useState<AIState>('idle');
  const [aiOutput, setAiOutput] = useState<AIOutput | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const s = params.get('search');
    if (s !== null) {
      if (s !== searchQuery) {
        setSearchQuery(s);
        setActiveTab('products');
      }
    } else if (searchQuery !== '') {
      setSearchQuery('');
    }
    const pid = params.get('productId');
    if (pid && productsData.length > 0) {
      const product = productsData.find(p => p.id === pid);
      if (product && (!selectedProduct || selectedProduct.id !== product.id)) {
        setSelectedProduct(product);
        setActiveTab('products');
      }
    }
    const addAllRecipeId = params.get('addAllRecipeId');
    if (addAllRecipeId && productsData.length > 0) {
      const recipeObj = recipes.find(r => r.id === Number(addAllRecipeId));
      if (recipeObj && recipeObj.linkedProducts) {
        const matchedProds = recipeObj.linkedProducts
          .map(pId => productsData.find(p => p.id === pId))
          .filter((p): p is Product => !!p);
        
        if (matchedProds.length > 0) {
          addMultipleToCart(matchedProds, `Berhasil memasukkan semua bahan untuk resep "${recipeObj.title}" ke keranjang!`);
          // Clear query params so it doesn't trigger again on reload
          navigate(location.pathname, { replace: true });
        }
      }
    }
  }, [location.search, productsData]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const categories = ['Semua', 'Sayuran', 'Buah', 'Jamur', 'Daging', 'Cemilan'];

  // Toggle dark class on root html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDarkMode]);

  // Reset modal image state when a new product is selected
  useEffect(() => {
    if (selectedProduct) {
      setSelectedImageIndex(0);
      setIsLightboxOpen(false);
    }
  }, [selectedProduct]);

  const handleSelectItem = (product: Product) => {
    if (!selectedItems.find((item) => item.id === product.id)) {
      setSelectedItems([...selectedItems, { ...product, quantity: 1 }]);
      // Reset AI state when new items are added
      if (aiState === 'success') {
        setAiState('idle');
        setAiOutput(null);
      }
    }
    setIsAiOpen(true);
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== productId));
    if (aiState === 'success') {
      setAiState('idle');
      setAiOutput(null);
    }
  };

  const handleIncrementQuantity = (productId: string) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.id === productId ? { ...item, quantity: (item.quantity || 1) + 1 } : item
      )
    );
    if (aiState === 'success') {
      setAiState('idle');
      setAiOutput(null);
    }
  };

  const handleDecrementQuantity = (productId: string) => {
    setSelectedItems(
      selectedItems.map((item) => {
        if (item.id === productId) {
          const currentQty = item.quantity || 1;
          return { ...item, quantity: currentQty > 1 ? currentQty - 1 : 1 };
        }
        return item;
      })
    );
    if (aiState === 'success') {
      setAiState('idle');
      setAiOutput(null);
    }
  };

  const handleCalculateAi = async () => {
    if (selectedItems.length === 0) return;
    
    setAiState('loading');
    
    try {
      const response = await fetch('/api/gemini/analyze-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedItems })
      });
      
      if (!response.ok) {
        throw new Error('Gagal mendapatkan nutrisi dan resep. Status: ' + response.status);
      }
      
      const aiResponse = await response.json();
      
      setAiOutput(aiResponse);
      setAiState('success');
    } catch (error) {
      console.error("AI Generation Error", error);
      alert("Maaf, gagal memuat hasil dari AI. Harap coba beberapa saat lagi atau cek koneksi dan API Key Anda.");
      setAiState('idle');
    }
  };

  const handleCalculateKitchenAi = async () => {
    if (!leftoverInput.trim()) return;
    setKitchenAiState('loading');
    setKitchenAiError('');
    try {
      const response = await fetch('/api/gemini/kitchen-leftovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftovers: leftoverInput,
          storeProducts: (productsData || []).map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            description: p.description
          }))
        })
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal memproses dapur virtual. Status: ' + response.status);
      }
      const data = await response.json();
      setKitchenRecipes(data.recipes || []);
      setKitchenAiState('success');
    } catch (error: any) {
      console.error("Kitchen AI Error State", error);
      setKitchenAiError(error.message || String(error));
      setKitchenAiState('error');
    }
  };

  const matchedProduct = (item: any) => {
    if (!item) return null;
    const byId = productsData.find(p => p.id === String(item.productId));
    if (byId) return byId;
    const nameToSearch = (item.productName || '').toLowerCase();
    const byName = productsData.find(p => p.name.toLowerCase().includes(nameToSearch));
    return byName || null;
  };

  const navLinks: { id: Tab; label: string }[] = [
    { id: 'home', label: 'Beranda' },
    { id: 'products', label: 'Katalog Produk' },
    { id: 'about', label: 'Tentang Kami' },
    { id: 'special_nutrition', label: 'Inspirasi Dapur' }
  ];

  return (
    // Note: Dark Mode colors applied here: 
    // Light=bg-[#ffffff] text-[#0c4a6e], Dark=bg-[#0f172a] text-[#38bdf8]
    <div className={`${isDarkMode ? 'dark' : 'light-mode'} min-h-screen bg-sky-100 text-sky-800 dark:bg-slate-900 dark:text-sky-400 transition-colors duration-300 font-sans selection:bg-sky-200 dark:selection:bg-sky-900/50 flex flex-col`}>
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/80 border-b border-sky-100 dark:border-slate-800 shadow-sm">
        <div className="w-full max-w-none px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setActiveTab('home')}
            >
              <div className="p-2 bg-sky-100 dark:bg-sky-900/50 rounded-xl text-sky-600 dark:text-sky-300">
                <Store className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-sky-900 dark:text-sky-100">
                Daily<span className="text-sky-500 dark:text-sky-400">Fresh</span> Market
              </h1>
            </div>

            <nav className="hidden md:flex items-center gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeTab === link.id
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                      : 'text-sky-800/70 hover:bg-sky-50 dark:text-sky-400/70 dark:hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </nav>
            
            <div className="flex items-center gap-4 relative">
              {/* Shopping Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="p-2 border border-sky-200 dark:border-slate-700 rounded-full hover:bg-sky-100 dark:hover:bg-slate-800 transition-colors text-sky-700 dark:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-900 relative"
                aria-label="Keranjang Belanja"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-none">
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              </button>

              {/* Light and dark mode toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 border border-sky-200 dark:border-slate-700 rounded-full hover:bg-sky-100 dark:hover:bg-slate-800 transition-colors text-sky-700 dark:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-900"
                aria-label="Toggle Dark Mode"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Profile Menu or Login */}
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="p-1 border border-sky-200 dark:border-slate-700 rounded-full hover:bg-sky-100 dark:hover:bg-slate-800 transition-colors text-sky-700 dark:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center w-10 h-10"
                    aria-label="Profile Menu"
                  >
                    {customPhotoURL || currentUser.photoURL ? (
                      <img src={customPhotoURL || currentUser.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </button>
                  
                  {isProfileDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-sky-100 dark:border-slate-700 py-2 z-50 overflow-hidden transform origin-top-right transition-all">
                        <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-slate-700 text-sky-600 flex items-center justify-center overflow-hidden">
                              {customPhotoURL || currentUser.photoURL ? (
                                <img src={customPhotoURL || currentUser.photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" />
                              ) : (
                                <User className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{customDisplayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin'}</p>
                              <p className="text-xs text-slate-500">{currentUser?.email}</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-2 space-y-1">
                          {userRole === 'admin' && (
                            <button onClick={() => { navigate('/admin'); setIsProfileDropdownOpen(false); }} className="w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-sky-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-3 transition">
                              <LayoutDashboard className="w-4 h-4 text-slate-400" />
                              Dashboard Admin
                            </button>
                          )}
                          <button onClick={() => { navigate('/settings'); setIsProfileDropdownOpen(false); }} className="w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-sky-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-3 transition">
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
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 rounded-2xl text-sm font-black bg-sky-500 hover:bg-sky-600 text-white transition-all shadow-md shadow-sky-500/10 hover:shadow-lg hover:shadow-sky-500/25 flex items-center gap-2 border border-sky-400/20 dark:border-sky-600/30 hover:-translate-y-0.5 active:translate-y-0"
                  aria-label="Login"
                >
                  <span>Login</span>
                  <User className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile Nav */}
        <div className="md:hidden border-t border-sky-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-4 py-2 flex justify-center gap-2">
           {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-1 ${
                  activeTab === link.id
                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                    : 'text-sky-800/70 dark:text-sky-400/70'
                }`}
              >
                {link.label}
              </button>
            ))}
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="w-full max-w-none px-4 sm:px-8 lg:px-12 py-8 flex-1">
        <AnimatePresence mode="wait">
          
          {/* =====================
                TAB: BERANDA (HOME)
              ===================== */}
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <section 
                className="mb-12 text-center md:text-left relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-sky-100 dark:border-slate-850 min-h-[480px] flex items-center bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(2, 6, 23, 0.95) 0%, rgba(2, 6, 23, 0.8) 50%, rgba(2, 6, 23, 0.4) 100%), url('https://i.pinimg.com/1200x/83/35/b5/8335b51ac60872f87269bd5682ca9c53.jpg')`
                }}
              >
                <div className="relative z-10 max-w-3xl p-8 md:p-12 lg:p-16">
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight leading-tight drop-shadow-sm">
                    Selamat Datang di <br className="hidden md:block"/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-sky-200">DailyFresh Market</span>
                  </h2>
                  <p className="text-slate-100 md:text-lg mb-8 leading-relaxed max-w-2xl font-medium drop-shadow-md">
                    Solusi belanja harian modern yang segar, praktis, dan berkualitas tinggi. Temukan berbagai pilihan sayuran segar, buah, daging, bahan pangan umum, hingga hidangan lezat. Cobalah fitur unggulan <strong>NutriAI</strong> kami untuk mendapatkan ide resep sehat seketika!
                  </p>
                  <button 
                    onClick={() => setActiveTab('products')}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-8 py-4 rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 mx-auto md:mx-0"
                  >
                    Mulai Belanja & Eksplorasi NutriAI
                  </button>
                </div>
              </section>

              <div className="mb-12">
                {/* Rekomendasi Spesial Untukmu */}
                <div className="bg-gradient-to-b from-sky-50/40 to-white dark:from-slate-900/40 dark:to-slate-950 rounded-[2.5rem] p-6 lg:p-10 border border-sky-100 dark:border-slate-800/80 shadow-2xl shadow-sky-100/50 dark:shadow-none">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-50 dark:bg-slate-950 text-indigo-500 dark:text-indigo-400 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-sky-950 dark:text-sky-50 tracking-tight">Rekomendasi Spesial Untukmu 🌟</h3>
                        <p className="text-sm text-sky-600/80 dark:text-sky-400/80 font-medium">Bahan makanan tinggi nutrisi pilihan terbaik untuk gaya hidup sehatmu hari ini</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {(() => {
                      const recommendedIds = ['1', '13', '16'];
                      const displayRecommendations = productsData.filter((item: any) => recommendedIds.includes(item.id));
                      const finalRecommendations = displayRecommendations.length >= 3 ? displayRecommendations : productsData.slice(0, 3);
                      const discountPercent = 20;

                      return finalRecommendations.map((item: any) => {
                        const originalPrice = Math.round((item.price || 0) / (1 - discountPercent / 100));
                        return (
                          <div 
                            key={item.id} 
                            className="group relative flex flex-col bg-white dark:bg-slate-900 border border-sky-100/80 dark:border-slate-800/80 rounded-[2rem] overflow-hidden shadow-md hover:shadow-2xl hover:border-sky-300 dark:hover:border-slate-700 transition-all duration-500 hover:-translate-y-2"
                          >
                            {/* Top floating discount badge */}
                            <div className="absolute top-4 left-4 bg-rose-500 text-white text-[11px] font-black px-3.5 py-1.5 rounded-full shadow-md tracking-wider uppercase z-10 animate-pulse">
                              Hemat {discountPercent}%
                            </div>

                            {/* Quick selection plus button */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectItem(item);
                                setIsAiOpen(true);
                              }}
                              title="Gunakan bahan untuk NutriAI"
                              className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/95 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-400 text-sky-600 dark:text-sky-400 p-2.5 rounded-full transition-all shadow-md z-10 backdrop-blur-sm border border-sky-100/30"
                            >
                              <Plus className="w-5 h-5" />
                            </button>

                            {/* Large Web Poster Image on top */}
                            <div 
                              className="relative aspect-[4/3] w-full overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-800"
                              onClick={() => setSelectedProduct(item)}
                            >
                              <img 
                                src={item.imageUrls[0]} 
                                alt={item.name} 
                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" 
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-50"></div>
                            </div>

                            {/* Card Content details */}
                            <div className="p-6 flex-1 flex flex-col justify-between">
                              <div>
                                {/* Category & Freshness indicator */}
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-[10px] font-black py-1 px-3.5 rounded-full bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 uppercase tracking-widest border border-sky-100/50 dark:border-slate-700">
                                    {item.category}
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                                    Segar Pilihan
                                  </span>
                                </div>

                                {/* Title */}
                                <h4 
                                  onClick={() => setSelectedProduct(item)}
                                  className="font-extrabold text-sky-950 dark:text-sky-100 text-lg sm:text-xl line-clamp-1 mb-1.5 hover:text-sky-500 dark:hover:text-sky-400 cursor-pointer transition-colors"
                                >
                                  {item.name}
                                </h4>

                                {/* Short product description excerpt */}
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4 min-h-[48px]">
                                  {item.description || "Bahan makanan berkualitas premium pilihan, dikemas higienis dengan nutrisi seimbang untuk mendukung kebugaran harian keluarga Anda."}
                                </p>
                              </div>

                              <div>
                                {/* Price display with strikethrough decoration */}
                                <div className="flex items-baseline gap-2 mb-5">
                                  <span className="text-xl font-black text-rose-500 dark:text-rose-400">
                                    {formatCurrency(item.price)}
                                  </span>
                                  <span className="text-xs line-through text-slate-400 font-medium">
                                    {formatCurrency(originalPrice)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {getPriceUnit(item)}
                                  </span>
                                </div>

                                {/* Poster design footer action button */}
                                <div className="mt-2.5">
                                  <button 
                                    onClick={() => setSelectedProduct(item)}
                                    className="w-full py-3 px-4 bg-sky-500 hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-400 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-sky-500/10 hover:shadow-sky-500/30 flex items-center justify-center gap-1.5 uppercase tracking-wider"
                                  >
                                    Selengkapnya (NutriAI)
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Fitur Tambahan: Kalkulator BMI & Resep Sehat - TEASER */}
              {/* BMI Calculator Section */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Visual Image Side */}
                <div 
                  onClick={() => navigate('/bmi')}
                  className="group relative rounded-[2.5rem] overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-rose-500/20 transition-all duration-500 min-h-[400px] flex flex-col justify-end"
                >
                  <img src="https://i.pinimg.com/1200x/a8/7c/ca/a87ccabcc83706a7d973c5779222fc30.jpg" alt="Kenali Tubuhmu Jaga Nutrisimu" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                  
                  <div className="relative z-10 p-8 flex flex-col items-start translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="flex items-center gap-4 mb-2">
                       <div className="w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/40">
                         <Activity className="w-6 h-6" />
                       </div>
                    </div>
                  </div>
                </div>

                {/* Text Explanation Side */}
                <div className="bg-sky-50 dark:bg-slate-800/80 rounded-[2.5rem] p-8 md:p-12 border border-sky-100 dark:border-slate-700 shadow-lg shadow-sky-100/50 dark:shadow-none flex flex-col justify-center items-start relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Activity className="w-48 h-48 text-rose-500" />
                   </div>
                   <div className="relative z-10">
                     <span className="text-rose-500 dark:text-rose-400 font-black tracking-widest uppercase text-xs sm:text-sm mb-4 block">Pusat Kesehatan Anda</span>
                     <h3 className="text-4xl md:text-5xl font-black text-sky-950 dark:text-sky-50 tracking-tight leading-tight mb-6">
                       Kenali Tubuhmu,<br />
                       <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500">
                         Jaga Nutrisimu.
                       </span>
                     </h3>
                     <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                       Ayo cari tahu apakah berat badanmu sudah ideal! Gunakan Kalkulator BMI & Kalori pintar kami untuk merencanakan asupan harian kamu dan dapatkan bentuk tubuh idamanmu dengan cara yang sehat.
                     </p>
                     <button 
                       onClick={() => navigate('/bmi')}
                       className="text-base sm:text-lg font-bold bg-rose-500 hover:bg-rose-600 text-white px-8 py-4 rounded-full shadow-lg shadow-rose-500/30 flex items-center gap-3 transition-transform hover:-translate-y-1"
                     >
                        Mulai Hitung Sekarang <ArrowRight className="w-5 h-5" />
                     </button>
                   </div>
                </div>
              </div>

               {/* Inspirasi Resep Sehat - FULL WIDTH */}
               <div 
                  onClick={() => navigate('/recipes')}
                  className="group relative rounded-[2.5rem] overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-500 min-h-[400px] mb-12 flex flex-col justify-center bg-slate-900"
                >
                  <img src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=1600" alt="Healthy Recipes" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out opacity-60 sm:opacity-100" />
                  <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-transparent"></div>
                  
                  <div className="relative z-10 p-8 md:p-16 flex flex-col items-start md:w-2/3">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/30 flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-500">
                        <Flame className="w-7 h-7" />
                      </div>
                      <span className="text-amber-400 font-black tracking-widest uppercase text-sm">Kreasi Dapur Sehat</span>
                    </div>
                    
                    <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 tracking-tight">
                      Inspirasi Resep<br/>Sehat & Bergizi
                    </h3>
                    
                    <p className="text-slate-300 text-lg md:text-xl mb-10 max-w-xl leading-relaxed">
                      Sajian lezat tak harus mengorbankan kesehatan. Temukan kreasi hidangan bernutrisi tinggi menggunakan bahan segar berkualitas dari DailyFresh.
                    </p>
                    
                    <button className="text-base sm:text-lg font-bold bg-white text-slate-900 px-8 py-4 rounded-full shadow-xl flex items-center gap-3 group-hover:bg-amber-50 transition-all group-hover:shadow-amber-500/20">
                       Jelajahi Koleksi Resep Kami <ArrowRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
            </motion.div>
          )}

          {/* =====================
                TAB: KATALOG PRODUK
              ===================== */}
          {activeTab === 'products' && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col"
            >
              {/* --- CATALOG GRID --- */}
              <div className="w-full">
                <div className="flex items-center gap-3 mb-6">
                  <LayoutGrid className="w-6 h-6 text-sky-500" />
                  <h2 className="text-2xl font-bold tracking-tight text-sky-950 dark:text-sky-100">Katalog Produk</h2>
                </div>

                <div className="flex overflow-x-auto gap-2 mb-4 pb-2" style={{ scrollbarWidth: 'none' }}>
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all shrink-0 ${
                        selectedCategory === category 
                          ? 'bg-sky-500 text-white shadow-md' 
                          : 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-700 shadow-md shadow-sky-200/40 dark:shadow-none'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400 dark:text-sky-500" />
                  <input 
                    type="text"
                    placeholder="Cari sayur, buah, atau cemilan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-900 dark:text-sky-100 placeholder-sky-400/70 shadow-md shadow-sky-200/40 dark:shadow-none transition-shadow"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 pb-8">
                  {productsData.filter((p: any) => {
                    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
                    return matchesSearch && matchesCategory;
                  }).map((product) => (
                    <div 
                      key={product.id} 
                      className="bg-white dark:bg-slate-800 border border-sky-100 dark:border-slate-700 rounded-3xl p-5 shadow-xl shadow-sky-200/40 dark:shadow-none hover:shadow-2xl hover:border-sky-300 dark:hover:border-slate-600 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute -top-6 -right-6 w-40 h-40 opacity-[0.04] dark:opacity-5 transform group-hover:scale-110 transition-transform duration-500 pointer-events-none rounded-full overflow-hidden">
                        <img src={product.imageUrls[0]} alt="" className="w-full h-full object-cover grayscale" />
                      </div>
                      
                      <div className="flex items-start gap-4 mb-5 relative z-10">
                        <div 
                          className="shrink-0 bg-sky-50/80 dark:bg-slate-900/80 w-16 h-16 rounded-2xl flex items-center justify-center border border-sky-100/50 dark:border-slate-700/50 shadow-sm overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="inline-block text-[10px] sm:text-xs font-semibold px-2.5 py-1 mb-1.5 rounded-full bg-sky-100/80 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 backdrop-blur-sm border border-sky-200/50 dark:border-sky-800/50">
                            {product.category}
                          </span>
                          <h3 className="text-lg font-bold text-sky-950 dark:text-sky-50 mb-1 truncate">{product.name}</h3>
                          <div className="flex items-center gap-1.5 text-[13px] font-bold text-sky-700 dark:text-sky-300 mb-2">
                            <span>{formatCurrency(product.price)}</span>
                            <span className="text-[10px] font-medium text-sky-600/60 dark:text-sky-400/60">{getPriceUnit(product)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-sky-600/70 dark:text-sky-200/60">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Kedaluwarsa: {product.tgl_expired}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 relative z-10 w-full mt-auto pt-3">
                        <button
                          onClick={() => handleSelectItem(product)}
                          disabled={selectedItems.some(i => i.id === product.id)}
                          title="Pilih untuk NutriAI"
                          className="w-11 shrink-0 py-2.5 rounded-xl flex items-center justify-center font-semibold text-sm transition-all
                            disabled:opacity-50 disabled:cursor-not-allowed
                            bg-sky-50 hover:bg-sky-500 hover:text-white text-sky-600 
                            dark:bg-slate-900 dark:hover:bg-sky-500 dark:hover:text-white dark:text-sky-400
                            border border-sky-200 dark:border-slate-700 hover:border-transparent dark:hover:border-transparent"
                        >
                          <Sparkles className="w-5 h-5 pointer-events-none" />
                        </button>

                        <button
                          onClick={() => addToCart(product)}
                          className="flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-sm transition-all
                            bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                        >
                          <ShoppingCart className="w-4 h-4 pointer-events-none" />
                          + Keranjang
                        </button>
                        
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="w-11 shrink-0 flex items-center justify-center rounded-xl transition-all bg-white hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-sky-200 dark:border-slate-600 text-sky-500 dark:text-sky-400 shadow-sm hover:shadow-md"
                          title="Detail"
                        >
                          <Info className="w-5 h-5 pointer-events-none" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>


            </motion.div>
          )}

          {/* =====================
                TAB: TENTANG KAMI
              ===================== */}
          {activeTab === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl mx-auto mt-8 px-4 sm:px-0"
            >
              {/* Header Box */}
              <div className="text-center mb-10">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-150 dark:border-sky-900/50 text-sky-600 dark:text-sky-300 text-xs font-bold tracking-wider uppercase mb-4 shadow-sm animate-pulse">
                  🌱 Mengenal Kami Lebih Dekat
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-50 mb-4 tracking-tight leading-tight">
                  Tentang <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">DailyFresh Market</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-400 md:text-lg max-w-2xl mx-auto leading-relaxed">
                  Menyediakan kualitas terbaik untuk konsumsi harian keluarga Anda. Kami menggabungkan kelengkapan bahan pangan segar harian dengan inovasi NutriAI.
                </p>
              </div>

              {/* Main Interactive Interactive Hub */}
              <div className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/75 rounded-3xl border border-slate-205 dark:border-slate-800 shadow-xl overflow-hidden p-6 md:p-8 mb-10 transition-all hover:shadow-2xl hover:border-sky-100 dark:hover:border-slate-700/80">
                {/* Switcher Navigation */}
                <div className="flex flex-wrap items-center justify-center gap-3 border-b border-slate-150 dark:border-slate-800/80 pb-6 mb-8">
                  <button
                    onClick={() => setAboutTabState('visimisi')}
                    className={`px-5 py-3 rounded-2xl text-xs md:text-sm font-bold tracking-wide transition-all duration-300 flex items-center gap-2 ${
                      aboutTabState === 'visimisi'
                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/25 scale-[1.03]'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    Komitmen Kami
                  </button>

                  <button
                    onClick={() => setAboutTabState('produk')}
                    className={`px-5 py-3 rounded-2xl text-xs md:text-sm font-bold tracking-wide transition-all duration-300 flex items-center gap-2 ${
                      aboutTabState === 'produk'
                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/25 scale-[1.03]'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    Pilihan Produk Lengkap
                  </button>

                  <button
                    onClick={() => setAboutTabState('nutriai')}
                    className={`px-5 py-3 rounded-2xl text-xs md:text-sm font-bold tracking-wide transition-all duration-300 flex items-center gap-2 ${
                      aboutTabState === 'nutriai'
                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/25 scale-[1.03]'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Asisten Cerdas NutriAI
                  </button>
                </div>

                {/* Sub Tab Contents */}
                <AnimatePresence mode="wait">
                  {aboutTabState === 'visimisi' && (
                    <motion.div
                      key="visimisi"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
                    >
                      <div className="space-y-4">
                        <div className="inline-block px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-widest rounded-md animate-pulse">
                          Our Commitment
                        </div>
                        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                          Menjamin Mutu & Kelengkapan Kebutuhan Harian
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                          Kami berdedikasi untuk mempermudah Anda dalam memenuhi segala macam belanja kebutuhan harian, mulai dari bahan pangan premium dan segar hingga aneka hidangan favorit keluarga. 
                          <strong> DailyFresh Market</strong> dirancang sebagai solusi satu pintu yang praktis, cepat, dan selalu dapat diandalkan oleh setiap rumah tangga di mana pun.
                        </p>
                        <div className="pt-2 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                              ✓
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              <strong>Pemasok Terpercaya</strong>: Menjamin pasokan barang yang segar, konsisten, dan higienis.
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                              ✓
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              <strong>Kemasan Terbaik</strong>: Setiap pesanan dipilah dengan cermat dan dikemas modern agar aman layaknya belanja langsung.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right conceptual graphics */}
                      <div className="bg-gradient-to-br from-sky-500/5 to-indigo-500/5 dark:from-slate-800/40 dark:to-slate-800/20 p-8 rounded-3xl border border-sky-100/50 dark:border-slate-800 text-center relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-sky-400 to-indigo-400 rounded-full opacity-10 filter blur-3xl"></div>
                        <Award className="w-16 h-16 text-sky-500 dark:text-sky-400 mx-auto mb-4 animate-bounce" />
                        <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-1">Standar Kualitas Premium</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                          Kepuasan Anda adalah prioritas utama kami. Kami berkomitmen menyuguhkan kelayakan produk terbaik serta kesigapan layanan untuk pengalaman berbelanja terbaik.
                        </p>
                        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 rounded-full border border-sky-100 dark:border-slate-750 text-indigo-500 dark:text-indigo-400 text-[10px] font-bold shadow-sm">
                          🎖️ Mitra Harian Keluarga Anda
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {aboutTabState === 'produk' && (
                    <motion.div
                      key="produk"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
                    >
                      <div className="space-y-4">
                        <div className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest rounded-md animate-pulse">
                          Complete Catalog
                        </div>
                        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                          Belanja Segala Kebutuhan Tanpa Batas Sektoral
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                          Di DailyFresh Market, kami memahami bahwa kehidupan harian membutuhkan keragaman menu. Kami tidak membatasi diri hanya pada pangan diet khusus (“Healthy Foods” saja). 
                        </p>
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                          Anda dapat menemukan daging beku siap olah, aneka sayuran kebun segar, bumbu masak instan, buah-buahan segar, hingga cemilan lezat harian favorit keluarga – semua terakomodasi dalam katalog satu pintu kami yang praktis.
                        </p>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="p-3 bg-slate-100/50 dark:bg-slate-800/40 dark:border-slate-700/80 border rounded-xl text-center">
                            <span className="text-xl">🥩</span>
                            <span className="block font-bold text-xs text-slate-800 dark:text-slate-200 mt-1">Daging & Segar</span>
                          </div>
                          <div className="p-3 bg-slate-100/50 dark:bg-slate-800/40 dark:border-slate-700/80 border rounded-xl text-center">
                            <span className="text-xl">🍟</span>
                            <span className="block font-bold text-xs text-slate-800 dark:text-slate-200 mt-1">Camilan Harian</span>
                          </div>
                        </div>
                      </div>

                      {/* Right conceptual graphics */}
                      <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-slate-800/40 dark:to-slate-800/20 p-8 rounded-3xl border border-emerald-100/50 dark:border-slate-800 text-center relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full opacity-10 filter blur-3xl"></div>
                        <Store className="w-16 h-16 text-emerald-500 dark:text-emerald-400 mx-auto mb-4 animate-pulse" />
                        <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-1">Netral & Lengkap</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                          Semua jenis pangan dari yang segar natural hingga cemilan renyah modern ada di satu katalog. Belanja mingguan kini tidak perlu pindah tempat!
                        </p>
                        <button 
                          onClick={() => setActiveTab('products')}
                          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          Lihat Katalog Produk <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {aboutTabState === 'nutriai' && (
                    <motion.div
                      key="nutriai"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
                    >
                      <div className="space-y-4">
                        <div className="inline-block px-3 py-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-extrabold uppercase tracking-widest rounded-md animate-pulse">
                          Smart Lifestyle
                        </div>
                        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                          Revolusi AI: Memandu Nutrisi di Dapur Anda
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                          DailyFresh Market menyematkan kecerdasan buatan <strong>NutriAI</strong> untuk menjembatani barang belanjaan Anda dengan pola saji sehat. 
                          Hanya dengan memilih beberapa produk dari katalog, asisten pintar kami akan menyusun rincian kalori, protein, lemak, karbohidrat, serta menyarankan resep masakan yang lezat seketika.
                        </p>
                        <div className="pt-2 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs shrink-0">
                              🔥
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                              Penghitung Kalori Presisi Instan
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs shrink-0">
                              🍳
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                              Saran Ide Menu Harian Berbasis Bahan Pilihan
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right conceptual graphics */}
                      <div className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 dark:from-slate-800/40 dark:to-slate-800/20 p-8 rounded-3xl border border-violet-100/50 dark:border-slate-800 text-center relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-violet-400 to-purple-400 rounded-full opacity-10 filter blur-3xl"></div>
                        <Sparkles className="w-16 h-16 text-violet-500 dark:text-violet-400 mx-auto mb-4 animate-pulse" />
                        <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-1">Kecerdasan NutriAI Terpadu</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                          Buka tab Inspirasi Dapur atau asisten mengambang AI di sudut bawah untuk menghitung kebutuhan harian keluarga Anda tanpa biaya tambahan.
                        </p>
                        <div className="mt-4 inline-flex items-center gap-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-bold px-3 py-1 rounded-full border border-violet-200/40">
                          ⚡ Didukung Gemini Pro API Resmi
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Advanced Interactive Features Cards */}
              <div className="text-center mt-12 mb-6">
                <span className="text-xs font-bold text-indigo-500 dark:text-sky-400 uppercase tracking-widest block mb-1">
                  Mengapa Kami Berbeda?
                </span>
                <h3 className="text-xl md:text-2xl font-black text-slate-850 dark:text-slate-100">
                  Pelayanan Unggul & Standar Keunggulan Kami
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="group p-6 bg-white dark:bg-slate-900/45 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-xl hover:border-sky-500/30 hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-sky-500/5 rounded-full group-hover:scale-150 transition-all duration-500"></div>
                  <div className="w-12 h-12 bg-sky-100 dark:bg-sky-950/50 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400 mb-4 font-bold text-xl group-hover:bg-sky-600 group-hover:text-white transition-all">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-450 transition-colors">Higienis & Segar</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Pengemasan modern hibris kedap udara untuk menahan kemurnian serta menjaga higienitas barang agar awet secara natural tanpa bahan pengawet buatan.
                  </p>
                </div>

                <div className="group p-6 bg-white dark:bg-slate-900/45 border border-slate-205 dark:border-slate-800 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-xl hover:border-emerald-500/30 hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-all duration-500"></div>
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 font-bold text-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Same Day & Instan</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Setiap pemesanan sebelum jam 15.00 akan dikirimkan di hari yang sama. Pengemasan cepat dengan armada logistik lokal berkualitas mumpuni.
                  </p>
                </div>

                <div className="group p-6 bg-white dark:bg-slate-900/45 border border-slate-205 dark:border-slate-800 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-xl hover:border-violet-500/30 hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-violet-500/5 rounded-full group-hover:scale-150 transition-all duration-500"></div>
                  <div className="w-12 h-12 bg-violet-100 dark:bg-violet-950/50 rounded-xl flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4 font-bold text-xl group-hover:bg-violet-600 group-hover:text-white transition-all">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Pelayanan Prima (Customer First)</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Sistem feedback terpadu melalui WhatsApp. Tim support kami siap melayani kebutuhan pelanggan 24/7 demi garansi kepuasan tepercaya.
                  </p>
                </div>
              </div>
            </motion.div>
          )}



          {/* =====================
                TAB: INSPIRASI DAPUR (KITCHEN DASHBOARD)
              ===================== */}
          {activeTab === 'special_nutrition' && (
            <motion.div
              key="special_nutrition"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <section className="max-w-6xl mx-auto mt-8 px-4 sm:px-6">
                
                {/* Section Title Header */}
                <div className="text-center mb-10">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 text-xs font-bold tracking-wider uppercase mb-3 shadow-sm">
                    🍳 Inspirasi Masak Harian
                  </span>
                  <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-50 mb-4 tracking-tight">KREASI INDAH DI DAPUR</h2>
                  <p className="text-slate-600 dark:text-slate-400 md:text-lg max-w-2xl mx-auto leading-relaxed">
                    Eksplorasi resep masakan, tips merawat kebersihan sayur, serta asisten perencanaan belanja otomatis yang terintegrasi langsung dengan katalog buah & daging segar kami.
                  </p>
                </div>

                {/* Sub Tab Switcher Navigation */}
                <div className="flex justify-center mb-8">
                  <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700 shadow-sm max-w-full overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setKitchenActiveSubTab('recipes')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap outline-none ${
                        kitchenActiveSubTab === 'recipes'
                          ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-300 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <ChefHat className="w-4 h-4" />
                      Ide Resep Kilat
                    </button>
                    <button
                      onClick={() => setKitchenActiveSubTab('tips')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap outline-none ${
                        kitchenActiveSubTab === 'tips'
                          ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-300 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Lightbulb className="w-4 h-4" />
                      Tips & Trik Cerdas
                    </button>
                    <button
                      onClick={() => setKitchenActiveSubTab('planner')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap outline-none ${
                        kitchenActiveSubTab === 'planner'
                          ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-300 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Rencana Belanja Menu
                    </button>
                  </div>
                </div>

                {/* Sub Tab: RECIPES */}
                {kitchenActiveSubTab === 'recipes' && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Filter and Search Panel */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                      <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {['Semua', 'Tumisan', 'Sup Hangat', 'Premium Sehat', 'Sarapan Kilat'].map(category => (
                          <button
                            key={category}
                            onClick={() => setRecipeCategoryFilter(category)}
                            className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                              recipeCategoryFilter === category
                                ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => navigate('/recipes')}
                        className="flex items-center justify-center gap-2 px-5 py-2 w-full md:w-auto bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Search className="w-4 h-4" />
                        Jelajahi Resep Lebih Banyak
                      </button>
                    </div>

                    {/* Recipes Infinite-Like Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        {
                          id: 'rec_1',
                          title: 'Tumis Sehat Ayam & Wortel Brokoli',
                          category: 'Tumisan',
                          desc: 'Protein dada ayam empuk ditumis bersama wortel segar kaya vitamin A dan brokoli garing bergizi.',
                          time: '15 Menit',
                          portions: '3 Orang',
                          calories: '280 kkal',
                          intensity: 'Sangat Mudah',
                          color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
                          bgGrad: 'from-emerald-500/5 to-teal-500/5 dark:from-emerald-950/10 dark:to-teal-950/10',
                          ingredientIds: ['7', '3', '1'],
                          ingredientsText: [
                            '250g Dada Ayam Fillet (dipotong dadu)',
                            '1 bonggol Brokoli Hijau Segar (dipotong per kuntum)',
                            '1 buah Wortel Berastagi Segar (diiris tipis bulat)',
                            '2 siung Bawang Putih cincang halus',
                            '1 sdt Kecap Asin & minyak wijen secukupnya'
                          ],
                          steps: [
                            'Cuci bersih brokoli, rendam air garam hangat sebentar, lalu tiriskan.',
                            'Panaskan sedikit minyak, tumis bawang putih iris hingga tercium harum keemasan.',
                            'Masukkan potongan dada ayam fillet, aduk rata hingga berubah warna pucat.',
                            'Tambahkan wortel dan brokoli, percikkan sedikit air agar cepat empuk.',
                            'Beri kecap asin, lada, garam dan minyak wijen. Tumis kilat selama 5 menit hingga matang sempurna dan sajikan hangat.'
                          ]
                        },
                        {
                          id: 'rec_2',
                          title: 'Sup Kaldu Gurih Sosis & Tofu',
                          category: 'Sup Hangat',
                          desc: 'Kuah bening sosis sapi bakar dipadu bayam segar dan kelembutan tahu sutra dalam kehangatan sup harian.',
                          time: '12 Menit',
                          portions: '2-3 Orang',
                          calories: '190 kkal',
                          intensity: 'Sangat Mudah',
                          color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400',
                          bgGrad: 'from-amber-500/5 to-orange-500/5 dark:from-amber-950/10 dark:to-orange-900/10',
                          ingredientIds: ['10', '14', '2', '12'],
                          ingredientsText: [
                            '3 buah Sosis Sapi Bakar premium (diiris bulat miring)',
                            '1 blok Tahu Sutra Putih (dipotong dadu lembut)',
                            '1 ikat Bayam Cabut Segar (disiangi daunnya)',
                            '1 buah Tomat Merah Segar (dipotong menjadi 4 bagian)',
                            'Bawang merah goreng untuk taburan gurih di atasnya'
                          ],
                          steps: [
                            'Didihkan 600ml air di panci kecil dengan sedikit kaldu bubuk ayam/sapi asli.',
                            'Masukkan potongan sosis sapi bakar premium dan irisan wortel/tomat segar.',
                            'Setelah kuah mendidih kembali, masukkan tahu sutra putih dengan lembut agar tidak hancur.',
                            'Tambahkan bayam segar menjelang sup diangkat agar daun bayam tetap hijau cerah dan renyah garing.',
                            'Taburkan bawang goreng harum di atas sup hangat dan nikmati bersama keluarga.'
                          ]
                        },
                        {
                          id: 'rec_3',
                          title: 'Salmon Panggang Brokoli Mentega',
                          category: 'Premium Sehat',
                          desc: 'Fillet salmon kaya kandungan omega-3 dipanggang lembut di teflon bertabur mentega, disajikan dengan brokoli kukus.',
                          time: '15 Menit',
                          portions: '1-2 Orang',
                          calories: '420 kkal',
                          intensity: 'Sedang',
                          color: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400',
                          bgGrad: 'from-indigo-500/5 to-purple-500/5 dark:from-indigo-950/10 dark:to-purple-950/10',
                          ingredientIds: ['16', '1', '12'],
                          ingredientsText: [
                            '1 potong Fillet Salmon Segar premium',
                            '1/2 bonggol Brokoli Hijau Segar (dikukus matang)',
                            '1 buah Tomat Segar pendamping segar',
                            '1 sdm Mentega (unsalted butter) berkualitas',
                            'Jeruk lemon, lada bubuk hitam, dan garam secukupnya'
                          ],
                          steps: [
                            'Taburi fillet salmon segar dengan sedikit lada bubuk hitam, garam, dan kucuran jeruk lemon peras.',
                            'Panaskan teflon antilengket, masukkan mentega berkualitas hingga meleleh harum.',
                            'Panggang salmon dengan sisi kulit menghadap ke bawah terlebih dahulu selama 4-5 menit hingga krispi.',
                            'Balik dengan hati-hati, panggang sisi sebaliknya selama 3 menit lagi hingga seluruh bagian berwarna pink matang.',
                            'Sajikan salmon hangat bersama brokoli kukus segar dan irisan tomat pelapis piring.'
                          ]
                        },
                        {
                          id: 'rec_4',
                          title: 'Sarapan Gizi: Scrambled Egg & Fresh Strawberries',
                          category: 'Sarapan Kilat',
                          desc: 'Telur orak-arik mentega nan lembut disantap bersama dessert mangkuk buah strawberry dan potongan apel manis segar.',
                          time: '8 Menit',
                          portions: '1 Orang',
                          calories: '230 kkal',
                          intensity: 'Sangat Mudah',
                          color: 'bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-400',
                          bgGrad: 'from-pink-500/5 to-rose-500/5 dark:from-pink-950/10 dark:to-rose-950/10',
                          ingredientIds: ['15', '13', '4'],
                          ingredientsText: [
                            '2 butir Telur Ayam berkualitas tinggi',
                            '6-8 buah Strawberry Manis (dicuci dan dibelah dua)',
                            '1/2 buah Apel Fuji Segar (diiris tipis)',
                            '1 sdm mentega atau mentega cair masak',
                            'Garam halus dan lada secukupnya'
                          ],
                          steps: [
                            'Kocok lepas dua butir telur ayam di mangkuk kecil dengan sejumput garam halus dan lada.',
                            'Panaskan wajan anti lengket dengan sedikit mentega cair dengan api kecil.',
                            'Tuang kocokan telur ayam, diamkan beberapa detik, lalu orak-arik perlahan ke tengah wajan hingga terbentuk lipatan lembut (creamy scrambled eggs).',
                            'Angkat telur selagi masih bertekstur lembab, sajikan di piring sarapan.',
                            'Makan pagi bersama semangkuk irisan strawberry manis serta apel krispi segar di samping piring.'
                          ]
                        }
                      ].filter(recipe => {
                        const matchesCategory = recipeCategoryFilter === 'Semua' || recipe.category === recipeCategoryFilter;
                        const matchesQuery = recipe.title.toLowerCase().includes(recipeSearchQuery.toLowerCase()) || 
                                             recipe.desc.toLowerCase().includes(recipeSearchQuery.toLowerCase());
                        return matchesCategory && matchesQuery;
                      }).map((recipe) => {
                        // Calculate total bundle price based on current actual prices
                        const bundlePrice = recipe.ingredientIds.reduce((total, id) => {
                          const matchingProd = productsData.find(p => p.id === id);
                          return total + (matchingProd?.price || 0);
                        }, 0);

                        return (
                          <div 
                            key={recipe.id}
                            className={`group relative rounded-3xl overflow-hidden border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between`}
                          >
                            <div className="p-6">
                              {/* Recipe Category Pill */}
                              <div className="flex items-center justify-between mb-4">
                                <span className="inline-block px-3 py-1 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 text-xs font-bold">
                                  {recipe.category}
                                </span>
                                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{recipe.time}</span>
                                </div>
                              </div>

                              {/* Title */}
                              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors mb-2">
                                {recipe.title}
                              </h3>

                              {/* Description */}
                              <p className="text-slate-500 dark:text-slate-400 text-sm mb-5 leading-relaxed line-clamp-2">
                                {recipe.desc}
                              </p>

                              {/* Small Quick Specs Row */}
                              <div className="flex flex-wrap gap-x-4 gap-y-2 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 mb-4 border border-slate-100/50 dark:border-slate-800/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">🍽️ {recipe.portions}</span>
                                <span className="text-slate-300 dark:text-slate-700">|</span>
                                <span className="flex items-center gap-1">🔥 {recipe.calories}</span>
                                <span className="text-slate-300 dark:text-slate-700">|</span>
                                <span className="flex items-center gap-1">⚡ {recipe.intensity}</span>
                              </div>

                              {/* Included Products Row in DB */}
                              <div className="mb-4">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-2 font-bold">Bahan Toko Terkait</span>
                                <div className="flex gap-2">
                                  {recipe.ingredientIds.map(id => {
                                    const matchingProd = productsData.find(p => p.id === id);
                                    if (!matchingProd) return null;
                                    return (
                                      <div key={id} className="relative group/tag flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200/50 dark:border-slate-700 shadow-sm cursor-help" title={matchingProd.name}>
                                        <img src={matchingProd.imageUrls[0]} alt={matchingProd.name} className="w-full h-full object-cover" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Sticky Card Footer Action Box */}
                            <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
                              <div className="text-left w-full sm:w-auto">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block uppercase">Harga Paket ({recipe.ingredientIds.length} Bahan)</span>
                                <span className="text-md sm:text-lg font-extrabold text-slate-800 dark:text-white">
                                  {formatCurrency(bundlePrice)}
                                </span>
                              </div>

                              <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                                <button
                                  onClick={() => setSelectedRecipe(recipe)}
                                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 rounded-xl transition-all"
                                >
                                  Cara Memasak
                                </button>
                                <button
                                  onClick={() => {
                                    const matchedProds = productsData.filter(p => recipe.ingredientIds.includes(p.id));
                                    addMultipleToCart(matchedProds, `Berhasil memasukkan ${matchedProds.length} bahan menu "${recipe.title}" ke keranjang!`);
                                  }}
                                  className="flex-1 sm:flex-initial flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow-md outline-none"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  Beli Semua
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Sub Tab: TRICKS & TIPS */}
                {kitchenActiveSubTab === 'tips' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {[
                      {
                        title: 'Bikin Sayuran Segar Kembali Garing',
                        emoji: '🥬',
                        category: 'Metode Segar',
                        text: 'Apakah bayam atau brokoli belanjaan Anda agak letih atau layu setelah penyimpanan di lemari es? Potong sedikit ujung batangnya, lalu rendam di dalam wadah berisi air dingin dan es batu selama 10-15 menit. Sel turgor sayuran akan kembali menyerap kelembaban es, memulihkan serat sel agar krispi renyah luar biasa.'
                      },
                      {
                        title: 'Uji Sederhana Kesegaran Telur Ayam',
                        emoji: '🥚',
                        category: 'Uji Kualitas',
                        text: 'Sebelum memecahkan telur, celupkan ke dalam gelas berisi air dingin. Telur segar tenggelam mendatar di dasar wadah. Jika telur tegak lurus di bagian dasar, artinya sudah disimpan sekitar 10 hari tapi masih aman diolah. Namun, jika telur terapung bebas di permukaan air, segera singkirkan karena sudah berjamur atau rusak.'
                      },
                      {
                        title: 'Protokol Thawing Daging Beku Aman',
                        emoji: '🥩',
                        category: 'Higienitas',
                        text: 'Jangan pernah membiarkan Dada Ayam Fillet Frozen atau Salmon di suhu meja terbuka seharian karena bakteri patogen berkembang biak kilat. Sebaiknya letakkan daging beku di kulkas bawah (chiller) semalaman sebelum dimasak, atau rendam kemasan vakum plastiknya di wadah air dingin biasa yang diganti berkala tiap 30 menit.'
                      },
                      {
                        title: 'Simpan Strawberry Menghindari Jamur',
                        emoji: '🍓',
                        category: 'Penyimpanan',
                        text: 'Strawberry gampang membusuk akibat uap air terperangkap. Cara terbaik: simpan tanpa dibilas terlebih dulu. Lapisi dasar dan sela-sela kotak berongga menggunakan selembar tisu dapur tebal untuk menangkap embun udara dingin kulkas, kencangkan penutup, lalu letakkan di laci sayur sayuran.'
                      },
                      {
                        title: 'Kreasi Sisa Batang Sayur (Zero-Waste)',
                        emoji: '🍲',
                        category: 'Tips Hemat',
                        text: 'Jangan buang bonggol brokoli, kupasan kulit wortel bersih, atau potongan tomat layu. Simpan potongan tadi ke wadah silikon di freezer. Saat sudah menumpuk banyak, rebus bersama air mendidih selama 45 menit dengan selembar daun salam untuk memperoleh kuah kaldu sayuran lezat aromatik yang bergizi.'
                      },
                      {
                        title: 'Mendeteksi Kematangan Apel Fuji',
                        emoji: '🍎',
                        category: 'Panduan Belanja',
                        text: 'Saat menjemput buah Apel Fuji, ketuk perlahan menggunakan jempol tangan Anda. Jika bunyi yang keluar terdengar nyaring padat-garing (high-pitch), daging apel dijamin padat kaya air dan garing renyah. Jika bunyinya berat/redup membal, sel daging buah sudah bertepung kering dan agak lunak.'
                      }
                    ].map((tip, idx) => (
                      <div 
                        key={idx}
                        className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/80 p-6 rounded-3xl hover:shadow-lg transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-3xl p-2.5 bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                              {tip.emoji}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase tracking-wider">
                              {tip.category}
                            </span>
                          </div>
                          <h4 className="text-md sm:text-lg font-bold text-slate-800 dark:text-white mb-2 leading-snug">
                            {tip.title}
                          </h4>
                          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                            {tip.text}
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-[11px] font-medium text-slate-400 flex items-center gap-1">
                          🍋 Solusi Praktis Dapur DailyFresh
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Sub Tab: MEAL PLANNER BUDGET SELECTOR */}
                {kitchenActiveSubTab === 'planner' && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-4xl mx-auto"
                  >
                    {/* Simulator Selection Card */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-850 dark:from-slate-800 dark:to-slate-900 text-white rounded-[2rem] p-6 sm:p-8 border border-slate-800 shadow-xl mb-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
                      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

                      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                            <Users className="w-5 h-5 text-orange-400 animate-bounce" />
                            Kalkulator Paket Hemat Keluarga
                          </h3>
                          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Dapatkan rekomendasi bahan pangan otomatis beserta rincian anggarannya sesuai porsi anggota rumah tangga dan preferensi nutrisi belanja harian Anda.
                          </p>

                          {/* Family Size Picker */}
                          <div className="mb-6">
                            <span className="text-xs text-slate-400 block uppercase font-bold tracking-widest mb-3">Jumlah Anggota Keluarga:</span>
                            <div className="grid grid-cols-3 gap-2">
                              {[2, 4, 6].map(num => (
                                <button
                                  key={num}
                                  onClick={() => setPlannerFamilySize(num)}
                                  className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                                    plannerFamilySize === num
                                      ? 'bg-orange-500 border-orange-500 text-white'
                                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                                  }`}
                                >
                                  {num} Orang
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Cooking Preference Picker */}
                          <div>
                            <span className="text-xs text-slate-400 block uppercase font-bold tracking-widest mb-3">Tujuan Menu Belanja:</span>
                            <div className="flex flex-col gap-2">
                              {[
                                { id: 'hemat', label: 'Hemat Cerdas (Sup, Sayur & Tahu)', desc: 'Ekonomis, tinggi serat nabati dan protein telur.' },
                                { id: 'praktis', label: 'Praktis Kilat (Ayam, Sosis, Kentang)', desc: 'Siap saji, anak-anak suka, hemat waktu kupas.' },
                                { id: 'gizi', label: 'Gizi Maksimal (Salmon Fillet & Buah)', desc: 'Menu prima, padat Omega-3, kaya vitamin buah merah.' }
                              ].map(pref => (
                                <button
                                  key={pref.id}
                                  onClick={() => setPlannerPreference(pref.id as any)}
                                  className={`w-full p-3 rounded-xl text-left border transition-all flex flex-col justify-center ${
                                    plannerPreference === pref.id
                                      ? 'bg-gradient-to-r from-orange-505/20 to-orange-500/10 border-orange-500 text-white shadow-md'
                                      : 'bg-slate-800/40 border-slate-700/60 text-slate-3 w-full hover:bg-slate-800'
                                  }`}
                                >
                                  <span className="text-sm font-bold flex items-center gap-1.5">
                                    {plannerPreference === pref.id && <span className="w-2 h-2 rounded-full bg-orange-400"></span>}
                                    {pref.label}
                                  </span>
                                  <span className="text-[11px] text-slate-400 mt-0.5 leading-snug">{pref.desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Recommendation Preview Sidebar Box */}
                        <div className="bg-slate-950/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
                              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">📦 Rincian Paket Menu Anda</span>
                              <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-bold">Resep Ideal</span>
                            </div>

                            {/* List of Recommended Products from DB */}
                            <div className="space-y-3 max-h-56 overflow-y-auto no-scrollbar mb-4">
                              {/* Resolve recommendations dynamically helper usage */}
                              {(() => {
                                let rawIds: { id: string, q: number }[] = [];
                                if (plannerPreference === 'hemat') {
                                  rawIds = [{ id: '1', q: 1 }, { id: '2', q: 1 }, { id: '3', q: 1 }, { id: '14', q: 1 }, { id: '15', q: 1 }];
                                } else if (plannerPreference === 'praktis') {
                                  rawIds = [{ id: '7', q: 1 }, { id: '8', q: 1 }, { id: '9', q: 1 }, { id: '10', q: 1 }];
                                } else {
                                  rawIds = [{ id: '16', q: 1 }, { id: '1', q: 1 }, { id: '3', q: 1 }, { id: '4', q: 1 }, { id: '13', q: 1 }, { id: '15', q: 1 }];
                                }

                                const factor = Math.ceil(plannerFamilySize / 2);
                                const recommendedItems = rawIds.map(item => {
                                  const prod = productsData.find(p => p.id === item.id);
                                  return { product: prod, q: item.q * factor };
                                }).filter(item => item.product !== undefined);

                                return recommendedItems.map(item => {
                                  const p = item.product!;
                                  return (
                                    <div key={p.id} className="flex gap-2.5 items-center justify-between py-1 border-b border-slate-900/50">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-850 bg-slate-900">
                                          <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="text-left">
                                          <span className="text-xs font-bold text-slate-200 line-clamp-1">{p.name}</span>
                                          <span className="text-[10px] text-slate-500">{p.category} • {formatCurrency(p.price)}</span>
                                        </div>
                                      </div>
                                      <span className="text-xs font-extrabold text-orange-400 shrink-0">x{item.q} porsi</span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>

                          <div>
                            {/* Live Budget Price Summary Box */}
                            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex justify-between items-center mb-4">
                              <div className="text-left">
                                <span className="text-[10px] text-slate-500 block uppercase font-bold font-mono">Estimasi Anggaran Masak</span>
                                <span className="text-xl font-black text-white">
                                  {(() => {
                                    let rawIds: { id: string, q: number }[] = [];
                                    if (plannerPreference === 'hemat') {
                                      rawIds = [{ id: '1', q: 1 }, { id: '2', q: 1 }, { id: '3', q: 1 }, { id: '14', q: 1 }, { id: '15', q: 1 }];
                                    } else if (plannerPreference === 'praktis') {
                                      rawIds = [{ id: '7', q: 1 }, { id: '8', q: 1 }, { id: '9', q: 1 }, { id: '10', q: 1 }];
                                    } else {
                                      rawIds = [{ id: '16', q: 1 }, { id: '1', q: 1 }, { id: '3', q: 1 }, { id: '4', q: 1 }, { id: '13', q: 1 }, { id: '15', q: 1 }];
                                    }
                                    const factor = Math.ceil(plannerFamilySize / 2);
                                    let total = 0;
                                    rawIds.forEach(item => {
                                      const prod = productsData.find(p => p.id === item.id);
                                      if (prod && prod.price) {
                                        total += prod.price * item.q * factor;
                                      }
                                    });
                                    return formatCurrency(total);
                                  })()}
                                </span>
                              </div>
                              <span className="text-[11px] px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold flex items-center gap-1 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                Super Hemat
                              </span>
                            </div>

                            {/* Global checkout button */}
                            <button
                              onClick={() => {
                                let rawIds: { id: string, q: number }[] = [];
                                if (plannerPreference === 'hemat') {
                                  rawIds = [{ id: '1', q: 1 }, { id: '2', q: 1 }, { id: '3', q: 1 }, { id: '14', q: 1 }, { id: '15', q: 1 }];
                                } else if (plannerPreference === 'praktis') {
                                  rawIds = [{ id: '7', q: 1 }, { id: '8', q: 1 }, { id: '9', q: 1 }, { id: '10', q: 1 }];
                                } else {
                                  rawIds = [{ id: '16', q: 1 }, { id: '1', q: 1 }, { id: '3', q: 1 }, { id: '4', q: 1 }, { id: '13', q: 1 }, { id: '15', q: 1 }];
                                }
                                const factor = Math.ceil(plannerFamilySize / 2);
                                const finalProductsList: Product[] = [];
                                rawIds.forEach(item => {
                                  const prod = productsData.find(p => p.id === item.id);
                                  if (prod) {
                                    for (let i = 0; i < item.q * factor; i++) {
                                      finalProductsList.push(prod);
                                    }
                                  }
                                });
                                addMultipleToCart(finalProductsList, `Berhasil memborong paket belanja menu keluarga untuk ${plannerFamilySize} orang seharga paket hemat ke keranjang belanja Anda!`);
                              }}
                              className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-550/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 outline-none"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              Masukkan Rencana Belanja ke Keranjang
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              </section>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* --- RECIPE DETAIL MODAL --- */}
      <AnimatePresence>
        {selectedRecipe && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedRecipe(null)}></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-700 z-10 no-scrollbar"
            >
              <button 
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Recipe Modal Header */}
              <div className="mb-6">
                <span className="inline-block px-3 py-1 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 text-xs font-extrabold mb-3">
                  {selectedRecipe.category}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white leading-tight">
                  {selectedRecipe.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                  {selectedRecipe.desc}
                </p>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 mb-6 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Waktu</span>
                  <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{selectedRecipe.time}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Porsi</span>
                  <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{selectedRecipe.portions}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Kalori</span>
                  <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{selectedRecipe.calories}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Tingkat</span>
                  <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{selectedRecipe.intensity}</span>
                </div>
              </div>

              {/* Interactive Ingredients List */}
              <div className="mb-6">
                <h4 className="text-md sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <span>🛒</span> Bahan-Bahan & Kelengkapan
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Tandai bahan masakan yang sudah Anda miliki di rumah untuk mempercepat persiapan belanja dapur:</p>
                <div className="space-y-2.5">
                  {selectedRecipe.ingredientsText.map((ing, idx) => (
                    <label key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-900/40 border border-slate-100/50 dark:border-slate-800 cursor-pointer transition-all">
                      <input 
                        type="checkbox" 
                        className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300 font-semibold select-none">
                        {ing}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ordered Cooking Steps */}
              <div className="mb-8">
                <h4 className="text-md sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <span>🍳</span> Langkah Demi Langkah Memasak
                </h4>
                <div className="space-y-4">
                  {selectedRecipe.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-black shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setSelectedRecipe(null)}
                  className="w-full sm:w-1/3 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-all outline-none"
                >
                  Tutup Panduan
                </button>
                <button
                  onClick={() => {
                    const matchedProds = productsData.filter(p => selectedRecipe.ingredientIds.includes(p.id));
                    addMultipleToCart(matchedProds, `Berhasil memasukkan ${matchedProds.length} bahan pilihan untuk "${selectedRecipe.title}"`);
                    setSelectedRecipe(null);
                  }}
                  className="w-full sm:flex-1 py-3 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-orange-550/20 hover:shadow-lg flex items-center justify-center gap-2 outline-none"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Beli Semua Bahan Resep Ini
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PRODUCT DETAIL MODAL --- */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm" onClick={() => {
              setSelectedProduct(null);
              if (location.search.includes('productId')) navigate('/', { replace: true });
            }}></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl border border-sky-100 dark:border-slate-700 z-10"
            >
              <button onClick={() => {
                setSelectedProduct(null);
                if (location.search.includes('productId')) navigate('/', { replace: true });
              }} className="absolute top-4 right-4 z-20 p-2 text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-700 backdrop-blur-sm rounded-full transition-colors shadow-sm">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Gallery Region */}
              <div className="mb-6 -mt-2">
                <div 
                  className="w-full aspect-video rounded-2xl overflow-hidden relative cursor-pointer group shadow-sm border border-sky-100/50 dark:border-slate-700/50 mb-3 bg-sky-50 dark:bg-slate-900"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <img src={selectedProduct.imageUrls[selectedImageIndex]} alt={selectedProduct.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                    <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-full opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all shadow-lg text-sky-600 dark:text-sky-400">
                      <ZoomIn className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  </div>
                </div>
                
                {selectedProduct.imageUrls.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {selectedProduct.imageUrls.map((url, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all bg-sky-50 dark:bg-slate-900 ${idx === selectedImageIndex ? 'border-sky-500 shadow-md opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <img src={url} alt={`${selectedProduct.name} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-sky-950 dark:text-sky-50 mb-1.5">{selectedProduct.name}</h2>
                <div className="flex items-center gap-1.5 text-lg font-bold text-sky-700 dark:text-sky-300 mb-4">
                  <span>{formatCurrency(selectedProduct.price)}</span>
                  <span className="text-xs font-normal font-medium text-sky-600/70 dark:text-sky-400/70">{getPriceUnit(selectedProduct)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 text-[10px] sm:text-xs font-bold rounded-lg border border-sky-200/50 dark:border-slate-700/50">
                    {selectedProduct.category}
                  </span>
                  <span className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg border ${
                    selectedProduct.name.toLowerCase().includes('segar') 
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' 
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
                  }`}>
                    {selectedProduct.name.toLowerCase().includes('segar') ? 'Bahan Mentah Segar' : 'Produk Beku'}
                  </span>
                </div>
              </div>

              <div className="space-y-5 mb-6">
                <p className="text-sky-800 dark:text-sky-200/80 leading-relaxed text-sm">
                  {selectedProduct.description || "Dipanen langsung dari petani lokal berkualitas, dijamin kesegarannya dan dikemas dengan standar tinggi untuk menjaga nutrisi."}
                </p>

                <div className="grid grid-cols-2 gap-3 p-4 bg-sky-50/50 dark:bg-slate-900/50 rounded-2xl border border-sky-100/50 dark:border-slate-700/50">
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold text-sky-500 uppercase tracking-wider mb-1">Tanggal Masuk</p>
                    <p className="text-xs sm:text-sm font-medium text-sky-900 dark:text-sky-100 flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      {selectedProduct.tgl_masuk}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold text-sky-500 uppercase tracking-wider mb-1">Kedaluwarsa</p>
                    <p className="text-xs sm:text-sm font-medium text-sky-900 dark:text-sky-100 flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      {selectedProduct.tgl_expired}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50/80 dark:bg-sky-900/20 p-3 rounded-xl border border-blue-100 dark:border-sky-800/30 flex items-center gap-3">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-sky-400 shrink-0" />
                  <p className="text-xs sm:text-sm text-blue-800 dark:text-sky-300 font-medium">Basis Info Nutrisi: per 100 gram</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setSelectedProduct(null);
                    if (location.search.includes('productId')) navigate('/', { replace: true });
                    if (!selectedItems.find(i => i.id === selectedProduct.id)) {
                      handleSelectItem(selectedProduct);
                    }
                  }}
                  className="flex-1 py-3 sm:py-3.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base outline-none focus:ring-4 focus:ring-sky-500/20"
                >
                  {selectedItems.find(i => i.id === selectedProduct.id) ? (
                    'Tutup & Kembali'
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 shrink-0" />
                      NutriAI
                    </>
                  )}
                </button>
                <button
                  onClick={() => addToCart(selectedProduct)}
                  className="flex-1 py-3 sm:py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base outline-none focus:ring-4 focus:ring-amber-500/20"
                >
                  <ShoppingCart className="w-5 h-5 shrink-0" />
                  Keranjang
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FULLSCREEN LIGHTBOX --- */}
      <AnimatePresence>
        {isLightboxOpen && selectedProduct && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/95 backdrop-blur-md" 
              onClick={() => setIsLightboxOpen(false)}
            />
            <button 
              onClick={() => setIsLightboxOpen(false)} 
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-5xl max-h-[90vh] flex items-center justify-center"
            >
              <img 
                src={selectedProduct.imageUrls[selectedImageIndex]} 
                alt={selectedProduct.name} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[110] flex justify-end">
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
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all outline-none focus:ring-4 focus:ring-emerald-500/20"
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

      {/* Floating NutriAI Assistant Button */}
      <button
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-tr from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white p-4 rounded-full shadow-[0_8px_30px_rgb(14,165,233,0.3)] hover:shadow-[0_8px_30px_rgb(14,165,233,0.5)] transition-all transform hover:scale-110 active:scale-95 group flex items-center justify-center border border-sky-400/20"
        title="Asisten NutriAI"
        aria-label="Asisten NutriAI"
      >
        <div className="absolute inset-0 bg-sky-400/20 rounded-full animate-ping group-hover:animate-none -z-10" />
        <Sparkles className="w-5 h-5" />
        {selectedItems.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md border border-white dark:border-slate-900 animate-none">
            {selectedItems.length}
          </span>
        )}
      </button>

      {/* NutriAI Drawer */}
      <AnimatePresence>
        {isAiOpen && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsAiOpen(false)}
            ></motion.div>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl h-full flex flex-col relative z-10 border-l border-sky-100 dark:border-slate-800"
            >
              <div className="p-5 sm:p-6 border-b border-sky-100 dark:border-slate-800 flex items-center justify-between animate-none">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-sky-500 animate-pulse" />
                  <h3 className="text-xl font-bold text-sky-950 dark:text-white">NutriAI Assistant</h3>
                </div>
                <button
                  onClick={() => setIsAiOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sub Mode Tab Bar */}
              <div className="flex border-b border-sky-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-1.5 gap-1">
                <button
                  onClick={() => setAiDrawerMode('store')}
                  className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    aiDrawerMode === 'store'
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm border border-sky-100/30 dark:border-slate-700 font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Store className="w-4 h-4 hover:scale-110 transition-transform" />
                  Bahan Toko
                </button>
                <button
                  onClick={() => setAiDrawerMode('kitchen')}
                  className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    aiDrawerMode === 'kitchen'
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm border border-sky-100/30 dark:border-slate-700 font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 hover:scale-110 transition-transform" />
                  Dapur Virtual Sisa
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar flex flex-col">
                {aiDrawerMode === 'store' ? (
                  <>
                    <div className="mb-6 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-3 text-sky-900 dark:text-sky-200">
                        <h3 className="text-sm font-bold">Bahan Terpilih</h3>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-sky-100 dark:bg-slate-900 text-sky-700 dark:text-sky-400 font-bold tracking-wider">
                          {selectedItems.length}/5
                        </span>
                      </div>
                      
                      {selectedItems.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-sky-200/50 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-sky-400/70 dark:text-sky-300/40 my-auto">
                          <Sparkles className="w-12 h-12 mb-4 opacity-50 text-sky-400" />
                          <p className="text-sm font-semibold mb-1">Dapur NutriAI Anda kosong.</p>
                          <p className="text-xs text-slate-400 max-w-xs px-4">
                            Klik ikon bintang (<Sparkles className="w-3.5 h-3.5 inline mx-0.5 text-sky-500" />) di setiap kartu produk untuk memasukkan bahan makanan ke sini.
                          </p>
                        </div>
                      ) : (
                        <ul className="space-y-2.5">
                          <AnimatePresence>
                            {selectedItems.map((item) => (
                              <motion.li 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={item.id} 
                                className="flex items-center justify-between p-3 bg-sky-50/50 dark:bg-slate-900/50 rounded-2xl border border-sky-100 dark:border-slate-700 shadow-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <span 
                                    className="flex-shrink-0 bg-white dark:bg-slate-800 w-11 h-11 flex items-center justify-center rounded-xl shadow-sm border border-sky-50 dark:border-slate-700 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setSelectedProduct(item)}
                                  >
                                    <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-cover" />
                                  </span>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-sky-900 dark:text-sky-100 line-clamp-1">{item.name}</span>
                                    <span className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                                      Takaran: <span className="bg-sky-100 dark:bg-slate-800 px-1.5 py-0.5 rounded leading-none text-sky-700 dark:text-sky-300 font-extrabold">{(item.quantity || 1) * 100} gram</span>
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="flex items-center bg-sky-100/50 dark:bg-slate-800 border border-sky-100/80 dark:border-slate-700 rounded-lg p-0.5">
                                    <button
                                      onClick={() => handleDecrementQuantity(item.id)}
                                      disabled={(item.quantity || 1) <= 1}
                                      className="w-6 h-6 rounded-md flex items-center justify-center text-sky-700 dark:text-sky-300 hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                      title="Kurangi 100g"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-6 text-center text-xs font-black text-sky-950 dark:text-sky-100">
                                      {item.quantity || 1}x
                                    </span>
                                    <button
                                      onClick={() => handleIncrementQuantity(item.id)}
                                      className="w-6 h-6 rounded-md flex items-center justify-center text-sky-700 dark:text-sky-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                      title="Tambah 100g"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <button 
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors border border-sky-100/50 dark:border-slate-700/80 shadow-sm cursor-pointer"
                                    aria-label="Hapus item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </motion.li>
                            ))}
                          </AnimatePresence>
                        </ul>
                      )}
                    </div>

                    {/* AI Output Result inside drawer scroll area */}
                    <AnimatePresence>
                      {aiState === 'success' && aiOutput && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-6 pt-6 border-t border-sky-100 dark:border-slate-700 w-full"
                        >
                          <div className="bg-sky-50 dark:bg-slate-900 rounded-3xl p-6 border border-sky-200 dark:border-slate-700 relative overflow-hidden w-full">
                            {/* Top accent */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-blue-500"></div>

                            <div className="flex items-end gap-2 mb-4">
                              <span className="text-4xl font-black tracking-tight text-sky-600 dark:text-sky-400">
                                {aiOutput.calories}
                              </span>
                              <span className="text-sm font-bold text-sky-800/60 dark:text-sky-200/60 pb-1.5 uppercase tracking-widest">
                                kkal
                              </span>
                            </div>
                            
                            <div className="mb-6">
                              <span className="inline-block px-3 py-1 bg-sky-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300 text-[10px] sm:text-xs font-semibold rounded-full border border-sky-200/50 dark:border-slate-700/50">
                                Basis perhitungan: akumulasi takaran bahan terpilih
                              </span>
                            </div>

                            <div className="mb-5 mt-4">
                              <h4 className="text-xs font-black text-sky-500 dark:text-sky-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                Makronutrien
                              </h4>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white dark:bg-slate-800 border border-sky-100 dark:border-slate-700 rounded-xl p-3 shadow-sm flex items-center gap-3">
                                  <div className="p-1.5 bg-blue-50 dark:bg-sky-900/40 rounded-lg text-blue-500 dark:text-sky-400 flex-shrink-0">
                                    <Activity className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs text-sky-600/70 dark:text-sky-400/70 font-medium truncate">Protein</p>
                                    <p className="text-sm font-bold text-sky-950 dark:text-sky-100">{aiOutput.protein}</p>
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-sky-100 dark:border-slate-700 rounded-xl p-3 shadow-sm flex items-center gap-3">
                                  <div className="p-1.5 bg-sky-50 dark:bg-sky-900/40 rounded-lg text-sky-500 dark:text-sky-400 flex-shrink-0">
                                    <Wheat className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs text-sky-600/70 dark:text-sky-400/70 font-medium truncate">Karbohidrat</p>
                                    <p className="text-sm font-bold text-sky-950 dark:text-sky-100">{aiOutput.carbs}</p>
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-sky-100 dark:border-slate-700 rounded-xl p-3 shadow-sm flex items-center gap-3">
                                  <div className="p-1.5 bg-yellow-50 dark:bg-yellow-900/45 rounded-lg text-yellow-500 flex-shrink-0">
                                    <Flame className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs text-sky-600/70 dark:text-sky-400/70 font-medium truncate">Lemak Total</p>
                                    <p className="text-sm font-bold text-sky-950 dark:text-sky-100">{aiOutput.fat}</p>
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-sky-100 dark:border-slate-700 rounded-xl p-3 shadow-sm flex items-center gap-3">
                                  <div className="p-1.5 bg-pink-50 dark:bg-pink-900/40 rounded-lg text-pink-500 flex-shrink-0">
                                    <Droplet className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs text-sky-600/70 dark:text-sky-400/70 font-medium truncate">Gula</p>
                                    <p className="text-sm font-bold text-sky-950 dark:text-sky-100">{aiOutput.sugar}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <h4 className="text-xs font-black text-sky-500 dark:text-sky-500 uppercase tracking-widest mb-3">
                                Mikronutrien (Highlight)
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {aiOutput.micronutrients.map((micro, idx) => (
                                  <span key={idx} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-sky-100 dark:border-slate-700 rounded-xl text-xs font-semibold text-sky-800 dark:text-sky-300 shadow-sm flex items-center gap-1.5 shrink-0">
                                    <Sparkles className="w-3 h-3 text-sky-400" />
                                    {micro}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {aiOutput.recipeIdea && (
                              <div className="mt-6 pt-5 border-t border-sky-200/50 dark:border-slate-700/50">
                                <h4 className="text-xs font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                  <Sparkles className="w-4 h-4 text-emerald-400" />
                                  Ide Resep AI
                                </h4>
                                <div className="bg-white dark:bg-slate-800 border border-sky-100 dark:border-slate-700 rounded-xl p-4 shadow-sm animate-none font-sans">
                                  <h5 className="font-bold text-sky-950 dark:text-sky-50 mb-1">{aiOutput.recipeIdea.title}</h5>
                                  <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-sky-600/80 dark:text-sky-400/80 font-medium">
                                    <span className="bg-sky-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-sky-100 dark:border-slate-700">Waktu Prep: {aiOutput.recipeIdea.prepTime}</span>
                                    <span className="bg-orange-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-orange-100 dark:border-slate-700 text-orange-600 dark:text-orange-400">Kalori: {aiOutput.recipeIdea.nutrition.calories} kkal</span>
                                    <span className="bg-blue-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-blue-100 dark:border-slate-700 text-blue-600 dark:text-blue-400">P: {aiOutput.recipeIdea.nutrition.protein}</span>
                                    <span className="bg-emerald-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-100 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">K: {aiOutput.recipeIdea.nutrition.carbs}</span>
                                    <span className="bg-purple-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-purple-100 dark:border-slate-700 text-purple-600 dark:text-purple-400">L: {aiOutput.recipeIdea.nutrition.fat}</span>
                                  </div>
                                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-sky-800/80 dark:text-sky-200/80">
                                    {aiOutput.recipeIdea.instructions.map((step, idx) => (
                                      <li key={idx} className="pl-1 leading-relaxed">
                                        {step}
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              </div>
                            )}

                            <div className="mt-6 pt-4 border-t border-sky-200/50 dark:border-slate-700/50">
                              <p className="text-[10px] sm:text-xs text-sky-600/60 dark:text-sky-400/50 italic leading-snug">
                                *Disclaimer: Nilai nutrisi ini adalah estimasi dari AI dan bukan saran medis/gizi akurat.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  // Virtual Kitchen Leftovers ("Dapur Virtual Sisa") mode
                  <div className="flex flex-col flex-1">
                    <div className="mb-4">
                      <h4 className="text-sm font-extrabold text-sky-950 dark:text-sky-200 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-sky-500 animate-pulse" />
                        Dapur Virtual NutriAI
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                        Ketik bahan makanan sisa yang ada di kulkas Anda untuk dicarikan ide resep cerdas beserta bumbu pelengkap praktis dari toko kami.
                      </p>
                      
                      <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>Bahan Sisa Kulkas:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                          <Sparkles className="w-3 h-3 animate-pulse" /> Prioritas Menu Nusantara
                        </span>
                      </div>
                      <div className="relative">
                        <textarea
                          value={leftoverInput}
                          onChange={(e) => setLeftoverInput(e.target.value)}
                          placeholder="Ketik sisa bahan di rumah, contoh: bayam, telur ayam, cabai, tahu..."
                          className="w-full min-h-[95px] p-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800 dark:text-slate-100 resize-none placeholder-slate-400 dark:placeholder-slate-500"
                        />
                      </div>

                      <button
                        onClick={handleCalculateKitchenAi}
                        disabled={!leftoverInput.trim() || kitchenAiState === 'loading'}
                        className="w-full mt-3 py-3 px-4 rounded-xl font-bold text-white transition-all bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 focus:ring-4 focus:ring-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
                      >
                        {kitchenAiState === 'loading' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Mencari resep kreatif...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Temukan Menu Kreatif & Sehat
                          </>
                        )}
                      </button>
                    </div>

                    {/* Result for Virtual Kitchen leftovers */}
                    {kitchenAiState === 'loading' && (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500 my-auto">
                        <Loader2 className="w-10 h-10 animate-spin text-sky-500 mb-3" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 animate-pulse">Meracik ide resep sehat...</p>
                        <p className="text-xs text-slate-400 mt-1.5 max-w-[260px]">NutriAI sedang mencocokkan bahan kulkas Anda dengan bumbu pelengkap dan sayuran segar kami.</p>
                      </div>
                    )}

                    {kitchenAiState === 'error' && (
                      <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/50 text-center text-red-600 dark:text-red-400 my-4 text-xs flex flex-col gap-1.5 leading-relaxed">
                        <span className="font-bold">Gagal memuat rekomendasi masakan.</span>
                        <span className="opacity-90">{kitchenAiError || "Silakan coba kembali atau periksa API Key Anda di Settings."}</span>
                      </div>
                    )}

                    {kitchenAiState === 'success' && kitchenRecipes.length === 0 && (
                      <div className="text-center py-12 text-xs text-slate-400 dark:text-slate-500">
                        Tidak ditemukan resep yang cocok untuk bahan tersebut. Coba sebutkan kombinasi bahan masakan lain.
                      </div>
                    )}

                    {kitchenAiState === 'success' && kitchenRecipes.length > 0 && (
                      <div className="space-y-6 mt-2">
                        {kitchenRecipes.map((recipe, idx) => (
                          <div key={idx} className="bg-sky-50/50 dark:bg-slate-900/40 p-5 rounded-3xl border border-sky-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                            
                            <h5 className="font-extrabold text-sky-950 dark:text-sky-100 text-base mb-1.5 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-emerald-500" />
                              {recipe.title}
                            </h5>
                            
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4 font-medium">
                              {recipe.description}
                            </p>

                            <div className="flex items-center gap-2 mb-4 text-[10px] sm:text-xs">
                              <span className="bg-sky-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-sky-700 dark:text-sky-350 font-bold">Waktu Prep: {recipe.prepTime}</span>
                            </div>

                            {/* Cooking Instructions */}
                            <div className="mb-4 bg-white dark:bg-slate-850 p-4 rounded-2xl border border-sky-100/30 dark:border-slate-800 shadow-xs">
                              <h6 className="text-[11px] font-black text-sky-900 dark:text-sky-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <ChefHat className="w-3.5 h-3.5 text-sky-500" />
                                Langkah Memasak:
                              </h6>
                              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 dark:text-slate-350 leading-relaxed">
                                {recipe.instructions.map((step: string, sIdx: number) => (
                                  <li key={sIdx} className="pl-1">
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Complementary store item suggestion list */}
                            <div className="mt-4 pt-3 border-t border-sky-100 dark:border-slate-800">
                              <div className="flex items-center justify-between mb-3">
                                <h6 className="text-[11px] font-black text-sky-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                  <Store className="w-3.5 h-3.5 text-sky-500" />
                                  Rekomendasi Pelengkap di Toko:
                                </h6>
                              </div>

                              {(!recipe.neededStoreProducts || recipe.neededStoreProducts.length === 0) ? (
                                <p className="text-xs text-slate-400 italic">Dapur Anda lengkap! Tidak membutuhkan bumbu tambahan dari katalog.</p>
                              ) : (
                                <div className="space-y-2.5">
                                  {recipe.neededStoreProducts.map((item: any, pIdx: number) => {
                                    const p = matchedProduct(item);
                                    return (
                                      <div key={pIdx} className="bg-white dark:bg-slate-850 p-3 rounded-2xl border border-sky-100/50 dark:border-slate-800/80 shadow-sm flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          {p && p.imageUrls && p.imageUrls[0] ? (
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-100 dark:border-slate-700">
                                              <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-cover" />
                                            </div>
                                          ) : (
                                            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-slate-800 flex items-center justify-center font-bold text-sky-500 flex-shrink-0 text-xs">
                                              Bahan
                                            </div>
                                          )}
                                          <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">{p ? p.name : item.productName}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 leading-snug">{item.reason}</p>
                                            {p && p.price && (
                                              <p className="text-[11px] font-extrabold text-amber-500 dark:text-amber-450 mt-0.5">Rp {p.price.toLocaleString('id-ID')}</p>
                                            )}
                                          </div>
                                        </div>

                                        {p ? (
                                          <button
                                            onClick={() => {
                                               addToCart(p);
                                               setIsAiOpen(false);
                                             }}
                                            className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] sm:text-xs font-extrabold text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-slate-700 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                            title="Tambah ke Keranjang"
                                          >
                                            <Plus className="w-3 h-3" />
                                            Beli
                                          </button>
                                        ) : (
                                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-400">Habis</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                  
                                  {/* Multi add button */}
                                  <button
                                    onClick={() => {
                                      const matchedList: Product[] = [];
                                      recipe.neededStoreProducts.forEach((item: any) => {
                                        const p = matchedProduct(item);
                                        if (p) matchedList.push(p);
                                      });
                                      if (matchedList.length > 0) {
                                        let updated = [...cartItems];
                                        matchedList.forEach(prod => {
                                          const existIdx = updated.findIndex(c => c.product.id === prod.id);
                                          if (existIdx > -1) {
                                            updated[existIdx].quantity += 1;
                                          } else {
                                            updated.push({ product: prod, quantity: 1 });
                                          }
                                        });
                                        updateCartAndSync(updated);
                                        setShowRecipeToast(`Berhasil menambahkan ${matchedList.length} bumbu pelengkap untuk "${recipe.title}" ke keranjang!`);
                                        setIsAiOpen(false);
                                        const timer = setTimeout(() => setShowRecipeToast(null), 4000);
                                        return () => clearTimeout(timer);
                                      }
                                    }}
                                    className="w-full mt-2 py-2 px-3 rounded-xl border-2 border-dashed border-sky-200 dark:border-slate-800 hover:bg-sky-50 dark:hover:bg-slate-850 text-xs font-extrabold text-sky-500 dark:text-sky-400 hover:text-sky-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    Beli Semua Bahan Pelengkap Menu Ini
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sticky bottom panel for analysis CTA inside drawer */}
              {aiDrawerMode === 'store' && (
                <div className="p-5 sm:p-6 border-t border-sky-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 sticky bottom-0">
                  <button
                    onClick={handleCalculateAi}
                    disabled={selectedItems.length === 0 || aiState === 'loading'}
                    className="w-full py-4 px-4 rounded-xl font-bold text-white transition-all
                      bg-sky-500 hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-450 focus:ring-4 focus:ring-sky-500/20
                      disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 disabled:shadow-none cursor-pointer"
                  >
                    {aiState === 'loading' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Menganalisis nutrisi...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Analisis Nutrisi Detail (NutriAI)
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="mt-auto bg-gradient-to-br from-sky-500 to-indigo-600 dark:from-slate-900 dark:to-slate-950 pt-16 pb-8 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
        <div className="absolute -bottom-24 -right-12 text-white/10 dark:text-slate-800/80 pointer-events-none">
          <Store className="w-64 h-64" />
        </div>
        
        <div className="w-full max-w-none px-4 sm:px-8 lg:px-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Info */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Store className="w-7 h-7 text-white" />
                <span className="text-2xl font-black tracking-tight text-white">
                  Daily<span className="text-sky-200">Fresh</span> Market
                </span>
              </div>
              <p className="text-sky-50 dark:text-slate-400 text-sm leading-relaxed max-w-sm">
                Pasar digital yang menyediakan produk segar, pangan berkualitas, dan mendukung gaya hidup sehat Anda harian.
              </p>
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center gap-3 text-sky-50 dark:text-slate-400 text-sm hover:text-white transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-slate-800 flex items-center justify-center shadow-sm">
                    <Mail className="w-4 h-4 text-white dark:text-sky-400" />
                  </div>
                  <span>halo@dailyfresh.com</span>
                </div>
                <div className="flex items-center gap-3 text-sky-50 dark:text-slate-400 text-sm hover:text-white transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-slate-800 flex items-center justify-center shadow-sm">
                    <MapPin className="w-4 h-4 text-white dark:text-sky-400" />
                  </div>
                  <span>Jl. Sayuran Segar No. 12, Jakarta</span>
                </div>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-bold mb-6 text-lg tracking-tight">Jelajahi</h4>
              <ul className="flex flex-col gap-3 text-sm text-sky-50 dark:text-slate-400">
                <li>
                  <button onClick={() => { setActiveTab('products'); window.scrollTo(0, 0); }} className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-2 outline-none">
                    <ChevronRight className="w-3 h-3" />
                    Katalog Produk
                  </button>
                </li>
                <li>
                  <button onClick={() => { setActiveTab('about'); window.scrollTo(0, 0); }} className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-2 outline-none">
                    <ChevronRight className="w-3 h-3" />
                    Tentang Kami
                  </button>
                </li>
                <li>
                  <button onClick={() => { setActiveTab('special_nutrition'); window.scrollTo(0, 0); }} className="text-rose-200 hover:text-rose-100 dark:text-emerald-300 dark:hover:text-emerald-200 hover:translate-x-1 transition-all flex items-center gap-2 font-medium outline-none">
                    <ChevronRight className="w-3 h-3" />
                    Inspirasi Dapur
                  </button>
                </li>
              </ul>
            </div>

            {/* Social Media */}
            <div>
              <h4 className="text-white font-bold mb-6 text-lg tracking-tight">Media Sosial</h4>
              <p className="text-sky-50 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                Ikuti kami untuk informasi resep menarik, promo belanja harian harian, dan tips praktis secara rutin.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#" className="w-11 h-11 rounded-full bg-white/10 border border-white/20 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:-translate-y-1 shadow-sm">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-11 h-11 rounded-full bg-white/10 border border-white/20 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:-translate-y-1 shadow-sm">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-11 h-11 rounded-full bg-white/10 border border-white/20 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:-translate-y-1 shadow-sm">
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 dark:border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-sky-100 dark:text-slate-500">
            <p>&copy; {new Date().getFullYear()} DailyFresh Market - Powered by NutriAI</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Syarat & Ketentuan</a>
              <a href="#" className="hover:text-white transition-colors">Kebijakan Privasi</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      <AnimatePresence>
        {showRecipeToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 border border-slate-800 dark:bg-slate-900 dark:border-slate-800 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3"
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
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors pointer-events-auto cursor-pointer"
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

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => setShowLogoutConfirm(false)}
            ></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 z-10 text-center"
            >
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors pointer-events-auto cursor-pointer"
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
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-sm font-semibold text-white shadow-lg shadow-rose-500/10 transition-colors cursor-pointer"
                >
                  Ya, Keluar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
