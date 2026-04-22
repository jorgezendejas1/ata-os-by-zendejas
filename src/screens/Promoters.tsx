import React, { useState, useEffect, useMemo } from 'react';
import { getPromoters, updatePromoter, deletePromoter, createPromoter, Promoter, showToast } from '../services/db';
import { Edit2, Check, X, Search, ChevronLeft, ChevronRight, Trash2, UserPlus, Loader2, Users2, AlertCircle, User as UserIcon, Building2, MapPin } from 'lucide-react';

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

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', company_id: 'c1', terminal_id: 'NAL' });

  useEffect(() => { loadData(); }, []);

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
  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (p: Promoter) => {
    try {
      await updatePromoter({ ...p, name: editData.name, company_id: editData.company_id, terminal_id: editData.terminal_id });
      setPromoters(prev => prev.map(x => x.id === p.id ? { ...x, ...editData } : x));
      setEditingId(null);
    } catch { /* toast shown */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este promotor?')) return;
    try {
      await deletePromoter(id);
      setPromoters(prev => prev.filter(p => p.id !== id));
    } catch { /* toast shown */ }
  };

  const handleOpenModal = () => {
    setFormData({ name: '', company_id: 'c1', terminal_id: 'NAL' });
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { showToast('El nombre es obligatorio', 'warning'); return; }
    if (!formData.company_id) { showToast('Selecciona una empresa', 'warning'); return; }
    if (!formData.terminal_id) { showToast('Selecciona una terminal', 'warning'); return; }

    setIsSubmitting(true);
    try {
      await createPromoter({
        name: formData.name.trim(),
        company_id: formData.company_id,
        terminal_id: formData.terminal_id,
        active: true,
      });
      await loadData();
      setIsModalOpen(false);
    } catch { /* toast shown */ } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-40 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Sincronizando Promotores...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 p-2 md:p-0 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3.5 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm">
            <Users2 size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Promotores</h2>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em]">{filtered.length} promotores activos</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-4 top-4 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm font-medium"
            />
          </div>
          <button
            onClick={handleOpenModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-100 dark:shadow-none transition-all active:scale-95 font-black uppercase text-[10px] tracking-widest"
          >
            <UserPlus size={18} />
            Agregar Promotor
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center px-4 md:px-0 mb-6">
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm">
          <option value="all">Todas las empresas</option>
          {Object.entries(COMPANIES).map(([id, c]) => (
            <option key={id} value={id}>{c.label}</option>
          ))}
        </select>
        <select value={filterTerminal} onChange={e => setFilterTerminal(e.target.value)} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm">
          <option value="all">Todas las terminales</option>
          {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b dark:border-gray-800">
                <th className="p-6 w-16">#</th>
                <th className="p-6">Nombre Completo</th>
                <th className="p-6">Empresa</th>
                <th className="p-6">Terminal</th>
                <th className="p-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pageData.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center"><p className="text-xs font-black text-gray-300 uppercase tracking-widest">Sin resultados</p></td></tr>
              ) : pageData.map((p, i) => {
                const isEditing = editingId === p.id;
                const co = COMPANIES[p.company_id];
                const rowNum = page * PAGE_SIZE + i + 1;
                return (
                  <tr key={p.id} className="group hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors">
                    <td className="p-6 text-xs text-gray-400 font-black">{rowNum}</td>
                    <td className="p-6">
                      {isEditing ? (
                        <input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} className="border-2 border-blue-300 dark:border-blue-600 rounded-xl px-3 py-2 text-sm font-bold w-full bg-blue-50/50 dark:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-black text-gray-500 dark:text-gray-400 shadow-inner">{p.name.charAt(0)}</div>
                          <p className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight">{p.name}</p>
                        </div>
                      )}
                    </td>
                    <td className="p-6">
                      {isEditing ? (
                        <select value={editData.company_id} onChange={e => setEditData(d => ({ ...d, company_id: e.target.value }))} className="border-2 border-blue-300 dark:border-blue-600 rounded-xl px-3 py-2 text-xs font-black bg-blue-50/50 dark:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {Object.entries(COMPANIES).map(([id, c]) => <option key={id} value={id}>{c.label}</option>)}
                        </select>
                      ) : (
                        <span className="inline-block px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border" style={{ backgroundColor: co?.bg || '#ddd', color: co?.text || '#000', borderColor: 'transparent' }}>{co?.label || p.company_id}</span>
                      )}
                    </td>
                    <td className="p-6">
                      {isEditing ? (
                        <select value={editData.terminal_id} onChange={e => setEditData(d => ({ ...d, terminal_id: e.target.value }))} className="border-2 border-blue-300 dark:border-blue-600 rounded-xl px-3 py-2 text-xs font-black bg-blue-50/50 dark:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      ) : (
                        <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-[10px] font-black text-gray-600 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-700 uppercase tracking-widest">{p.terminal_id}</span>
                      )}
                    </td>
                    <td className="p-6 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => saveEdit(p)} className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all active:scale-90 shadow-sm"><Check size={18} /></button>
                          <button onClick={cancelEdit} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-90 shadow-sm"><X size={18} /></button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(p)} className="p-3 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all shadow-sm active:scale-90 border border-transparent hover:border-gray-100 dark:hover:border-gray-700"><Edit2 size={18} /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-3 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all shadow-sm active:scale-90 border border-transparent hover:border-gray-100 dark:hover:border-gray-700"><Trash2 size={18} /></button>
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"><ChevronLeft size={16} /></button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4 px-4">
        {pageData.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-800">
            <AlertCircle size={40} className="text-gray-200 mx-auto mb-4" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Sin resultados</p>
          </div>
        ) : pageData.map(p => {
          const co = COMPANIES[p.company_id];
          return (
            <div key={p.id} className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-black text-gray-500 dark:text-gray-400 shadow-inner">{p.name.charAt(0)}</div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm leading-none mb-1">{p.name}</h4>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.terminal_id}</span>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: co?.bg || '#ddd', color: co?.text || '#000' }}>{co?.label}</span>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                <button onClick={() => startEdit(p)} className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-black uppercase text-[10px] border border-blue-100 dark:border-blue-800/50 active:scale-95 transition-all"><Edit2 size={14} /> Editar</button>
                <button onClick={() => handleDelete(p.id)} className="p-2.5 text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800/50 active:scale-95 transition-all"><Trash2 size={18} /></button>
              </div>
            </div>
          );
        })}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pág {page + 1} / {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[60] animate-in fade-in duration-300">
          <form onSubmit={handleCreate} className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="px-8 py-8 md:px-10 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">Nuevo Promotor</h3>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Registro en directorio operativo</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 bg-white dark:bg-gray-900 rounded-2xl text-gray-400 hover:text-gray-600 dark:hover:text-white shadow-sm transition-all border dark:border-gray-800"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-6 no-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2"><UserIcon size={12} className="text-blue-500" /> Nombre Completo</label>
                <input
                  required autoFocus
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Juan Pérez García"
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-2xl text-sm font-bold outline-none transition-all dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Building2 size={12} className="text-blue-500" /> Empresa</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(COMPANIES).map(([id, c]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFormData({ ...formData, company_id: id })}
                      className={`p-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 ${formData.company_id === id ? 'border-blue-600 shadow-lg translate-x-0.5' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}
                      style={{ backgroundColor: c.bg, color: c.text }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MapPin size={12} className="text-blue-500" /> Terminal</label>
                <div className="grid grid-cols-4 gap-3">
                  {TERMINALS.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, terminal_id: t })}
                      className={`p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${formData.terminal_id === t ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 md:p-10 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-800 flex flex-col sm:flex-row gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-4 text-xs font-black text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all uppercase tracking-widest border border-transparent hover:border-gray-200 dark:hover:border-gray-700 order-2 sm:order-1">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="flex-[2] px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-100 dark:shadow-none font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 order-1 sm:order-2">
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                Confirmar Registro
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Promoters;
