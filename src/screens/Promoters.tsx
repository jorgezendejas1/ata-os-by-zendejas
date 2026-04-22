import React, { useState, useEffect, useMemo } from 'react';
import { getPromoters, updatePromoter, deletePromoter, Promoter } from '../services/db';
import { Edit3, Check, X, Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

const COMPANIES: Record<string, { label: string; bg: string; text: string }> = {
  c1: { label: 'Sunset', bg: '#92d050', text: '#000' },
  c2: { label: 'XCA', bg: '#948a54', text: '#fff' },
  c3: { label: 'VDP', bg: '#f8cbad', text: '#000' },
  c4: { label: 'CID', bg: '#bdd7ee', text: '#000' },
  c5: { label: 'KRY', bg: '#ffff00', text: '#000' },
  c6: { label: 'KRY_G', bg: '#afafaf', text: '#000' },
};

const TERMINALS = ['NAL', 'T2', 'T3', 'T4'];
const PAGE_SIZE = 50;

const Promoters: React.FC = () => {
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterTerminal, setFilterTerminal] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ name: string; company_id: string; terminal_id: string }>({ name: '', company_id: '', terminal_id: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getPromoters();
    setPromoters(data);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let list = promoters;
    if (filterCompany !== 'all') list = list.filter(p => p.company_id === filterCompany);
    if (filterTerminal !== 'all') list = list.filter(p => p.terminal_id === filterTerminal);
    if (search.length >= 2) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [promoters, filterCompany, filterTerminal, search]);

  useEffect(() => { setPage(0); }, [filterCompany, filterTerminal, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const startEdit = (p: Promoter) => {
    setEditingId(p.id);
    setEditData({ name: p.name, company_id: p.company_id, terminal_id: p.terminal_id });
  };

  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async (p: Promoter) => {
    try {
      await updatePromoter({ ...p, name: editData.name, company_id: editData.company_id, terminal_id: editData.terminal_id });
      setPromoters(prev => prev.map(x => x.id === p.id ? { ...x, name: editData.name, company_id: editData.company_id, terminal_id: editData.terminal_id } : x));
      setEditingId(null);
    } catch { /* toast already shown */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este promotor?')) return;
    try {
      await deletePromoter(id);
      setPromoters(prev => prev.filter(p => p.id !== id));
    } catch { /* toast already shown */ }
  };

  const selectClass = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Promotores</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mt-1">{filtered.length} promotores</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className={selectClass}>
          <option value="all">Todas las empresas</option>
          {Object.entries(COMPANIES).map(([id, c]) => (
            <option key={id} value={id}>{c.label}</option>
          ))}
        </select>

        <select value={filterTerminal} onChange={e => setFilterTerminal(e.target.value)} className={selectClass}>
          <option value="all">Todas las terminales</option>
          {TERMINALS.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all w-48"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 font-bold text-sm">Cargando promotores...</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-left">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-12">#</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Nombre Completo</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Empresa</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Terminal</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-24">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400 font-bold text-xs">Sin resultados</td></tr>
                )}
                {pageData.map((p, i) => {
                  const isEditing = editingId === p.id;
                  const co = COMPANIES[p.company_id];
                  const rowNum = page * PAGE_SIZE + i + 1;

                  return (
                    <tr key={p.id} className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400 font-bold">{rowNum}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} className="border border-blue-300 dark:border-blue-600 rounded-lg px-2 py-1.5 text-xs font-bold w-full bg-blue-50/50 dark:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        ) : (
                          <span className="font-bold text-gray-900 dark:text-white text-xs">{p.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select value={editData.company_id} onChange={e => setEditData(d => ({ ...d, company_id: e.target.value }))} className="border border-blue-300 dark:border-blue-600 rounded-lg px-2 py-1.5 text-xs font-bold bg-blue-50/50 dark:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {Object.entries(COMPANIES).map(([id, c]) => <option key={id} value={id}>{c.label}</option>)}
                          </select>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider" style={{ backgroundColor: co?.bg || '#ddd', color: co?.text || '#000' }}>{co?.label || p.company_id}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select value={editData.terminal_id} onChange={e => setEditData(d => ({ ...d, terminal_id: e.target.value }))} className="border border-blue-300 dark:border-blue-600 rounded-lg px-2 py-1.5 text-xs font-bold bg-blue-50/50 dark:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{p.terminal_id}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-1.5">
                            <button onClick={() => saveEdit(p)} className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"><Check size={14} /></button>
                            <button onClick={cancelEdit} className="p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex gap-1.5 items-center">
                            <button onClick={() => startEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit3 size={14} /></button>
                            <button onClick={() => handleDelete(p.id)} className="p-3 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all shadow-sm active:scale-90 border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Página {page + 1} de {totalPages}</span>
              <div className="flex gap-1.5">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><ChevronLeft size={14} /></button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Promoters;
