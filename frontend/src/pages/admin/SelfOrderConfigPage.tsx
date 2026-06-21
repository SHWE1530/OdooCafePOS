import { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { Save, ShoppingBag, Eye, Palette, Sparkles, Image as ImageIcon } from 'lucide-react';

interface SelfOrderConfig {
  mode: 'online' | 'menu_only';
  themeColor: string;
  bgColor: string;
  bgGradient: string;
  cafeName: string;
  welcomeMessage: string;
}

const STORAGE_KEY = 'self_order_config';

const COLOR_SCHEMES = [
  { name: 'Coffee Brown', primary: '#6F4E37', bg: '#FFF8E7', bgGradient: 'from-amber-950 via-amber-900 to-amber-950' },
  { name: 'Luxury Obsidian', primary: '#D4AF37', bg: '#1E1E1E', bgGradient: 'from-slate-950 via-slate-900 to-slate-950' },
  { name: 'Deep Emerald', primary: '#10B981', bg: '#064E3B', bgGradient: 'from-emerald-950 via-teal-900 to-emerald-950' },
  { name: 'Amethyst Night', primary: '#8B5CF6', bg: '#2E1065', bgGradient: 'from-violet-950 via-indigo-900 to-violet-950' },
  { name: 'Crimson Velvet', primary: '#EF4444', bg: '#450A0A', bgGradient: 'from-rose-950 via-red-900 to-rose-950' }
];

const SelfOrderConfigPage = () => {
  const { showToast } = useToast();
  const [config, setConfig] = useState<SelfOrderConfig>({
    mode: 'online',
    themeColor: '#6F4E37',
    bgColor: '#FFF8E7',
    bgGradient: 'from-slate-950 via-slate-900 to-slate-950',
    cafeName: 'Luxe Café & Bistro',
    welcomeMessage: 'Indulge in a premium culinary journey from the comfort of your table.',
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse self order config', e);
      }
    }
  }, []);

  const handleSave = () => {
    if (!config.cafeName.trim()) {
      showToast('Establishment name is required', 'error');
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    showToast('Self-ordering configuration updated!', 'success');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Self-Ordering Setup
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Configure the self-ordering customer web portal, background styles, and service modes.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-violet-600/20 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Mode Card 1: Online Ordering */}
        <div 
          onClick={() => setConfig({ ...config, mode: 'online' })}
          className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${
            config.mode === 'online'
              ? 'bg-indigo-650/15 border-indigo-500 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500'
              : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${
              config.mode === 'online' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'
            }`}>
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              config.mode === 'online' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-700'
            }`}>
              {config.mode === 'online' && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Online Ordering Mode</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Allow table guests to view products, add items to cart, and place orders directly to the KDS/Cashier.
          </p>
        </div>

        {/* Mode Card 2: QR Menu Only */}
        <div 
          onClick={() => setConfig({ ...config, mode: 'menu_only' })}
          className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${
            config.mode === 'menu_only'
              ? 'bg-amber-650/15 border-amber-500 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500'
              : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${
              config.mode === 'menu_only' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              <Eye className="w-6 h-6" />
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              config.mode === 'menu_only' ? 'border-amber-500 bg-amber-500' : 'border-slate-700'
            }`}>
              {config.mode === 'menu_only' && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">QR Menu Only</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Digital menu showcase only. Cart and ordering are disabled. Cashier handles all order inputs.
          </p>
        </div>

        {/* Branding Config */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm col-span-1 md:col-span-3 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-violet-500" />
            Customer Portal Branding
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                Establishment Title / Brand Name
              </label>
              <input
                type="text"
                value={config.cafeName}
                onChange={(e) => setConfig({ ...config, cafeName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                Portal Welcome Message
              </label>
              <input
                type="text"
                value={config.welcomeMessage}
                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Styling Options */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm col-span-1 md:col-span-3 space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-violet-500" />
            Visual Themes & Background Aesthetics
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">
              Select Preset Theme Scheme
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {COLOR_SCHEMES.map((scheme) => (
                <div 
                  key={scheme.name}
                  onClick={() => setConfig({ 
                    ...config, 
                    themeColor: scheme.primary,
                    bgGradient: scheme.bgGradient
                  })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    config.themeColor === scheme.primary && config.bgGradient === scheme.bgGradient
                      ? 'border-violet-500 bg-slate-50 dark:bg-slate-800/80' 
                      : 'border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: scheme.primary }} />
                    <span className="text-xs font-medium text-slate-900 dark:text-white truncate">{scheme.name}</span>
                  </div>
                  <div className={`h-8 rounded bg-gradient-to-r ${scheme.bgGradient}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                Accent Theme Color (Hex Code)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.themeColor}
                  onChange={(e) => setConfig({ ...config, themeColor: e.target.value })}
                  className="w-10 h-10 rounded bg-transparent border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.themeColor}
                  onChange={(e) => setConfig({ ...config, themeColor: e.target.value })}
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm w-36 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" /> Background Gradient Class (Tailwind)
              </label>
              <input
                type="text"
                value={config.bgGradient}
                onChange={(e) => setConfig({ ...config, bgGradient: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white"
                placeholder="from-slate-950 via-slate-900 to-slate-950"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfOrderConfigPage;
