import { useEffect, useState } from 'react';
import { couponsAPI } from '../../services/api';
import type { Coupon } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, X, Tag, Calendar, Percent } from 'lucide-react';

const emptyForm = (): Partial<Coupon> => ({
  code: '', discount_type: 'percentage', discount_value: 10,
  minimum_order: 0, max_uses: undefined, is_active: true,
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: '',
});

const CouponsPage = () => {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<Partial<Coupon>>(emptyForm());

  const fetchCoupons = async () => {
    setLoading(true);
    try { setCoupons(await couponsAPI.getAll()); }
    catch { showToast('Failed to load coupons', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (c: Coupon) => { setEditing(c); setForm({ ...c }); setShowModal(true); };

  const handleSave = async () => {
    const payload = { ...form };
    if (!payload.valid_until) delete payload.valid_until;
    if (!payload.max_uses) delete payload.max_uses;
    try {
      if (editing) { await couponsAPI.update(editing.id, payload); showToast('Coupon updated!', 'success'); }
      else { await couponsAPI.create(payload); showToast('Coupon created!', 'success'); }
      setShowModal(false);
      fetchCoupons();
    } catch (e: any) { showToast(e.response?.data?.detail || 'Save failed', 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this coupon?')) return;
    try { await couponsAPI.delete(id); showToast('Coupon deleted', 'info'); fetchCoupons(); }
    catch { showToast('Delete failed', 'error'); }
  };

  const isExpired = (c: Coupon) => c.valid_until && new Date(c.valid_until) < new Date();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Coupons</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{coupons.length} discount codes</p>
        </div>
        <button id="add-coupon-btn" onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />Add Coupon
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && [...Array(6)].map((_, i) => <div key={i} className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        {!loading && coupons.map((coupon) => {
          const expired = isExpired(coupon);
          return (
            <div key={coupon.id} className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 shadow-sm hover:shadow-md transition-all group ${expired || !coupon.is_active ? 'border-slate-200 dark:border-slate-700 opacity-60' : 'border-violet-200 dark:border-violet-800'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-violet-100 dark:bg-violet-950/30 rounded-xl flex items-center justify-center">
                    <Tag className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-slate-900 dark:text-white">{coupon.code}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${expired ? 'bg-red-100 dark:bg-red-950/30 text-red-600' : coupon.is_active ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {expired ? 'Expired' : coupon.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(coupon)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(coupon.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-semibold">
                  <Percent className="w-4 h-4" />
                  {coupon.discount_value}{coupon.discount_type === 'percentage' ? '%' : '₹'} off
                  {coupon.minimum_order > 0 && <span className="text-xs text-slate-400 font-normal">• Min ₹{coupon.minimum_order}</span>}
                </div>
                {coupon.valid_until && (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    Expires {new Date(coupon.valid_until).toLocaleDateString()}
                  </div>
                )}
                {coupon.max_uses && (
                  <p className="text-xs text-slate-500">
                    {coupon.uses_count || 0}/{coupon.max_uses} uses
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">{editing ? 'Edit Coupon' : 'Add Coupon'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Coupon Code *</label>
                <input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE20" className="w-full font-mono uppercase border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Discount Type</label>
                <select value={form.discount_type || 'percentage'} onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Discount Value</label>
                <input type="number" min={0} value={form.discount_value || ''} onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Min Order (₹)</label>
                <input type="number" min={0} value={form.minimum_order || ''} onChange={(e) => setForm({ ...form, minimum_order: parseFloat(e.target.value) })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Max Uses</label>
                <input type="number" min={1} value={form.max_uses || ''} onChange={(e) => setForm({ ...form, max_uses: parseInt(e.target.value) || undefined })} placeholder="Unlimited" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Valid From</label>
                <input type="date" value={form.valid_from?.split('T')[0] || ''} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Valid Until</label>
                <input type="date" value={form.valid_until?.split('T')[0] || ''} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Status</label>
                <select value={form.is_active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">{editing ? 'Save Changes' : 'Create Coupon'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponsPage;
