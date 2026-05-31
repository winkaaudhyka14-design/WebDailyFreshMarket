import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';
import BmiPage from './pages/BmiPage';
import RecipesPage from './pages/RecipesPage';
import AllRecipesPage from './pages/AllRecipesPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { seedMissingProducts } from './lib/products';

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [role, setRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    // Initializing dark mode globally on load
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Seed new missing products
    seedMissingProducts();
  }, []);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (sessionStorage.getItem('registering') === 'true') {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          let currentRole = 'pelanggan';
          if (userDoc.exists()) {
            currentRole = userDoc.data().role || 'pelanggan';
          }
          if (currentUser.email === 'admin@naturachill.com') {
            currentRole = 'admin';
          }
          setRole(currentRole);
        } catch (error) {
          console.error("Gagal mengambil role dari Firestore:", error);
          let currentRole = 'pelanggan';
          if (currentUser.email === 'admin@naturachill.com') {
            currentRole = 'admin';
          }
          setRole(currentRole);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-sky-50 dark:bg-slate-900 text-sky-800 dark:text-sky-400 font-bold">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/login" 
          element={
            !user ? (
              <Login />
            ) : role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/admin" 
          element={
            user && role === 'admin' ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route path="/settings" element={user ? <Settings /> : <Navigate to="/" replace />} />
        <Route path="/bmi" element={<BmiPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/all-recipes" element={<AllRecipesPage />} />
        <Route path="/recipe/:id" element={<RecipeDetailPage />} />
      </Routes>
    </Router>
  );
}
