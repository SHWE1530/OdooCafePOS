import { useEffect, useState } from 'react';
import { dashboardAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  TrendingUp, ShoppingBag, DollarSign, Grid, Activity, Play, 
  Download, RefreshCw, Lightbulb, ArrowUpRight, ArrowDownRight,
  Clock, ShieldCheck, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface Summary {
  revenue: number;
  orders_count: number;
  avg_order_val: number;
  active_tables: number;
  revenue_growth: number;
  today_revenue: number;
  today_orders: number;
  occupancy_rate: number;
  kitchen_efficiency: number;
  delayed_orders_count: number;
}

interface Charts {
  revenue_trend: { date: string; revenue: number }[];
  top_products: { name: string; quantity: number; revenue: number }[];
  top_categories: { name: string; color: string; revenue: number }[];
  peak_hours: { hour: string; orders: number; revenue: number }[];
  table_utilization: { floor: string; occupied: number; total: number; utilization: number }[];
  kitchen_performance: { avg_prep_time: number; total_orders: number; completed_orders: number; preparing_orders: number; to_cook_orders: number };
}

interface AIInsight {
  title: string;
  metric: string;
  description: string;
  type: 'success' | 'warning' | 'info' | 'danger' | 'promo';
}

interface HealthScore {
  score: number;
  trend: string;
  breakdown: {
    kitchen_efficiency: string;
    table_utilization: string;
    customer_satisfaction: string;
  };
  details: {
    completion_rate: number;
    avg_rating: number;
    kitchen_efficiency_pct: number;
    table_utilization_pct: number;
  };
}

interface LiveOps {
  active_orders: number;
  orders_in_kitchen: number;
  delayed_orders: number;
  occupied_tables: number;
  available_tables: number;
  revenue_today: number;
  avg_prep_time: number;
  activity_feed: { time: string; message: string; type: string }[];
}

const CHART_COLORS = ['#714B67', '#8B5CF6', '#D4AF37', '#22C55E', '#3b82f6', '#ec4899'];

const StatCard = ({ title, value, sub, icon: Icon, trend, color, glow }: {
  title: string;
  value: string;
  sub?: string;
  icon: any;
  trend?: number;
  color: string;
  glow: string;
}) => (
  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-slate-700">
    {/* Subtle Background Glow */}
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 ${glow}`} />
    
    <div className="flex items-start justify-between relative">
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-extrabold text-white tracking-tight">{value}</p>
        {sub && <p className="text-[10px] font-semibold text-slate-400">{sub}</p>}
      </div>
      <div className={`p-3 rounded-2xl ${color} shadow-lg shadow-black/40`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
    
    {trend !== undefined && (
      <div className={`flex items-center gap-1 mt-4 text-xs font-bold ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {Math.abs(trend).toFixed(1)}% vs yesterday
      </div>
    )}
  </div>
);

const DashboardPage = () => {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [aiAdvisor, setAiAdvisor] = useState<AIInsight[]>([]);
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [liveOps, setLiveOps] = useState<LiveOps | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, c, a, h, l] = await Promise.all([
        dashboardAPI.getSummary(),
        dashboardAPI.getCharts(),
        dashboardAPI.getAIAdvisor(),
        dashboardAPI.getHealthScore(),
        dashboardAPI.getLiveOps()
      ]);
      setSummary(s);
      setCharts(c);
      setAiAdvisor(a);
      setHealth(h);
      setLiveOps(l);
    } catch (err) {
      console.error(err);
      showToast('Error fetching dashboard stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh every 15 seconds for live operations fallback
    const interval = setInterval(async () => {
      try {
        const l = await dashboardAPI.getLiveOps();
        setLiveOps(l);
        const s = await dashboardAPI.getSummary();
        setSummary(s);
      } catch (e) {
        console.error('Ops refresh failed', e);
      }
    }, 15000);

    // WebSocket real-time updates
    const wsUrl = `ws://${window.location.hostname}:8000/ws`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'dashboard_updated') {
          fetchData();
        }
      } catch (e) {
        console.error("WS error in Dashboard:", e);
      }
    };

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  const handleDemoTrigger = async () => {
    setDemoLoading(true);
    try {
      const res = await dashboardAPI.triggerDemoMode();
      showToast(res.message, 'success');
      await fetchData();
    } catch (err: any) {
      showToast('Failed to trigger Demo Mode', 'error');
    } finally {
      setDemoLoading(false);
    }
  };

  const fmtCurrency = (v: number) => `₹${v?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse bg-slate-950 min-h-screen text-slate-100">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-800 rounded w-48" />
          <div className="h-10 bg-slate-800 rounded w-64" />
        </div>
        <div className="grid grid-cols-6 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-900 border border-slate-800 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-[400px] bg-slate-900 border border-slate-800 rounded-3xl" />
          <div className="col-span-1 h-[400px] bg-slate-900 border border-slate-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100">
      {/* Top Banner for Judges */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/30">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Judges Sandbox Dashboard</h3>
            <p className="text-xs text-indigo-300">Instantly populate active sales, kitchen timelines, and customer ratings for live testing.</p>
          </div>
        </div>
        <button
          onClick={handleDemoTrigger}
          disabled={demoLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-lg shadow-indigo-950/60 cursor-pointer"
        >
          {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
          {demoLoading ? 'Seeding...' : 'Enable Mock Demo Mode'}
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Restaurant Operations Control
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Real-time analytical insights and mission control</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <a
            href={dashboardAPI.getExportExcelUrl()}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-750 hover:bg-emerald-600 border border-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-950/50"
          >
            <Download className="w-3.5 h-3.5" />
            Excel
          </a>
          <a
            href={dashboardAPI.getExportPdfUrl()}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-violet-750 hover:bg-violet-600 border border-violet-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-violet-950/50"
          >
            <Download className="w-3.5 h-3.5" />
            PDF Report
          </a>
        </div>
      </div>

      {/* 6 TOP KPIs */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <StatCard
            title="Revenue Today"
            value={fmtCurrency(summary.today_revenue)}
            sub={`Total: ${fmtCurrency(summary.revenue)}`}
            icon={DollarSign}
            trend={summary.revenue_growth}
            color="bg-indigo-600"
            glow="bg-indigo-500"
          />
          <StatCard
            title="Orders Today"
            value={summary.today_orders?.toLocaleString()}
            sub={`Total count: ${summary.orders_count}`}
            icon={ShoppingBag}
            color="bg-blue-600"
            glow="bg-blue-500"
          />
          <StatCard
            title="Avg Order Value"
            value={fmtCurrency(summary.avg_order_val)}
            icon={TrendingUp}
            color="bg-amber-500"
            glow="bg-amber-500"
          />
          <StatCard
            title="Active Tables"
            value={summary.active_tables?.toString()}
            icon={Grid}
            color="bg-pink-600"
            glow="bg-pink-500"
          />
          <StatCard
            title="Table Occupancy"
            value={`${summary.occupancy_rate}%`}
            icon={Activity}
            color="bg-emerald-600"
            glow="bg-emerald-500"
          />
          <StatCard
            title="Kitchen Efficiency"
            value={`${summary.kitchen_efficiency}%`}
            sub={`Delayed tickets: ${summary.delayed_orders_count}`}
            icon={Clock}
            color="bg-rose-600"
            glow="bg-rose-500"
          />
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Operations & Timeline */}
        <div className="xl:col-span-2 space-y-6">
          {/* Live Operations Center */}
          {liveOps && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <h2 className="text-lg font-bold text-white">Live Operations Center</h2>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  Mission Control Feed
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="text-center space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Avg Prep Time</p>
                  <p className="text-lg font-extrabold text-indigo-400">{liveOps.avg_prep_time}m</p>
                </div>
                <div className="text-center space-y-0.5 border-l border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Active Orders</p>
                  <p className="text-lg font-extrabold text-blue-400">{liveOps.active_orders}</p>
                </div>
                <div className="text-center space-y-0.5 border-l border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Cooking In Kitchen</p>
                  <p className="text-lg font-extrabold text-orange-400">{liveOps.orders_in_kitchen}</p>
                </div>
                <div className="text-center space-y-0.5 border-l border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Delayed (&gt;15m)</p>
                  <p className="text-lg font-extrabold text-rose-500">{liveOps.delayed_orders}</p>
                </div>
              </div>

              {/* Feed list */}
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {liveOps.activity_feed.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No active operation feeds recorded.</p>
                ) : (
                  liveOps.activity_feed.map((e, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-xs bg-slate-950/20 border border-slate-850 p-2.5 rounded-xl">
                      <span className="text-[10px] font-mono text-indigo-400 font-bold shrink-0">{e.time}</span>
                      <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-slate-700" />
                      <p className="text-slate-300 flex-1">{e.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Revenue Area Chart */}
          {charts && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-base font-bold text-white mb-6 uppercase tracking-wider text-xs">Revenue Trend – Last 7 Days</h2>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={charts.revenue_trend}>
                  <defs>
                    <linearGradient id="dbRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#714b67" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderColor: 'rgba(255, 255, 255, 0.08)', 
                      borderRadius: '16px',
                      boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)'
                    }} 
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }} 
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, 'Revenue']} 
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fill="url(#dbRevGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Charts Row: Peak Hours & Table utilization */}
          {charts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Peak Hours Combination Chart */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h2 className="text-base font-bold text-white mb-6 uppercase tracking-wider text-xs">Peak Hour Sales Activity</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={charts.peak_hours}>
                    <defs>
                      <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#714b67" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d4af37" stopOpacity={1} />
                        <stop offset="100%" stopColor="#b5942b" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 10 }} width={25} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#d4af37', fontSize: 10 }} width={30} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        borderColor: 'rgba(255, 255, 255, 0.08)', 
                        borderRadius: '16px',
                        boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)'
                      }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    />
                    <Bar yAxisId="left" dataKey="orders" fill="url(#ordersGrad)" name="Orders" radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="right" dataKey="revenue" fill="url(#salesGrad)" name="Sales" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table Utilization */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h2 className="text-base font-bold text-white mb-6 uppercase tracking-wider text-xs">Floor Table Occupancy</h2>
                <div className="space-y-4">
                  {charts.table_utilization.map((f, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-300">{f.floor}</span>
                        <span className="text-slate-400">{f.occupied} / {f.total} Tables ({f.utilization}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${f.utilization}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: AI insights & Health Score */}
        <div className="space-y-6">
          {/* Health Score Visual Gauge */}
          {health && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-center space-y-6">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-left">Restaurant Health Score</h2>
              
              <div className="flex justify-center relative">
                {/* SVG Gauge */}
                <svg className="w-36 h-36 transform -rotate-90">
                  <circle cx="72" cy="72" r="60" stroke="#0f172a" strokeWidth="8" fill="transparent" />
                  <circle cx="72" cy="72" r="60" stroke="#6366f1" strokeWidth="8" fill="transparent"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 * (1 - health.score / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-4xl font-extrabold text-white">{health.score}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rating</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Kitchen</p>
                  <p className="text-xs font-bold text-white mt-0.5">{health.breakdown.kitchen_efficiency}</p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Tables</p>
                  <p className="text-xs font-bold text-white mt-0.5">{health.breakdown.table_utilization}</p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Reviews</p>
                  <p className="text-xs font-bold text-white mt-0.5">{health.breakdown.customer_satisfaction}</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Restaurant Advisor */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI Restaurant Advisor</h2>
            </div>
            
            <div className="space-y-3">
              {aiAdvisor.length === 0 ? (
                <p className="text-xs text-slate-500">Advisory engine is calibrating metrics...</p>
              ) : (
                aiAdvisor.map((insight, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 bg-slate-950/40 ${
                    insight.type === 'danger' ? 'border-rose-900/30 text-rose-300' :
                    insight.type === 'warning' ? 'border-amber-900/30 text-amber-300' :
                    insight.type === 'success' ? 'border-emerald-900/30 text-emerald-300' :
                    'border-slate-800 text-slate-300'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="uppercase text-[9px] tracking-widest">{insight.title}</span>
                      <span className="text-xs font-extrabold">{insight.metric}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal mt-1">{insight.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Categories Pie Chart */}
          {charts && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-base font-bold text-white mb-6 uppercase tracking-wider text-xs">Category Sales Split</h2>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={charts.top_categories}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {charts.top_categories.map((c, i) => (
                      <Cell key={i} fill={c.color || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderColor: 'rgba(255, 255, 255, 0.08)', 
                      borderRadius: '16px',
                      boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)'
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(v: any) => `₹${Number(v).toLocaleString()}`} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {charts.top_categories.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
