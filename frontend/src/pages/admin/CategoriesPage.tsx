import { useEffect, useState } from 'react';
import { categoriesAPI } from '../../services/api';
import type { Category } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, X, Tag } from 'lucide-react';

const EMOJI_OPTIONS = ['☕', '🍵', '🥤', '🧃', '🍹', '🍔', '🌮', '🍕', '🥗', '🍜', '🍣', '🍰', '🧁', '🍩', '🥪', '🥘'];

const CategoriesPage = () => {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '🍽️', color: '#7c5dfa' });

  const fetchCategories = async () => {
    setLoading(true);
    try { setCategories(await categoriesAPI.getAll()); }
    catch { showToast('Failed to load categories', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', icon: '🍽️', color: '#7c5dfa' }); setShowModal(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, description: c.description || '', icon: c.icon || '🍽️', color: c.color || '#7c5dfa' }); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (editing) { await categoriesAPI.update(editing.id, form); showToast('Category updated!', 'success'); }
      else { await categoriesAPI.create(form); showToast('Category created!', 'success'); }
      setShowModal(false);
      fetchCategories();
    } catch (e: any) { showToast(e.response?.data?.detail || 'Save failed', 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    try { await categoriesAPI.delete(id); showToast('Category deleted', 'info'); fetchCategories(); }
    catch { showToast('Delete failed - category may have products', 'error'); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Categories</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{categories.length} menu categories</p>
        </div>
        <button id="add-category-btn" onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />Add Category
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading && [...Array(8)].map((_, i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        {!loading && categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${cat.color || '#7c5dfa'}22` }}>
                {cat.icon || <Tag className="w-6 h-6" />}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(cat)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white">{cat.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{cat.description || 'No description'}</p>
          </div>
        ))}
        {!loading && categories.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400">
            No categories yet. Add your first one!
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">{editing ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button key={emoji} onClick={() => setForm({ ...form, icon: emoji })}
                      className={`w-9 h-9 text-xl rounded-xl transition-all ${form.icon === emoji ? 'bg-violet-100 dark:bg-violet-950/40 ring-2 ring-violet-500' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >{emoji}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer" />
                  <span className="text-sm text-slate-500">{form.color}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">{editing ? 'Save Changes' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
