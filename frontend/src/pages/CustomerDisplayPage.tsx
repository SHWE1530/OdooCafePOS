import React, { useEffect, useState, useCallback } from 'react';
import { publicAPI } from '../services/api';
import { getProductImage } from '../utils/image';
import type { Table, Floor } from '../types';
import { Coffee, Star, Users, CheckCircle2, QrCode } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface CustomerDisplayItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  note?: string;
  total: number;
}

interface ActiveOrder {
  id: number;
  order_number: string;
  table_id: number;
  status: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  items: CustomerDisplayItem[];
  upi_qr: string | null;
  paid_at: string | null;
  coupon_code?: string;
}

const CustomerDisplayPage: React.FC = () => {
  const { showToast } = useToast();
  const [tableId, setTableId] = useState<number | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // Feedback states
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Initialize and load tables if tableId is not set
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('table_id');
    if (idParam) {
      setTableId(parseInt(idParam));
    } else {
      // Load tables to let them configure the display
      Promise.all([publicAPI.getFloors(), publicAPI.getTables()])
        .then(([f, t]) => {
          setFloors(f);
          setTables(t);
          if (f.length > 0) setSelectedFloorId(f[0].id);
        })
        .catch(err => console.error("Setup load failed", err))
        .finally(() => setLoading(false));
    }
  }, []);

  const fetchActiveOrder = useCallback(async (id: number) => {
    try {
      const order = await publicAPI.getActiveOrder(id);
      if (order) {
        setActiveOrder(order);
        if (order.status === 'paid' && !showFeedback && !feedbackSubmitted) {
          setShowFeedback(true);
        }
      } else {
        setActiveOrder(null);
        setShowFeedback(false);
        setFeedbackSubmitted(false);
      }
    } catch (err) {
      console.error("Order fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [showFeedback, feedbackSubmitted]);

  // Load and listen for changes
  useEffect(() => {
    if (!tableId) return;

    fetchActiveOrder(tableId);

    // Setup WebSockets
    const wsUrl = `ws://${window.location.hostname}:8000/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Reload order if update corresponds to our table
        if (data.table_id === tableId || data.event === 'kitchen_updated') {
          fetchActiveOrder(tableId);
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => ws.close();
  }, [tableId, fetchActiveOrder]);

  // Handle setting tableId via query param
  const handleSelectTable = (id: number) => {
    window.history.pushState({}, '', `?table_id=${id}`);
    setTableId(id);
    setLoading(true);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    try {
      await publicAPI.submitFeedback(activeOrder.id, rating, comment);
      setFeedbackSubmitted(true);
      showToast('Thank you for your rating!', 'success');
      setTimeout(() => {
        // Reset feedback modal
        setShowFeedback(false);
        setComment('');
        setRating(5);
        setFeedbackSubmitted(false);
      }, 3000);
    } catch {
      showToast('Feedback submission failed', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider uppercase text-indigo-400">Syncing Display...</p>
      </div>
    );
  }

  // Setup / table selection view
  if (!tableId) {
    const floorTables = tables.filter(t => t.floor_id === selectedFloorId);
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-650 rounded-xl mb-2">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">Launch Customer Display</h1>
            <p className="text-xs text-slate-400">Select which table's order and checkout state this screen will mirror.</p>
          </div>

          {/* Floor Selection */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {floors.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFloorId(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedFloorId === f.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-3 gap-2">
            {floorTables.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelectTable(t.id)}
                className="p-3 bg-slate-800 hover:bg-indigo-950/40 hover:border-indigo-500/50 border border-slate-700/50 rounded-xl text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105"
              >
                <span className="font-extrabold text-sm text-white">{t.name || t.table_number}</span>
                <span className="text-[9px] text-slate-400">{t.capacity || t.seats} Seats</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Celebratory thank-you screen
  if (activeOrder && activeOrder.status === 'paid' && showFeedback) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 relative overflow-hidden">
        {/* Decorative sparkles */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-indigo-500/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-emerald-500/10 rounded-full blur-[80px]" />

        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 relative animate-fade-in">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 mb-2">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Thank You!</h1>
            <p className="text-slate-400 text-xs">Your payment has been successfully received.</p>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
              Order #{activeOrder.order_number}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex justify-between items-center max-w-sm mx-auto">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount Settled</span>
            <span className="text-2xl font-black text-emerald-400">₹{activeOrder.net_amount.toFixed(0)}</span>
          </div>

          {/* Feedback Form */}
          <div className="border-t border-slate-800/80 pt-6">
            {!feedbackSubmitted ? (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <p className="text-xs font-semibold text-slate-400">How would you rate your experience today?</p>
                <div className="flex justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-125"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what you liked! (optional)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 h-16 resize-none"
                />
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  Submit Review
                </button>
              </form>
            ) : (
              <div className="py-4 space-y-2 animate-pulse text-indigo-400">
                <Star className="w-10 h-10 fill-yellow-400 text-yellow-400 mx-auto" />
                <p className="text-sm font-bold">Feedback Submitted!</p>
                <p className="text-[10px] text-slate-500">Preparing display for the next customer...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Idle state (no active order)
  if (!activeOrder) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-650/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="text-center space-y-4 max-w-sm animate-pulse">
          <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Coffee className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Welcome to Odoo Cafe!</h1>
          <p className="text-xs text-slate-400 leading-normal">
            Ready to order? Just scan the unique QR code on your table using your mobile phone to browse our catalog, order delicious pastries, and pay instantly.
          </p>
          <div className="inline-flex items-center gap-1 text-[10px] bg-slate-900 border border-slate-800 text-indigo-400 font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
            <QrCode className="w-3.5 h-3.5" />
            Scan QR Code on Table to Begin
          </div>
        </div>
      </div>
    );
  }
  const getCustomUpiQr = () => {
    if (!activeOrder) return null;
    const savedConfig = localStorage.getItem('payment_methods_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.upiEnabled && parsed.upiId) {
          const amount = activeOrder.net_amount;
          const upiUri = `upi://pay?pa=${encodeURIComponent(parsed.upiId)}&pn=${encodeURIComponent('Cafe POS')}&am=${amount.toFixed(2)}&cu=INR`;
          return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;
        }
      } catch (e) {
        console.error('Failed to parse payment config', e);
      }
    }
    return activeOrder.upi_qr;
  };

  const upiQrSrc = getCustomUpiQr();

  // Active Checkout / Order view
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] overflow-hidden">
      {/* Left Column: Cart items */}
      <div className="flex flex-col h-full border-r border-slate-900 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Your Order</h2>
            <span className="text-[10px] bg-indigo-950/40 text-indigo-400 border border-indigo-800 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider mt-1 inline-block">
              Table {activeOrder.table_id}
            </span>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-850">
            {activeOrder.order_number}
          </span>
        </div>

        {/* Items List */}
        <div className="flex-1 space-y-3">
          {activeOrder.items.map(item => (
            <div 
              key={item.id} 
              className="bg-slate-900/60 border border-slate-850 rounded-2xl p-4 flex gap-4 items-center animate-fade-in"
            >
              <div className="w-14 h-14 rounded-xl bg-slate-950 overflow-hidden flex-shrink-0">
                <img 
                  src={getProductImage(item.product_name)} 
                  alt={item.product_name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">{item.product_name}</p>
                {item.note && (
                  <p className="text-[10px] text-amber-500 italic mt-0.5 font-medium">📝 {item.note}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  <span className="text-slate-400">{item.quantity} ×</span>
                  <span className="text-indigo-400 font-bold">₹{item.price.toFixed(0)}</span>
                </div>
              </div>
              <span className="font-extrabold text-sm text-white shrink-0">₹{item.total.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Totals & UPI Code */}
      <div className="flex flex-col bg-slate-900/40 p-8 justify-between border-t border-slate-900 lg:border-t-0">
        <div className="space-y-6">
          <h3 className="font-bold text-lg text-white">Settle Bill</h3>

          {/* Pricing Panel */}
          <div className="bg-slate-900 border border-slate-850 rounded-3xl p-5 space-y-3.5 shadow-xl relative overflow-hidden">
            {/* Subtle top decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
            
            <div className="flex justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>Subtotal</span>
              <span>₹{activeOrder.total_amount.toFixed(0)}</span>
            </div>
            {activeOrder.discount_amount > 0 && (
              <div className="flex justify-between text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                <span>Discounts</span>
                <span>−₹{activeOrder.discount_amount.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>GST & Tax (5%)</span>
              <span>₹{activeOrder.tax_amount.toFixed(0)}</span>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-slate-850">
              <span className="font-extrabold text-sm text-white">Amount Due</span>
              <span className="text-3xl font-black text-indigo-400">₹{activeOrder.net_amount.toFixed(0)}</span>
            </div>
          </div>

          {/* UPI Scan QR Display */}
          {upiQrSrc && (
            <div className="bg-white rounded-3xl p-6 flex flex-col items-center border border-slate-200 shadow-2xl max-w-xs mx-auto animate-pulse">
              <img 
                src={upiQrSrc} 
                alt="UPI QR Code" 
                className="w-48 h-48 rounded-xl border border-slate-100" 
              />
              <p className="text-[10px] text-indigo-650 font-bold uppercase tracking-widest mt-4 text-center leading-normal">
                Scan QR with GPay / PhonePe / Paytm to Settle ₹{activeOrder.net_amount.toFixed(0)}
              </p>
            </div>
          )}
        </div>

        {/* Live operators warning */}
        <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex items-center gap-3 mt-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Users className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-white uppercase tracking-wider">Operator Connection Active</p>
            <p className="text-[9px] text-slate-500">Checkout completes instantly as cashier processes payment.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDisplayPage;
