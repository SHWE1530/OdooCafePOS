import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { 
  LayoutDashboard, Coffee, ChefHat, Grid, 
  Settings, LogOut, Layers, Ticket, Percent, Users,
  CreditCard, QrCode
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout, activeSession } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen text-slate-200 shrink-0">
      {/* Header / Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            O
          </div>
          <div>
            <h1 className="font-semibold text-white tracking-wide text-sm">Odoo Cafe POS</h1>
            <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider">Restaurant OS</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {/* Admin Links */}
        {user.role === 'admin' && (
          <>
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Management</p>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Users className="w-4 h-4" />
              User Management
            </NavLink>
          </>
        )}

        {/* POS Cashier Links */}
        {(user.role === 'admin' || user.role === 'employee') && (
          <>
            {user.role === 'admin' && <div className="h-px bg-slate-800 my-4" />}
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Sales Operations</p>
            <NavLink
              to="/pos"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Coffee className="w-4 h-4" />
              POS Terminal
            </NavLink>
            <NavLink
              to="/tables"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Grid className="w-4 h-4" />
              Table Layout
            </NavLink>
            <NavLink
              to="/customer-display"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            >
              <Users className="w-4 h-4" />
              Customer Display
            </NavLink>
          </>
        )}

        {/* Kitchen Links */}
        {(user.role === 'admin' || user.role === 'kitchen' || user.role === 'employee') && (
          <>
            <div className="h-px bg-slate-800 my-4" />
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Kitchen display</p>
            <NavLink
              to="/kitchen"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <ChefHat className="w-4 h-4" />
              Kitchen Screen
            </NavLink>
          </>
        )}

        {/* Admin CRUD Links */}
        {user.role === 'admin' && (
          <>
            <div className="h-px bg-slate-800 my-4" />
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Database Setup</p>
            <NavLink
              to="/admin/products"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Settings className="w-4 h-4" />
              Products CRUD
            </NavLink>
            <NavLink
              to="/admin/categories"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Layers className="w-4 h-4" />
              Categories CRUD
            </NavLink>
            <NavLink
              to="/admin/floors"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Grid className="w-4 h-4" />
              Floors & Tables
            </NavLink>
            <NavLink
              to="/admin/customers"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Users className="w-4 h-4" />
              Customers
            </NavLink>
            <NavLink
              to="/admin/coupons"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Ticket className="w-4 h-4" />
              Coupons CRUD
            </NavLink>
            <NavLink
              to="/admin/promotions"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Percent className="w-4 h-4" />
              Promotions CRUD
            </NavLink>
            <NavLink
              to="/admin/payment-methods"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <CreditCard className="w-4 h-4" />
              Payment Methods
            </NavLink>
            <NavLink
              to="/admin/self-order-config"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <QrCode className="w-4 h-4" />
              Self-Ordering Setup
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer Profile & Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between mb-4">
          <NavLink to="/profile" className="flex flex-col min-w-0 hover:text-indigo-400 transition-colors">
            <span className="text-xs font-semibold text-white truncate hover:underline">{user.name}</span>
            <span className="text-[10px] text-slate-500 capitalize">{user.role}</span>
          </NavLink>
          <ThemeToggle />
        </div>
        
        {/* Session Status Tag */}
        {user.role !== 'kitchen' && (
          <div className={`mb-4 text-center py-1.5 px-3 rounded-lg text-[10px] font-bold ${
            activeSession 
              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800' 
              : 'bg-rose-950/40 text-rose-400 border border-rose-800'
          }`}>
            {activeSession ? '● Active Session Open' : '○ Closed Session'}
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-rose-900/40 hover:text-rose-200 text-slate-300 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
