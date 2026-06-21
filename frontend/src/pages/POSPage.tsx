import { useEffect, useState, useCallback } from 'react';
import { productsAPI, categoriesAPI, ordersAPI, paymentsAPI, tablesAPI, customersAPI } from '../services/api';
import type { Product, Category, Order, Table, Customer, PaymentMethod } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Star,
  Banknote, Smartphone, ChevronRight, Tag, X, Send, Printer, Sparkles
} from 'lucide-react';
import { getProductImage } from '../utils/image';

interface CartItem {
  product: Product;
  quantity: number;
  note: string;
}

// ── Left Panel: Product Catalog ──────────────────────────────────────
const CatalogPanel = ({
  categories, products, onAdd, search, setSearch, activeCategory, setActiveCategory
}: {
  categories: Category[];
  products: Product[];
  onAdd: (p: Product) => void;
  search: string;
  setSearch: (s: string) => void;
  activeCategory: number | null;
  setActiveCategory: (id: number | null) => void;
}) => {
  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === null || p.category_id === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Search */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="pos-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 p-3 overflow-x-auto border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 flex-shrink-0">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeCategory === null
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-850'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            style={{ borderLeftColor: c.color }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border-l-4 cursor-pointer ${
              activeCategory === c.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-850'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 xl:grid-cols-3 gap-4 content-start">
        {filtered.map((product) => {
          const catColor = product.category?.color || '#6366f1';
          return (
            <button
              key={product.id}
              onClick={() => onAdd(product)}
              style={{ borderLeftColor: catColor }}
              className="group bg-white dark:bg-slate-900 rounded-2xl border-l-4 border-y border-r border-slate-200/80 dark:border-slate-800/80 p-3.5 text-left hover:border-indigo-400 dark:hover:border-indigo-400 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer flex flex-col"
            >
              <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-950 rounded-xl mb-3 overflow-hidden shadow-inner relative">
                <img
                  src={getProductImage(product.name, product.image_url)}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-all duration-500"
                />
                {product.stock !== undefined && product.stock <= (product.min_stock || 10) && (
                  <span className="absolute top-2 right-2 bg-rose-600/90 text-white font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm">
                    Low Stock: {product.stock}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{product.name}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{product.description || 'Delectable fresh cafe item'}</p>
              
              <div className="flex items-center justify-between mt-auto pt-3">
                <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">₹{product.price.toFixed(0)}</span>
                <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-950/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow shadow-indigo-500/25">
                  <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                </span>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-20 text-slate-500 text-sm">No items found in this section</div>
        )}
      </div>
    </div>
  );
};

// ── Center Panel: Cart & Combo Suggestions ───────────────────────────
const CartPanel = ({
  cart, order, onIncrease, onDecrease, onRemove, onNoteChange, onSendToKitchen,
  tables, customers, selectedTable, setSelectedTable, selectedCustomer, setSelectedCustomer,
  couponCode, setCouponCode, onApplyCoupon, onRemoveCoupon, products, onAddRecommendation
}: {
  cart: CartItem[];
  order: Order | null;
  onIncrease: (id: number) => void;
  onDecrease: (id: number) => void;
  onRemove: (id: number) => void;
  onNoteChange: (id: number, note: string) => void;
  onSendToKitchen: () => void;
  tables: Table[];
  customers: Customer[];
  selectedTable: number | null;
  setSelectedTable: (id: number | null) => void;
  selectedCustomer: number | null;
  setSelectedCustomer: (id: number | null) => void;
  couponCode: string;
  setCouponCode: (c: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  products: Product[];
  onAddRecommendation: (p: Product) => void;
}) => {
  const subtotal = order?.total_amount || cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = order?.discount_amount || 0;
  const tax = order?.tax_amount || (subtotal - discount) * 0.05;
  const total = order?.net_amount || order?.total || (subtotal - discount + tax);

  // Simple dynamic combo helper
  const getComboRecommendation = () => {
    if (cart.length === 0) return null;
    const cartItemIds = cart.map(i => i.product.id);
    
    // Check if they have coffee (Cappuccino, Espresso, Latte, Cold Coffee)
    const hasCoffee = cart.some(i => i.product.name.toLowerCase().includes('cappuccino') || i.product.name.toLowerCase().includes('espresso') || i.product.name.toLowerCase().includes('latte') || i.product.name.toLowerCase().includes('coffee'));
    const hasBurger = cart.some(i => i.product.name.toLowerCase().includes('burger') || i.product.name.toLowerCase().includes('sandwich'));

    if (hasCoffee) {
      // Recommend Butter Croissant (p7) or Chocolate Mud Cake (p10)
      const croissant = products.find(p => p.name.toLowerCase().includes('croissant'));
      if (croissant && !cartItemIds.includes(croissant.id)) {
        return { source: 'Coffee', target: croissant, reason: 'Frequently ordered together with hot drinks.' };
      }
      const cake = products.find(p => p.name.toLowerCase().includes('mud cake'));
      if (cake && !cartItemIds.includes(cake.id)) {
        return { source: 'Coffee', target: cake, reason: 'Customers love pairing hot drinks with chocolate cakes.' };
      }
    }
    
    if (hasBurger) {
      // Recommend Mint Cooler or Margherita Pizza
      const cooler = products.find(p => p.name.toLowerCase().includes('cooler'));
      if (cooler && !cartItemIds.includes(cooler.id)) {
        return { source: 'Sandwich/Burger', target: cooler, reason: 'Add a fresh Mango Cooler drink to make it a combo!' };
      }
    }
    
    // Default fallback recommendation
    const standardPromo = products.find(p => p.name.toLowerCase().includes('croissant') || p.name.toLowerCase().includes('cheesecake'));
    if (standardPromo && !cartItemIds.includes(standardPromo.id)) {
      return { source: 'Your Cart', target: standardPromo, reason: 'Chef Recommendation: Sweet treat to complete your meal.' };
    }
    return null;
  };

  const recommendation = getComboRecommendation();

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-slate-900 dark:text-white">Current Order</h2>
          {order && <span className="ml-auto text-xs bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">#{order.id}</span>}
        </div>
        {/* Table & Customer selectors */}
        <div className="grid grid-cols-2 gap-2">
          <select
            id="pos-table-select"
            value={selectedTable || ''}
            onChange={(e) => setSelectedTable(e.target.value ? parseInt(e.target.value) : null)}
            className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer font-semibold"
          >
            <option value="">No Table</option>
            {tables.filter(t => t.status === 'available' || t.status === 'occupied').map((t) => (
              <option key={t.id} value={t.id}>{t.table_number} ({t.status})</option>
            ))}
          </select>
          <select
            id="pos-customer-select"
            value={selectedCustomer || ''}
            onChange={(e) => setSelectedCustomer(e.target.value ? parseInt(e.target.value) : null)}
            className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer font-semibold"
          >
            <option value="">Walk-in Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30 animate-pulse text-indigo-400" />
            <p className="text-sm font-semibold">Start adding items to your cart</p>
          </div>
        )}
        {cart.map((item) => (
          <div key={item.product.id} className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-100 dark:border-slate-850">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.product.name}</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">₹{item.product.price.toFixed(0)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onDecrease(item.product.id)} className="w-6 h-6 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white w-4 text-center">{item.quantity}</span>
                <button onClick={() => onIncrease(item.product.id)} className="w-6 h-6 bg-indigo-650 text-white rounded-full flex items-center justify-center hover:bg-indigo-500 transition-colors cursor-pointer">
                  <Plus className="w-3 h-3" />
                </button>
                <button onClick={() => onRemove(item.product.id)} className="w-6 h-6 text-rose-400 hover:text-rose-600 transition-colors cursor-pointer ml-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-850">
              <input
                value={item.note}
                onChange={(e) => onNoteChange(item.product.id, e.target.value)}
                placeholder="Special preparation notes..."
                className="text-[10px] bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded px-2 py-0.5 text-slate-800 dark:text-slate-300 w-3/4 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                ₹{(item.product.price * item.quantity).toFixed(0)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Combo Recommendations Card */}
      {recommendation && (
        <div className="mx-3 mb-2 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 p-3 rounded-2xl flex flex-col gap-2 relative overflow-hidden animate-pulse">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Smart Combo Suggestion
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">Pair with {recommendation.target.name}?</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">{recommendation.reason}</p>
            </div>
            <button
              onClick={() => onAddRecommendation(recommendation.target)}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wide shrink-0 cursor-pointer shadow-md shadow-indigo-600/10 transition-colors"
            >
              + ₹{recommendation.target.price.toFixed(0)}
            </button>
          </div>
        </div>
      )}

      {/* Coupon */}
      {cart.length > 0 && (
        <div className="px-3 pb-2 bg-white dark:bg-slate-900">
          {order?.coupon ? (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex-1">{order.coupon.code} applied</span>
              <button onClick={onRemoveCoupon} className="text-emerald-600 hover:text-rose-500 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                id="coupon-input"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="COUPON CODE"
                className="flex-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800 dark:text-white font-bold"
              />
              <button onClick={onApplyCoupon} className="bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs px-4 rounded-xl font-bold transition-colors cursor-pointer">
                Apply
              </button>
            </div>
          )}
        </div>
      )}

      {/* Totals */}
      {cart.length > 0 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-sm bg-white dark:bg-slate-900">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Discount</span><span>−₹{discount.toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Tax (5%)</span><span>₹{tax.toFixed(0)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-lg text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
            <span>Total</span><span>₹{total.toFixed(0)}</span>
          </div>
          <button
            id="send-to-kitchen-btn"
            onClick={onSendToKitchen}
            disabled={!order}
            className="w-full mt-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shadow-md shadow-orange-950/20 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Send to Kitchen
          </button>
        </div>
      )}
    </div>
  );
};

// ── Right Panel: Payment ─────────────────────────────────────────────
const PaymentPanel = ({
  order, paymentMethods, onPay, upiQr, onGetUpiQr
}: {
  order: Order | null;
  paymentMethods: PaymentMethod[];
  onPay: (methodId: number, transactionRef?: string) => void;
  upiQr: { qr_code: string; upi_uri: string } | null;
  onGetUpiQr: () => void;
}) => {
  const [selectedMethod, setSelectedMethod] = useState<number | null>(null);
  const [cashGiven, setCashGiven] = useState('');
  const [transactionRef, setTransactionRef] = useState('');

  const total = order?.net_amount || order?.total || 0;
  const cashChange = selectedMethod
    ? (paymentMethods.find(m => m.id === selectedMethod)?.name === 'Cash'
        ? Math.max(0, parseFloat(cashGiven || '0') - total)
        : 0)
    : 0;

  const paymentIcons: Record<string, any> = {
    Cash: Banknote,
    Card: CreditCard,
    'Credit/Debit Card': CreditCard,
    'UPI QR': Smartphone,
  };

  const handlePay = () => {
    if (!selectedMethod || !order) return;
    onPay(selectedMethod, transactionRef || undefined);
  };

  if (!order || order.status?.toLowerCase() === 'paid') {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950 items-center justify-center p-8 text-center border-l border-slate-200 dark:border-slate-800">
        {order?.status?.toLowerCase() === 'paid' ? (
          <>
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
              <CreditCard className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Payment Complete!</h3>
            <p className="text-slate-500 text-xs mt-2">Order #{order.order_number} has been settled.</p>
            {order.id && (
              <a
                href={paymentsAPI.getReceiptPdfUrl(order.id)}
                target="_blank"
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-500 shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </a>
            )}
          </>
        ) : (
          <>
            <CreditCard className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4 animate-pulse" />
            <p className="text-slate-400 text-xs font-medium">Add items and select table to checkout</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950 p-4 gap-4 border-l border-slate-200 dark:border-slate-800">
      <h2 className="font-bold text-slate-900 dark:text-white">Payment Selection</h2>
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-850 shadow-inner">
        <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">Settlement Amount</p>
        <p className="text-3xl font-extrabold text-slate-900 dark:text-white">₹{total.toFixed(2)}</p>
      </div>

      {/* Payment Methods */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Method</p>
        <div className="space-y-2">
          {paymentMethods.map((method) => {
            const Icon = paymentIcons[method.name] || CreditCard;
            return (
              <button
                key={method.id}
                onClick={() => { setSelectedMethod(method.id); if (method.type === 'upi') onGetUpiQr(); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedMethod === method.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 hover:border-indigo-300'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selectedMethod === method.id ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <Icon className={`w-5 h-5 ${selectedMethod === method.id ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">{method.name}</span>
                {selectedMethod === method.id && (
                  <ChevronRight className="ml-auto w-4 h-4 text-indigo-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cash change calculator */}
      {selectedMethod && paymentMethods.find(m => m.id === selectedMethod)?.type === 'cash' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-850 space-y-3 shadow-sm">
          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase">Cash Given</label>
            <input
              type="number"
              value={cashGiven}
              onChange={(e) => setCashGiven(e.target.value)}
              placeholder="Enter amount received (₹)"
              className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white font-bold"
            />
          </div>
          {cashChange > 0 && (
            <div className="flex justify-between items-center bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2.5">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Change Change</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">₹{cashChange.toFixed(0)}</span>
            </div>
          )}
        </div>
      )}

      {/* UPI QR */}
      {selectedMethod && paymentMethods.find(m => m.id === selectedMethod)?.type === 'upi' && (
        <div className="space-y-2">
          {upiQr && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex flex-col items-center border border-slate-200 dark:border-slate-850 shadow-inner">
              <img src={upiQr.qr_code} alt="UPI QR Code" className="w-32 h-32 rounded-lg border border-slate-100 dark:border-slate-850" />
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-2.5 text-center">Scan QR to settle ₹{total.toFixed(0)}</p>
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Transaction Reference (UPI Txn ID)</label>
            <input
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. UPI123456"
              className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Card ref */}
      {selectedMethod && paymentMethods.find(m => m.id === selectedMethod)?.type === 'card' && (
        <div>
          <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase font-semibold">Card Swipe / Slip ID</label>
          <input
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="Slip reference or card last 4 digits"
            className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
          />
        </div>
      )}

      <button
        id="process-payment-btn"
        onClick={handlePay}
        disabled={!selectedMethod}
        className="mt-auto w-full bg-indigo-650 hover:bg-indigo-650/90 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 cursor-pointer"
      >
        <CreditCard className="w-5 h-5" />
        Process Checkout
      </button>
    </div>
  );
};

// ── Main POS Page ─────────────────────────────────────────────────────
const POSPage = () => {
  const { activeSession, openSession } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [upiQr, setUpiQr] = useState<{ qr_code: string; upi_uri: string } | null>(null);
  const [startBalance, setStartBalance] = useState('1000');
  const [loading, setLoading] = useState(true);

  // Customer Feedback Modal states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackOrderId, setFeedbackOrderId] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [prods, cats, tbls, custs, methods] = await Promise.all([
          productsAPI.getAllActive(),
          categoriesAPI.getAll(),
          tablesAPI.getAll(),
          customersAPI.getAll(),
          paymentsAPI.getMethods(),
        ]);
        setProducts(prods);
        setCategories(cats);
        setTables(tbls);
        setCustomers(custs);

        const savedConfig = localStorage.getItem('payment_methods_config');
        if (savedConfig) {
          try {
            const parsed = JSON.parse(savedConfig);
            const filtered = methods.filter((m: any) => {
              if (m.type === 'cash') return parsed.cashEnabled;
              if (m.type === 'card') return parsed.cardEnabled;
              if (m.type === 'upi') return parsed.upiEnabled;
              return true;
            });
            setPaymentMethods(filtered);
          } catch (e) {
            setPaymentMethods(methods);
          }
        } else {
          setPaymentMethods(methods);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1, note: '' }];
    });
  };

  const increaseQty = (id: number) => setCart((prev) => prev.map((i) => i.product.id === id ? { ...i, quantity: i.quantity + 1 } : i));
  const decreaseQty = (id: number) => setCart((prev) => {
    const item = prev.find((i) => i.product.id === id);
    if (!item) return prev;
    if (item.quantity <= 1) return prev.filter((i) => i.product.id !== id);
    return prev.map((i) => i.product.id === id ? { ...i, quantity: i.quantity - 1 } : i);
  });
  const removeItem = (id: number) => setCart((prev) => prev.filter((i) => i.product.id !== id));
  const setNote = (id: number, note: string) => setCart((prev) => prev.map((i) => i.product.id === id ? { ...i, note } : i));

  const syncOrder = useCallback(async () => {
    if (cart.length === 0) return;
    try {
      const items = cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity, note: i.note || undefined }));
      if (!order) {
        const newOrder = await ordersAPI.create({
          table_id: selectedTable || undefined,
          customer_id: selectedCustomer || undefined,
          items,
        });
        setOrder(newOrder);
      } else {
        const updated = await ordersAPI.updateItems(order.id, { items });
        setOrder(updated);
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Order sync failed', 'error');
    }
  }, [cart, order, selectedTable, selectedCustomer]);

  // Auto-sync cart to backend after 1s debounce
  useEffect(() => {
    if (cart.length === 0) return;
    const t = setTimeout(() => syncOrder(), 1000);
    return () => clearTimeout(t);
  }, [cart]);

  // Load existing unpaid order for selected table
  useEffect(() => {
    const loadTableOrder = async () => {
      if (!selectedTable) {
        setCart([]);
        setOrder(null);
        return;
      }
      try {
        const res = await ordersAPI.getAll({ table_id: selectedTable });
        const activeOrder = res.find(o => o.status !== 'paid' && o.status !== 'cancelled');
        if (activeOrder) {
          setOrder(activeOrder);
          
          // Populate cart from activeOrder.order_items
          const cartItems = (activeOrder.order_items || []).map((item: any) => {
            const product = products.find(p => p.id === item.product_id);
            return {
              product: product || ({
                id: item.product_id,
                name: item.product?.name || 'Unknown',
                price: item.price,
                unit: 'pcs',
                tax: item.tax_rate,
                stock: 50,
                min_stock: 10,
                is_active: true,
                is_available: true
              } as Product),
              quantity: item.quantity,
              note: item.note || ''
            };
          });
          setCart(cartItems);
        } else {
          setCart([]);
          setOrder(null);
        }
      } catch (err) {
        console.error("Failed to load table order", err);
      }
    };
    loadTableOrder();
  }, [selectedTable, products]);

  // Real-time WebSocket updates
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:8000/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'order_updated' && selectedTable && data.table_id === selectedTable) {
          const res = await ordersAPI.getAll({ table_id: selectedTable });
          const activeOrder = res.find(o => o.status !== 'paid' && o.status !== 'cancelled');
          if (activeOrder) {
            setOrder(activeOrder);
            const cartItems = (activeOrder.order_items || []).map((item: any) => {
              const product = products.find(p => p.id === item.product_id);
              return {
                product: product || ({
                  id: item.product_id,
                  name: item.product?.name || 'Unknown',
                  price: item.price,
                  unit: 'pcs',
                  tax: item.tax_rate,
                  stock: 50,
                  min_stock: 10,
                  is_active: true,
                  is_available: true
                } as Product),
                quantity: item.quantity,
                note: item.note || ''
              };
            });
            setCart(cartItems);
          } else {
            setCart([]);
            setOrder(null);
          }
        }
      } catch (e) {
        console.error("WS error in POS:", e);
      }
    };

    return () => ws.close();
  }, [selectedTable, products]);

  const handleSendToKitchen = async () => {
    if (!order) { await syncOrder(); return; }
    try {
      const updated = await ordersAPI.sendToKitchen(order.id);
      setOrder(updated);
      showToast('Order sent to kitchen!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to send to kitchen', 'error');
    }
  };

  const handleApplyCoupon = async () => {
    if (!order || !couponCode) return;
    try {
      const updated = await ordersAPI.applyCoupon(order.id, couponCode);
      setOrder(updated);
      setCouponCode('');
      showToast('Coupon applied!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Invalid coupon', 'error');
    }
  };

  const handleRemoveCoupon = async () => {
    if (!order) return;
    try {
      const updated = await ordersAPI.removeCoupon(order.id);
      setOrder(updated);
      showToast('Coupon removed', 'info');
    } catch { }
  };

  const handlePay = async (methodId: number, transactionRef?: string) => {
    if (!order) return;
    try {
      const paid = await paymentsAPI.processPayment(order.id, {
        amount: order.net_amount ?? order.total_amount ?? order.total ?? 0,
        payment_method_id: methodId,
        transaction_ref: transactionRef,
      });
      setOrder(paid);
      setFeedbackOrderId(order.id);
      showToast('Settled: Settle transaction completed!', 'success');
      
      // Clear QR code & UPI state
      setUpiQr(null);
      setCouponCode('');
      
      // Delay opening feedback modal slightly
      setTimeout(() => {
        setShowFeedbackModal(true);
      }, 800);
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Checkout failed', 'error');
    }
  };

  const handleGetUpiQr = async () => {
    if (!order) return;
    const savedConfig = localStorage.getItem('payment_methods_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.upiEnabled && parsed.upiId) {
          const amount = order.net_amount ?? order.total_amount ?? order.total ?? 0;
          const upiUri = `upi://pay?pa=${encodeURIComponent(parsed.upiId)}&pn=${encodeURIComponent('Cafe POS')}&am=${amount.toFixed(2)}&cu=INR`;
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;
          setUpiQr({
            qr_code: qrCodeUrl,
            upi_uri: upiUri,
          });
          return;
        }
      } catch (e) {
        console.error('Error parsing payment config', e);
      }
    }
    try {
      const qr = await paymentsAPI.getUpiQr(order.id);
      setUpiQr(qr);
    } catch { }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackOrderId) return;
    try {
      await ordersAPI.submitFeedback(feedbackOrderId, feedbackRating, feedbackComment);
      showToast('Thank you for your feedback!', 'success');
      setShowFeedbackModal(false);
      resetPOSAfterPayment();
    } catch (err: any) {
      showToast('Failed to submit feedback', 'error');
      setShowFeedbackModal(false);
      resetPOSAfterPayment();
    }
  };

  const resetPOSAfterPayment = () => {
    setCart([]);
    setOrder(null);
    setFeedbackOrderId(null);
    setFeedbackRating(5);
    setFeedbackComment('');
    setSelectedTable(null);
    setSelectedCustomer(null);
  };

  // Open session screen
  if (!activeSession) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/10">
            <CreditCard className="w-8 h-8 text-indigo-650" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Open POS Session</h2>
          <p className="text-slate-500 text-sm mb-6">Enter your opening cash balance to begin.</p>
          <input
            type="number"
            value={startBalance}
            onChange={(e) => setStartBalance(e.target.value)}
            placeholder="Opening Balance (₹)"
            className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 text-slate-800 dark:text-white"
          />
          <button
            id="open-session-btn"
            onClick={() => openSession(parseFloat(startBalance))}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            Open Session
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full grid grid-cols-3 gap-0 animate-pulse bg-slate-950">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full grid grid-cols-[2.2fr_1.5fr_1fr] overflow-hidden bg-white dark:bg-slate-950">
      <CatalogPanel
        categories={categories}
        products={products}
        onAdd={addToCart}
        search={search}
        setSearch={setSearch}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />
      <CartPanel
        cart={cart}
        order={order}
        onIncrease={increaseQty}
        onDecrease={decreaseQty}
        onRemove={removeItem}
        onNoteChange={setNote}
        onSendToKitchen={handleSendToKitchen}
        tables={tables}
        customers={customers}
        selectedTable={selectedTable}
        setSelectedTable={setSelectedTable}
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        products={products}
        onAddRecommendation={addToCart}
      />
      <PaymentPanel
        order={order}
        paymentMethods={paymentMethods}
        onPay={handlePay}
        upiQr={upiQr}
        onGetUpiQr={handleGetUpiQr}
      />

      {/* CUSTOMER FEEDBACK MODAL OVERLAY */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6 text-center">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Checkout Finished
              </span>
              <h2 className="text-lg font-bold text-white">How was your dining experience?</h2>
              <p className="text-xs text-slate-400 leading-normal">
                Please take 10 seconds to share your satisfaction rating to help us serve you better.
              </p>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-6">
              {/* Star Rating select */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= feedbackRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider text-left mb-2">Optional Comments</label>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="e.g. Delicious lasagna, loved the service!"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-20"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { showToast('Feedback skipped.', 'info'); setShowFeedbackModal(false); resetPOSAfterPayment(); }}
                  className="w-1/3 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-xs"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-950/50 cursor-pointer text-xs uppercase tracking-wide"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSPage;
