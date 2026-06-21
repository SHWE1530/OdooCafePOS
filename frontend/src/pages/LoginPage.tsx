import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Coffee, Eye, EyeOff, Loader2, Key, Mail, User as UserIcon, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80', // Elegant dining atmosphere
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80', // Premium coffee/barista
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80', // Chef preparing food
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80', // Luxury cafe interior
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80', // Kitchen operations
];

const LoginPage = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();
  
  // View states
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Passwords / actions
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Background Slider index
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Load remembered email
  useEffect(() => {
    const remembered = localStorage.getItem('rememberedEmail');
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    } else {
      setEmail('admin@cafe.com');
    }
    setPassword('admin123');
  }, []);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  // Calculate password strength
  const getPasswordStrength = (p: string) => {
    if (!p) return { score: 0, label: 'None', color: 'bg-slate-700' };
    let score = 0;
    if (p.length >= 6) score += 1;
    if (p.length >= 8) score += 1;
    if (/[A-Z]/.test(p)) score += 1;
    if (/[0-9]/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score, label: 'Medium', color: 'bg-amber-500' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    try {
      if (isSignUpMode) {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setSubmitting(false);
          return;
        }
        await authAPI.signup({ name, email, password, role: 'employee' });
        showToast('Registration successful! Logging in...', 'success');
        await login(email, password);
      } else {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        await login(email, password);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Incorrect email or password';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('A password reset link has been sent to your email.', 'success');
    setShowForgotPassword(false);
  };

  const demoUsers = [
    { label: 'Admin', email: 'admin@cafe.com', password: 'admin123', color: 'bg-indigo-650/40 border-indigo-500/20 hover:border-indigo-400' },
    { label: 'Cashier', email: 'cashier@cafe.com', password: 'cashier123', color: 'bg-blue-600/30 border-blue-500/20 hover:border-blue-400' },
    { label: 'Kitchen', email: 'kitchen@cafe.com', password: 'kitchen123', color: 'bg-orange-650/30 border-orange-500/20 hover:border-orange-400' },
    { label: 'Manager', email: 'manager@cafe.com', password: 'manager123', color: 'bg-emerald-600/30 border-emerald-500/20 hover:border-emerald-400' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      
      {/* Floating particles background effect for luxury atmosphere */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[20%] left-[10%] w-[450px] h-[450px] bg-indigo-650/10 rounded-full blur-[140px] animate-pulse-slow" />
        <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] bg-purple-650/15 rounded-full blur-[120px] animate-pulse-slow" />
        {/* Particle nodes */}
        <div className="absolute w-2 h-2 rounded-full bg-indigo-400/20 top-12 left-1/4 animate-float-slow" />
        <div className="absolute w-3.5 h-3.5 rounded-full bg-purple-400/10 bottom-36 left-1/3 animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute w-2.5 h-2.5 rounded-full bg-yellow-400/10 top-24 right-1/4 animate-float-slow" style={{ animationDelay: '4s' }} />
      </div>

      {/* LEFT SIDE (60%) - Hero section (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[60%] relative h-screen overflow-hidden select-none z-10 border-r border-white/5">
        {/* Rotating Image Slides */}
        {HERO_IMAGES.map((img, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1500 ease-in-out transform scale-102 ${
              idx === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}

        {/* Soft Dark & Blur overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0b1120]/95 via-[#0b1120]/75 to-[#0b1120]/60 backdrop-blur-[1px]" />

        {/* Hero Content */}
        <div className="absolute inset-0 flex flex-col justify-between p-16 z-20">
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#714B67] to-[#8B5CF6] flex items-center justify-center font-bold text-white shadow-lg border border-white/10">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-white tracking-wider text-base uppercase">Odoo Cafe</h2>
              <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">Enterprise Platform</p>
            </div>
          </div>

          {/* Heading info */}
          <div className="space-y-6 max-w-xl">
            <span className="text-[10px] font-extrabold text-[#D4AF37] bg-[#D4AF37]/15 px-3 py-1.5 rounded-full border border-[#D4AF37]/35 uppercase tracking-widest">
              Luxe Restaurant OS
            </span>
            <h1 className="text-5xl font-extrabold text-white tracking-tight leading-[1.1] animate-fade-in">
              Reimagining Restaurant Operations
            </h1>
            <p className="text-slate-350 text-base leading-relaxed font-normal">
              Manage orders, kitchen workflows, payments, customers and business insights from one intelligent platform.
            </p>
          </div>

          {/* Animated Statistics */}
          <div className="grid grid-cols-2 gap-6 max-w-lg">
            {[
              { text: '10,000+ Orders Processed', label: 'Scale' },
              { text: 'Real-Time Kitchen Operations', label: 'Velocity' },
              { text: 'Smart Business Insights', label: 'Intelligence' },
              { text: 'Enterprise POS Platform', label: 'Security' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/3 backdrop-blur-md border border-white/5 rounded-2xl p-3.5 hover:border-white/10 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white tracking-wide">{stat.text}</p>
                  <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE (40%) - Login Card */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-6 sm:p-12 z-10 relative h-screen overflow-y-auto">
        
        {/* Mobile background (renders only if screen is small) */}
        <div className="lg:hidden absolute inset-0 z-0">
          {HERO_IMAGES.map((img, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1500 ease-in-out ${
                idx === currentImageIndex ? 'opacity-35' : 'opacity-0'
              }`}
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}
          <div className="absolute inset-0 bg-[#0B1120]/90 backdrop-blur-[2px]" />
        </div>

        <div className="relative w-full max-w-md space-y-6 z-10 animate-fade-in">
          {/* Logo header for Mobile screen */}
          <div className="lg:hidden text-center space-y-2 mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-[#714B67] to-[#8B5CF6] rounded-xl shadow-lg mb-2">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Odoo Cafe POS</h1>
            <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">Restaurant OS</p>
          </div>

          {/* Frosted Glassmorphism Card (rounded-3xl = 24px) */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[24px] p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#714B67] via-[#8B5CF6] to-[#D4AF37] opacity-60" />
            
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white tracking-tight">{isSignUpMode ? 'Get Started' : 'Welcome back'}</h2>
              <p className="text-xs text-slate-400">
                {isSignUpMode 
                  ? 'Access world-class operations tools for your kitchen and staff.' 
                  : 'Log in to your workspace control dashboard.'
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3.5 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {isSignUpMode && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><UserIcon className="w-4 h-4" /></span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="John Doe"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><Mail className="w-4 h-4" /></span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@cafe.com"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><Key className="w-4 h-4" /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-12 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {isSignUpMode && password && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                      <span className="text-slate-500">Security Score:</span>
                      <span className={strength.score <= 2 ? 'text-rose-400' : strength.score <= 4 ? 'text-amber-400' : 'text-emerald-400'}>{strength.label}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                      <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${(strength.score / 5) * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {isSignUpMode && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Confirm Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><Key className="w-4 h-4" /></span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Remember Me & Forgot Password Links */}
              {!isSignUpMode && (
                <div className="flex items-center justify-between py-1.5">
                  <label className="flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-800 text-indigo-500 focus:ring-indigo-500/30 bg-slate-950/60 cursor-pointer"
                    />
                    Remember Me
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-350 transition-colors font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
              )}

              {/* Login Button with Luxury Purple Gradient: #714B67 -> #8B5CF6 */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-[#714B67] to-[#8B5CF6] text-white font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-[#8b5cf6]/20 hover:scale-[1.01] hover:brightness-[1.06] cursor-pointer text-xs font-bold uppercase tracking-wider disabled:opacity-60"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Authenticating...' : isSignUpMode ? 'Register Member' : 'Secure Sign In'}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                onClick={() => { setIsSignUpMode(!isSignUpMode); setError(''); resetForm(); }}
                className="text-xs text-slate-400 hover:text-white transition-colors font-bold uppercase tracking-wider cursor-pointer"
              >
                {isSignUpMode ? 'Already registered? Sign In' : 'Create an Account'}
              </button>
            </div>

            {/* Quick Demo Shortcuts for judges */}
            <div className="pt-5 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 mb-3.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Judges Quick Fills</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {demoUsers.map((u) => (
                  <button
                    type="button"
                    key={u.label}
                    onClick={() => { setEmail(u.email); setPassword(u.password); setIsSignUpMode(false); }}
                    className={`text-[9px] font-extrabold uppercase tracking-widest py-2 px-1 border rounded-lg text-slate-350 transition-all cursor-pointer ${u.color}`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-slate-600 text-[9px] uppercase font-bold tracking-widest">
            © 2026 Odoo Cafe POS · Luxury Operations Suite
          </p>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#714B67] to-[#8B5CF6]" />
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-white">Reset Password Request</h2>
              <button onClick={() => setShowForgotPassword(false)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Enter your email address and we will mail you a link to reset your password.
            </p>
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@cafe.com"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#714B67] to-[#8B5CF6] text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:brightness-[1.06] cursor-pointer text-xs font-bold uppercase tracking-wider"
              >
                Send Reset Link
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
