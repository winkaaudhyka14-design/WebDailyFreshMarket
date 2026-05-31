import React, { useState, useEffect } from 'react';
import { ShoppingCart, TrendingUp, DollarSign, Package, Eye, Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { Sale, SaleItem, getSales, addSale, updateExistingSale, deleteSaleRecord, seedMissingSales } from '../lib/sales';
import { Product, getProducts } from '../lib/products';

interface SalesManagerProps {
  onShowToast?: (message: string) => void;
}

export default function SalesManager({ onShowToast }: SalesManagerProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    id: string;
    user: string;
    date: string;
    total: number | string;
    status: string;
    items: SaleItem[];
  }>({
    id: '', user: '', date: '', total: '', status: 'Selesai', items: []
  });

  useEffect(() => {
    Promise.all([seedMissingSales(), getProducts()]).then(([_, productData]) => {
      setProducts(productData);
      fetchSales();
    });
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await getSales();
      setSales(data);
    } catch (error) {
      console.error("Failed to fetch sales", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSale = () => {
    setEditingSale(null);
    setFormData({
      id: `TRX-${String(Date.now()).slice(-6)}`,
      user: '', 
      date: new Date().toISOString().slice(0, 16).replace('T', ' '), 
      total: '', 
      status: 'Selesai', 
      items: []
    });
    setIsModalOpen(true);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({ ...sale });
    setIsModalOpen(true);
  };

  const handleDeleteSale = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
      try {
        await deleteSaleRecord(id);
        fetchSales();
        onShowToast?.("Transaksi berhasil dihapus!");
      } catch (error) {
        console.error("Failed to delete sale", error);
      }
    }
  };

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailModalOpen(true);
  };

  const handleAddItem = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value;
    if (!productId) return;
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newItem = { productName: product.name, quantity: 1, price: product.price || 0 };
    const updatedItems = [...(formData.items || []), newItem];
    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setFormData({ ...formData, items: updatedItems, total: newTotal });
    e.target.value = '';
  };

  const handleUpdateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) newQuantity = 1;
    const updatedItems = [...(formData.items || [])];
    updatedItems[index].quantity = newQuantity;
    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setFormData({ ...formData, items: updatedItems, total: newTotal });
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...(formData.items || [])];
    updatedItems.splice(index, 1);
    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setFormData({ ...formData, items: updatedItems, total: newTotal });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.user && !formData.user.endsWith('@gmail.com')) {
      alert('Mohon gunakan email yang berakhiran @gmail.com');
      return;
    }
    setIsSaving(true);
    try {
      const saleToSave: Sale = {
        id: formData.id,
        user: formData.user,
        date: formData.date,
        total: Number(formData.total) || 0,
        status: formData.status,
        items: formData.items || []
      };
      
      if (editingSale) {
        await updateExistingSale(saleToSave);
        onShowToast?.("Transaksi berhasil diperbarui!");
      } else {
        await addSale(saleToSave);
        onShowToast?.("Transaksi berhasil ditambahkan!");
      }
      setIsModalOpen(false);
      fetchSales();
    } catch (error) {
      console.error("Failed to save sale", error);
      alert('Terjadi kesalahan saat menyimpan transaksi (Pastikan izin Firebase sudah benar).');
    } finally {
      setIsSaving(false);
    }
  };

  // Compute metrics
  const totalPendapatan = sales.reduce((acc, sale) => acc + sale.total, 0);
  const totalPesanan = sales.length;
  const produkTerjual = sales.reduce((acc, sale) => acc + (sale.items?.reduce((iAcc, item) => iAcc + item.quantity, 0) || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Memuat data penjualan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl p-6 rounded-[2rem] border border-sky-100 dark:border-slate-700 shadow-xl shadow-sky-900/5">
          <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/50 text-sky-500 rounded-2xl flex items-center justify-center mb-4">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-slate-500 font-medium mb-1">Total Kotor</h3>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">Rp {totalPendapatan.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl p-6 rounded-[2rem] border border-sky-100 dark:border-slate-700 shadow-xl shadow-sky-900/5">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <h3 className="text-slate-500 font-medium mb-1">Total Pesanan</h3>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalPesanan} Pesanan</p>
        </div>
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl p-6 rounded-[2rem] border border-sky-100 dark:border-slate-700 shadow-xl shadow-sky-900/5">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-slate-500 font-medium mb-1">Pertumbuhan</h3>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">+12.5%</p>
        </div>
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl p-6 rounded-[2rem] border border-sky-100 dark:border-slate-700 shadow-xl shadow-sky-900/5">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/50 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-slate-500 font-medium mb-1">Produk Terjual</h3>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{produkTerjual} Item</p>
        </div>
      </div>

      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-[2rem] border border-sky-100 dark:border-slate-700 shadow-xl shadow-sky-900/5 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Riwayat Penjualan Terakhir</h2>
          <button onClick={handleAddSale} className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-sky-500/20">
            <Plus className="w-4 h-4" />
            Tambah Transaksi
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">
                <th className="p-4 font-bold uppercase text-xs">Pengguna</th>
                <th className="p-4 font-bold uppercase text-xs">Tanggal</th>
                <th className="p-4 font-bold uppercase text-xs">Total</th>
                <th className="p-4 font-bold uppercase text-xs">Status</th>
                <th className="p-4 font-bold uppercase text-xs text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 text-slate-600 dark:text-slate-400">{sale.user}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{sale.date}</td>
                  <td className="p-4 font-bold text-sky-600 dark:text-sky-400">Rp {sale.total.toLocaleString('id-ID')}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      sale.status === 'Selesai' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                        : sale.status === 'Diproses'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button onClick={() => handleViewDetails(sale)} className="p-2 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition" title="Detail">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEditSale(sale)} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteSale(sale.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition" title="Hapus">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">Belum ada transaksi penjualan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {isDetailModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-sky-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                Detail Transaksi <span className="text-sky-500">{selectedSale.id}</span>
              </h2>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Pengguna</p>
                  <p className="font-bold">{selectedSale.user}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Tanggal</p>
                  <p className="font-bold">{selectedSale.date}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Total Transaksi</p>
                  <p className="font-bold text-sky-600 dark:text-sky-400">Rp {selectedSale.total.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedSale.status === 'Selesai' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                      : selectedSale.status === 'Diproses'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                  }`}>
                    {selectedSale.status}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-4">Produk yang Dibeli</h3>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80">
                      <tr>
                        <th className="p-3 text-sm font-bold">Produk</th>
                        <th className="p-3 text-sm font-bold text-center">Jumlah</th>
                        <th className="p-3 text-sm font-bold text-right">Harga Satuan</th>
                        <th className="p-3 text-sm font-bold text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items && selectedSale.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                          <td className="p-3 text-sm">{item.productName}</td>
                          <td className="p-3 text-sm text-center">{item.quantity}</td>
                          <td className="p-3 text-sm text-right">Rp {item.price.toLocaleString('id-ID')}</td>
                          <td className="p-3 text-sm text-right font-bold">Rp {(item.quantity * item.price).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                      {(!selectedSale.items || selectedSale.items.length === 0) && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-500">Tidak ada detail item</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-sky-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
              <h2 className="text-xl font-bold">{editingSale ? 'Edit Transaksi' : 'Tambah Transaksi'}</h2>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2">ID Transaksi</label>
                <input 
                  type="text" 
                  required 
                  value={formData.id} 
                  disabled={!!editingSale}
                  onChange={e => setFormData({ ...formData, id: e.target.value })} 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 transition disabled:opacity-50" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Email Pengguna (*@gmail.com)</label>
                <input 
                  type="email" 
                  required 
                  placeholder="contoh@gmail.com"
                  value={formData.user} 
                  onChange={e => setFormData({ ...formData, user: e.target.value })} 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 transition" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Total Kotor (Rp)</label>
                  <input 
                    type="number" 
                    required 
                    value={formData.total} 
                    onChange={e => setFormData({ ...formData, total: e.target.value === '' ? '' : Number(e.target.value) })} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 transition" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Status</label>
                  <select 
                    required 
                    value={formData.status} 
                    onChange={e => setFormData({ ...formData, status: e.target.value })} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 transition"
                  >
                    <option value="Selesai">Selesai</option>
                    <option value="Diproses">Diproses</option>
                    <option value="Dibatalkan">Dibatalkan</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Produk yang Terjual</label>
                <select 
                  defaultValue=""
                  onChange={handleAddItem}
                  className="w-full px-4 py-2.5 mb-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 transition"
                >
                  <option value="" disabled>+ Tambah Produk ke Transaksi...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - Rp {p.price?.toLocaleString('id-ID')}</option>
                  ))}
                </select>

                {formData.items && formData.items.length > 0 && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-3">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/80">
                        <tr>
                          <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400">Produk</th>
                          <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 text-center">Jumlah</th>
                          <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 text-right">Harga</th>
                          <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, idx) => (
                          <tr key={idx} className="border-t border-slate-200 dark:border-slate-700 text-sm">
                            <td className="p-3">{item.productName}</td>
                            <td className="p-3 text-center">
                              <input 
                                type="number" 
                                min="1"
                                className="w-16 p-1 text-center rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-900"
                                value={item.quantity} 
                                onChange={(e) => handleUpdateItemQuantity(idx, Number(e.target.value))} 
                              />
                            </td>
                            <td className="p-3 text-right">Rp {item.price.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-center">
                              <button type="button" onClick={() => handleRemoveItem(idx)} className="text-rose-500 hover:text-rose-600 transition">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-sky-500/20 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
