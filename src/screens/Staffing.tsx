
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TERMINALS as TERMINALS_FALLBACK, COMPANIES, ZONES } from '../constants';
import { useTerminals } from '../hooks/useTerminals';
import { getStaffing, saveStaffingBatch, showToast } from '../services/db';
import { StaffingEntry } from '../types';
import { Save, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ClipboardPaste, Loader2, Info, LayoutGrid, Table2, Calendar, UserCheck, Target, X, Plus, Minus, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Función de formateo de fecha segura (Evita desfases horaria)
const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const COMPANY_COLORS: Record<string, string> = {
  'c1': 'bg-[#92d050]', // Sunset
  'c4': 'bg-[#bdd7ee]', // CID
  'c3': 'bg-[#f8cbad]', // Villa del Palmar
  'c5': 'bg-[#ffff00]', // Krystal
  'c2': 'bg-[#948a54]', // XCA
  'c6': 'bg-[#afafaf]', // K Grand
};

const getMonthWeeks = (year: number, monthIndex: number) => {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const dayOfWeek = firstDayOfMonth.getDay(); 
  const daysToSubtract = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;
  const startOfSem1 = new Date(year, monthIndex, 1 - daysToSubtract);
  const weeks = [];
  for (let i = 0; i < 6; i++) {
    const start = new Date(startOfSem1);
    start.setDate(startOfSem1.getDate() + (i * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    if (end.getMonth() !== monthIndex) break;
    weeks.push({ id: i, label: `Semana ${i + 1}`, start, end, days: Array.from({ length: 7 }, (_, d) => {
        const dayDate = new Date(start);
        dayDate.setDate(start.getDate() + d);
        return dayDate;
      })
    });
  }
  return weeks;
};

const getDaysInMonth = (year: number, monthIndex: number) => {
  const date = new Date(year, monthIndex, 1);
  const days = [];
  while (date.getMonth() === monthIndex) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const Staffing: React.FC = () => {
  const now = new Date();
  const { terminals } = useTerminals();
  const activeTerminals = useMemo(() => terminals.filter(t => t.isActive), [terminals]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>(activeTerminals[0].id);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  
  const [staffingData, setStaffingData] = useState<StaffingEntry[]>([]);
  const [localChanges, setLocalChanges] = useState<Record<string, number>>({});
  const [pastedKeys, setPastedKeys] = useState<Set<string>>(new Set());
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'TABLE' | 'CALENDAR'>('TABLE');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [expandedDayMobile, setExpandedDayMobile] = useState<string | null>(null);

  const refreshData = async (tId = selectedTerminalId, yr = currentYear, mo = currentMonth) => {
    setIsLoading(true);
    try {
      const data = await getStaffing(tId, yr, mo);
      setStaffingData(data);
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Autocarga al navegar entre terminales o fechas
  useEffect(() => {
    refreshData(selectedTerminalId, currentYear, currentMonth);
  }, [selectedTerminalId, currentYear, currentMonth]);

  useEffect(() => {
    if (pastedKeys.size > 0) {
      const timer = setTimeout(() => setPastedKeys(new Set()), 2000);
      return () => clearTimeout(timer);
    }
  }, [pastedKeys]);

  const selectedTerminal = useMemo(() => terminals.find(t => t.id === selectedTerminalId), [terminals, selectedTerminalId]);
  const tableDays = useMemo(() => getDaysInMonth(currentYear, currentMonth), [currentYear, currentMonth]);
  const calendarWeeks = useMemo(() => getMonthWeeks(currentYear, currentMonth), [currentYear, currentMonth]);

  const columns: { id: string, zoneId: string, companyId: string, companyName: string, zoneName: string }[] = useMemo(() => {
    if (!selectedTerminal) return [];
    const relevantCompanies = selectedTerminal.allowedCompanies 
      ? selectedTerminal.allowedCompanies.map(id => COMPANIES.find(c => c.id === id)!).filter(Boolean)
      : COMPANIES;

    if (selectedTerminal.hasZones) {
      const terminalZones = ZONES.filter(z => z.terminalId === selectedTerminal.id);
      const cols: { id: string, zoneId: string, companyId: string, companyName: string, zoneName: string }[] = [];
      relevantCompanies.forEach(c => {
        terminalZones.forEach(z => {
          cols.push({ id: `${c.id}_${z.id}`, zoneId: z.id, companyId: c.id, companyName: c.name, zoneName: z.name });
        });
      });
      return cols;
    }
    return relevantCompanies.map(c => ({ id: `default_${c.id}`, zoneId: 'default', companyId: c.id, companyName: c.name, zoneName: '' }));
  }, [selectedTerminal]);

  const getValue = (dateObj: Date, zoneId: string, companyId: string): number => {
    const dateStr = formatDateLocal(dateObj);
    const key = `${dateStr}_${selectedTerminalId}_${zoneId}_${companyId}`;
    if (key in localChanges) return localChanges[key] || 0;
    const saved = staffingData.find(s => s.date === dateStr && s.terminalId === selectedTerminalId && s.zoneId === zoneId && s.companyId === companyId);
    return saved ? saved.count : 0;
  };

  const handlePaste = (e: React.ClipboardEvent, startDayIndex: number, startColIndex: number) => {
    e.preventDefault();
    const clipboardText = e.clipboardData.getData('text');
    if (!clipboardText) return;

    const rows = clipboardText.split(/\r\n|\n|\r/).filter(r => r.trim() !== '');
    const newChanges: Record<string, number> = { ...localChanges };
    const newPastedKeys = new Set<string>();
    let changesCount = 0;

    rows.forEach((rowStr, rOffset) => {
        const targetDayIdx = startDayIndex + rOffset;
        if (targetDayIdx >= tableDays.length) return;

        const cells = rowStr.split('\t');
        cells.forEach((cellVal, cOffset) => {
            const targetColIdx = startColIndex + cOffset;
            if (targetColIdx >= columns.length) return;

            const cleanVal = cellVal.trim().replace(/[^0-9]/g, '');
            if (cleanVal === '') return; 
            
            const numVal = parseInt(cleanVal, 10);
            if (!isNaN(numVal)) {
                const dateObj = tableDays[targetDayIdx];
                const dateStr = formatDateLocal(dateObj);
                const col = columns[targetColIdx];
                const key = `${dateStr}_${selectedTerminalId}_${col.zoneId}_${col.companyId}`;
                newChanges[key] = numVal;
                newPastedKeys.add(key);
                changesCount++;
            }
        });
    });

    if (changesCount > 0) {
        setLocalChanges(newChanges);
        setPastedKeys(newPastedKeys);
        showToast(`${changesCount} celdas pegadas`, 'success');
    }
  };

  const saveChanges = async () => {
    if (Object.keys(localChanges).length === 0) return;
    
    setIsSaving(true);
    const entriesToSave: StaffingEntry[] = Object.entries(localChanges)
      .map(([key, val]): StaffingEntry => {
        const parts = key.split('_'); 
        return { 
          date: parts[0], 
          terminalId: parts[1], 
          zoneId: parts[2], 
          companyId: parts[3], 
          count: val as number // Aseguramos el tipado numérico
        };
      });

    try {
        await saveStaffingBatch(entriesToSave);
        setLocalChanges({});
        setPastedKeys(new Set());
        setExpandedDayMobile(null);
        // Refrescamos datos del periodo actual
        await refreshData(selectedTerminalId, currentYear, currentMonth);
    } catch (err) {
        console.error("Save error:", err);
    } finally {
        setIsSaving(false);
    }
  };

  const getTerminalHeader = () => {
      if (!selectedTerminal) return 'DIA';
      if (selectedTerminal.id === 't1') return 'T2 NAL';
      return selectedTerminal.id.toUpperCase();
  };

  const renderCalendarView = () => {
    const calendarDays: (Date | null)[] = [];
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const offset = firstDay.getDay();
    for (let i = 0; i < offset; i++) calendarDays.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) calendarDays.push(new Date(currentYear, currentMonth, i));

    return (
        <div className="animate-in fade-in duration-500 px-4 md:px-0">
            <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-800 border dark:border-gray-800 rounded-3xl overflow-hidden shadow-xl">
                {DAYS_SHORT.map(d => (
                    <div key={d} className="bg-gray-50 dark:bg-gray-900/80 p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{d}</div>
                ))}
                {calendarDays.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} className="bg-gray-50/30 dark:bg-gray-950/20 min-h-[80px] md:min-h-[140px]"></div>;
                    const dateStr = formatDateLocal(date);
                    let totalCount = 0;
                    if (columns.length > 0) {
                        totalCount = columns.reduce((acc: number, col) => acc + getValue(date, col.zoneId, col.companyId), 0);
                    }
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isSelected = selectedCalendarDay === dateStr;
                    const hasPendingChanges = Object.keys(localChanges).some(k => k.startsWith(dateStr));
                    return (
                        <div key={dateStr} onClick={() => setSelectedCalendarDay(isSelected ? null : dateStr)} className={`bg-white dark:bg-gray-900 p-2 md:p-3 min-h-[80px] md:min-h-[140px] border-t border-l border-gray-50 dark:border-gray-800 transition-all cursor-pointer relative group ${isSelected ? 'ring-2 ring-inset ring-blue-500 z-10' : 'hover:bg-blue-50/30 dark:hover:bg-blue-900/10'}`}>
                            <div className="flex justify-between items-start mb-1 md:mb-2">
                                <span className={`text-xs md:text-sm font-black ${isToday ? 'bg-blue-600 text-white w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center' : 'text-gray-400 group-hover:text-blue-600'}`}>{date.getDate()}</span>
                                {totalCount > 0 && <span className={`text-[8px] md:text-[10px] font-black px-1.5 py-0.5 rounded-full border ${hasPendingChanges ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:border-blue-800/50'}`}>{totalCount}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  const renderTableView = () => (
    <div className="space-y-6">
        <div className="hidden md:block bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 overflow-hidden shadow-xl relative">
            <div className="overflow-x-auto no-scrollbar touch-pan-x">
                <table className="w-full text-[10px] border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
                            <th className="sticky left-0 z-20 p-5 w-28 text-center bg-gray-900 text-white font-black uppercase tracking-widest border-r border-gray-800">{getTerminalHeader()}</th>
                            {columns.map(col => (
                                <th key={col.id} className={`p-4 border-r dark:border-gray-700 min-w-[120px] text-center transition-all ${COMPANY_COLORS[col.companyId] || 'bg-gray-100'}`}>
                                    <div className="flex flex-col items-center">
                                        <span className="font-black text-[11px] uppercase tracking-tighter leading-tight">{col.companyName}</span>
                                        {col.zoneName && <span className="text-[8px] font-bold opacity-70 uppercase tracking-widest mt-1">{col.zoneName}</span>}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {tableDays.map((dateObj, dayIdx) => (
                            <tr key={dayIdx} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors">
                                <td className="sticky left-0 z-10 p-4 border-r dark:border-gray-800 font-black text-center bg-white dark:bg-gray-900 dark:text-gray-300 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                    <div className="flex flex-col">
                                        <span className="text-sm leading-none">{dateObj.getDate()}</span>
                                        <span className="text-[8px] uppercase font-bold text-gray-400">{MONTHS[dateObj.getMonth()].substring(0,3)}</span>
                                    </div>
                                </td>
                                {columns.map((col, colIdx) => {
                                    const dateStr = formatDateLocal(dateObj);
                                    const changeKey = `${dateStr}_${selectedTerminalId}_${col.zoneId}_${col.companyId}`;
                                    const val = getValue(dateObj, col.zoneId, col.companyId);
                                    const isMod = changeKey in localChanges;
                                    const isPasted = pastedKeys.has(changeKey);
                                    return (
                                        <td key={col.id} className="p-0 border-r dark:border-gray-800 relative">
                                            <input type="number" inputMode="numeric" min="0" value={val === 0 && !isMod ? '' : val} placeholder="0" onFocus={(e) => e.target.select()} onChange={(e) => { const v = e.target.value === '' ? 0 : parseInt(e.target.value); setLocalChanges(prev => ({...prev, [changeKey]: v})); }} onPaste={(e) => handlePaste(e, dayIdx, colIdx)} className={`w-full h-14 text-center outline-none bg-transparent font-black text-base transition-all duration-300 focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:z-10 relative ${isPasted ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 scale-105' : ''} ${isMod && !isPasted ? 'text-blue-600 dark:text-blue-400 bg-blue-50/30' : 'text-gray-800 dark:text-gray-200'}`} />
                                            {isPasted && <div className="absolute inset-0 border-2 border-emerald-500 pointer-events-none animate-pulse"></div>}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="md:hidden space-y-4 px-4">
            {tableDays.map((dateObj) => {
                const dateStr = formatDateLocal(dateObj);
                const isExpanded = expandedDayMobile === dateStr;
                const dailyTotal = columns.reduce((acc: number, col) => acc + getValue(dateObj, col.zoneId, col.companyId), 0);
                const hasChanges = Object.keys(localChanges).some(key => key.startsWith(dateStr));
                return (
                    <div key={dateStr} className={`bg-white dark:bg-gray-900 rounded-[2rem] border-2 transition-all duration-300 overflow-hidden ${isExpanded ? 'border-blue-500 shadow-xl' : 'border-gray-50 dark:border-gray-800 shadow-sm'}`}>
                        <div className="p-6 flex justify-between items-center" onClick={() => setExpandedDayMobile(isExpanded ? null : dateStr)}>
                            <div className="flex items-center gap-4">
                                <div className="text-center bg-gray-900 text-white rounded-2xl w-14 h-14 flex flex-col justify-center items-center">
                                    <span className="text-xl font-black leading-none">{dateObj.getDate()}</span>
                                    <span className="text-[8px] font-bold uppercase">{MONTHS[dateObj.getMonth()].substring(0,3)}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Capacidad Total</p>
                                    <p className="text-lg font-black text-blue-600 leading-none">{dailyTotal} Módulos</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {hasChanges && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>}
                                {isExpanded ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                            </div>
                        </div>
                        {isExpanded && (
                            <div className="p-6 bg-gray-50 dark:bg-gray-800/30 border-t dark:border-gray-800 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {columns.map(col => {
                                        const changeKey = `${dateStr}_${selectedTerminalId}_${col.zoneId}_${col.companyId}`;
                                        const val = getValue(dateObj, col.zoneId, col.companyId);
                                        const isMod = changeKey in localChanges;
                                        return (
                                            <div key={col.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{col.companyName}</p>
                                                    {col.zoneName && <p className="text-[8px] font-bold text-blue-500 uppercase">{col.zoneName}</p>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => { const nv = Math.max(0, val - 1); setLocalChanges(prev => ({...prev, [changeKey]: nv})); }} className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-600"><Minus size={16} /></button>
                                                    <span className={`w-8 text-center font-black text-lg ${isMod ? 'text-blue-600' : 'dark:text-white'}`}>{val}</span>
                                                    <button onClick={() => { const nv = val + 1; setLocalChanges(prev => ({...prev, [changeKey]: nv})); }} className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-600"><Plus size={16} /></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );

  if (isLoading) return <div className="flex items-center justify-center p-40"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="max-w-full mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-600"><CalendarIcon size={32} /></div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Plan de Operaciones</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Master Staffing Cloud</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            <div className="flex bg-white dark:bg-gray-900 p-1 rounded-2xl border dark:border-gray-800 shadow-sm">
                <button onClick={() => setViewMode('TABLE')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'TABLE' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}><Table2 size={16}/>Tabla</button>
                <button onClick={() => setViewMode('CALENDAR')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'CALENDAR' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}><LayoutGrid size={16}/>Mes</button>
            </div>
            <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-sm border dark:border-gray-800">
                <button onClick={() => { setCurrentMonth(prev => prev === 0 ? 11 : prev - 1); if (currentMonth === 0) setCurrentYear(y => y-1); }} className="p-2 text-gray-400"><ChevronLeft size={20}/></button>
                <span className="font-black uppercase text-[10px] tracking-[0.15em] min-w-[120px] text-center dark:text-white">{MONTHS[currentMonth]} {currentYear}</span>
                <button onClick={() => { setCurrentMonth(prev => prev === 11 ? 0 : prev + 1); if (currentMonth === 11) setCurrentYear(y => y+1); }} className="p-2 text-gray-400"><ChevronRight size={20}/></button>
            </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 p-3 md:p-4 rounded-3xl border dark:border-gray-800 mb-8 overflow-hidden mx-4 md:mx-0">
         <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {activeTerminals.map(t => (
                <button key={t.id} onClick={() => { setSelectedTerminalId(t.id); setLocalChanges({}); setPastedKeys(new Set()); }} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap transition-all border-2 ${selectedTerminalId === t.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-gray-50 dark:bg-gray-800 border-gray-50 dark:border-gray-800 text-gray-500'}`}>{t.name}</button>
            ))}
         </div>
      </div>
      {viewMode === 'TABLE' ? renderTableView() : renderCalendarView()}
      {Object.keys(localChanges).length > 0 && (
         <div className="fixed bottom-6 left-6 right-6 z-50 animate-in slide-in-from-bottom-10 flex gap-2">
            <button onClick={() => { setLocalChanges({}); setPastedKeys(new Set()); }} className="bg-gray-900 text-white px-5 py-5 rounded-[2rem] font-black shadow-lg uppercase active:scale-95"><Trash2 size={24}/></button>
            <button onClick={saveChanges} disabled={isSaving} className="flex-1 bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-2xl uppercase tracking-widest text-sm active:scale-95 disabled:opacity-50">
               {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
               Sincronizar Cambios ({Object.keys(localChanges).length})
            </button>
         </div>
      )}
    </div>
  );
};

export default Staffing;
