import { useEffect, useState } from 'react';
import { promotionsAPI } from '../../services/api';
import type { Promotion } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, X, Zap, Calendar } from 'lucide-react';

const emptyForm = (): Partial<Promotion> => ({
  name: '', description: '', promotion_type: 'percentage',
  discount_value: 10, is_active: true,
  start_date: new Date().toISOString().split('T')[0], end_date: '',
  minimum_order: 0,
});

const PromotionsPage = () => {
  const { showToast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<Partial<Promotion>>(emptyForm());

  const fetchPromotions = async () => {
    setLoading(true);
    try { setPromotions(await promotionsAPI.getAll()); }
    catch { showToast('Failed to load promotions', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPromotions(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (p: Promotion) => { setEditing(p); setForm({ ...p }); setShowModal(true); };

  const handleSave = async () => {
    const payload = { ...form };
    if (!payload.end_date) delete payload.end_date;
    try {
      if (editing) { await promotionsAPI.update(editing.id, payload); showToast('Promotion updated!', 'success'); }
      else { await promotionsAPI.create(payload); showToast('Promotion created!', 'success'); }
      setShowModal(false);
      fetchPromotions();
    } catch (e: any) { showToast(e.response?.data?.detail || 'Save failed', 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this promotion?')) return;
    try { await promotionsAPI.delete(id); showToast('Promotion deleted', 'info'); fetchPromotions(); }
    catch { showToast('Delete failed', 'error'); }
  };

  const typeColors: Record<string, string> = {
    percentage: 'bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300',
    fixed: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    bogo: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Promotions</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{promotions.length} active campaigns</p>
        </div>
        <button id="add-promotion-btn" onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />Add Promotion
        </button>
      </div>

      <div className="space-y-4">
        {loading && [...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        {!loading && promotions.map((promo) => (
          <div key={promo.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 dark:text-white">{promo.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[promo.promotion_type] || typeColors.percentage}`}>
                  {promo.promotion_type}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${promo.is_active ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  {promo.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">{promo.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span className="font-semibold text-violet-600 dark:text-violet-400">
                  {promo.discount_value}{promo.promotion_type === 'percentage' ? '%' : '₹'} off
                </span>
                {promo.start_date && (
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(promo.start_date).toLocaleDateString()}</span>
                )}
                {promo.end_date && <span>→ {new Date(promo.end_date).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(promo)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-xl transition-colors"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(promo.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {!loading && promotions.length === 0 && (
          <div className="text-center py-16 text-slate-400">No promotions found. Create one!</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">{editing ? 'Edit Promotion' : 'Add Promotion'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Name *</label>
                <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Description</label>
                <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Type</label>
                  <select value={form.promotion_type || 'percentage'} onChange={(e) => setForm({ ...form, promotion_type: e.target.value as any })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed (₹)</option>
                    <option value="bogo">BOGO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Discount Value</label>
                  <input type="number" min={0} value={form.discount_value || ''} onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Start Date</label>
                  <input type="date" value={form.start_date?.split('T')[0] || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">End Date</label>
                  <input type="date" value={form.end_date?.split('T')[0] || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Status</label>
                <select value={form.is_active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">{editing ? 'Save Changes' : 'Create Promotion'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsPage;
