import { useEffect, useState, useCallback, useMemo } from 'react';
import { kitchenAPI, categoriesAPI, productsAPI } from '../services/api';
import type { KitchenOrder, Category, Product } from '../types';
import { Clock, ChefHat, CheckCircle2, RefreshCw, AlertTriangle, Search } from 'lucide-react';

const STATUS_CONFIG = {
  TO_COOK: {
    label: 'New Orders',
    icon: AlertTriangle,
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20 hover:border-blue-500/50',
    badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    btnLabel: 'Start Cooking',
    btnClass: 'bg-blue-600 hover:bg-blue-500',
    nextStatus: 'PREPARING' as const,
  },
  PREPARING: {
    label: 'In Progress',
    icon: ChefHat,
    bg: 'bg-orange-500/5',
    border: 'border-orange-500/20 hover:border-orange-500/50',
    badge: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    btnLabel: 'Mark Done',
    btnClass: 'bg-orange-600 hover:bg-orange-500',
    nextStatus: 'COMPLETED' as const,
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle2,
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20 hover:border-emerald-500/50',
    badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    btnLabel: null,
    btnClass: '',
    nextStatus: null,
  },
};

const getElapsedMinutes = (dateStr: string) => {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
};

const formatTimelineTime = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
};

const KitchenCard = ({ 
  order, 
  onUpdate, 
  struckItems, 
  onToggleStrikethrough 
}: { 
  order: KitchenOrder; 
  onUpdate: () => void;
  struckItems: Record<string, boolean>;
  onToggleStrikethrough: (orderId: number, itemIndex: number) => void;
}) => {
  const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
  const Icon = cfg.icon;
  const elapsed = order.elapsed_minutes ?? getElapsedMinutes(order.created_at);
  const isUrgent = order.is_delayed ?? (elapsed > 15 && order.status !== 'COMPLETED');

  const handleUpdate = async () => {
    if (!cfg.nextStatus) return;
    try {
      await kitchenAPI.updateStatus(order.id, cfg.nextStatus);
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const timeline = [
    { label: 'Created', time: order.order_created_at || order.created_at, completed: true },
    { label: 'Sent to Kitchen', time: order.sent_to_kitchen_at || order.created_at, completed: !!order.sent_to_kitchen_at },
    { label: 'Cooking', time: order.preparing_at, completed: !!order.preparing_at || order.status === 'PREPARING' || order.status === 'COMPLETED' },
    { label: 'Ready', time: order.completed_at, completed: !!order.completed_at || order.status === 'COMPLETED' },
  ];

  return (
    <div className={`bg-slate-900 rounded-3xl border p-5 transition-all duration-300 relative overflow-hidden group ${
      isUrgent 
        ? 'border-rose-500/40 bg-rose-500/5 shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:border-rose-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.25)]' 
        : `${cfg.border} hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]`
    }`}>
      {/* Background soft tint */}
      {!isUrgent && <div className={`absolute inset-0 ${cfg.bg} opacity-30 transition-opacity group-hover:opacity-60`} />}
      
      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-white tracking-tight">
                Order #{order.order_id}
              </span>
              {isUrgent && (
                <span className="bg-rose-500/20 text-rose-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-rose-500/30 animate-pulse tracking-wider">
                  DELAYED
                </span>
              )}
            </div>
            {order.table_number && (
              <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">
                Table {order.table_number} • {order.floor_name}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${cfg.badge}`}>
              {cfg.label}
            </span>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 font-semibold justify-end">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className={isUrgent ? 'text-rose-400 font-bold' : ''}>
                {elapsed}m elapsed
              </span>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          {order.items.map((item, i) => {
            const isStruck = struckItems[`${order.id}-${i}`];
            return (
              <div 
                key={i} 
                onClick={() => onToggleStrikethrough(order.id, i)}
                className={`flex items-start gap-3 bg-slate-950/60 rounded-2xl p-3 border border-slate-800/85 cursor-pointer transition-all ${
                  isStruck 
                    ? 'opacity-45 border-slate-950 bg-slate-950/20 shadow-none' 
                    : 'hover:border-slate-700'
                }`}
              >
                <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold flex-shrink-0 transition-all ${
                  isStruck 
                    ? 'bg-slate-900 text-slate-500 border border-slate-850 line-through' 
                    : 'bg-indigo-650/20 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {item.quantity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold leading-normal transition-all ${isStruck ? 'line-through text-slate-500' : 'text-white'}`}>
                    {item.product_name}
                  </p>
                  {item.note && (
                    <p className={`text-[10px] mt-1 font-bold italic flex items-center gap-1 transition-all ${isStruck ? 'text-slate-600' : 'text-amber-500'}`}>
                      <span>📝</span> {item.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div>
          {cfg.nextStatus ? (
            <button
              onClick={handleUpdate}
              className={`w-full ${cfg.btnClass} text-white font-bold py-2.5 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer`}
            >
              <Icon className="w-4 h-4" />
              {cfg.btnLabel}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 px-3 py-2.5 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Ready for Pickup
            </div>
          )}
        </div>

        {/* Vertical Timeline */}
        <div className="pt-4 border-t border-slate-800/60">
          <p className="text-[9px] font-bold text-slate-500 mb-3 uppercase tracking-widest">
            Order Timeline
          </p>
          <div className="relative pl-6 space-y-3">
            <div className="absolute left-[9px] top-1.5 bottom-1.5 w-[2px] bg-slate-800/85" />
            {timeline.map((step, idx) => {
              const isDone = step.completed;
              return (
                <div key={idx} className="flex items-center justify-between text-[10px] font-semibold">
                  <div className="flex items-center gap-2.5">
                    <div className={`absolute left-0 w-5 h-5 rounded-full border-2 flex items-center justify-center -translate-x-[0.5px] ${
                      isDone 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}>
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
                      )}
                    </div>
                    <span className={isDone ? 'text-slate-200' : 'text-slate-500'}>
                      {step.label}
                    </span>
                  </div>
                  {step.time && (
                    <span className={`font-mono ${isDone ? 'text-slate-400 font-bold' : 'text-slate-600'}`}>
                      {formatTimelineTime(step.time)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const KitchenPage = () => {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [struckItems, setStruckItems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchOrders = useCallback(async () => {
    try {
      const data = await kitchenAPI.getActiveOrders();
      setOrders(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    
    // Load products and categories to map items for filtering
    Promise.all([
      productsAPI.getAllActive().catch(() => []),
      categoriesAPI.getAll().catch(() => [])
    ]).then(([prods, cats]) => {
      setProducts(prods);
      setCategories(cats);
    });

    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchOrders, 15000);

    // WebSocket real-time updates
    const wsUrl = `ws://${window.location.hostname}:8000/ws`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'kitchen_updated') {
          fetchOrders();
        }
      } catch (e) {
        console.error("WS error in Kitchen:", e);
      }
    };

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, [fetchOrders]);

  const handleToggleStrikethrough = (orderId: number, itemIndex: number) => {
    const key = `${orderId}-${itemIndex}`;
    setStruckItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const productCategoryMap = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.category_id) {
        map[p.name.toLowerCase()] = p.category_id;
      }
    });
    return map;
  }, [products]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = searchQuery.trim() === '' ||
        (order.table_number && order.table_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        order.items.some((item) => item.product_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategoryId === null || order.items.some((item) => {
        const catId = productCategoryMap[item.product_name.toLowerCase()];
        return catId === selectedCategoryId;
      });

      return matchesSearch && matchesCategory;
    });
  }, [orders, searchQuery, selectedCategoryId, productCategoryMap]);

  const rawToCookCount = orders.filter((o) => o.status === 'TO_COOK').length;
  const rawPreparingCount = orders.filter((o) => o.status === 'PREPARING').length;
  const rawCompletedCount = orders.filter((o) => o.status === 'COMPLETED').length;

  const toCook = filteredOrders.filter((o) => o.status === 'TO_COOK');
  const preparing = filteredOrders.filter((o) => o.status === 'PREPARING');
  const completed = filteredOrders.filter((o) => o.status === 'COMPLETED');

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white">
      {/* KDS Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 bg-slate-900 border-b border-slate-800/80 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-tr from-indigo-650 to-indigo-50 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-950/50">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Kitchen Operations Command</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshing in real-time
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-2.5 text-xs font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-3.5 py-1.5 rounded-full border border-blue-500/20">
              <AlertTriangle className="w-4 h-4 text-blue-500" />
              {rawToCookCount} New
            </span>
            <span className="flex items-center gap-1.5 bg-orange-500/10 text-orange-400 px-3.5 py-1.5 rounded-full border border-orange-500/20">
              <ChefHat className="w-4 h-4 text-orange-500" />
              {rawPreparingCount} Cooking
            </span>
            <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {rawCompletedCount} Completed
            </span>
          </div>
          <button
            id="kitchen-refresh-btn"
            onClick={fetchOrders}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-800 rounded-xl transition-all cursor-pointer animate-fade-in"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KDS Filters Bar */}
      <div className="px-6 py-3.5 bg-slate-900 border-b border-slate-800/60 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2.5 w-full sm:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table number or product..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category:</span>
          <select
            value={selectedCategoryId || ''}
            onChange={(e) => setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer min-w-[150px] font-bold"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Three-column Kanban */}
      <div className="flex-1 grid grid-cols-3 gap-0 overflow-hidden bg-slate-950">
        {(['TO_COOK', 'PREPARING', 'COMPLETED'] as const).map((status) => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          const colOrders = status === 'TO_COOK' ? toCook : status === 'PREPARING' ? preparing : completed;
          
          return (
            <div key={status} className="flex flex-col border-r border-slate-800/80 last:border-r-0 overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-2">
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-350 text-xs uppercase tracking-wider">{cfg.label}</span>
                <span className="ml-auto bg-slate-950 text-slate-300 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-slate-800/60">
                  {colOrders.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {loading && <div className="text-slate-500 text-xs font-bold uppercase tracking-widest text-center pt-8">Loading orders...</div>}
                {!loading && colOrders.length === 0 && (
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-widest text-center pt-8">No orders</div>
                )}
                {colOrders.map((order) => (
                  <KitchenCard 
                    key={order.id} 
                    order={order} 
                    onUpdate={fetchOrders} 
                    struckItems={struckItems}
                    onToggleStrikethrough={handleToggleStrikethrough}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KitchenPage;
