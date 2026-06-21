import { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { CreditCard, Wallet, QrCode, Save, ShieldCheck } from 'lucide-react';

interface PaymentMethodsConfig {
  cashEnabled: boolean;
  cardEnabled: boolean;
  upiEnabled: boolean;
  upiId: string;
}

const STORAGE_KEY = 'payment_methods_config';

const PaymentMethodsPage = () => {
  const { showToast } = useToast();
  const [config, setConfig] = useState<PaymentMethodsConfig>({
    cashEnabled: true,
    cardEnabled: true,
    upiEnabled: true,
    upiId: 'cafe@ybl',
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse payment methods config', e);
      }
    }
  }, []);

  const handleSave = () => {
    if (config.upiEnabled && !config.upiId.trim()) {
      showToast('UPI Merchant ID is required when UPI is enabled', 'error');
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    showToast('Payment methods configuration saved successfully!', 'success');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Payment Methods Setup
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Configure available payment terminals, checkout methods, and merchant credentials.
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
        {/* Cash Payment Config */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${
          config.cashEnabled 
            ? 'bg-slate-900/60 border-emerald-500/30 shadow-md shadow-emerald-500/5' 
            : 'bg-slate-900/20 border-slate-800'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${
              config.cashEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
            }`}>
              <Wallet className="w-6 h-6" />
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.cashEnabled}
                onChange={(e) => setConfig({ ...config, cashEnabled: e.target.checked })}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-checked:after:border-white"></div>
            </label>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Cash Register</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Accept physical cash payments. Enables cashier change calculator during checkout.
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Local checkout only</span>
          </div>
        </div>

        {/* Card Payment Config */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${
          config.cardEnabled 
            ? 'bg-slate-900/60 border-violet-500/30 shadow-md shadow-violet-500/5' 
            : 'bg-slate-900/20 border-slate-800'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${
              config.cardEnabled ? 'bg-violet-500/10 text-violet-400' : 'bg-slate-800 text-slate-400'
            }`}>
              <CreditCard className="w-6 h-6" />
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.cardEnabled}
                onChange={(e) => setConfig({ ...config, cardEnabled: e.target.checked })}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-500 peer-checked:after:bg-white peer-checked:after:border-white"></div>
            </label>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Card Terminal</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Accept credit/debit card swipe payments. Integrates external POS swipe terminal prompts.
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Swipe, Tap & Chip</span>
          </div>
        </div>

        {/* UPI QR Config */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${
          config.upiEnabled 
            ? 'bg-slate-900/60 border-amber-500/30 shadow-md shadow-amber-500/5' 
            : 'bg-slate-900/20 border-slate-800'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${
              config.upiEnabled ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              <QrCode className="w-6 h-6" />
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.upiEnabled}
                onChange={(e) => setConfig({ ...config, upiEnabled: e.target.checked })}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-white peer-checked:after:border-white"></div>
            </label>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">UPI QR Code</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Generate dynamic checkout UPI QR codes instantly for customers to scan and pay.
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Instant Mobile Payments</span>
          </div>
        </div>
      </div>

      {config.upiEnabled && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">UPI Merchant Settings</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Enter your UPI VPA (Virtual Payment Address). All customer payments will be routed directly to this account via the QR code.
          </p>
          
          <div className="max-w-md">
            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
              UPI Merchant VPA / ID *
            </label>
            <div className="relative">
              <input
                type="text"
                value={config.upiId}
                onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
                placeholder="merchant@vpa (e.g. cafe@ybl)"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                VPA
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Verify your VPA carefully. Incorrect addresses will result in payment failures or money sent to the wrong account.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodsPage;
