import { useEffect, useState } from 'react';
import { floorsAPI, tablesAPI } from '../services/api';
import type { Floor, Table } from '../types';
import { Plus, Trash2, Users, Layers, X, QrCode } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const STATUS_COLORS: Record<string, { border: string, bg: string, text: string, glow: string, dot: string }> = {
  available: {
    border: 'border-emerald-500/20 hover:border-emerald-500/50',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-400',
    glow: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]',
    dot: 'bg-emerald-500'
  },
  occupied: {
    border: 'border-rose-500/20 hover:border-rose-500/50',
    bg: 'bg-rose-500/5',
    text: 'text-rose-400',
    glow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
    dot: 'bg-rose-500'
  },
  reserved: {
    border: 'border-amber-500/20 hover:border-amber-500/50',
    bg: 'bg-amber-500/5',
    text: 'text-amber-400',
    glow: 'hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]',
    dot: 'bg-amber-500'
  },
  cleaning: {
    border: 'border-blue-500/20 hover:border-blue-500/50',
    bg: 'bg-blue-500/5',
    text: 'text-blue-400',
    glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    dot: 'bg-blue-500'
  },
};

const TableCard = ({ table, onStatusChange, onDelete, onShowQr }: {
  table: Table;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onShowQr: (table: Table) => void;
}) => {
  const statuses = ['available', 'occupied', 'reserved', 'cleaning'];
  const style = STATUS_COLORS[table.status] || STATUS_COLORS.available;

  return (
    <div className={`bg-slate-900 rounded-3xl border p-5 transition-all duration-300 ${style.border} ${style.glow} group relative overflow-hidden`}>
      {/* Background soft status tint */}
      <div className={`absolute inset-0 ${style.bg} opacity-50 transition-opacity group-hover:opacity-100`} />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${style.dot} shadow-[0_0_8px_currentColor]`} />
              <h3 className="font-bold text-lg text-white tracking-tight">{table.name || table.table_number || `Table ${table.id}`}</h3>
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400 font-medium">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>{table.capacity || table.seats || 4} Seats</span>
              <span className="mx-1 text-slate-600">•</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>{table.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <button onClick={() => onShowQr(table)} className="hover:text-indigo-450 transition-colors p-1.5 hover:bg-slate-950/60 rounded-lg cursor-pointer" title="Generate Table QR Code">
              <QrCode className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(table.id)} className="hover:text-rose-455 transition-colors p-1.5 hover:bg-slate-950/60 rounded-lg cursor-pointer" title="Delete Table">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Change Status</p>
          <div className="grid grid-cols-2 gap-1.5">
            {statuses.map((s) => {
              const btnStyle = STATUS_COLORS[s] || STATUS_COLORS.available;
              const isActive = table.status === s;
              return (
                <button
                  key={s}
                  onClick={() => onStatusChange(table.id, s)}
                  className={`text-[10px] py-1.5 px-2 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? `${btnStyle.dot} text-white shadow-md shadow-black/35`
                      : 'bg-slate-950/50 text-slate-400 hover:bg-slate-950 hover:text-white border border-slate-800/60'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TableModal {
  floorId: number;
  name: string;
  capacity: number;
}

const TablesPage = () => {
  const { showToast } = useToast();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeFloor, setActiveFloor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showFloorModal, setShowFloorModal] = useState(false);
  const [tableForm, setTableForm] = useState<TableModal>({ floorId: 0, name: '', capacity: 4 });
  const [floorName, setFloorName] = useState('');
  const [selectedQrTable, setSelectedQrTable] = useState<Table | null>(null);

  const fetchAll = async () => {
    try {
      const [f, t] = await Promise.all([floorsAPI.getAll(), tablesAPI.getAll()]);
      setFloors(f);
      setTables(t);
      if (f.length > 0 && !activeFloor) setActiveFloor(f[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await tablesAPI.updateStatus(id, status);
      setTables((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
      showToast(`Table status updated to ${status}`, 'success');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDeleteTable = async (id: number) => {
    if (!confirm('Delete this table?')) return;
    try {
      await tablesAPI.delete(id);
      setTables((prev) => prev.filter((t) => t.id !== id));
      showToast('Table deleted', 'info');
    } catch {
      showToast('Failed to delete table', 'error');
    }
  };

  const handleAddTable = async () => {
    try {
      const t = await tablesAPI.create({ 
        floor_id: activeFloor, 
        table_number: tableForm.name, 
        seats: tableForm.capacity,
        name: tableForm.name, 
        capacity: tableForm.capacity 
      });
      setTables((prev) => [...prev, t]);
      setShowTableModal(false);
      setTableForm({ floorId: activeFloor!, name: '', capacity: 4 });
      showToast('Table added!', 'success');
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Failed to add table', 'error');
    }
  };

  const handleAddFloor = async () => {
    try {
      const f = await floorsAPI.create({ name: floorName });
      setFloors((prev) => [...prev, f]);
      setActiveFloor(f.id);
      setShowFloorModal(false);
      setFloorName('');
      showToast('Floor added!', 'success');
    } catch {
      showToast('Failed to add floor', 'error');
    }
  };

  const floorTables = tables.filter((t) => t.floor_id === activeFloor);
  const activeFloorData = floors.find((f) => f.id === activeFloor);

  const stats = {
    available: floorTables.filter((t) => t.status === 'available').length,
    occupied: floorTables.filter((t) => t.status === 'occupied').length,
    reserved: floorTables.filter((t) => t.status === 'reserved').length,
  };

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Floor & Table Manager</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage restaurant layout and table occupancy statuses</p>
        </div>
        <div className="flex gap-3">
          <button
            id="add-floor-btn"
            onClick={() => setShowFloorModal(true)}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            Add Floor
          </button>
          <button
            id="add-table-btn"
            onClick={() => { setTableForm({ floorId: activeFloor!, name: '', capacity: 4 }); setShowTableModal(true); }}
            disabled={!activeFloor}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-950/60 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Table
          </button>
        </div>
      </div>

      {/* Floor tabs */}
      <div className="flex gap-2 flex-wrap bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/80 max-w-max">
        {floors.map((f) => {
          const isActive = activeFloor === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFloor(f.id)}
              className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-650 to-indigo-500 text-white shadow-md shadow-black/40 border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
              }`}
            >
              {f.name}
            </button>
          );
        })}
      </div>

      {/* Stats bar */}
      {activeFloor && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Available', count: stats.available, color: 'text-emerald-400', dot: 'bg-emerald-500' },
            { label: 'Occupied', count: stats.occupied, color: 'text-rose-400', dot: 'bg-rose-500' },
            { label: 'Reserved', count: stats.reserved, color: 'text-amber-400', dot: 'bg-amber-500' },
            { label: 'Total Tables', count: floorTables.length, color: 'text-slate-200', dot: 'bg-indigo-400' },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 rounded-2xl p-4.5 border border-slate-800/80 shadow-md shadow-black/25 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${s.dot} shadow-[0_0_8px_currentColor] shrink-0`} />
              <div>
                <span className={`text-2xl font-extrabold tracking-tight ${s.color}`}>{s.count}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mt-0.5">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 animate-pulse">
          {[...Array(10)].map((_, i) => <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {floorTables.map((t) => (
            <TableCard
              key={t.id}
              table={t}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteTable}
              onShowQr={(table) => setSelectedQrTable(table)}
            />
          ))}
          {floorTables.length === 0 && (
            <div className="col-span-full text-center py-16 text-slate-400">
              No tables on {activeFloorData?.name}. Add one!
            </div>
          )}
        </div>
      )}      {/* Add Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-extrabold text-lg text-white">Add New Table</h2>
              <button onClick={() => setShowTableModal(false)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Table Name</label>
                <input
                  value={tableForm.name}
                  onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                  placeholder="e.g. T-07"
                  className="w-full border border-slate-800 bg-slate-950 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Capacity (seats)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) })}
                  className="w-full border border-slate-800 bg-slate-950 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowTableModal(false)} className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-350 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-slate-800 cursor-pointer">
                Cancel
              </button>
              <button onClick={handleAddTable} className="flex-1 bg-indigo-650 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-950/60 cursor-pointer">
                Add Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Floor Modal */}
      {showFloorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-extrabold text-lg text-white">Add New Floor</h2>
              <button onClick={() => setShowFloorModal(false)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Floor Name</label>
                <input
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  placeholder="e.g. Ground Floor"
                  className="w-full border border-slate-800 bg-slate-950 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowFloorModal(false)} className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-350 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-slate-800 cursor-pointer">
                Cancel
              </button>
              <button onClick={handleAddFloor} className="flex-1 bg-indigo-650 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-950/60 cursor-pointer">
                Add Floor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Printable Modal */}
      {selectedQrTable && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
          <div className="bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-800 flex flex-col items-center text-center relative print:border-none print:shadow-none print:w-full print:max-w-none print:p-0">
            <button 
              onClick={() => setSelectedQrTable(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors print:hidden cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="print:block space-y-4">
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-500/20 print:hidden uppercase tracking-widest">
                QR Self-Ordering
              </span>
              <h2 className="text-2xl font-extrabold text-white mt-2">
                {selectedQrTable.name || selectedQrTable.table_number || `Table #${selectedQrTable.id}`}
              </h2>
              <p className="text-xs text-slate-400 print:text-black">
                Scan to browse menu, apply coupons, and place orders.
              </p>
            </div>

            <div className="my-6 p-4 bg-white rounded-3xl border border-slate-800 shadow-inner print:border-none print:shadow-none">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                  window.location.origin + '/s/' + window.btoa('table_id=' + selectedQrTable.id)
                )}`} 
                alt={`QR Code Table ${selectedQrTable.id}`}
                className="w-56 h-56 print:w-64 print:h-64 rounded-2xl mx-auto"
              />
            </div>

            <div className="w-full space-y-3 print:hidden">
              <button 
                onClick={() => window.print()} 
                className="w-full bg-indigo-650 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer text-xs font-bold uppercase tracking-wider transition-all"
              >
                Print Table QR Card
              </button>
              <button 
                onClick={() => setSelectedQrTable(null)} 
                className="w-full bg-slate-950 hover:bg-slate-800 text-slate-350 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablesPage;
