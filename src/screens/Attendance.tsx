
import React, { useState, useMemo, useEffect } from 'react';
import { User, Terminal, Zone, Schedule, AttendanceFormEntry, AttendanceRecord, StaffingEntry, PositionTarget } from '../types';
import { COMPANIES, TERMINALS as TERMINALS_FALLBACK, ZONES, SCHEDULES, DEFAULT_ALLOCATIONS } from '../constants';
import { saveRecords, getPlannedCount, getRecords, getStaffing, getTargets, updateAttendanceRecord, showToast } from '../services/db';
import SignaturePad from '../components/SignaturePad';
import { useTerminals } from '../hooks/useTerminals';
import { useCompanies } from '../hooks/useCompanies';
import { getMonthWeeks } from '../lib/dateUtils';
import { Check, AlertCircle, Save, CheckSquare, Square, Info, ChevronDown, ChevronUp, X, MapPin, Clock, Loader2, Target, ArrowRight, LayoutGrid, Calendar, ListChecks, Edit3, Trash2, Building2, TrendingUp, Filter, CalendarDays, ClipboardCopy, FileSpreadsheet, Wand2 } from 'lucide-react';

const HEADER_BG_METAS = '#e2efda';
const FOOTER_BG_STATS = '#fff2cc';

const FIRST_LAST_SCHEDULES: Record<string, { first: string; last: string }> = {
  't2i': { first: 'h_1000', last: 'h_2100' },
  't3':  { first: 'h_0900', last: 'h_2030' },
  't4':  { first: 'h_0900', last: 'h_2100' },
  't1':  { first: 'h_1000', last: 'h_2100' },
};

// --- HELPERS DE CALENDARIO OPERATIVO (Jueves a Miércoles) ---

const getOperativeWeekForDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const weeks = getMonthWeeks(d.getFullYear(), d.getMonth());
    const week = weeks.find(w => d >= w.start && d <= w.end);
    return week || weeks[0];
};

// --- SUB-COMPONENTE: CUADRÍCULA OPERATIVA RECONSTRUIDA ---

interface TerminalGridProps {
    terminal: Terminal;
    date: string;
    records: AttendanceRecord[];
    staffing: StaffingEntry[];
    targets: PositionTarget[];
    onUpdate: (date: string, scheduleId: string, companyId: string, zoneId: string | undefined, newValue: number) => void;
    companyColors?: Record<string, string>;
}

const DailyTerminalGrid: React.FC<TerminalGridProps> = ({ terminal, date, records, staffing, targets, onUpdate, companyColors }) => {
    const schedules = terminal.allowedSchedules ? SCHEDULES.filter(s => terminal.allowedSchedules!.includes(s.id)) : SCHEDULES;
    
    // Obtener empresas en el orden definido en constants.ts
    const effectiveCompanies = useMemo(() => {
        if (terminal.allowedCompanies) {
            return terminal.allowedCompanies
                .map(id => COMPANIES.find(c => c.id === id))
                .filter((c): c is typeof COMPANIES[0] => !!c);
        }
        return COMPANIES;
    }, [terminal]);

    const terminalZones = ZONES.filter(z => z.terminalId === terminal.id);

    // Generar columnas planas
    const columns = useMemo(() => {
        const cols: { id: string, companyId: string, companyName: string, zoneId?: string, zoneName?: string }[] = [];
        
        // Lógica T2 Nacional (Tiene Zonas): Agrupar por Empresa, luego iterar Zonas
        if (terminal.hasZones) {
            effectiveCompanies.forEach(c => {
                terminalZones.forEach(z => {
                    cols.push({
                        id: `${c.id}_${z.id}`,
                        companyId: c.id,
                        companyName: c.name,
                        zoneId: z.id,
                        zoneName: z.name
                    });
                });
            });
        } else {
            // Lógica T2 Inter, T3, T4 (Sin Zonas explícitas en columnas): Una columna por empresa
            effectiveCompanies.forEach(c => {
                cols.push({
                    id: c.id,
                    companyId: c.id,
                    companyName: c.name,
                    zoneId: undefined,
                    zoneName: undefined // Se usará "PR. en sala" visualmente
                });
            });
        }
        return cols;
    }, [terminal, effectiveCompanies, terminalZones]);

    // Data Helpers
    const getDailyGoal = (companyId: string, zoneId?: string) => {
        const zoneKey = zoneId || 'default';
        const s = staffing.find(item => item.date === date && item.terminalId === terminal.id && item.companyId === companyId && item.zoneId === zoneKey);
        if (s) return s.count;
        return DEFAULT_ALLOCATIONS[terminal.id]?.[zoneKey]?.[companyId] || 0;
    };

    const getAuthorizedPosition = (companyId: string, zoneId?: string) => {
        const zoneKey = zoneId || 'default';
        const t = targets.find(item => item.terminalId === terminal.id && item.companyId === companyId && item.zoneId === zoneKey);
        return t ? t.count : 0;
    };

    const getCellValue = (scheduleId: string, companyId: string, zoneId?: string) => {
        const r = records.find(rec => 
            rec.dateRegistered === date && 
            rec.terminalId === terminal.id && 
            rec.scheduleId === scheduleId && 
            rec.companyId === companyId &&
            (zoneId ? rec.zoneId === zoneId : true)
        );
        return r ? r.promoterCount : 0;
    };

    // Paste Logic
    const handlePaste = (e: React.ClipboardEvent, startScheduleIdx: number, startColIdx: number) => {
        e.preventDefault();
        const clipboardText = e.clipboardData.getData('text');
        if (!clipboardText) return;
        
        const rows = clipboardText.split(/\r\n|\n|\r/).filter(r => r.trim() !== '');
        
        rows.forEach((rowStr, rOffset) => {
            const scheduleIdx = startScheduleIdx + rOffset;
            if (scheduleIdx >= schedules.length) return;
            
            const cells = rowStr.split('\t');
            cells.forEach((cellVal, cOffset) => {
                const colIdx = startColIdx + cOffset;
                if (colIdx >= columns.length) return;
                
                const col = columns[colIdx];
                const num = parseInt(cellVal.trim());
                if (!isNaN(num)) {
                    onUpdate(date, schedules[scheduleIdx].id, col.companyId, col.zoneId, num);
                }
            });
        });
        showToast("Datos pegados desde Excel", "success");
    };

    // Regla Especial de Exclusión de KG (c6) para T1 y T4
    const isExcludingKG = terminal.id === 't1' || terminal.id === 't4';

    // --- REGLA DEL 50% ---
    const firstLastConfig = FIRST_LAST_SCHEDULES[terminal.id];

    const getEffectiveValue = (scheduleId: string, companyId: string, zoneId?: string) => {
        const real = getCellValue(scheduleId, companyId, zoneId);
        if (!firstLastConfig) return { real, effective: real, ruleApplied: false };
        if (scheduleId !== firstLastConfig.first && scheduleId !== firstLastConfig.last) {
            return { real, effective: real, ruleApplied: false };
        }
        const plan = getDailyGoal(companyId, zoneId);
        if (plan > 0 && real >= plan * 0.5) {
            return { real, effective: plan, ruleApplied: true, plan };
        }
        return { real, effective: real, ruleApplied: false };
    };

    // Track if any cell has rule applied for legend
    let anyRuleApplied = false;

    // --- CÁLCULOS DE PIE DE PÁGINA (COLUMNAS) ---
    const colStats = columns.map(col => {
        const sumEffective = schedules.reduce((acc, s) => {
            const { effective } = getEffectiveValue(s.id, col.companyId, col.zoneId);
            return acc + effective;
        }, 0);
        const avg = sumEffective / (schedules.length || 1);
        const dailyGoal = getDailyGoal(col.companyId, col.zoneId);
        const perc = dailyGoal > 0 ? (avg / dailyGoal) * 100 : 0;
        const absent = Math.max(0, dailyGoal - avg);
        const absentPerc = dailyGoal > 0 ? (absent / dailyGoal) * 100 : 0;
        const authorized = getAuthorizedPosition(col.companyId, col.zoneId);
        return { avg, perc, absent, absentPerc, authorized, dailyGoal };
    });

    // --- CÁLCULOS LATERALES (FILAS) ---
    const rowTotals = schedules.map(s => {
        const colsToSum = isExcludingKG 
            ? columns.filter(c => c.companyId !== 'c6') 
            : columns;
        
        const sumEffective = colsToSum.reduce((acc, c) => {
            const { effective } = getEffectiveValue(s.id, c.companyId, c.zoneId);
            return acc + effective;
        }, 0);
        
        const sumGoal = colsToSum.reduce((acc, c) => acc + getDailyGoal(c.companyId, c.zoneId), 0);
        const perc = sumGoal > 0 ? (sumEffective / sumGoal) * 100 : 0;

        return { sumReal: sumEffective, sumGoal, perc };
    });

    // Total General (Resumen Sidebar/Footer)
    const grandTotalGoal = rowTotals.reduce((acc, r) => acc + r.sumGoal, 0) / (rowTotals.length || 1);
    const grandTotalReal = rowTotals.reduce((acc, r) => acc + r.sumReal, 0) / (rowTotals.length || 1);
    const grandTotalPerc = grandTotalGoal > 0 ? (grandTotalReal / grandTotalGoal) * 100 : 0;

    return (
        <div className="animate-in fade-in zoom-in-95 duration-500 overflow-x-auto pb-6 relative">
            <div className="min-w-fit shadow-xl rounded-none md:rounded-[1rem] overflow-hidden border border-gray-300">
                
                {/* UNIFIED TABLE STRUCTURE */}
                <table className="border-collapse w-full">
                    {/* HEADER - 3 FILAS */}
                    <thead>
                        {/* Fila 1: METAS (Staffing) */}
                        <tr style={{ backgroundColor: HEADER_BG_METAS }}>
                            {/* Celda Esquina Superior - Fecha o Nombre */}
                            <th className="border border-gray-300 p-2 min-w-[100px] text-center relative bg-white" rowSpan={3}>
                                <div className="flex flex-col items-center justify-center h-full">
                                    <span className="text-lg font-black uppercase text-gray-800 leading-tight block">
                                        {terminal.name.toUpperCase()}
                                    </span>
                                    <div className="text-[10px] mt-2 font-bold bg-blue-50 px-2 py-0.5 rounded text-blue-800">
                                        {new Intl.DateTimeFormat('es-MX').format(new Date(date + 'T12:00:00'))}
                                    </div>
                                </div>
                            </th>
                            {/* Valores de Meta por Columna */}
                            {columns.map((col, idx) => (
                                <th key={`meta-${idx}`} className="border border-gray-300 p-1 text-center font-bold text-gray-800 text-sm min-w-[80px]">
                                    {getDailyGoal(col.companyId, col.zoneId).toFixed(1)}
                                </th>
                            ))}

                            {/* HEADER TOTALES UNIFICADO (Sidebar Header) */}
                            <th rowSpan={3} className="border-l-4 border-gray-300 bg-gray-50 min-w-[140px] align-middle p-2">
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase text-gray-600">
                                        {isExcludingKG ? 'Total Mod. s/KG' : 'Total Mod.'}
                                    </span>
                                    <div className={`p-1 text-[10px] font-bold rounded ${grandTotalPerc >= 85 ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                        % Objetivo: {Math.round(grandTotalPerc)}%
                                    </div>
                                    <span className="text-[9px] text-gray-500">Obj: {grandTotalGoal.toFixed(1)}</span>
                                </div>
                            </th>
                        </tr>

                        {/* Fila 2: NOMBRES DE ZONA */}
                        <tr className="bg-white">
                            {columns.map((col, idx) => (
                                <th key={`zone-${idx}`} className="border border-gray-300 p-1 text-center text-[10px] font-black uppercase text-gray-600">
                                    {col.zoneName || 'PR. en sala de:'}
                                </th>
                            ))}
                        </tr>

                        {/* Fila 3: EMPRESAS */}
                        <tr>
                            {columns.map((col, idx) => (
                                <th 
                                    key={`comp-${idx}`} 
                                    className="border border-gray-300 p-1 text-center text-[10px] font-black uppercase text-black"
                                    style={{ backgroundColor: (companyColors && companyColors[col.companyId]) || '#eee' }}
                                >
                                    {col.companyName}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* BODY - HORARIOS */}
                    <tbody>
                        {schedules.map((s, sIdx) => {
                            // Datos de totales para esta fila
                            const rowStat = rowTotals[sIdx];
                            return (
                                <tr key={s.id} className="bg-white hover:bg-gray-50 h-[45px]">
                                    {/* Columna Hora */}
                                    <td className="border border-gray-300 p-2 text-center font-black text-gray-800 text-xs bg-gray-100">
                                        {s.time}
                                    </td>
                                    {/* Celdas de Datos */}
                                    {columns.map((col, cIdx) => {
                                        const { real, effective, ruleApplied, plan } = getEffectiveValue(s.id, col.companyId, col.zoneId) as any;
                                        if (ruleApplied) anyRuleApplied = true;
                                        return (
                                            <td 
                                                key={`${s.id}-${cIdx}`} 
                                                className="border border-gray-300 p-0 text-center relative h-[45px]"
                                                style={ruleApplied ? { backgroundColor: '#7C3AED' } : undefined}
                                            >
                                                {ruleApplied ? (
                                                    <span className="text-white font-bold text-sm">{real} ★ {plan}</span>
                                                ) : (
                                                    <input 
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={real || '-'}
                                                        onPaste={(e) => handlePaste(e, sIdx, cIdx)}
                                                        onChange={(e) => {
                                                            const val = e.target.value === '-' || e.target.value === '' ? 0 : parseInt(e.target.value);
                                                            if (!isNaN(val)) onUpdate(date, s.id, col.companyId, col.zoneId, val);
                                                        }}
                                                        className="w-full h-full text-center bg-transparent outline-none font-medium text-sm focus:bg-blue-100 transition-colors"
                                                    />
                                                )}
                                            </td>
                                        );
                                    })}
                                    {/* Celda Total de la Fila (Sidebar Body Merged) */}
                                    <td className="border-l-4 border-gray-300 border-b border-gray-200 bg-gray-50 text-center h-[45px]">
                                        <div className="flex items-center justify-between px-4">
                                            <span className="font-bold text-xs text-gray-800">{rowStat.sumReal}</span>
                                            <span className={`text-[10px] font-bold ${rowStat.perc >= 85 ? 'text-green-600' : 'text-gray-400'}`}>
                                                {Math.round(rowStat.perc)}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    {/* FOOTER - ESTADISTICAS */}
                    <tfoot style={{ backgroundColor: FOOTER_BG_STATS }}>
                        {/* Fila 1: PROMEDIOS */}
                        <tr>
                            <td className="border border-gray-300 p-2 text-right font-bold text-[10px] uppercase">PROMEDIOS:</td>
                            {colStats.map((stat, i) => (
                                <td key={i} className="border border-gray-300 p-1 text-center font-bold text-sm text-gray-800">
                                    {stat.avg.toFixed(2)}
                                </td>
                            ))}
                            {/* FOOTER TOTAL SUMMARY (Sidebar Footer Merged with rowSpan) */}
                            <td rowSpan={5} className="border-l-4 border-gray-300 bg-orange-500 text-white p-4 align-top">
                                <div className="flex flex-col gap-3 h-full justify-center">
                                    <span className="text-xs font-black uppercase text-center border-b border-orange-400 pb-1">RESUMEN</span>
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-bold uppercase">Promedio</span>
                                        <span className="text-sm font-black">{grandTotalReal.toFixed(1)}</span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-bold uppercase">% Total</span>
                                        <span className={`text-sm font-black ${grandTotalPerc >= 85 ? 'text-white' : 'text-orange-100'}`}>
                                            {Math.round(grandTotalPerc)}%
                                        </span>
                                    </div>
                                </div>
                            </td>
                        </tr>

                        {/* Fila 2: % ASISTENCIA */}
                        <tr>
                            <td className="border border-gray-300 p-2 text-right font-bold text-[10px] uppercase bg-white">
                                <div className="flex justify-between"><span># Pr. en Sala en el día:</span><span>Asist. %</span></div>
                            </td>
                            {colStats.map((stat, i) => (
                                <td key={i} className={`border border-gray-300 p-1 text-center font-bold text-xs ${stat.perc > 50 ? 'text-green-600' : 'text-red-600'}`}>
                                    {Math.round(stat.perc)}%
                                </td>
                            ))}
                        </tr>

                        {/* Fila 3: CANTIDAD AUSENTES */}
                        <tr>
                            <td className="border border-gray-300 p-2 text-right font-bold text-[10px] uppercase bg-white">
                                <div className="flex justify-between"><span># Pr. Ausentes en el día:</span><span>%</span></div>
                            </td>
                            {colStats.map((stat, i) => (
                                <td key={i} className="border border-gray-300 p-1 text-center font-medium text-xs text-gray-600">
                                    {stat.absent.toFixed(2)}
                                </td>
                            ))}
                        </tr>

                        {/* Fila 4: % AUSENTISMO */}
                        <tr>
                            <td className="border border-gray-300 p-2 text-right font-bold text-[10px] uppercase bg-white">
                                % Ausentismo
                            </td>
                            {colStats.map((stat, i) => (
                                <td key={i} className={`border border-gray-300 p-1 text-center font-bold text-xs ${stat.absentPerc > 50 ? 'text-red-600' : 'text-green-600'}`}>
                                    {Math.round(stat.absentPerc)}%
                                </td>
                            ))}
                        </tr>

                        {/* Fila 5: POSICIONES AUTORIZADAS */}
                        <tr className="border-t-2 border-black">
                            <td className="border border-gray-300 p-2 text-right font-black text-[10px] uppercase bg-white">Posiciones Autorizadas:</td>
                            {colStats.map((stat, i) => (
                                <td key={i} className="border border-gray-300 p-1 text-center font-black text-sm text-blue-800 bg-white">
                                    {stat.authorized.toFixed(1)}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
            {anyRuleApplied && (
                <p className="text-xs text-purple-700 mt-2 px-2 italic">
                    ★ Regla del 50% aplicada — La asistencia en este horario alcanzó o superó el 50% de las posiciones del plan de operaciones, por lo que se reconoce el 100% de ocupación.
                </p>
            )}
        </div>
    );
};

// --- PANTALLA PRINCIPAL DE ASISTENCIAS ---

interface AttendanceProps {
  user: User;
  onSuccess: () => void;
}

const Attendance: React.FC<AttendanceProps> = ({ user, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'REGISTRO' | 'VISTA_DIA' | 'VISTA_SEMANA' | 'VISTA_MES'>('REGISTRO');
  const { terminals: TERMINALS } = useTerminals();
  
  // Estados para Flujo de Registro
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [selectedZones, setSelectedZones] = useState<Zone[]>([]); 
  const [selectedSchedules, setSelectedSchedules] = useState<Schedule[]>([]);
  const [companyEntries, setCompanyEntries] = useState<AttendanceFormEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPlanned, setIsLoadingPlanned] = useState(false);

  // Estados para Visualización por Terminal
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [staffing, setStaffing] = useState<StaffingEntry[]>([]);
  const [targets, setTargets] = useState<PositionTarget[]>([]);
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewTerminalId, setViewTerminalId] = useState(TERMINALS_FALLBACK.filter(t => t.isActive)[0].id);
  const [refreshKey, setRefreshKey] = useState(0);

  const { companies: dynamicCompanies } = useCompanies();
  const companyColors = useMemo(() => {
    const map: Record<string, string> = {};
    dynamicCompanies.forEach(c => { map[c.id] = c.color; });
    return map;
  }, [dynamicCompanies]);

  // Estados Globales UI
  const [validationModal, setValidationModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' }>({
    isOpen: false, title: '', message: '', type: 'error'
  });
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; count: number; summary: { terminal: string; schedule: string; count: number }[] }>({
    isOpen: false, count: 0, summary: []
  });

  const visibleTerminals = useMemo(() => {
    // Only show active terminals for non-MASTER roles, or if restricted by assignedTerminals
    const baseTerminals = TERMINALS.filter(t => t.isActive);
    
    const canHaveRestrictions = user.role === 'REPORTES' || user.role === 'GENERICO';
    if (canHaveRestrictions && user.assignedTerminals && user.assignedTerminals.length > 0) {
      return baseTerminals.filter(t => user.assignedTerminals!.includes(t.id));
    }
    return baseTerminals;
  }, [user]);

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

  const availableCompanies = useMemo(() => {
    if (!selectedTerminal) return [];
    return selectedTerminal.allowedCompanies ? COMPANIES.filter(c => selectedTerminal.allowedCompanies!.includes(c.id)) : COMPANIES;
  }, [selectedTerminal]);

  const availableSchedules = useMemo(() => {
    if (!selectedTerminal) return [];
    return selectedTerminal.allowedSchedules ? SCHEDULES.filter(s => selectedTerminal.allowedSchedules!.includes(s.id)) : SCHEDULES;
  }, [selectedTerminal]);

  const handleTerminalSelect = (t: Terminal) => {
    setSelectedTerminal(t);
    setSelectedZones([]); 
    setSelectedSchedules([]);
    setCompanyEntries([]);
  };

  const generateUid = (zoneId: string | undefined, scheduleId: string, companyId: string) => `${zoneId || 'nozone'}_${scheduleId}_${companyId}`;

  const loadEntriesForSelection = async (zones: Zone[], schedules: Schedule[]) => {
    if (!selectedTerminal) return;
    setIsLoadingPlanned(true);
    const dateStr = new Date().toISOString().split('T')[0];
    
    const newEntries: AttendanceFormEntry[] = [];
    const effectiveZones = selectedTerminal.hasZones ? zones : [{ id: 'default', name: 'General', terminalId: selectedTerminal.id } as Zone];

    for (const zone of effectiveZones) {
      for (const sched of schedules) {
        for (const comp of availableCompanies) {
          const planned = await getPlannedCount(dateStr, selectedTerminal.id, zone.id === 'default' ? undefined : zone.id, comp.id);
          const finalPlanned = planned !== null ? planned : (DEFAULT_ALLOCATIONS[selectedTerminal.id]?.[zone.id]?.[comp.id] || 0);
          
          newEntries.push({
            uid: generateUid(zone.id === 'default' ? undefined : zone.id, sched.id, comp.id),
            zoneId: zone.id === 'default' ? undefined : zone.id,
            scheduleId: sched.id,
            companyId: comp.id,
            promoterCount: finalPlanned,
            plannedCount: finalPlanned,
            signature: null,
            isSelected: false
          });
        }
      }
    }
    setCompanyEntries(newEntries);
    setIsLoadingPlanned(false);
  };

  const handleZoneToggle = (zone: Zone) => {
    const isAlreadySelected = selectedZones.some(z => z.id === zone.id);
    const newZones = isAlreadySelected ? selectedZones.filter(z => z.id !== zone.id) : [...selectedZones, zone];
    newZones.sort((a, b) => ZONES.findIndex(z => z.id === a.id) - ZONES.findIndex(z => z.id === b.id));
    setSelectedZones(newZones);
    loadEntriesForSelection(newZones, selectedSchedules);
  };

  const handleScheduleToggle = (schedule: Schedule) => {
    const isAlreadySelected = selectedSchedules.some(s => s.id === schedule.id);
    const newSchedules = isAlreadySelected ? selectedSchedules.filter(s => s.id !== schedule.id) : [...selectedSchedules, schedule];
    newSchedules.sort((a, b) => SCHEDULES.findIndex(s => s.id === a.id) - SCHEDULES.findIndex(s => s.id === b.id));
    setSelectedSchedules(newSchedules);
    loadEntriesForSelection(selectedZones, newSchedules);
  };

  const handleEntryToggle = (uid: string) => setCompanyEntries(prev => prev.map(entry => entry.uid === uid ? { ...entry, isSelected: !entry.isSelected } : entry));
  const updateEntryValue = (uid: string, field: keyof AttendanceFormEntry, value: any) => setCompanyEntries(prev => prev.map(entry => entry.uid === uid ? { ...entry, [field]: value } : entry));

  const handleSelectAllForBlock = (zoneId: string | undefined, scheduleId: string) => {
    const targets = companyEntries.filter(e => e.zoneId === zoneId && e.scheduleId === scheduleId);
    if (targets.length === 0) return;
    const allSelected = targets.every(e => e.isSelected);
    setCompanyEntries(prev => prev.map(entry => (entry.zoneId === zoneId && entry.scheduleId === scheduleId) ? { ...entry, isSelected: !allSelected } : entry));
  };

  const showValidationAlert = (title: string, message: string, type: 'error' | 'warning' = 'error') => setValidationModal({ isOpen: true, title, message, type });

  const handleSubmit = async () => {
    if (!selectedTerminal) return showValidationAlert("Selección Requerida", "Debes seleccionar una terminal.");
    const activeEntries = companyEntries.filter(e => e.isSelected);
    if (activeEntries.length === 0) return showValidationAlert("Sin Selección", "Selecciona al menos una empresa para registrar.");

    for (const entry of activeEntries) {
      if (!entry.signature) return showValidationAlert("Firma Requerida", "Cada registro seleccionado debe estar firmado por el supervisor.");
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const localDate = now.toISOString().split('T')[0];
      
      const recordsToSave: AttendanceRecord[] = activeEntries.map(entry => ({
        id: crypto.randomUUID(),
        userId: user.id,
        companyId: entry.companyId,
        companyName: COMPANIES.find(c => c.id === entry.companyId)!.name,
        terminalId: selectedTerminal.id,
        terminalName: selectedTerminal.name,
        zoneId: entry.zoneId,
        zoneName: entry.zoneId ? ZONES.find(z => z.id === entry.zoneId)?.name : undefined,
        scheduleId: entry.scheduleId,
        scheduleTime: SCHEDULES.find(s => s.id === entry.scheduleId)!.time,
        promoterCount: entry.promoterCount,
        plannedCount: entry.plannedCount,
        supervisorSignature: entry.signature!,
        dateRegistered: localDate,
        timeRegistered: now.toLocaleTimeString('en-GB'),
        createdAt: now.toISOString()
      }));

      await saveRecords(recordsToSave);
      
      const summaryList = Array.from(new Set(recordsToSave.map(r => `${r.terminalName}|${r.scheduleTime}`))).map(key => {
          const [terminal, schedule] = key.split('|');
          return { terminal, schedule, count: recordsToSave.filter(r => r.terminalName === terminal && r.scheduleTime === schedule).length };
      });

      setSuccessModal({ isOpen: true, count: recordsToSave.length, summary: summaryList });
    } catch (e: any) {
      showValidationAlert("Error Cloud", `No se pudo sincronizar: ${e.message || 'Error de conexión'}`);
    } finally {
      setIsSubmitting(false);
    }
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
              const company = COMPANIES.find(c => c.id === companyId)!;
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

  const handleCloseSuccess = () => {
    setSuccessModal({ isOpen: false, count: 0, summary: [] });
    setSelectedTerminal(null);
    setSelectedZones([]);
    setSelectedSchedules([]);
    setCompanyEntries([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCompanyList = (zoneId: string | undefined, scheduleId: string, title: string) => {
    const entriesInBlock = companyEntries.filter(e => e.zoneId === zoneId && e.scheduleId === scheduleId);
    if (entriesInBlock.length === 0) return null;
    return (
        <div key={`${zoneId}_${scheduleId}`} className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
            <div className="flex justify-between items-center mb-6 px-2">
                <div className="space-y-0.5">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contenedor de Captura</p>
                   <h4 className="text-sm font-black text-blue-900 dark:text-blue-400 uppercase tracking-tighter">{title}</h4>
                </div>
                <button onClick={() => handleSelectAllForBlock(zoneId, scheduleId)} className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-4 py-2 rounded-xl font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800/50">Todos</button>
            </div>
            <div className="space-y-4">
                {entriesInBlock.map(entry => (
                    <div key={entry.uid} className={`p-6 rounded-[2rem] border-2 transition-all duration-300 ${entry.isSelected ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/10' : 'border-gray-50 dark:border-gray-800'}`}>
                        <div className="flex items-center justify-between">
                            <button onClick={() => handleEntryToggle(entry.uid)} className="flex items-center gap-4 text-left group">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${entry.isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                   {entry.isSelected ? <Check size={20} strokeWidth={4} /> : null}
                                </div>
                                <span className={`text-base font-black uppercase tracking-tighter ${entry.isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{COMPANIES.find(c => c.id === entry.companyId)?.name}</span>
                            </button>
                            {entry.isSelected && (
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700">
                                <Target size={12} className="text-blue-500" />
                                <span className="text-[9px] font-black text-gray-500 uppercase">Meta: {entry.plannedCount}</span>
                              </div>
                            )}
                        </div>
                        {entry.isSelected && (
                            <div className="mt-8 space-y-6 animate-in slide-in-from-top-2">
                                <div className="space-y-2">
                                   <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Personal Real en Módulo</label>
                                   <input type="number" min="0" value={entry.promoterCount} onChange={(e) => updateEntryValue(entry.uid, 'promoterCount', parseInt(e.target.value) || 0)} className="w-full h-16 bg-white dark:bg-gray-800 border-2 border-blue-100 dark:border-gray-700 rounded-2xl font-black text-3xl text-center focus:border-blue-500 outline-none transition-all dark:text-white" />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Firma del Supervisor</label>
                                   <SignaturePad onEnd={(sig) => updateEntryValue(entry.uid, 'signature', sig)} />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
  };

  return (
    <div className="max-w-full mx-auto pb-32 px-4 md:px-0">
      {/* MODALES */}
      {validationModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-6">
               <AlertCircle size={40} />
            </div>
            <h3 className="text-2xl font-black mb-3 text-gray-900 dark:text-white uppercase tracking-tighter">{validationModal.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 font-medium leading-relaxed">{validationModal.message}</p>
            <button onClick={() => setValidationModal(prev => ({ ...prev, isOpen: false }))} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95">OK</button>
          </div>
        </div>
      )}

      {successModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 max-md:max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-3xl flex items-center justify-center text-green-600 mx-auto mb-6">
               <Check size={48} strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-green-600 mb-6 text-center uppercase tracking-tighter">¡Sincronizado!</h3>
            <div className="space-y-3 mb-8">
                {successModal.summary.map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl flex justify-between items-center border dark:border-gray-800">
                        <div className="flex flex-col">
                           <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{item.terminal}</span>
                           <span className="text-sm font-bold dark:text-gray-200">{item.schedule}</span>
                        </div>
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{item.count}</span>
                    </div>
                ))}
            </div>
            <button onClick={handleCloseSuccess} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95">Listo</button>
          </div>
        </div>
      )}

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
        <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <section className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <MapPin size={14} className="text-blue-500" /> 1. Selecciona Terminal
                </label>
                <div className="space-y-3">
                    {visibleTerminals.map(t => (
                    <button 
                        key={t.id} 
                        onClick={() => handleTerminalSelect(t)} 
                        className={`w-full text-left p-5 rounded-[1.5rem] font-black text-sm uppercase transition-all ${selectedTerminal?.id === t.id ? 'bg-blue-600 text-white shadow-xl translate-y-[-2px]' : 'bg-gray-50 dark:bg-gray-800 text-gray-500'}`}
                    >
                        <div className="flex items-center justify-between">
                        <span>{t.name}</span>
                        {selectedTerminal?.id === t.id && <ArrowRight size={18} />}
                        </div>
                    </button>
                    ))}
                </div>
                </section>

                <section className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-8">
                {selectedTerminal?.hasZones && (
                    <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <MapPin size={14} className="text-blue-500" /> 2. Zonas
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {ZONES.filter(z => z.terminalId === selectedTerminal.id).map(z => (
                        <button key={z.id} onClick={() => handleZoneToggle(z)} className={`p-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${selectedZones.some(sz => sz.id === z.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-50 dark:border-gray-800 text-gray-400'}`}>{z.name}</button>
                        ))}
                    </div>
                    </div>
                )}
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Clock size={14} className="text-blue-500" /> {selectedTerminal?.hasZones ? '3. Horarios' : '2. Horarios'}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                    {availableSchedules.map(s => (
                        <button key={s.id} onClick={() => handleScheduleToggle(s)} className={`p-3 rounded-2xl text-[10px] font-black border-2 transition-all ${selectedSchedules.some(ss => ss.id === s.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-50 dark:border-gray-800 text-gray-400'}`}>{s.time}</button>
                    ))}
                    </div>
                </div>
                </section>
            </div>

            {isLoadingPlanned ? (
                <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>
            ) : selectedTerminal && (
                <div className="space-y-6">
                    {selectedTerminal.hasZones ? selectedZones.map(z => selectedSchedules.map(s => renderCompanyList(z.id, s.id, `${selectedTerminal.name} • ${z.name} • ${s.time}`))) : selectedSchedules.map(s => renderCompanyList(undefined, s.id, `${selectedTerminal.name} • ${s.time}`))}
                </div>
            )}

            {selectedTerminal && companyEntries.length > 0 && (
                <div className="fixed bottom-6 left-4 right-4 z-40 animate-in slide-in-from-bottom-10">
                <button onClick={handleSubmit} disabled={isSubmitting || companyEntries.filter(e => e.isSelected).length === 0} className="w-full bg-blue-600 text-white font-black py-5 rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm active:scale-95 disabled:opacity-50">
                    {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                    Sincronizar Captura
                </button>
                </div>
            )}
        </div>
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
