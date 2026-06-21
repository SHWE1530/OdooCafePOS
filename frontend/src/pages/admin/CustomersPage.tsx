import { useEffect, useState } from 'react';
import { customersAPI } from '../../services/api';
import type { Customer } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Plus, Search, Phone, Mail, X, ShoppingBag } from 'lucide-react';

const CustomersPage = () => {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const fetchCustomers = async (q?: string) => {
    setLoading(true);
    try { setCustomers(await customersAPI.getAll(q)); }
    catch { showToast('Failed to load customers', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async () => {
    try {
      const c = await customersAPI.create(form);
      setCustomers((prev) => [...prev, c]);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '' });
      showToast('Customer added!', 'success');
    } catch (e: any) { showToast(e.response?.data?.detail || 'Failed to add customer', 'error'); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customers</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{customers.length} registered customers</p>
        </div>
        <button id="add-customer-btn" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />Add Customer
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Loyalty Points</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Spent</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && [...Array(5)].map((_, i) => (
              <tr key={i}>
                {[...Array(5)].map((_, j) => (
                  <td key={j} className="px-4 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /></td>
                ))}
              </tr>
            ))}
            {!loading && customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white text-sm">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    {c.email && <div className="flex items-center gap-1.5 text-xs text-slate-500"><Mail className="w-3 h-3" />{c.email}</div>}
                    {c.phone && <div className="flex items-center gap-1.5 text-xs text-slate-500"><Phone className="w-3 h-3" />{c.phone}</div>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 py-1 rounded-lg">
                    ★ {c.loyalty_points || 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-violet-600 dark:text-violet-400">
                  ₹{(c.total_spent || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                    {c.total_orders || 0}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">Add Customer</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleCreate} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">Add Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
