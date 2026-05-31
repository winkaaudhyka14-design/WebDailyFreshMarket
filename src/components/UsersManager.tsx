import React, { useState, useEffect } from 'react';
import { AppUser, getUsers, addUser, updateExistingUser, deleteUserRecord } from '../lib/users';
import { Loader2, Plus, Edit2, Trash2, Shield, User, Search } from 'lucide-react';
import { auth } from '../firebase';

interface UsersManagerProps {
  onShowToast?: (message: string) => void;
}

export default function UsersManager({ onShowToast }: UsersManagerProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<AppUser>>({
    name: '', email: '', role: 'admin'
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      if (data.length === 0 && auth.currentUser) {
        // Auto-seed current user if no users exist
        const defaultUser: AppUser = {
          id: auth.currentUser.uid,
          name: auth.currentUser.email?.split('@')[0] || 'Admin',
          email: auth.currentUser.email || '',
          role: 'admin'
        };
        await addUser(defaultUser);
        setUsers([defaultUser]);
      } else {
        setUsers(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchUsers();
      }
    });
    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ id: Date.now().toString(), name: '', email: '', role: 'admin' });
    setIsModalOpen(true);
  };

  const openEditModal = (u: AppUser) => {
    setEditingUser(u);
    setFormData(u);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setUserToDelete(id);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      try {
        await deleteUserRecord(userToDelete);
        fetchUsers();
        setUserToDelete(null);
        onShowToast?.("Pengguna berhasil dihapus!");
      } catch (err: any) {
        console.error("Error deleting user:", err);
        alert("Gagal menghapus pengguna: " + (err.message || err));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = formData as AppUser;
    
    try {
      if (editingUser) {
        await updateExistingUser(finalData);
        onShowToast?.("Pengguna berhasil diedit!");
      } else {
        await addUser(finalData);
        onShowToast?.("Pengguna berhasil ditambahkan!");
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error("Error saving user:", err);
      alert("Gagal menyimpan pengguna: " + (err.message || err));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-sky-500 mb-4" />
        <p className="text-sky-600 font-medium">Memuat data pengguna...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-sky-500" />
          </div>
          <input
            type="text"
            className="pl-10 pr-4 py-2.5 w-full rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all font-medium"
            placeholder="Cari pengguna..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button onClick={openAddModal} className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-md shadow-sky-500/20 transition-all w-full md:w-auto">
          <Plus className="w-5 h-5" />
          Tambah Pengguna
        </button>
      </div>

      <div className="bg-white/95 backdrop-blur-xl dark:bg-slate-800/95 rounded-3xl shadow-xl shadow-sky-900/10 dark:shadow-none border border-white dark:border-sky-800/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sky-600 dark:bg-sky-800 text-white shadow-sm">
                <th className="p-4 font-extrabold text-white uppercase text-xs tracking-wider">#</th>
                <th className="p-4 font-extrabold text-white uppercase text-xs tracking-wider">Nama</th>
                <th className="p-4 font-extrabold text-white uppercase text-xs tracking-wider">Email</th>
                <th className="p-4 font-extrabold text-white uppercase text-xs tracking-wider">Peran</th>
                <th className="p-4 font-extrabold text-white uppercase text-xs tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u.role.toLowerCase().includes(searchQuery.toLowerCase())).map((u, idx) => (
                <tr key={u.id} className="border-b border-sky-50 dark:border-sky-800/30 hover:bg-sky-50/50 dark:hover:bg-sky-900/10 transition-colors">
                  <td className="p-4 text-sky-600 dark:text-sky-400 font-medium">{idx + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-100 dark:bg-slate-700 text-sky-600 dark:text-sky-300 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <p className="font-bold">{u.name}</p>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{u.email}</td>
                  <td className="p-4">
                    <span className={`flex items-center gap-1 w-max px-3 py-1 rounded-full text-xs font-bold border ${
                      u.role === 'admin' 
                        ? 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-800' 
                        : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800'
                    }`}>
                      <Shield className="w-3 h-3" />
                      {u.role === 'admin' ? 'Admin' : 'Pelanggan'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(u)} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 font-medium text-sky-600/70 dark:text-sky-400/50">Tidak ada data pengguna.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl border border-sky-100 dark:border-slate-700">
            <h2 className="text-2xl font-bold mb-6">{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-sky-900 dark:text-sky-100 mb-2">Nama Lengkap</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-sky-900 dark:text-sky-100 mb-2">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-sky-900 dark:text-sky-100 mb-2">Peran</label>
                <select required value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium transition-all">
                  <option value="admin">Admin</option>
                  <option value="pelanggan">Pelanggan</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-sky-500 hover:bg-sky-600 shadow-md shadow-sky-500/20 transition-all">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setUserToDelete(null)}></div>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-rose-100 dark:border-rose-900/30 text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Hapus Pengguna?</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">Apakah anda yakin akan menghapus pengguna ini?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
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
    </div>
  );
}
