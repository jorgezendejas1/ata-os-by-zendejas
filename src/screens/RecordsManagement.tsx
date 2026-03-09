
import React, { useState, useEffect, useMemo } from 'react';
import { getRecords, updateAttendanceRecord, deleteAttendanceRecord } from '../services/db';
import { AttendanceRecord, User } from '../types';
import { TERMINALS, COMPANIES } from '../constants';
import { Search, Database, Calendar, Trash2, Save, Edit2, X, Filter, AlertTriangle, MapPin, Building2, ChevronDown, ChevronUp, User as UserIcon, Hash, Clock, Download, ArrowUpDown, ArrowUp, ArrowDown, History, CheckCircle2, UserCheck, Target, RefreshCw, AlertCircle, Check, MoreVertical } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RecordsManagementProps {
  user: User;
}

const RecordsManagement: React.FC<RecordsManagementProps> = ({ user }) => {
  const now = new Date();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTerminalId, setSelectedTerminalId] = useState('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // UI State
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ planned: number; actual: number } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const refreshRecords = async () => {
    const data = await getRecords();
    const sorted = [...data].sort((a, b) => {
        if (a.dateRegistered !== b.dateRegistered) return b.dateRegistered.localeCompare(a.dateRegistered);
        return b.timeRegistered.localeCompare(a.timeRegistered);
    });
    setRecords(sorted);
  };

  useEffect(() => {
    refreshRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedDate) {
        if (r.dateRegistered !== selectedDate) return false;
      } else {
        if (!r.dateRegistered.startsWith(selectedMonth)) return false;
      }
      if (selectedTerminalId !== 'all' && r.terminalId !== selectedTerminalId) return false;
      if (selectedCompanyId !== 'all' && r.companyId !== selectedCompanyId) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        return (
          r.terminalName.toLowerCase().includes(lower) ||
          r.companyName.toLowerCase().includes(lower) ||
          (r.zoneName && r.zoneName.toLowerCase().includes(lower)) ||
          r.dateRegistered.includes(lower) ||
          r.id.toLowerCase().includes(lower)
        );
      }
      return true;
    });
  }, [records, selectedMonth, selectedDate, selectedTerminalId, selectedCompanyId, searchTerm]);

  const sortedRecords = useMemo(() => {
    const sortableItems = [...filteredRecords];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';
        switch (sortConfig.key) {
            case 'dateRegistered':
                aValue = a.dateRegistered + a.timeRegistered;
                bValue = b.dateRegistered + b.timeRegistered;
                break;
            case 'terminalName':
                aValue = (a.terminalName + (a.zoneName || '')).toLowerCase();
                bValue = (b.terminalName + (b.zoneName || '')).toLowerCase();
                break;
            case 'companyName':
                aValue = a.companyName.toLowerCase();
                bValue = b.companyName.toLowerCase();
                break;
            case 'plannedCount':
                aValue = a.plannedCount || 0;
                bValue = b.plannedCount || 0;
                break;
            case 'promoterCount':
                aValue = a.promoterCount;
                bValue = b.promoterCount;
                break;
            case 'status': {
                 const aMet = a.promoterCount >= (a.plannedCount || 0);
                 const bMet = b.promoterCount >= (b.plannedCount || 0);
                 aValue = aMet ? 1 : 0;
                 bValue = bMet ? 1 : 0;
                break;
            }
            default:
                return 0;
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredRecords, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
      if (sortConfig?.key === key) {
          return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-blue-600" /> : <ArrowDown size={14} className="ml-1 text-blue-600" />;
      }
      return <ArrowUpDown size={14} className="ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
  };

  const resetFilters = () => {
      setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      setSelectedDate('');
      setSelectedTerminalId('all');
      setSelectedCompanyId('all');
      setSearchTerm('');
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (date) setSelectedMonth(date.substring(0, 7));
  };

  const toggleExpand = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  const handleEditStart = (e: React.MouseEvent, record: AttendanceRecord) => {
    e.stopPropagation(); 
    setEditingId(record.id);
    setEditValues({ planned: record.plannedCount || 0, actual: record.promoterCount });
  };

  const handleEditCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditValues(null);
  };

  const handleSave = (e: React.MouseEvent, record: AttendanceRecord) => {
    e.stopPropagation();
    if (!editValues) return;
    const updated: AttendanceRecord = { ...record, plannedCount: editValues.planned, promoterCount: editValues.actual };
    updateAttendanceRecord(updated, user.name);
    setEditingId(null);
    setEditValues(null);
    refreshRecords();
  };

  const handleDeleteTrigger = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteAttendanceRecord(deleteConfirmId);
      refreshRecords();
      setDeleteConfirmId(null);
    }
  };

  const handleExportCSV = () => {
    if (sortedRecords.length === 0) return alert("No hay registros filtrados para exportar.");
    const dataToExport = sortedRecords.map(r => ({
        "ID Registro": r.id, "Fecha": r.dateRegistered, "Hora": r.timeRegistered, "Terminal": r.terminalName,
        "Zona": r.zoneName || 'N/A', "Horario": r.scheduleTime, "Empresa": r.companyName, "Meta": r.plannedCount || 0,
        "Real": r.promoterCount, "Estado": r.promoterCount >= (r.plannedCount || 0) ? "CUMPLIDO" : "BAJO META",
        "Usuario": r.userId, "Firma": r.supervisorSignature ? "SI" : "NO", "Creado": new Date(r.createdAt).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bitácora");
    XLSX.writeFile(wb, `Bitacora_Asistencias_${selectedDate || selectedMonth}.csv`);
  };

  const ExpandedContent = ({ record }: { record: AttendanceRecord }) => {
    const isGoalMet = record.promoterCount >= (record.plannedCount || 0);
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-300 mt-2">
            <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-4 p-6 bg-gray-50/50 dark:bg-gray-800/50 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <UserCheck size={14} className="text-blue-600"/> Firma de Validación
                    </h4>
                    <div className="bg-white dark:bg-gray-100 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[140px] shadow-inner mb-6">
                        {record.supervisorSignature ? (
                            <img src={record.supervisorSignature} alt="Firma" className="max-h-28 w-full object-contain" />
                        ) : (
                            <div className="text-center">
                                <AlertTriangle className="text-amber-400 mx-auto mb-2" size={24}/>
                                <span className="text-xs text-gray-400 italic">Firma no disponible</span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cumplimiento</span>
                            <span className={`text-xl font-black ${isGoalMet ? 'text-green-600' : 'text-red-500'}`}>
                                {record.plannedCount ? Math.round((record.promoterCount / record.plannedCount) * 100) : 100}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden shadow-inner">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${isGoalMet ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(100, record.plannedCount ? (record.promoterCount / record.plannedCount) * 100 : 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-8 flex flex-col">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Hash size={14} className="text-amber-600"/> Auditoría
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">ID Registro</span>
                                <span className="font-mono text-[10px] text-gray-700 dark:text-gray-300 truncate block">{record.id}</span>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">Registrado por</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-bold uppercase">{record.userId.charAt(0)}</div>
                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{record.userId}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">Fecha de Creación</span>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300"><Clock size={12} className="text-gray-400"/>{new Date(record.createdAt).toLocaleString()}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">Fuente</span>
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={10}/> JZL OS Cloud v1.2</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-gray-50/20 dark:bg-gray-800/10 flex-1">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <History size={14} className="text-purple-600"/> Historial de Modificaciones
                        </h4>
                        {!record.history || record.history.length === 0 ? (
                            <div className="p-6 text-center bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl"><p className="text-xs text-gray-400 italic">No hay modificaciones registradas.</p></div>
                        ) : (
                            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-x-auto shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-800 text-[9px] font-black text-gray-500 uppercase tracking-widest border-b dark:border-gray-700">
                                        <tr>
                                            <th className="p-3">Fecha</th>
                                            <th className="p-3">Editor</th>
                                            <th className="p-3">Campo</th>
                                            <th className="p-3 text-center">Previo</th>
                                            <th className="p-3 text-center">Nuevo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {record.history.map((h, i) => (
                                            <tr key={i} className="text-[10px]">
                                                <td className="p-3 font-medium dark:text-gray-400 whitespace-nowrap">{new Date(h.date).toLocaleDateString()}</td>
                                                <td className="p-3 font-bold text-gray-700 dark:text-gray-300">{h.editorName}</td>
                                                <td className="p-3"><span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${h.field === 'Meta' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{h.field}</span></td>
                                                <td className="p-3 text-center text-gray-400 line-through">{h.oldValue}</td>
                                                <td className="p-3 text-center font-black text-gray-900 dark:text-white">{h.newValue}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const isFiltered = selectedDate !== '' || selectedTerminalId !== 'all' || selectedCompanyId !== 'all' || searchTerm !== '';

  return (
    <div className="max-w-full mx-auto pb-20 p-2 md:p-0">
      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-sm:max-w-[320px] overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 flex flex-col items-center text-center bg-red-50 dark:bg-red-900/20">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-red-100 dark:bg-red-800/40 text-red-600 dark:text-red-400">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black mb-2 text-red-900 dark:text-red-100 uppercase tracking-tighter">¿Eliminar Registro?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-[11px] font-medium leading-relaxed">
                Esta acción es irreversible. El registro será eliminado permanentemente de la bitácora Cloud de JZL OS.
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 flex gap-2">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl text-amber-700 dark:text-amber-400 shadow-sm">
            <Database size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Bitácora Cloud</h2>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.4em]">Auditoría de Registros</p>
          </div>
        </div>
        <button 
            onClick={handleExportCSV}
            disabled={sortedRecords.length === 0}
            className="w-full md:w-auto bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3.5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg font-black text-[10px] uppercase tracking-widest"
        >
            <Download size={18} />
            CSV
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 mb-8 mx-4 md:mx-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-end">
            <div className="lg:col-span-2">
                <label className="block text-[9px] font-black text-gray-400 mb-2 uppercase tracking-widest ml-1">Periodo</label>
                <input type="month" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDate(''); }} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/30 rounded-2xl text-xs font-black dark:text-white outline-none transition-all" />
            </div>
            <div className="lg:col-span-2">
                <label className="block text-[9px] font-black text-gray-400 mb-2 uppercase tracking-widest ml-1">Fecha</label>
                <input type="date" value={selectedDate} onChange={handleDateChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/30 rounded-2xl text-xs font-black dark:text-white outline-none transition-all" />
            </div>
            <div className="lg:col-span-2">
                <label className="block text-[9px] font-black text-gray-400 mb-2 uppercase tracking-widest ml-1">Terminal</label>
                <select value={selectedTerminalId} onChange={(e) => setSelectedTerminalId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/30 rounded-2xl text-xs font-black dark:text-white outline-none appearance-none cursor-pointer">
                    <option value="all">Todas</option>
                    {TERMINALS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div className="lg:col-span-2">
                <label className="block text-[9px] font-black text-gray-400 mb-2 uppercase tracking-widest ml-1">Empresa</label>
                <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/30 rounded-2xl text-xs font-black dark:text-white outline-none appearance-none cursor-pointer">
                    <option value="all">Todas</option>
                    {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div className="lg:col-span-3">
                <label className="block text-[9px] font-black text-gray-400 mb-2 uppercase tracking-widest ml-1">Buscar</label>
                <input type="text" placeholder="..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/30 rounded-2xl text-xs font-black dark:text-white outline-none" />
            </div>
            <div className="lg:col-span-1">
                <button onClick={resetFilters} disabled={!isFiltered} className={`w-full h-[46px] rounded-2xl flex items-center justify-center transition-all ${isFiltered ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}><RefreshCw size={16} /></button>
            </div>
        </div>
      </div>

      {/* MOBILE LIST VIEW */}
      <div className="md:hidden space-y-4 px-4">
        {sortedRecords.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-[2rem] border border-dashed border-gray-200">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Sin resultados</p>
          </div>
        ) : (
          sortedRecords.map(record => {
            const isEditing = editingId === record.id;
            const isExpanded = expandedId === record.id;
            const isGoalMet = record.promoterCount >= (record.plannedCount || 0);
            
            return (
              <div key={record.id} className={`bg-white dark:bg-gray-900 rounded-[2rem] border-2 transition-all ${isExpanded ? 'border-blue-500 shadow-xl' : 'border-gray-50 dark:border-gray-800 shadow-sm'}`}>
                <div className="p-6" onClick={() => toggleExpand(record.id)}>
                   <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{record.dateRegistered} • {record.timeRegistered.substring(0, 5)}</div>
                        <div className="font-black text-gray-900 dark:text-white text-base leading-tight uppercase tracking-tighter">{record.terminalName}</div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${isGoalMet ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400'}`}>
                         {isGoalMet ? 'OK' : 'Bajo Meta'}
                      </div>
                   </div>
                   
                   <div className="flex flex-wrap items-center gap-2 mb-6">
                      <span className="px-3 py-1 bg-blue-900 text-white rounded-xl text-[9px] font-black uppercase">{record.companyName}</span>
                      <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-[9px] font-black border border-amber-100 dark:border-amber-800/50 uppercase">{record.scheduleTime}</span>
                   </div>

                   <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border dark:border-gray-800">
                        <div className="text-center border-r dark:border-gray-700">
                            <span className="block text-[8px] font-black text-gray-400 uppercase mb-1">Plan</span>
                            {isEditing ? (
                                <input type="number" value={editValues?.planned} onClick={e => e.stopPropagation()} onChange={e => setEditValues(p => p ? ({...p, planned: parseInt(e.target.value) || 0}) : null)} className="w-full p-1.5 rounded-lg text-center font-black bg-white dark:bg-gray-900 dark:text-white outline-none border-2 border-amber-200" />
                            ) : (
                                <span className="text-base font-black text-gray-400">{record.plannedCount || 0}</span>
                            )}
                        </div>
                        <div className="text-center">
                            <span className="block text-[8px] font-black text-gray-400 uppercase mb-1">Real</span>
                            {isEditing ? (
                                <input type="number" value={editValues?.actual} onClick={e => e.stopPropagation()} onChange={e => setEditValues(p => p ? ({...p, actual: parseInt(e.target.value) || 0}) : null)} className="w-full p-1.5 rounded-lg text-center font-black bg-white dark:bg-gray-900 dark:text-white outline-none border-2 border-blue-500" />
                            ) : (
                                <span className={`text-base font-black ${isGoalMet ? 'text-green-600' : 'text-red-500'}`}>{record.promoterCount}</span>
                            )}
                        </div>
                   </div>

                   <div className="mt-6 flex justify-between items-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleExpand(record.id)} className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2">
                            {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                            {isExpanded ? 'Ocultar' : 'Detalles'}
                        </button>
                        <div className="flex gap-2">
                             {isEditing ? (
                                <>
                                    <button onClick={e => handleSave(e, record)} className="p-3 bg-green-600 text-white rounded-xl"><Save size={18}/></button>
                                    <button onClick={handleEditCancel} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-xl"><X size={18}/></button>
                                </>
                             ) : (
                                <>
                                    <button onClick={e => handleEditStart(e, record)} className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl"><Edit2 size={18}/></button>
                                    <button onClick={e => handleDeleteTrigger(e, record.id)} className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-xl"><Trash2 size={18}/></button>
                                </>
                             )}
                        </div>
                   </div>
                </div>
                {isExpanded && <div className="p-6 pt-0 border-t dark:border-gray-800"><ExpandedContent record={record} /></div>}
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 font-black text-[10px] uppercase border-b dark:border-gray-800 tracking-widest">
              <tr>
                <th className="p-5 w-12"></th>
                <th className="p-5 cursor-pointer" onClick={() => requestSort('dateRegistered')}>Registro {getSortIcon('dateRegistered')}</th>
                <th className="p-5 cursor-pointer" onClick={() => requestSort('terminalName')}>Ubicación {getSortIcon('terminalName')}</th>
                <th className="p-5 cursor-pointer" onClick={() => requestSort('companyName')}>Empresa {getSortIcon('companyName')}</th>
                <th className="p-5 text-center cursor-pointer" onClick={() => requestSort('plannedCount')}>Meta {getSortIcon('plannedCount')}</th>
                <th className="p-5 text-center cursor-pointer" onClick={() => requestSort('promoterCount')}>Real {getSortIcon('promoterCount')}</th>
                <th className="p-5 text-center">Estado</th>
                <th className="p-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sortedRecords.map(record => {
                  const isEditing = editingId === record.id;
                  const isExpanded = expandedId === record.id;
                  const isGoalMet = record.promoterCount >= (record.plannedCount || 0);
                  return (
                    <React.Fragment key={record.id}>
                        <tr onClick={() => toggleExpand(record.id)} className={`transition-all cursor-pointer ${isExpanded ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                            <td className="p-5 text-center">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                            <td className="p-5">
                                <div className="font-black text-gray-900 dark:text-white uppercase">{record.dateRegistered}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{record.timeRegistered}</div>
                            </td>
                            <td className="p-5">
                                <div className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-tighter">{record.terminalName}</div>
                                <div className="mt-1 flex gap-1.5">
                                    {record.zoneName && <span className="text-[9px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-bold uppercase">{record.zoneName}</span>}
                                    <span className="text-[9px] bg-amber-50 dark:bg-amber-900/30 text-amber-600 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">{record.scheduleTime}</span>
                                </div>
                            </td>
                            <td className="p-5">
                                <span className="font-black text-blue-900 dark:text-blue-400 text-sm uppercase px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-xl">{record.companyName}</span>
                            </td>
                            <td className="p-5 text-center">
                                {isEditing ? <input type="number" value={editValues?.planned} onClick={e => e.stopPropagation()} onChange={e => setEditValues(p => p ? ({...p, planned: parseInt(e.target.value) || 0}) : null)} className="w-16 p-1 border-2 border-amber-300 rounded-lg text-center font-black dark:bg-gray-800 dark:text-white" /> : <span className="text-gray-400 font-bold">{record.plannedCount || 0}</span>}
                            </td>
                            <td className="p-5 text-center">
                                {isEditing ? <input type="number" value={editValues?.actual} onClick={e => e.stopPropagation()} onChange={e => setEditValues(p => p ? ({...p, actual: parseInt(e.target.value) || 0}) : null)} className="w-16 p-1 border-2 border-blue-400 rounded-lg text-center font-black dark:bg-gray-800 dark:text-white text-blue-600" /> : <span className={`font-black text-lg ${isGoalMet ? 'text-green-600' : 'text-red-500'}`}>{record.promoterCount}</span>}
                            </td>
                            <td className="p-5 text-center">
                                <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase ${isGoalMet ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>{isGoalMet ? 'CUMPLE' : 'BAJO'}</div>
                            </td>
                            <td className="p-5 text-right" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-end gap-2">
                                    {isEditing ? (
                                        <>
                                            <button onClick={e => handleSave(e, record)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><Save size={18} /></button>
                                            <button onClick={handleEditCancel} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg"><X size={18} /></button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={e => handleEditStart(e, record)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={18} /></button>
                                            <button onClick={e => handleDeleteTrigger(e, record.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                        {isExpanded && <tr><td colSpan={8} className="p-8 bg-gray-50/50 dark:bg-gray-800/10"><ExpandedContent record={record} /></td></tr>}
                    </React.Fragment>
                  );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecordsManagement;
