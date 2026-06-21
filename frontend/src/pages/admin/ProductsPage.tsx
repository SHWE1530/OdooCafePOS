import { useEffect, useState } from 'react';
import { productsAPI, categoriesAPI } from '../../services/api';
import type { Product, Category } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, Search, X, Package } from 'lucide-react';
import { getProductImage } from '../../utils/image';

const emptyForm = (): Partial<Product> => ({
  name: '', description: '', price: 0, category_id: undefined,
  is_available: true, preparation_time: 10, image_url: '',
  stock: 50, min_stock: 10,
});

const ProductsPage = () => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>(emptyForm());
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Category creation on the fly
  const [showInlineCategory, setShowInlineCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#8B5CF6');

  const handleCreateCategoryOnFly = async () => {
    if (!newCategoryName.trim()) {
      showToast('Category name is required', 'error');
      return;
    }
    try {
      const newCat = await categoriesAPI.create({ name: newCategoryName, color: newCategoryColor });
      setCategories((prev) => [...prev, newCat]);
      setForm((prev) => ({ ...prev, category_id: newCat.id }));
      setNewCategoryName('');
      setNewCategoryColor('#8B5CF6');
      setShowInlineCategory(false);
      showToast('Category created and selected!', 'success');
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Failed to create category', 'error');
    }
  };

  const LIMIT = 12;

  const fetchProducts = async (p = page, s = search) => {
    setLoading(true);
    try {
      const res = await productsAPI.getPaginated({ page: p, limit: LIMIT, search: s });
      setProducts(res.items);
      setTotal(res.total);
    } catch { showToast('Failed to load products', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    categoriesAPI.getAll().then(setCategories);
    fetchProducts();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchProducts(1, search); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const openAdd = () => { 
    setEditing(null); 
    setForm(emptyForm()); 
    setImageFile(null);
    setPreviewUrl(null);
    setShowInlineCategory(false);
    setNewCategoryName('');
    setNewCategoryColor('#8B5CF6');
    setShowModal(true); 
  };
  
  const openEdit = (p: Product) => { 
    setEditing(p); 
    setForm({ ...p }); 
    setImageFile(null);
    setPreviewUrl(null);
    setShowInlineCategory(false);
    setNewCategoryName('');
    setNewCategoryColor('#8B5CF6');
    setShowModal(true); 
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      showToast('Product name is required', 'error');
      return;
    }
    if (!form.category_id) {
      showToast('Please select a Category', 'error');
      return;
    }
    if (form.price === undefined || form.price === null || form.price < 0 || isNaN(form.price)) {
      showToast('Please enter a valid price', 'error');
      return;
    }
    setUploadingImage(true);
    try {
      const finalForm = { ...form };
      if (imageFile) {
        try {
          const res = await productsAPI.uploadImage(imageFile);
          finalForm.image_url = res.url;
        } catch (uploadErr) {
          showToast('Image upload failed, trying to save product anyway', 'error');
        }
      }

      if (editing) {
        await productsAPI.update(editing.id, finalForm);
        showToast('Product updated successfully!', 'success');
      } else {
        await productsAPI.create(finalForm);
        showToast('Product created successfully!', 'success');
      }
      setShowModal(false);
      fetchProducts();
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Save failed', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productsAPI.delete(id);
      showToast('Product deleted', 'info');
      fetchProducts();
    } catch { showToast('Delete failed', 'error'); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Products</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{total} items in menu</p>
        </div>
        <button
          id="add-product-btn"
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && [...Array(6)].map((_, i) => (
              <tr key={i}>
                {[...Array(6)].map((_, j) => (
                  <td key={j} className="px-4 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /></td>
                ))}
              </tr>
            ))}
            {!loading && products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-950/30 rounded-xl flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
                      <img src={getProductImage(p.name, p.image_url)} className="w-full h-full object-cover rounded-xl" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">{p.name}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{p.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{categories.find(c => c.id === p.category_id)?.name || '—'}</td>
                <td className="px-4 py-3 text-sm font-semibold text-violet-600 dark:text-violet-400">₹{p.price.toFixed(0)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.is_available ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'}`}>
                    {p.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      (p.stock ?? 0) <= (p.min_stock ?? 10)
                        ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {p.stock ?? 0} / {p.min_stock ?? 10}
                    </span>
                    {(p.stock ?? 0) <= (p.min_stock ?? 10) && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">Low</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); fetchProducts(page - 1); }} className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 disabled:opacity-50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Previous</button>
              <button disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); fetchProducts(page + 1); }} className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 disabled:opacity-50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Name *</label>
                <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Description</label>
                <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Price (₹) *</label>
                <input type="number" min={0} value={form.price || ''} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Category</label>
                  <button 
                    type="button" 
                    onClick={() => setShowInlineCategory(!showInlineCategory)} 
                    className="text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    {showInlineCategory ? 'Select Existing' : '+ Add New'}
                  </button>
                </div>
                {!showInlineCategory ? (
                  <select value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: parseInt(e.target.value) || undefined })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">No Category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800/80">
                    <input 
                      value={newCategoryName} 
                      onChange={(e) => setNewCategoryName(e.target.value)} 
                      placeholder="New Category Name" 
                      className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 text-white" 
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Color:</span>
                        <input 
                          type="color" 
                          value={newCategoryColor} 
                          onChange={(e) => setNewCategoryColor(e.target.value)} 
                          className="w-6 h-6 bg-transparent border-0 cursor-pointer" 
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={handleCreateCategoryOnFly} 
                        className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-500 text-white font-bold rounded-lg text-[9px] uppercase tracking-wider cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Prep Time (min)</label>
                <input type="number" min={0} value={form.preparation_time || ''} onChange={(e) => setForm({ ...form, preparation_time: parseInt(e.target.value) })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Available</label>
                <select value={form.is_available ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_available: e.target.value === 'true' })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="true">Available</option>
                  <option value="false">Unavailable</option>
                </select>
              </div>

              {/* Stock Inputs */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Stock Level *</label>
                <input 
                  type="number" 
                  min={0} 
                  value={form.stock ?? 50} 
                  onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} 
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                    (form.stock ?? 50) <= (form.min_stock ?? 10)
                      ? 'border-amber-400 bg-amber-500/5 focus:ring-amber-500 dark:border-amber-600 text-amber-700 dark:text-amber-400 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-violet-500'
                  }`} 
                />
                {(form.stock ?? 50) <= (form.min_stock ?? 10) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold flex items-center gap-1">
                    ⚠️ Low stock warning
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Min Stock Threshold</label>
                <input 
                  type="number" 
                  min={0} 
                  value={form.min_stock ?? 10} 
                  onChange={(e) => setForm({ ...form, min_stock: parseInt(e.target.value) || 0 })} 
                  className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" 
                />
              </div>

              {/* Modern Image Upload Section */}
              <div className="col-span-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Product Image</label>
                <div className="flex gap-4 items-center">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                    {previewUrl || form.image_url ? (
                      <img src={previewUrl || getProductImage(form.name || '', form.image_url)} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-slate-400" />
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors inline-block">
                        Choose File
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      </label>
                      {(previewUrl || form.image_url) && (
                        <button 
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setPreviewUrl(null);
                            setForm({ ...form, image_url: '' });
                          }}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-455 rounded-xl text-xs font-semibold transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">Supports PNG, JPG. Max 5MB.</p>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-[11px] font-medium text-slate-400 dark:text-slate-550 mb-1">Or enter direct Image URL</label>
                  <input 
                    value={form.image_url || ''} 
                    onChange={(e) => {
                      setForm({ ...form, image_url: e.target.value });
                      setPreviewUrl(null); 
                      setImageFile(null);
                    }} 
                    placeholder="https://images.unsplash.com/..." 
                    className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500" 
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button disabled={uploadingImage} onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button disabled={uploadingImage} onClick={handleSave} className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                {uploadingImage ? 'Uploading...' : (editing ? 'Save Changes' : 'Create Product')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
