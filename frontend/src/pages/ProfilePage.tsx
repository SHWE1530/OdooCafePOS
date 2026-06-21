import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authAPI } from '../services/api';
import { Lock, Mail, Shield, Calendar, Key, AlertCircle } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    
    setUpdating(true);
    try {
      await authAPI.changePassword({ old_password: oldPassword, new_password: newPassword });
      showToast('Password changed successfully!', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to change password';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Profile Center</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Manage your personal account credentials</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-3xl font-bold border-2 border-indigo-500 mb-4 shadow-inner">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h2>
          <p className="text-xs font-semibold px-2 py-0.5 mt-1 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 capitalize">{user.role}</p>
          
          <div className="w-full mt-6 space-y-4 text-left border-t border-slate-100 dark:border-slate-800 pt-6">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 text-sm">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 text-sm">
              <Shield className="w-4 h-4 text-slate-400" />
              <span>Status: <b className="text-emerald-500">Active</b></span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Security Settings</h2>
          </div>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2 border border-red-100 dark:border-red-900/50">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Enter current password"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Min 6 characters"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Confirm new password"
              />
            </div>
            
            <button
              type="submit"
              disabled={updating}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <Key className="w-4 h-4" />
              {updating ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
