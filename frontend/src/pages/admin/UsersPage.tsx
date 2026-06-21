import React, { useEffect, useState } from 'react';
import { authAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Key, Trash2, Check, X } from 'lucide-react';

const UsersPage: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [isActive, setIsActive] = useState(true);
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await authAPI.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authAPI.signup({ name, email, password, role });
      showToast('User created successfully!', 'success');
      setShowCreateModal(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create user';
      showToast(msg, 'error');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await authAPI.updateUser(selectedUser.id, { name, email, role, is_active: isActive });
      showToast('User updated successfully!', 'success');
      setShowEditModal(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update user';
      showToast(msg, 'error');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await authAPI.resetPassword(selectedUser.id, { password });
      showToast('Password reset successful!', 'success');
      setShowResetModal(false);
      resetForm();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to reset password';
      showToast(msg, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await authAPI.deleteUser(id);
      showToast('User deleted successfully', 'success');
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to delete user';
      showToast(msg, 'error');
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('employee');
    setIsActive(true);
    setSelectedUser(null);
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setIsActive(user.is_active);
    setShowEditModal(true);
  };

  const openResetModal = (user: any) => {
    setSelectedUser(user);
    setPassword('');
    setShowResetModal(true);
  };

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-48 mb-8" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin User Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Create, edit, reset passwords, or archive cafe operators</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-md shadow-indigo-600/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Email</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Role</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-white">{u.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{u.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                      u.role === 'admin' ? 'bg-violet-100 dark:bg-violet-950/40 text-violet-600' :
                      u.role === 'kitchen' ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600' :
                      'bg-blue-100 dark:bg-blue-950/40 text-blue-600'
                    }`}>
                      {u.role === 'employee' ? 'Cashier' : u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {u.is_active ? (
                      <span className="flex items-center gap-1.5 text-emerald-500 font-semibold text-xs">
                        <Check className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-slate-400 font-semibold text-xs">
                        <X className="w-3.5 h-3.5" /> Archived
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-right space-x-2">
                    <button
                      onClick={() => openEditModal(u)}
                      className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Account"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openResetModal(u)}
                      className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Reset Password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Delete Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Operator</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-650 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@cafe.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-white transition-all"
                >
                  <option value="admin">Admin</option>
                  <option value="employee">Cashier</option>
                  <option value="kitchen">Kitchen Staff</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Account</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-655 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-white transition-all"
                >
                  <option value="admin">Admin</option>
                  <option value="employee">Cashier</option>
                  <option value="kitchen">Kitchen Staff</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-650 bg-slate-50 rounded border-slate-350 focus:ring-indigo-500 focus:ring-2 dark:bg-slate-950"
                />
                <label htmlFor="isActiveCheck" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Active Operator</label>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Key className="w-5 h-5 text-indigo-500" /> Reset Password</h2>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-655 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Resetting password for <b>{selectedUser.name}</b>. Enter the new password below.
            </p>
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-white transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Reset Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
