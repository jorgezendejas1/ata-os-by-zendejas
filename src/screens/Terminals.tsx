import React, { useState, useEffect } from 'react';
import { MapPin, Edit2, X, Loader2, AlertCircle, Power } from 'lucide-react';
import { getTerminals, saveTerminal, TerminalDB, showToast } from '../services/db';
import { COMPANIES, SCHEDULES } from '../constants';

const Terminals: React.FC = () => {
  const [terminals, setTerminals] = useState<TerminalDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TerminalDB | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const data = await getTerminals();
    setTerminals(data);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleToggleActive = async (t: TerminalDB) => {
    const updated = { ...t, is_active: !t.is_active };
    try {
      await saveTerminal(updated);
      setTerminals(prev => prev.map(x => x.id === t.id ? updated : x));
    } catch {/* toast handled */}
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { showToast('El nombre es obligatorio', 'warning'); return; }
    setSaving(true);
    try {
      await saveTerminal(editing);
      setTerminals(prev => prev.map(x => x.id === editing.id ? editing : x));
      setEditing(null);
    } catch {/* */} finally { setSaving(false); }
  };

  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-40 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Cargando Terminales...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 p-2 md:p-0 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3.5 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm">
            <MapPin size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Terminales</h2>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em]">{terminals.length} terminales registradas</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b dark:border-gray-800">
                <th className="p-6">ID</th>
                <th className="p-6">Nombre</th>
                <th className="p-6">Zonas</th>
                <th className="p-6">Empresas</th>
                <th className="p-6">Horarios</th>
                <th className="p-6">Estado</th>
                <th className="p-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {terminals.length === 0 ? (
                <tr><td colSpan={7} className="p-20 text-center"><p className="text-xs font-black text-gray-300 uppercase tracking-widest">Sin terminales</p></td></tr>
              ) : terminals.map(t => (
                <tr key={t.id} className="group hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors">
                  <td className="p-6">
                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-[10px] font-mono font-black text-gray-500 dark:text-gray-400 rounded-md uppercase">{t.id}</span>
                  </td>
                  <td className="p-6">
                    <p className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight">{t.name}</p>
                  </td>
                  <td className="p-6">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${t.has_zones ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50' : 'bg-gray-50 text-gray-500 border-gray-100 dark:bg-gray-800/50 dark:text-gray-500 dark:border-gray-700'}`}>
                      {t.has_zones ? 'CON ZONAS' : 'SIMPLE'}
                    </span>
                  </td>
                  <td className="p-6"><span className="text-xs font-bold text-gray-500">{t.allowed_companies.length}</span></td>
                  <td className="p-6"><span className="text-xs font-bold text-gray-500">{t.allowed_schedules.length}</span></td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleToggleActive(t)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${t.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${t.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      {!t.is_active && t.id === 't1' && (
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Activa desde julio 2026</span>
                      )}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => setEditing({ ...t })} className="p-3 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all shadow-sm active:scale-90 border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                      <Edit2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal edición */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[60] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="px-8 py-8 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Editar Terminal</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">ID: {editing.id} (no editable)</p>
              </div>
              <button onClick={() => setEditing(null)} className="p-3 bg-white dark:bg-gray-900 rounded-2xl text-gray-400 hover:text-gray-600 dark:hover:text-white shadow-sm border dark:border-gray-800"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Nombre</label>
                <input
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Power size={18} className="text-blue-500" />
                  <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Terminal Activa</span>
                </div>
                <button
                  onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${editing.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${editing.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Empresas Permitidas</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {COMPANIES.map(c => {
                    const checked = editing.allowed_companies.includes(c.id);
                    return (
                      <label key={c.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${checked ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setEditing({ ...editing, allowed_companies: toggleArrayItem(editing.allowed_companies, c.id) })}
                          className="rounded"
                        />
                        <span className="text-xs font-bold uppercase">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Horarios Permitidos</label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {SCHEDULES.map(s => {
                    const checked = editing.allowed_schedules.includes(s.id);
                    return (
                      <label key={s.id} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${checked ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setEditing({ ...editing, allowed_schedules: toggleArrayItem(editing.allowed_schedules, s.id) })}
                          className="rounded"
                        />
                        <span className="text-xs font-mono font-bold">{s.time}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">El campo "Tiene zonas" no se puede modificar (depende de la estructura física).</p>
              </div>
            </div>
            <div className="px-8 py-6 border-t dark:border-gray-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800/50">
              <button onClick={() => setEditing(null)} className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Terminals;
