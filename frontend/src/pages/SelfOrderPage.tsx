import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { publicAPI } from '../services/api';
import { getProductImage } from '../utils/image';
import type { Table, Floor, Product, Category } from '../types';
import { 
  Coffee, Plus, Minus, Search, ShoppingBag, Check, 
  Ticket, Clock, X, ChefHat, CheckCircle2, ChevronRight, 
  Sparkles, Flame, RefreshCw, AlertCircle, ShoppingCart
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface CartItem {
  product: Product;
  quantity: number;
  note: string;
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
  items: Array<{
    id: number;
    product_name: string;
    quantity: number;
    price: number;
    note?: string;
    total: number;
  }>;
  upi_qr: string | null;
  paid_at: string | null;
  coupon?: {
    id: number;
    code: string;
    value: number;
    type: string;
  } | null;
}

const SelfOrderPage: React.FC = () => {
  const { showToast } = useToast();
  
  // State variables
  const [tableId, setTableId] = useState<number | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [currentTable, setCurrentTable] = useState<Table | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderTrackingMode, setOrderTrackingMode] = useState(false);
  
  // Ordering state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponLocal, setAppliedCouponLocal] = useState<{ code: string; type: string; value: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  
  // Cart UI States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [showItemNoteId, setShowItemNoteId] = useState<number | null>(null);
  const [tempNote, setTempNote] = useState('');

  // Config state
  const [config, setConfig] = useState({
    mode: 'online',
    themeColor: '#6F4E37',
    bgColor: '#FFF8E7',
    bgGradient: 'from-slate-950 via-slate-900 to-slate-950',
    cafeName: 'Luxe Café & Bistro',
    welcomeMessage: 'Indulge in a premium culinary journey from the comfort of your table.',
  });

  useEffect(() => {
    const saved = localStorage.getItem('self_order_config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse self order config', e);
      }
    }
  }, []);

  // 1. Initial URL / Setup check
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('table_id');
    if (idParam) {
      const parsedId = parseInt(idParam);
      setTableId(parsedId);
    } else {
      // Table selector configuration mode
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

  // Fetch Table details & Active Order if tableId is set
  const fetchTableDetailsAndOrder = useCallback(async (id: number) => {
    try {
      // Fetch products, categories, tables to find our current table details
      const [allTables, allProducts, allCategories] = await Promise.all([
        publicAPI.getTables(),
        publicAPI.getProducts(),
        publicAPI.getCategories()
      ]);

      const foundTable = allTables.find(t => t.id === id);
      if (foundTable) {
        setCurrentTable(foundTable);
      }
      
      setProducts(allProducts.filter(p => p.is_available));
      setCategories(allCategories.filter(c => c.is_active));

      // Fetch active order
      const order = await publicAPI.getActiveOrder(id);
      if (order && ['draft', 'sent_to_kitchen', 'cooking', 'ready'].includes(order.status)) {
        setActiveOrder(order);
        setOrderTrackingMode(true);
      } else {
        setActiveOrder(null);
        setOrderTrackingMode(false);
      }
    } catch (err) {
      console.error("Self order data fetch failed", err);
      showToast("Error loading cafe menu. Please refresh.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Setup data fetching and WebSockets for active order updates
  useEffect(() => {
    if (!tableId) return;

    fetchTableDetailsAndOrder(tableId);

    // WebSocket connection to track live updates
    const wsUrl = `ws://${window.location.hostname}:8000/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // If update triggers a reload for this table, or KDS status has changed
        if (data.table_id === tableId || data.event === 'kitchen_updated') {
          // Silent reload to keep tracking states live
          publicAPI.getActiveOrder(tableId).then(order => {
            if (order && ['draft', 'sent_to_kitchen', 'cooking', 'ready'].includes(order.status)) {
              setActiveOrder(order);
              setOrderTrackingMode(true);
            } else if (order && order.status === 'paid') {
              // Settle payment state
              setActiveOrder(order);
              setOrderTrackingMode(true);
            } else {
              setActiveOrder(null);
              // Only reset tracking mode if we are not actively placing a new order
              setOrderTrackingMode(prev => {
                if (prev) showToast("Your table order was cleared or paid.", "info");
                return false;
              });
            }
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => ws.close();
  }, [tableId, fetchTableDetailsAndOrder, showToast]);

  // Table selection handler
  const handleSelectTable = (id: number) => {
    window.history.pushState({}, '', `?table_id=${id}`);
    setTableId(id);
    setLoading(true);
  };

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      showToast(`${product.name} added to cart`, 'success');
      return [...prev, { product, quantity: 1, note: '' }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const openNoteDialog = (productId: number, currentNote: string) => {
    setShowItemNoteId(productId);
    setTempNote(currentNote);
  };

  const saveItemNote = (productId: number) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId 
        ? { ...item, note: tempNote }
        : item
    ));
    setShowItemNoteId(null);
    setTempNote('');
    showToast("Special note updated", "success");
  };

  // Coupons simulation & validation
  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    setCouponError('');
    
    if (!code) return;
    
    if (code === 'WELCOME10') {
      setAppliedCouponLocal({
        code: 'WELCOME10',
        type: 'percentage',
        value: 10
      });
      showToast("Coupon WELCOME10 applied (10% Off)!", "success");
    } else if (code === 'FLAT50') {
      setAppliedCouponLocal({
        code: 'FLAT50',
        type: 'fixed',
        value: 50
      });
      showToast("Coupon FLAT50 applied (₹50 Off)!", "success");
    } else {
      setCouponError("Invalid coupon code.");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponLocal(null);
    setCouponCode('');
    setCouponError('');
    showToast("Coupon removed", "info");
  };

  // Calculating order values locally
  const cartTotals = useMemo(() => {
    let subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    
    // Automatic product promotions (Buy 2 Cappuccinos get 15% off)
    let productDiscount = 0;
    const cappuccinoItem = cart.find(item => item.product.name.toLowerCase().includes('cappuccino'));
    if (cappuccinoItem && cappuccinoItem.quantity >= 2) {
      productDiscount = (cappuccinoItem.product.price * cappuccinoItem.quantity) * 0.15;
    }

    let couponDiscount = 0;
    if (appliedCouponLocal) {
      if (appliedCouponLocal.type === 'percentage') {
        couponDiscount = (subtotal - productDiscount) * (appliedCouponLocal.value / 100);
      } else if (appliedCouponLocal.type === 'fixed') {
        couponDiscount = Math.min(appliedCouponLocal.value, subtotal - productDiscount);
      }
    }

    const totalDiscount = productDiscount + couponDiscount;
    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const tax = taxableAmount * 0.05; // 5% GST
    const netTotal = taxableAmount + tax;

    return {
      subtotal,
      discount: totalDiscount,
      tax,
      netTotal
    };
  }, [cart, appliedCouponLocal]);

  // Place Self Order handler
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !tableId) return;
    setSubmittingOrder(true);
    try {
      const itemsPayload = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        note: item.note || undefined
      }));
      
      const payload = {
        table_id: tableId,
        items: itemsPayload,
        coupon_code: appliedCouponLocal?.code || undefined
      };

      const result = await publicAPI.placeSelfOrder(payload);
      if (result) {
        showToast("Order placed successfully! Sent to kitchen.", "success");
        setCart([]);
        setAppliedCouponLocal(null);
        setCouponCode('');
        setIsCartOpen(false);
        // Refresh details and open status tracker
        fetchTableDetailsAndOrder(tableId);
      }
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || "Could not place order. Cashier session might be closed.";
      showToast(detail, "error");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Category Filtering
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = activeCategory === null || p.category_id === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategory]);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Loading Screen
  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} flex flex-col items-center justify-center text-white`}>
        <RefreshCw className="w-8 h-8 animate-spin mb-4" style={{ color: config.themeColor }} />
        <p className="text-sm font-semibold tracking-wider uppercase" style={{ color: config.themeColor }}>Loading Cafe Menu...</p>
      </div>
    );
  }

  // 1. SELECT TABLE VIEW (When no Table ID is specified)
  if (!tableId) {
    const floorTables = tables.filter(t => t.floor_id === selectedFloorId);
    return (
      <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} flex flex-col items-center justify-center p-6 text-slate-100`}>
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2" style={{ backgroundColor: config.themeColor }}>
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">Welcome to {config.cafeName}</h1>
            <p className="text-xs text-slate-400">Select your table number to start browsing our menu.</p>
          </div>

          {/* Floor Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {floors.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFloorId(f.id)}
                style={selectedFloorId === f.id ? { backgroundColor: config.themeColor } : {}}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedFloorId === f.id ? 'text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
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

  // 2. ORDER STATUS TRACKING MODE (When table has an active preparation order)
  if (orderTrackingMode && activeOrder) {
    const getStatusStep = (status: string) => {
      switch (status) {
        case 'draft': return 0;
        case 'sent_to_kitchen': return 1;
        case 'cooking': return 2;
        case 'ready': return 3;
        case 'paid': return 4;
        default: return 0;
      }
    };

    const currentStep = getStatusStep(activeOrder.status);

    const steps = [
      { label: "Placed", desc: "Order confirmed", icon: CheckCircle2 },
      { label: "Sent", desc: "Received by Kitchen", icon: RefreshCw },
      { label: "Preparing", desc: "Chef is cooking", icon: ChefHat },
      { label: "Ready", desc: "Ready to serve", icon: Sparkles },
    ];

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* Navbar */}
        <header className="bg-slate-900 border-b border-slate-800/80 sticky top-0 z-10 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
              <Coffee className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Table {currentTable?.name || currentTable?.table_number}</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Self-Ordering Dashboard</p>
            </div>
          </div>
          <button 
            onClick={() => setOrderTrackingMode(false)}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Order More
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-6">
          
          {/* Status Tracker Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Order Reference</span>
                <h2 className="text-lg font-black text-white font-mono">{activeOrder.order_number}</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                activeOrder.status === 'ready' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 animate-pulse' :
                activeOrder.status === 'cooking' ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400 animate-pulse' :
                'bg-slate-800 border border-slate-750 text-slate-350'
              }`}>
                {activeOrder.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* Steps Timeline */}
            <div className="grid grid-cols-4 gap-2 relative">
              {/* Background Connecting Line */}
              <div className="absolute top-5 left-1/8 right-1/8 h-0.5 bg-slate-800 -z-0" />
              <div 
                className="absolute top-5 left-1/8 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-400 -z-0 transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(0, (currentStep / 3) * 75))}%` }}
              />

              {steps.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = idx <= currentStep;
                const isActive = idx === currentStep;
                
                return (
                  <div key={idx} className="flex flex-col items-center text-center relative z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 scale-110 shadow-lg shadow-indigo-600/30' :
                      isCompleted ? 'bg-indigo-500 text-white' :
                      'bg-slate-850 text-slate-500 border border-slate-800'
                    }`}>
                      {isActive && step.label === "Preparing" ? (
                        <ChefHat className="w-5 h-5 animate-bounce" />
                      ) : isActive && step.label === "Sent" ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold mt-2 ${isActive ? 'text-indigo-400' : isCompleted ? 'text-white' : 'text-slate-500'}`}>
                      {step.label}
                    </span>
                    <span className="text-[8px] text-slate-500 mt-0.5 hidden sm:block">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Notification Banner */}
            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex items-center gap-3">
              {activeOrder.status === 'ready' ? (
                <>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/25">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Your meal is ready to serve!</h3>
                    <p className="text-[10px] text-slate-400">Our waiter is bringing it to Table {currentTable?.name || currentTable?.table_number} now.</p>
                  </div>
                </>
              ) : activeOrder.status === 'cooking' ? (
                <>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/25">
                    <Flame className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Chef Ramsay is preparing your food!</h3>
                    <p className="text-[10px] text-slate-400">Sit back and relax. Everything is crafted fresh on order.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0 border border-indigo-500/25 animate-pulse">
                    <Clock className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Order placed successfully</h3>
                    <p className="text-[10px] text-slate-400">Waiting for kitchen queue assignment.</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Settle Info Card (If order is ready, remind to check display or settle) */}
          {activeOrder.status === 'ready' && (
            <div className="bg-indigo-950/30 border border-indigo-500/35 rounded-3xl p-5 shadow-lg space-y-3">
              <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-indigo-400" /> Scan to Settle Payment
              </h3>
              <p className="text-xs text-slate-350">
                You can view the UPI QR code on the Customer Display facing you, or scan the code below to settle immediately via GPAY/PhonePe:
              </p>
              {activeOrder.upi_qr ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 border border-indigo-950 p-4 rounded-2xl w-fit mx-auto sm:mx-0">
                  <img src={`data:image/png;base64,${activeOrder.upi_qr}`} alt="UPI QR" className="w-28 h-28 bg-white p-1 rounded-lg border border-slate-700" />
                  <div className="space-y-1.5 text-center sm:text-left">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 px-2 py-0.5 bg-indigo-950/50 rounded-full border border-indigo-800">Instant UPI Payment</span>
                    <p className="text-xs font-bold text-white">Odoo Cafe POS Terminal</p>
                    <p className="text-lg font-black text-emerald-400">₹{activeOrder.net_amount.toFixed(0)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">QR Generation not available. Please settle at cash counter.</p>
              )}
            </div>
          )}

          {/* Ordered Items Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">Order Items Summary</h3>
            <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto pr-1">
              {activeOrder.items.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-start gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-extrabold text-white">{item.product_name}</h4>
                    <span className="text-[10px] text-indigo-400 font-bold">Qty: {item.quantity} × ₹{item.price.toFixed(0)}</span>
                    {item.note && (
                      <p className="text-[9px] text-amber-400/90 italic font-medium bg-amber-950/20 px-2 py-0.5 rounded border border-amber-900/30 w-fit mt-1">
                        Note: {item.note}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-extrabold text-slate-300">₹{item.total.toFixed(0)}</span>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="border-t border-slate-800 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400 font-medium">
                <span>Subtotal</span>
                <span>₹{activeOrder.total_amount.toFixed(0)}</span>
              </div>
              {activeOrder.discount_amount > 0 && (
                <div className="flex justify-between text-rose-450 font-bold">
                  <span>Discounts Applied</span>
                  <span>- ₹{activeOrder.discount_amount.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 font-medium">
                <span>GST (5%)</span>
                <span>₹{activeOrder.tax_amount.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-850">
                <span>Net Amount Pay</span>
                <span className="text-emerald-400">₹{activeOrder.net_amount.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 3. MENU CATALOG & ORDER PLACEMENT MODE
  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} text-slate-100 flex flex-col`}>
      <style>{`
        .self-order-accent-bg { background-color: ${config.themeColor} !important; }
        .self-order-accent-text { color: ${config.themeColor} !important; }
        .self-order-accent-border { border-color: ${config.themeColor} !important; }
        .self-order-accent-ring:focus { --tw-ring-color: ${config.themeColor} !important; }
      `}</style>

      {config.mode === 'menu_only' && (
        <div className="bg-amber-500/15 border-b border-amber-500/25 px-4 py-2.5 text-center text-xs font-semibold text-amber-400 backdrop-blur-md">
          📖 Digital Menu Mode: Placing orders from this portal is disabled. Please order with your server.
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-950 border border-slate-800" style={{ borderLeftColor: config.themeColor, borderLeftWidth: 3 }}>
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white">{config.cafeName}</h1>
            <p className="text-[9px] text-slate-400 tracking-wider">Table {currentTable?.name || currentTable?.table_number}</p>
          </div>
        </div>

        {/* View Active Order Shortcut Button (If one is loaded in background) */}
        <div className="flex items-center gap-2">
          {activeOrder && (
            <button 
              onClick={() => setOrderTrackingMode(true)}
              className="flex items-center gap-1.5 bg-slate-800 border border-slate-750 hover:bg-slate-750 font-extrabold text-[10px] py-1.5 px-3 rounded-lg transition-colors cursor-pointer self-order-accent-text"
            >
              <Clock className="w-3.5 h-3.5" /> View Active Order ({activeOrder.status.toUpperCase()})
            </button>
          )}

          {/* Floating Cart Icon with Badge */}
          {config.mode !== 'menu_only' && (
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-white rounded-xl shadow-lg transition-transform hover:scale-105 cursor-pointer self-order-accent-bg"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 border border-slate-950 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                  {totalCartItems}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Hero Banner / Search */}
      <section className="bg-slate-900/50 border-b border-slate-850 p-4 space-y-3">
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search delicious pizzas, lattes, rolls..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-10 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-800 rounded text-slate-400"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category Carousel Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 max-w-2xl mx-auto scrollbar-none">
          <button
            onClick={() => setActiveCategory(null)}
            style={activeCategory === null ? { backgroundColor: config.themeColor, borderColor: config.themeColor } : {}}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
              activeCategory === null
                ? 'text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={activeCategory === cat.id ? { backgroundColor: config.themeColor, borderColor: config.themeColor, borderLeftColor: cat.color } : { borderLeftColor: cat.color }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border border-l-4 ${
                activeCategory === cat.id
                  ? 'text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* Menu List Grid */}
      <main className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const qtyInCart = cart.find(item => item.product.id === p.id)?.quantity || 0;
            const borderCol = p.category?.color || '#6366f1';
            
            return (
              <div 
                key={p.id}
                style={{ borderLeftColor: borderCol }}
                className="group bg-slate-900 rounded-2xl border-l-4 border-y border-r border-slate-800 p-3 flex flex-col hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                {/* Food Image */}
                <div className="aspect-[4/3] w-full bg-slate-950 rounded-xl overflow-hidden mb-3 relative shadow-inner">
                  <img 
                    src={getProductImage(p.name, p.image_url)} 
                    alt={p.name} 
                    className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-all duration-500"
                  />
                  {p.preparation_time && (
                    <span className="absolute bottom-2 left-2 bg-slate-950/80 text-white font-bold text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1 backdrop-blur-sm">
                      <Clock className="w-2.5 h-2.5 text-indigo-400" /> {p.preparation_time}m
                    </span>
                  )}
                </div>

                {/* Details */}
                <h3 className="text-xs font-extrabold text-white truncate">{p.name}</h3>
                <p className="text-[9px] text-slate-500 line-clamp-2 mt-0.5 min-h-[27px]">{p.description || "Freshly cooked gourmet restaurant item."}</p>
                
                {/* Footer Add Controller */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-850">
                  <span className="font-extrabold text-xs" style={{ color: config.themeColor }}>₹{p.price.toFixed(0)}</span>
                  
                  {config.mode !== 'menu_only' && (
                    qtyInCart > 0 ? (
                      <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg" style={{ backgroundColor: config.themeColor }}>
                        <button 
                          onClick={() => updateQuantity(p.id, -1)}
                          className="p-1 text-white hover:bg-black/10 rounded cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black text-white px-0.5">{qtyInCart}</span>
                        <button 
                          onClick={() => updateQuantity(p.id, 1)}
                          className="p-1 text-white hover:bg-black/10 rounded cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCart(p)}
                        style={{ backgroundColor: config.themeColor }}
                        className="text-white p-1.5 rounded-lg hover:opacity-90 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-500 text-sm">
              No matching items found.
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Bar (Quick View Cart) */}
      {cart.length > 0 && !isCartOpen && (
        <div className="sticky bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-between shadow-2xl animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 text-white rounded-xl flex items-center justify-center self-order-accent-bg">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{totalCartItems} Items Selected</p>
              <p className="text-sm font-extrabold text-emerald-400">Total: ₹{cartTotals.netTotal.toFixed(0)}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            style={{ backgroundColor: config.themeColor }}
            className="text-white font-extrabold py-2 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg"
          >
            Review Cart <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CART DRAWER BACKDROP */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex justify-end">
          {/* Cart Drawer */}
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-slide-left">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                <h2 className="font-extrabold text-sm text-white">Review Self-Order Cart</h2>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1 hover:bg-slate-850 text-slate-400 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-slate-800/50">
              {cart.map((item, index) => (
                <div key={item.product.id} className={`flex gap-3 pt-3 ${index === 0 ? 'pt-0' : ''}`}>
                  <img 
                    src={getProductImage(item.product.name, item.product.image_url)} 
                    alt={item.product.name} 
                    className="w-14 h-14 object-cover rounded-lg bg-slate-950 flex-shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <h3 className="text-xs font-bold text-white">{item.product.name}</h3>
                    <span className="text-[10px] text-indigo-400 font-extrabold">₹{item.product.price.toFixed(0)}</span>
                    
                    {/* Cooking instructions note input trigger */}
                    {showItemNoteId === item.product.id ? (
                      <div className="flex items-center gap-1.5 mt-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                        <input 
                          type="text"
                          value={tempNote}
                          onChange={(e) => setTempNote(e.target.value)}
                          placeholder="e.g. No ice, extra cheese..."
                          className="w-full bg-transparent text-[10px] focus:outline-none"
                          autoFocus
                        />
                        <button 
                          onClick={() => saveItemNote(item.product.id)}
                          className="bg-indigo-600 hover:bg-indigo-500 p-1 rounded text-white cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1.5">
                        <button 
                          onClick={() => openNoteDialog(item.product.id, item.note)}
                          className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline decoration-dotted"
                        >
                          {item.note ? 'Edit instructions' : '+ Special note'}
                        </button>
                        {item.note && (
                          <span className="text-[9px] text-amber-450 italic truncate max-w-[150px]">
                            "{item.note}"
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg">
                      <button 
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-0.5 hover:bg-slate-700 rounded text-slate-400 cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-xs font-black text-white min-w-[14px] text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-0.5 hover:bg-slate-700 rounded text-slate-400 cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <span className="text-[10px] font-black text-slate-400">
                      ₹{(item.product.price * item.quantity).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupons Section */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Ticket className="w-3.5 h-3.5 text-indigo-400" /> Apply Coupon Code
              </span>
              
              {appliedCouponLocal ? (
                <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-900 px-3 py-2 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-indigo-300 font-mono">{appliedCouponLocal.code}</span>
                    <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-1.5 py-0.5 rounded">
                      {appliedCouponLocal.type === 'percentage' ? `${appliedCouponLocal.value}% Off` : `₹${appliedCouponLocal.value} Off`}
                    </span>
                  </div>
                  <button 
                    onClick={handleRemoveCoupon}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setCouponError('');
                    }}
                    placeholder="Enter code (WELCOME10 / FLAT50)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button 
                    onClick={handleApplyCoupon}
                    style={{ backgroundColor: config.themeColor }}
                    className="text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}
              {couponError && <p className="text-[10px] text-rose-500 font-semibold">{couponError}</p>}
            </div>

            {/* Calculations & Checkout */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400 font-medium">
                  <span>Subtotal</span>
                  <span>₹{cartTotals.subtotal.toFixed(0)}</span>
                </div>
                {cartTotals.discount > 0 && (
                  <div className="flex justify-between text-rose-450 font-bold">
                    <span>Discount</span>
                    <span>- ₹{cartTotals.discount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 font-medium">
                  <span>GST Tax (5%)</span>
                  <span>₹{cartTotals.tax.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-850">
                  <span>Net Total Amount</span>
                  <span className="text-emerald-400">₹{cartTotals.netTotal.toFixed(0)}</span>
                </div>
              </div>

              <button 
                onClick={handlePlaceOrder}
                disabled={submittingOrder}
                style={!submittingOrder ? { backgroundColor: config.themeColor } : {}}
                className="w-full disabled:bg-slate-850 disabled:text-slate-550 text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                {submittingOrder ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching to kitchen...
                  </>
                ) : (
                  <>
                    Confirm & Place Order <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfOrderPage;
