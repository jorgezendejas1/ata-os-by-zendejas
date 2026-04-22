import React, { useState, useEffect } from 'react';
import { getCompanies, saveCompany, deleteCompany, showToast, Company } from '../services/db';
import { TERMINALS } from '../constants';
import { Building2, Trash2, Edit2, Search, Loader2, X, CheckSquare, Square, AlertCircle, Plus, Globe } from 'lucide-react';

const getTerminalShortName = (id: string): string => {
  const terminal = TERMINALS.find(t => t.id === id);
  if (!terminal) return id;
  if (terminal.id === 't1') return 'NACIONAL';
  if (terminal.id === 't2') return 'T2';
  if (terminal.id === 't3') return 'T3';
  if (terminal.id === 't4') return 'T4';
  return terminal.name;
};

const TERMINAL_OPTIONS = ['NAL', 'T2', 'T3', 'T4'];

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Company>({
    name: '',
    short_name: '',
    abbreviation: '',
    color: '#cccccc',
    text_color: '#000000',
    active: true,
    terminals: [],
  });

  const refresh = async () => {
    setIsLoading(true);
    try {
      const data = await getCompanies();
      setCompanies(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleOpenModal = (c?: Company) => {
    if (c) {
      setEditingCompany(c);
      setFormData({
        id: c.id,
        name: c.name,
        short_name: c.short_name,
        abbreviation: c.abbreviation,
        color: c.color,
        text_color: c.text_color,
        active: c.active,
        terminals: c.terminals || [],
      });
    } else {
      setEditingCompany(null);
      setFormData({ name: '', short_name: '', abbreviation: '', color: '#cccccc', text_color: '#000000', active: true, terminals: [] });
    }
    setIsModalOpen(true);
  };

  const validate = () => {
    if (!formData.name.trim()) { showToast('El nombre completo es obligatorio', 'warning'); return false; }
    if (!formData.short_name.trim()) { showToast('El nombre corto es obligatorio', 'warning'); return false; }
    if (!formData.abbreviation.trim() || formData.abbreviation.length !== 3) { showToast('La abreviación debe tener 3 letras', 'warning'); return false; }
    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload: Company = {
        ...formData,
        abbreviation: formData.abbreviation.toUpperCase(),
      };
      if (!payload.id) delete (payload as any).id;
      await saveCompany(payload);
      await refresh();
      setIsModalOpen(false);
    } catch {
      // toast handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('¿Eliminar esta empresa permanentemente?')) return;
    try {
      await deleteCompany(id);
      await refresh();
    } catch {/* toast */}
  };

  const toggleTerminal = (t: string) => {
    setFormData(d => ({
      ...d,
      terminals: d.terminals.includes(t) ? d.terminals.filter(x => x !== t) : [...d.terminals, t],
    }));
  };

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.short_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-40 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Sincronizando Empresas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 p-2 md:p-0 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3.5 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm">
            <Building2 size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Gestión de Empresas</h2>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em]">Identidades Corporativas Cloud</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-4 top-4 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar empresa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm font-medium"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-100 dark:shadow-none transition-all active:scale-95 font-black uppercase text-[10px] tracking-widest"
          >
            <Plus size={18} />
            Nueva Empresa
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b dark:border-gray-800">
                <th className="p-6">Identidad</th>
                <th className="p-6">Abreviación</th>
                <th className="p-6">Terminales</th>
                <th className="p-6">Estado</th>
                <th className="p-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No hay empresas registradas</p>
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="group hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shadow-inner transition-transform group-hover:scale-110"
                          style={{ background: c.color, color: c.text_color }}>
                          {c.abbreviation}
                        </div>
                        <div>
                          <p className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight">{c.name}</p>
                          <p className="text-[11px] font-medium text-gray-400">{c.short_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border"
                        style={{ background: c.color, color: c.text_color, borderColor: c.color }}>
                        {c.abbreviation}
                      </span>
                    </td>
                    <td className="p-6">
                      {c.terminals && c.terminals.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {c.terminals.map(t => (
                            <span key={t} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-[9px] font-black text-gray-500 dark:text-gray-400 rounded-md border border-gray-200 dark:border-gray-700 uppercase">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800/50 uppercase tracking-widest inline-flex items-center gap-1.5">
                          <Globe size={10} /> Aeropuerto Completo
                        </span>
                      )}
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${c.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50'
                        : 'bg-gray-50 text-gray-500 border-gray-100 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700'}`}>
                        {c.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(c)} className="p-3 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all shadow-sm active:scale-90 border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-3 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all shadow-sm active:scale-90 border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4 px-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-800">
            <AlertCircle size={40} className="text-gray-200 mx-auto mb-4" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Sin empresas</p>
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shadow-inner"
                    style={{ background: c.color, color: c.text_color }}>
                    {c.abbreviation}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm leading-none mb-1">{c.name}</h4>
                    <p className="text-[10px] font-medium text-gray-400">{c.short_name}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Terminales</p>
                <div className="flex flex-wrap gap-2">
                  {c.terminals && c.terminals.length > 0 ? c.terminals.map(t => (
                    <span key={t} className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-[10px] font-black text-gray-500 dark:text-gray-400 rounded-xl border border-gray-100 dark:border-gray-700 uppercase">{t}</span>
                  )) : (
                    <span className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-[10px] font-black text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800/50 uppercase flex items-center gap-2">
                      <Globe size={12} /> Aeropuerto completo
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-50 dark:border-gray-800">
                <button onClick={() => handleOpenModal(c)} className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-black uppercase text-[10px] border border-blue-100 dark:border-blue-800/50 active:scale-95 transition-all">
                  <Edit2 size={14} /> Editar
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-2.5 text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800/50 active:scale-95 transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[60] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="px-8 py-8 md:px-10 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">{editingCompany ? 'Actualizar Empresa' : 'Nueva Empresa'}</h3>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Identidad corporativa ATA Cloud</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white dark:bg-gray-900 rounded-2xl text-gray-400 hover:text-gray-600 dark:hover:text-white shadow-sm transition-all border dark:border-gray-800"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Grupo Sunset" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-2xl text-sm font-bold outline-none transition-all dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Corto</label>
                  <input required value={formData.short_name} onChange={e => setFormData({ ...formData, short_name: e.target.value })} placeholder="Sunset" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-2xl text-sm font-bold outline-none transition-all dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Abreviación (3 letras)</label>
                  <input required maxLength={3} value={formData.abbreviation} onChange={e => setFormData({ ...formData, abbreviation: e.target.value.toUpperCase() })} placeholder="SUN" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-2xl text-sm font-black uppercase outline-none transition-all dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Color de Fondo</label>
                  <div className="flex gap-2">
                    <input type="color" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-16 h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-700 cursor-pointer" />
                    <input value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} placeholder="#92d050" className="flex-1 px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-2xl text-sm font-mono outline-none transition-all dark:text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Color de Texto</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setFormData({ ...formData, text_color: '#000000' })} className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${formData.text_color === '#000000' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}>Negro</button>
                    <button type="button" onClick={() => setFormData({ ...formData, text_color: '#ffffff' })} className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${formData.text_color === '#ffffff' ? 'bg-white text-gray-900 border-gray-900' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}>Blanco</button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vista Previa</label>
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-base font-black shadow-inner" style={{ background: formData.color, color: formData.text_color }}>
                    {formData.abbreviation || '???'}
                  </div>
                  <span className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest" style={{ background: formData.color, color: formData.text_color }}>
                    {formData.short_name || 'Vista previa'}
                  </span>
                </div>
              </div>

              {/* Terminals */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Terminales Asignadas</label>
                  <span className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full uppercase">Opcional</span>
                </div>
                <div className="bg-gray-50/50 dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {TERMINAL_OPTIONS.map(t => (
                    <button key={t} type="button" onClick={() => toggleTerminal(t)}
                      className={`p-4 flex items-center gap-2 rounded-2xl text-[10px] font-black uppercase transition-all border-2 ${formData.terminals.includes(t) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white dark:bg-gray-900 border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'}`}>
                      {formData.terminals.includes(t) ? <CheckSquare size={16} /> : <Square size={16} className="text-gray-300 dark:text-gray-700" />}
                      <span>{t}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] font-black text-gray-400 mt-4 text-center uppercase tracking-widest flex items-center justify-center gap-2">
                  <AlertCircle size={10} className="text-blue-400" /> Sin selección = Aeropuerto completo
                </p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">Empresa Activa</p>
                  <p className="text-[10px] font-medium text-gray-400 mt-1">Disponible en módulos operativos</p>
                </div>
                <button type="button" onClick={() => setFormData({ ...formData, active: !formData.active })}
                  className={`relative w-14 h-8 rounded-full transition-all ${formData.active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                  <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.active ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="p-8 md:p-10 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-800 flex flex-col sm:flex-row gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-4 text-xs font-black text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all uppercase tracking-widest border border-transparent hover:border-gray-200 dark:hover:border-gray-700 order-2 sm:order-1">Cancelar</button>
              <button onClick={handleSave} disabled={isSubmitting} className="flex-[2] px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-100 dark:shadow-none font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 order-1 sm:order-2">
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Building2 size={18} />}
                {editingCompany ? 'Actualizar Empresa' : 'Crear Empresa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;
