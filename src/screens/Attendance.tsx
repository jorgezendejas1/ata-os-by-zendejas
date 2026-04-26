
import React, { useState, useMemo, useEffect } from 'react';
import { User, Terminal, AttendanceRecord, StaffingEntry, PositionTarget } from '../types';
import { ZONES, SCHEDULES } from '../constants';
import { saveRecords, getPlannedCount, getRecords, getStaffing, getTargets, updateAttendanceRecord, showToast } from '../services/db';
import { useTerminals } from '../hooks/useTerminals';
import { useCompanies } from '../hooks/useCompanies';
import { getMonthWeeks } from '../lib/dateUtils';
import AttendanceGrid, { DailyTerminalGrid, getOperativeWeekForDate } from './AttendanceGrid';
import { MapPin, Clock, Calendar, ListChecks, TrendingUp, CalendarDays, FileSpreadsheet } from 'lucide-react';

// --- PANTALLA PRINCIPAL DE ASISTENCIAS ---

interface AttendanceProps {
  user: User;
  onSuccess: () => void;
}

const Attendance: React.FC<AttendanceProps> = ({ user, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'REGISTRO' | 'VISTA_DIA' | 'VISTA_SEMANA' | 'VISTA_MES'>('REGISTRO');
  const { terminals: TERMINALS } = useTerminals();

  // Estados para Visualización por Terminal
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [staffing, setStaffing] = useState<StaffingEntry[]>([]);
  const [targets, setTargets] = useState<PositionTarget[]>([]);
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewTerminalId, setViewTerminalId] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const { companies: dynamicCompanies } = useCompanies();
  const companyColors = useMemo(() => {
    const map: Record<string, string> = {};
    dynamicCompanies.forEach(c => { map[c.id] = c.color; });
    return map;
  }, [dynamicCompanies]);

  const visibleTerminals = useMemo(() => {
    // Only show active terminals for non-MASTER roles, or if restricted by assignedTerminals
    const baseTerminals = TERMINALS.filter(t => t.isActive);

    const canHaveRestrictions = user.role === 'REPORTES' || user.role === 'GENERICO';
    if (canHaveRestrictions && user.assignedTerminals && user.assignedTerminals.length > 0) {
      return baseTerminals.filter(t => user.assignedTerminals!.includes(t.id));
    }
    return baseTerminals;
  }, [user, TERMINALS]);

  const terminalsToRender = useMemo(() => {
    if (viewTerminalId === 'all') return visibleTerminals;
    const t = visibleTerminals.find(t => t.id === viewTerminalId);
    return t ? [t] : [];
  }, [viewTerminalId, visibleTerminals]);

  useEffect(() => {
    const loadBaseData = async () => {
      const [recs, trgts] = await Promise.all([
        getRecords(),
        getTargets()
      ]);
      setRecords(recs);
      setTargets(trgts);
    };
    loadBaseData();
  }, [viewDate, refreshKey]);

  // Recarga al montar el componente (regresar al módulo con misma fecha)
  useEffect(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (activeTab === 'REGISTRO') return;
    const loadStaffing = async () => {
      const d = new Date(viewDate + 'T12:00:00');
      const stff = await getStaffing(viewTerminalId, d.getFullYear(), d.getMonth());
      setStaffing(stff);
    };
    loadStaffing();
  }, [activeTab, viewDate, viewTerminalId]);

  // Handler para registros nuevos creados desde el formulario de AttendanceGrid
  const handleNewRecords = async (newRecords: AttendanceRecord[]) => {
    await saveRecords(newRecords);
    setRecords(prev => [...newRecords, ...prev]);
  };

  const handleCellSave = async (date: string, terminalId: string, scheduleId: string, companyId: string, zoneId: string | undefined, newValue: number) => {
      // Find existing record taking zoneId into account
      const existing = records.find(r => 
        r.dateRegistered === date && 
        r.terminalId === terminalId && 
        r.scheduleId === scheduleId && 
        r.companyId === companyId &&
        (zoneId ? r.zoneId === zoneId : true)
      );
      
      try {
          if (existing) {
              const updated = { ...existing, promoterCount: newValue };
              await updateAttendanceRecord(updated, user.name);
              setRecords(prev => prev.map(r => r.id === existing.id ? updated : r));
          } else {
              const company = dynamicCompanies.find(c => c.id === companyId);
              if (!company) throw new Error(`Empresa ${companyId} no encontrada`);
              const terminal = TERMINALS.find(t => t.id === terminalId)!;
              const schedule = SCHEDULES.find(s => s.id === scheduleId)!;
              const zone = zoneId ? ZONES.find(z => z.id === zoneId) : undefined;
              
              const newRecord: AttendanceRecord = {
                  id: crypto.randomUUID(),
                  userId: user.id,
                  companyId: company.id,
                  companyName: company.name,
                  terminalId: terminal.id,
                  terminalName: terminal.name,
                  zoneId: zoneId,
                  zoneName: zone?.name,
                  scheduleId: schedule.id,
                  scheduleTime: schedule.time,
                  promoterCount: newValue,
                  plannedCount: (await getPlannedCount(date, terminal.id, zoneId, company.id)) || 0,
                  supervisorSignature: 'N/A (Auditoría Admin)',
                  dateRegistered: date,
                  timeRegistered: new Date().toLocaleTimeString('en-GB'),
                  createdAt: new Date().toISOString()
              };
              
              await saveRecords([newRecord]);
              setRecords(prev => [newRecord, ...prev]);
          }
      } catch (err) {
          showToast("Error al guardar versión final", "error");
      }
  };

  return (
    <div className="max-w-full mx-auto pb-32 px-4 md:px-0">
      {/* HEADER Y PESTAÑAS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
         <div className="space-y-1">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Asistencias</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">JZL Operating System</p>
         </div>
         
         <div className="flex bg-white dark:bg-gray-900 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 w-full md:w-auto overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('REGISTRO')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'REGISTRO' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>
                <ListChecks size={18}/>
                Captura
            </button>
            <button onClick={() => setActiveTab('VISTA_DIA')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'VISTA_DIA' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>
                <Calendar size={18}/>
                Día
            </button>
            <button onClick={() => setActiveTab('VISTA_SEMANA')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'VISTA_SEMANA' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>
                <TrendingUp size={18}/>
                Semana
            </button>
            <button onClick={() => setActiveTab('VISTA_MES')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'VISTA_MES' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>
                <CalendarDays size={18}/>
                Mes
            </button>
         </div>
      </div>

      {/* FILTROS GLOBAL PARA VISTAS DE TABLA */}
      {activeTab !== 'REGISTRO' && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in slide-in-from-top-2">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MapPin size={12} className="text-blue-500"/> Terminal</label>
                <select 
                    value={viewTerminalId} 
                    onChange={e => setViewTerminalId(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/30 rounded-2xl text-xs font-black uppercase dark:text-white outline-none"
                >
                    <option value="all">Todas las Terminales</option>
                    {visibleTerminals.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Calendar size={12} className="text-blue-500"/> {activeTab === 'VISTA_MES' ? 'Mes de' : 'Fecha de Referencia'}</label>
                <input 
                    type={activeTab === 'VISTA_MES' ? 'month' : 'date'}
                    value={activeTab === 'VISTA_MES' ? viewDate.substring(0, 7) : viewDate}
                    onChange={e => setViewDate(activeTab === 'VISTA_MES' ? `${e.target.value}-01` : e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/30 rounded-2xl text-xs font-black dark:text-white outline-none"
                />
            </div>
            <div className="flex items-end gap-3">
                <button onClick={() => setViewDate(new Date().toISOString().split('T')[0])} className="flex-1 px-5 py-4 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
                    <Clock size={16} /> Hoy
                </button>
                <div className="hidden lg:flex flex-col items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800 text-[8px] font-black text-blue-600 uppercase">
                    <FileSpreadsheet size={16} className="mb-0.5"/> 
                    Soporte Excel
                </div>
            </div>
        </div>
      )}

      {/* CONTENIDO SEGÚN PESTAÑA */}
      {activeTab === 'REGISTRO' && (
        <AttendanceGrid
          terminals={visibleTerminals}
          user={user}
          onSubmitRecords={handleNewRecords}
        />
      )}

      {activeTab === 'VISTA_DIA' && (
         <div className="space-y-12">
            {terminalsToRender.map(t => (
               <div key={t.id} className="mb-8">
                   <DailyTerminalGrid 
                      terminal={t}
                      date={viewDate}
                      records={records}
                      staffing={staffing}
                      targets={targets}
                      onUpdate={(d, s, c, z, v) => handleCellSave(d, t.id, s, c, z, v)}
                      companyColors={companyColors}
                   />
               </div>
            ))}
         </div>
      )}

      {activeTab === 'VISTA_SEMANA' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {(() => {
                const currentWeek = getOperativeWeekForDate(viewDate);
                return (
                    <div className="space-y-12">
                        <div className="flex flex-col items-center gap-2 mb-4">
                           <span className="bg-blue-900 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-xl">
                             Semana Operativa: {new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(currentWeek.start)} - {new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(currentWeek.end)}
                           </span>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">(Protocolo Jueves a Miércoles • Pegado Directo habilitado)</p>
                        </div>
                        {currentWeek.days.map(day => {
                            const dStr = day.toISOString().split('T')[0];
                            return (
                                <div key={dStr} className="space-y-4">
                                    <div className="flex items-center gap-4 px-6">
                                        <div className="h-[1px] flex-1 bg-gray-200 dark:bg-gray-800"></div>
                                        <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em]">
                                            {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: '2-digit', month: 'short' }).format(day)}
                                        </span>
                                        <div className="h-[1px] flex-1 bg-gray-200 dark:bg-gray-800"></div>
                                    </div>
                                    {terminalsToRender.map(t => (
                                       <div key={t.id} className="mb-6">
                                           <DailyTerminalGrid 
                                              terminal={t}
                                              date={dStr}
                                              records={records}
                                              staffing={staffing}
                                              targets={targets}
                                              onUpdate={(d, s, c, z, v) => handleCellSave(d, t.id, s, c, z, v)}
                                              companyColors={companyColors}
                                           />
                                       </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                );
            })()}
        </div>
      )}

      {activeTab === 'VISTA_MES' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
            {(() => {
                const d = new Date(viewDate + 'T12:00:00');
                const weeks = getMonthWeeks(d.getFullYear(), d.getMonth());
                return (
                    <div className="space-y-20">
                        {weeks.map((week) => (
                            <div key={week.id} className="space-y-8 border-l-4 border-blue-600/20 pl-4 md:pl-8">
                                <div className="flex items-center gap-4 mb-10">
                                   <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg">
                                      {week.id + 1}
                                   </div>
                                   <div>
                                      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Bloque {week.label}</h3>
                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        Del {new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long' }).format(week.start)} al {new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long' }).format(week.end)}
                                      </p>
                                   </div>
                                </div>
                                
                                <div className="space-y-12">
                                    {week.days.map(day => {
                                        const dStr = day.toISOString().split('T')[0];
                                        return (
                                            <div key={dStr} className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        {new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: '2-digit', month: 'short' }).format(day)}
                                                    </span>
                                                </div>
                                                {terminalsToRender.map(t => (
                                                   <div key={t.id} className="mb-6">
                                                       <DailyTerminalGrid 
                                                          terminal={t}
                                                          date={dStr}
                                                          records={records}
                                                          staffing={staffing}
                                                          targets={targets}
                                                          onUpdate={(d, s, c, z, v) => handleCellSave(d, t.id, s, c, z, v)}
                                                          companyColors={companyColors}
                                                       />
                                                   </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })()}
        </div>
      )}
    </div>
  );
};

export default Attendance;
