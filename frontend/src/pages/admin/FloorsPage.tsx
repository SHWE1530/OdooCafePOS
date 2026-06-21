import { useEffect, useState } from 'react';
import { floorsAPI, tablesAPI } from '../../services/api';
import type { Floor, Table } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, X, Layers, Grid } from 'lucide-react';

const FloorsPage = () => {
  const { showToast } = useToast();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFloorModal, setShowFloorModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [floorForm, setFloorForm] = useState({ name: '', description: '' });
  const [tableForm, setTableForm] = useState({ name: '', capacity: 4, floor_id: 0 });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [f, t] = await Promise.all([floorsAPI.getAll(), tablesAPI.getAll()]);
      setFloors(f);
      setTables(t);
    } catch { showToast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const openAddFloor = () => { setEditingFloor(null); setFloorForm({ name: '', description: '' }); setShowFloorModal(true); };
  const openEditFloor = (f: Floor) => { setEditingFloor(f); setFloorForm({ name: f.name, description: f.description || '' }); setShowFloorModal(true); };

  const handleSaveFloor = async () => {
    try {
      if (editingFloor) { await floorsAPI.update(editingFloor.id, floorForm); showToast('Floor updated!', 'success'); }
      else { await floorsAPI.create(floorForm); showToast('Floor added!', 'success'); }
      setShowFloorModal(false);
      fetchAll();
    } catch (e: any) { showToast(e.response?.data?.detail || 'Save failed', 'error'); }
  };

  const handleDeleteFloor = async (id: number) => {
    if (!confirm('Delete this floor and all its tables?')) return;
    try { await floorsAPI.delete(id); showToast('Floor deleted', 'info'); fetchAll(); }
    catch { showToast('Delete failed', 'error'); }
  };

  const openAddTable = (floorId: number) => {
    setEditingTable(null);
    setTableForm({ name: '', capacity: 4, floor_id: floorId });
    setShowTableModal(true);
  };

  const openEditTable = (t: Table) => {
    setEditingTable(t);
    setTableForm({ name: t.name, capacity: t.capacity, floor_id: t.floor_id });
    setShowTableModal(true);
  };

  const handleSaveTable = async () => {
    try {
      if (editingTable) {
        await tablesAPI.update(editingTable.id, tableForm);
        showToast('Table updated!', 'success');
      } else {
        await tablesAPI.create(tableForm);
        showToast('Table added!', 'success');
      }
      setShowTableModal(false);
      fetchAll();
    } catch (e: any) { showToast(e.response?.data?.detail || 'Save failed', 'error'); }
  };

  const handleDeleteTable = async (id: number) => {
    if (!confirm('Delete this table?')) return;
    try { await tablesAPI.delete(id); showToast('Table deleted', 'info'); fetchAll(); }
    catch { showToast('Delete failed', 'error'); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Floor & Table Setup</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{floors.length} floors · {tables.length} tables total</p>
        </div>
        <button id="admin-add-floor-btn" onClick={openAddFloor} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />Add Floor
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {floors.map((floor) => {
            const floorTables = tables.filter((t) => t.floor_id === floor.id);
            return (
              <div key={floor.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Floor Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-violet-100 dark:bg-violet-950/30 rounded-xl flex items-center justify-center">
                      <Layers className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900 dark:text-white">{floor.name}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{floorTables.length} tables</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openAddTable(floor.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Table
                    </button>
                    <button onClick={() => openEditFloor(floor)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteFloor(floor.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Tables */}
                <div className="p-4">
                  {floorTables.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      No tables yet.
                      <button onClick={() => openAddTable(floor.id)} className="ml-2 text-violet-600 hover:underline">Add one</button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {floorTables.map((table) => (
                        <div
                          key={table.id}
                          className="group relative bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 min-w-[120px] hover:border-violet-300 dark:hover:border-violet-700 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-bold text-sm text-slate-900 dark:text-white">{table.name}</p>
                              <p className="text-xs text-slate-500">{table.capacity} seats</p>
                            </div>
                            <Grid className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${
                              table.status === 'available' ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' :
                              table.status === 'occupied' ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400' :
                              'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                            }`}>{table.status}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditTable(table)} className="p-1 text-slate-400 hover:text-violet-600 rounded transition-colors"><Edit2 className="w-3 h-3" /></button>
                              <button onClick={() => handleDeleteTable(table.id)} className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {floors.length === 0 && (
            <div className="text-center py-16 text-slate-400">No floors configured. Add your first floor!</div>
          )}
        </div>
      )}

      {/* Floor Modal */}
      {showFloorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">{editingFloor ? 'Edit Floor' : 'Add Floor'}</h2>
              <button onClick={() => setShowFloorModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Floor Name *</label>
                <input value={floorForm.name} onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })} placeholder="Ground Floor" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Description</label>
                <input value={floorForm.description} onChange={(e) => setFloorForm({ ...floorForm, description: e.target.value })} placeholder="Optional description" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowFloorModal(false)} className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleSaveFloor} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">{editingFloor ? 'Save Changes' : 'Add Floor'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">{editingTable ? 'Edit Table' : 'Add Table'}</h2>
              <button onClick={() => setShowTableModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Table Name *</label>
                <input value={tableForm.name} onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })} placeholder="T-01" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Capacity (seats)</label>
                <input type="number" min={1} max={20} value={tableForm.capacity} onChange={(e) => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) })} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowTableModal(false)} className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleSaveTable} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">{editingTable ? 'Save Changes' : 'Add Table'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorsPage;
