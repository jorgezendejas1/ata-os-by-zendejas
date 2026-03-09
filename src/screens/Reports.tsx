
import React, { useState, useMemo, useEffect } from 'react';
import { getRecords, getStaffing, getEmailConfig, getEmailLogs } from '../services/db';
import { User, AttendanceRecord, EmailAutomationConfig, SentEmailLog, Zone } from '../types';
import { COMPANIES, TERMINALS, ZONES } from '../constants';
import { Printer, Filter, ChevronDown, FileSpreadsheet, TrendingUp, Mail, Loader2, Download, LayoutDashboard, FileText, CheckSquare, Square, RefreshCw, X, ChevronRight, ChevronLeft, Wand2, Target, BarChart3, PieChart } from 'lucide-react';
import * as XLSX from 'xlsx';

// Declaración para la librería html2pdf cargada en index.html
declare const html2pdf: any;

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const getMonthWeeks = (year: number, monthIndex: number) => {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const dayOfWeek = firstDayOfMonth.getDay(); 

  let daysToSubtract = 0;
  if (dayOfWeek >= 4) {
    daysToSubtract = dayOfWeek - 4;
  } else {
    daysToSubtract = dayOfWeek + 3;
  }

  const startOfSem1 = new Date(year, monthIndex, 1 - daysToSubtract);
  
  const weeks = [];
  for (let i = 0; i < 5; i++) {
    const start = new Date(startOfSem1);
    start.setDate(startOfSem1.getDate() + (i * 7));
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6); 
    
    weeks.push({
      id: i,
      label: `Semana ${i + 1}`,
      weekId: `${year}-W${Math.ceil((start.getDate() + start.getDay()) / 7)}`,
      start,
      end,
      days: Array.from({ length: 7 }, (_, d) => {
        const dayDate = new Date(start);
        dayDate.setDate(start.getDate() + d);
        return dayDate;
      })
    });
  }

  const lastWeek = weeks[4];
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0); 
  if (lastWeek.end > lastDayOfMonth) return weeks.slice(0, 4);
  return weeks;
};

const WeeklyTrendChart = ({ data }: { data: { label: string, actual: number, planned: number }[] }) => {
  if (data.length === 0) return null;
  const height = 200, width = 600, padding = 40;
  const graphWidth = width - padding * 2, graphHeight = height - padding * 2;
  const maxVal = Math.max(...data.map(d => Math.max(d.actual, d.planned)), 10) * 1.2; 
  const getX = (i: number) => {
    if (data.length <= 1) return width / 2;
    return padding + (i * (graphWidth / (data.length - 1)));
  }
  const getY = (v: number) => height - padding - (v / maxVal) * graphHeight;

  let actualPath = "";
  let plannedPath = "";
  data.forEach((d, i) => {
      const x = getX(i), yA = getY(d.actual), yP = getY(d.planned);
      if (i === 0) { actualPath += `M ${x} ${yA}`; plannedPath += `M ${x} ${yP}`; }
      else { actualPath += ` L ${x} ${yA}`; plannedPath += ` L ${x} ${yP}`; }
  });

  return (
      <div className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 md:p-8 shadow-sm mb-8 break-inside-avoid transition-colors">
          <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={14} className="text-blue-600"/>
                  Tendencia Semanal
              </h4>
              <div className="flex gap-4 text-[9px] font-black uppercase">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-600"></div><span className="dark:text-gray-400">Real</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border-2 border-gray-400 dark:border-gray-600 border-dashed"></div><span className="dark:text-gray-400">Meta</span></div>
              </div>
          </div>
          <div className="w-full aspect-[3/1] md:aspect-[4/1]">
             <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                 {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                     const y = height - padding - (tick * graphHeight);
                     return <line key={tick} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f3f4f6" className="dark:stroke-gray-800" strokeWidth="1" />;
                 })}
                 <path d={plannedPath} fill="none" stroke="#9ca3af" className="dark:stroke-gray-600" strokeWidth="2" strokeDasharray="5,5" />
                 <path d={actualPath} fill="none" stroke="#2563eb" strokeWidth="3" />
                 {data.map((d, i) => (
                     <g key={i}>
                         <circle cx={getX(i)} cy={getY(d.actual)} r="5" fill="#2563eb" stroke="white" className="dark:stroke-gray-900" strokeWidth="2" />
                         <text x={getX(i)} y={height - padding + 18} textAnchor="middle" fontSize="10" className="fill-gray-400 dark:fill-gray-500 font-bold uppercase tracking-tighter">{d.label}</text>
                     </g>
                 ))}
             </svg>
          </div>
      </div>
  );
};

interface ReportsProps { user: User; }

const Reports: React.FC<ReportsProps> = ({ user }) => {
  const now = new Date();
  const [selectedDateStr, setSelectedDateStr] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0); 
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [selectedTerminalIds, setSelectedTerminalIds] = useState<string[]>([]);
  const [isTerminalDropdownOpen, setIsTerminalDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [staffing, setStaffing] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'PDF'>('DASHBOARD');

  const selectedYear = useMemo(() => parseInt(selectedDateStr.split('-')[0]), [selectedDateStr]);
  const selectedMonth = useMemo(() => parseInt(selectedDateStr.split('-')[1]) - 1, [selectedDateStr]);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoadingData(true);
      try {
        const [recs, stff] = await Promise.all([
          getRecords(),
          getStaffing('all', selectedYear, selectedMonth)
        ]);
        setRecords(recs);
        setStaffing(stff);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadAll();
  }, [selectedYear, selectedMonth]); // Recarga al cambiar periodo

  const visibleTerminals = useMemo(() => {
    // Master can see archived terminals for historical reports
    const isMaster = user.role === 'MASTER';
    const baseTerminals = isMaster ? TERMINALS : TERMINALS.filter(t => t.isActive);
    
    if (user.role === 'REPORTES' && user.assignedTerminals?.length) {
      return baseTerminals.filter(t => user.assignedTerminals!.includes(t.id));
    }
    return baseTerminals;
  }, [user]);

  const availableTerminalsForSelectedCompany = useMemo(() => {
    if (selectedCompanyId === 'all') return visibleTerminals;
    return visibleTerminals.filter(t => !t.allowedCompanies || t.allowedCompanies.includes(selectedCompanyId));
  }, [visibleTerminals, selectedCompanyId]);

  useEffect(() => {
    const validSelection = selectedTerminalIds.filter(id => availableTerminalsForSelectedCompany.some(t => t.id === id));
    if (validSelection.length === 0 && availableTerminalsForSelectedCompany.length > 0) {
        setSelectedTerminalIds(availableTerminalsForSelectedCompany.map(t => t.id));
    } else {
        setSelectedTerminalIds(validSelection);
    }
  }, [availableTerminalsForSelectedCompany]);

  const weeks = useMemo(() => getMonthWeeks(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  
  const safeWeekIdx = Math.min(selectedWeekIdx, weeks.length - 1);
  const weeksToDisplay = useMemo(() => weeks.slice(0, safeWeekIdx + 1), [weeks, safeWeekIdx]);

  const getEffectiveCountInfo = (record: AttendanceRecord): { value: number, isRounded: boolean } => {
    const terminal = TERMINALS.find(t => t.id === record.terminalId);
    if (!terminal?.allowedSchedules?.length) return { value: record.promoterCount, isRounded: false };
    
    const firstSchedId = terminal.allowedSchedules[0];
    const lastSchedId = terminal.allowedSchedules[terminal.allowedSchedules.length - 1];
    
    const isCriticalSchedule = record.scheduleId === firstSchedId || record.scheduleId === lastSchedId;
    const planned = record.plannedCount || 0;
    
    if (isCriticalSchedule && planned > 0 && record.promoterCount > (planned * 0.5) && record.promoterCount < planned) {
      return { value: planned, isRounded: true };
    }
    
    return { value: record.promoterCount, isRounded: false };
  };

  const calculateMetrics = (termId: string, zoneId: string, companyId: string, week: { days: Date[] }) => {
    const daily = week.days.map(day => {
      const dStr = day.toISOString().split('T')[0];
      const dayRecs = records.filter(r => r.companyId === companyId && r.terminalId === termId && (zoneId !== 'default' ? r.zoneId === zoneId : true) && r.dateRegistered === dStr);
      
      let totalEffectiveValue = 0;
      let roundingsCount = 0;
      
      if (dayRecs.length > 0) {
        dayRecs.forEach(r => {
          const info = getEffectiveCountInfo(r);
          totalEffectiveValue += info.value;
          if (info.isRounded) roundingsCount++;
        });
      }

      const actual = dayRecs.length ? totalEffectiveValue / dayRecs.length : 0;
      const stffEntry = staffing.find(s => s.date === dStr && s.terminalId === termId && s.zoneId === zoneId && s.companyId === companyId);
      const planned = stffEntry ? stffEntry.count : 0;
      
      return { actual, planned, empty: Math.max(0, planned - actual), hasRounding: roundingsCount > 0 };
    });
    
    const avgA = daily.reduce<number>((a, b) => a + b.actual, 0) / (daily.length || 1);
    const avgP = daily.reduce<number>((a, b) => a + b.planned, 0) / (daily.length || 1);
    const weekHasRounding = daily.some(d => d.hasRounding);

    return { daily, weeklyAvg: { actual: avgA, planned: avgP, empty: Math.max(0, avgP - avgA), hasRounding: weekHasRounding } };
  };

  const getReportData = (companyId: string, customTerminalIds?: string[]) => {
    const targetTerminalIds = customTerminalIds || selectedTerminalIds;
    const terminalsData = visibleTerminals
      .filter(t => targetTerminalIds.includes(t.id))
      .filter(t => (!t.allowedCompanies || t.allowedCompanies.includes(companyId)))
      .map(term => {
        const zones = term.hasZones ? ZONES.filter(z => z.terminalId === term.id) : [{ id: 'default', name: 'General', terminalId: term.id } as Zone];
        const zonesData = zones.map(zone => {
            const wm = weeksToDisplay.map(w => calculateMetrics(term.id, zone.id, companyId, w));
            const mA = wm.reduce<number>((s, x) => s + x.weeklyAvg.actual, 0) / (wm.length || 1);
            const mP = wm.reduce<number>((s, x) => s + x.weeklyAvg.planned, 0) / (wm.length || 1);
            return { zone, weeklyMetrics: wm, monthAvg: { actual: mA, planned: mP, empty: Math.max(0, mP - mA) } };
        });
        const wT = weeksToDisplay.map((_, i) => ({ 
          actual: zonesData.reduce<number>((a, z) => a + z.weeklyMetrics[i].weeklyAvg.actual, 0), 
          planned: zonesData.reduce<number>((a, z) => a + z.weeklyMetrics[i].weeklyAvg.planned, 0) 
        }));
        return { 
          term, 
          zonesData, 
          terminalWeeklyTotals: wT, 
          terminalMonthAvg: { 
            actual: wT.reduce<number>((a, b) => a + b.actual, 0) / (wT.length || 1), 
            planned: wT.reduce<number>((a, b) => a + b.planned, 0) / (wT.length || 1) 
          } 
        };
    });
    
    if (terminalsData.length === 0) return { terminalsData: [], grandWeeklyTotals: weeksToDisplay.map(() => ({ actual: 0, planned: 0 })), grandMonthAvg: { actual: 0, planned: 0, empty: 0 } };
    
    const gWT = weeksToDisplay.map((_, i) => ({ 
      actual: terminalsData.reduce<number>((a, t) => a + t.terminalWeeklyTotals[i].actual, 0), 
      planned: terminalsData.reduce<number>((a, t) => a + t.terminalWeeklyTotals[i].planned, 0) 
    }));
    
    const totalWeeks = gWT.length || 1;
    const finalActual = gWT.reduce<number>((a, b) => a + b.actual, 0) / totalWeeks;
    const finalPlanned = gWT.reduce<number>((a, b) => a + b.planned, 0) / totalWeeks;

    return { 
      terminalsData, 
      grandWeeklyTotals: gWT, 
      grandMonthAvg: { 
        actual: finalActual, 
        planned: finalPlanned, 
        empty: Math.max(0, finalPlanned - finalActual) 
      } 
    };
  };

  const fmt = (n: number) => n.toFixed(2);

  const handlePrint = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    setIsExporting(true);
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Reporte_ATA_${selectedDateStr}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    try {
      const pdf = await html2pdf().from(element).set(opt).toPdf().get('pdf');
      const blobUrl = URL.createObjectURL(pdf.output('blob'));
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) { printWindow.addEventListener('load', () => { printWindow.print(); }); }
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    setIsExporting(true);
    const opt = { margin: 10, filename: `ATA_Report_${selectedDateStr}.pdf`, image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    try { await html2pdf().from(element).set(opt).save(); } 
    catch (err) { alert("Error al exportar PDF"); } 
    finally { setIsExporting(false); }
  };

  const handleExportExcel = () => {
    const dataForExcel: any[] = [];
    const targetCompanies = COMPANIES.filter(c => selectedCompanyId === 'all' || c.id === selectedCompanyId);
    targetCompanies.forEach(company => {
        const { terminalsData } = getReportData(company.id);
        terminalsData.forEach(t => {
            t.zonesData.forEach(z => {
                const row: any = {
                    "Empresa": company.name,
                    "Terminal": t.term.name,
                    "Zona": z.zone.name === 'General' ? company.name : z.zone.name,
                    "Promedio Mensual": z.monthAvg.actual.toFixed(2),
                    "Meta Mensual": z.monthAvg.planned.toFixed(2),
                    "KPI (%)": z.monthAvg.planned > 0 ? Math.round((z.monthAvg.actual / z.monthAvg.planned) * 100) : 100
                };
                z.weeklyMetrics.forEach((wm, idx) => { row[`S${idx + 1}`] = wm.weeklyAvg.actual.toFixed(2); });
                dataForExcel.push(row);
            });
        });
    });
    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte JZL");
    XLSX.writeFile(wb, `Reporte_JZL_${selectedDateStr}.xlsx`);
  };

  const RenderMetricsResponsive = ({ company, terminalsData }: { company: any, terminalsData: any[] }) => {
    return (
        <div className="space-y-6">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 transition-all">
                <table className="w-full text-[10px] border-collapse">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-black uppercase tracking-widest border-b dark:border-gray-700">
                            <th className="p-6 border-r dark:border-gray-700 text-left">TERMINAL / ZONA</th>
                            {weeksToDisplay.map(w => <th key={w.id} className="p-6 border-r dark:border-gray-700 text-center">{w.label}</th>)}
                            <th className="p-6 border-r dark:border-gray-700 bg-gray-900 text-white text-center">PROM.</th>
                            <th className="p-6 bg-blue-600 text-white text-center">KPI%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {terminalsData.map(t => (
                            <React.Fragment key={t.term.id}>
                                <tr className="bg-slate-50 dark:bg-blue-900/10"><td colSpan={weeksToDisplay.length + 3} className="p-4 px-6 font-black text-blue-900 dark:text-blue-400 uppercase text-[9px]">{t.term.name} {!t.term.isActive && <span className="ml-2 text-[8px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded font-black">ARCHIVADA</span>}</td></tr>
                                {t.zonesData.map((z: any) => (
                                    <tr key={z.zone.id} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="p-5 border-r dark:border-gray-800 pl-10 font-bold text-gray-700 dark:text-gray-300">{z.zone.name === 'General' ? company.name : z.zone.name}</td>
                                        {z.weeklyMetrics.map((m: any, i: number) => (
                                          <td key={i} className={`p-5 border-r dark:border-gray-800 text-center font-mono ${m.weeklyAvg.hasRounding ? 'text-blue-600 font-black' : 'dark:text-gray-400'}`}>
                                            <div className="flex flex-col items-center gap-0.5">
                                              {fmt(m.weeklyAvg.actual)}
                                              {m.weeklyAvg.hasRounding && <Wand2 size={8} className="text-blue-400"/>}
                                            </div>
                                          </td>
                                        ))}
                                        <td className="p-5 border-r dark:border-gray-800 text-center font-black bg-gray-50/50 dark:bg-gray-800/30 text-gray-900 dark:text-white">{fmt(z.monthAvg.actual)}</td>
                                        <td className={`p-5 text-center font-black bg-blue-50/20 ${z.monthAvg.actual / (z.monthAvg.planned || 1) >= 0.85 ? 'text-green-600' : 'text-amber-600'}`}>
                                          {z.monthAvg.planned > 0 ? Math.round((z.monthAvg.actual / z.monthAvg.planned) * 100) : 100}%
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-6">
                {terminalsData.map(t => (
                    <div key={t.term.id} className="space-y-4">
                        <div className="px-6 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-between mx-4">
                            <span className="text-[10px] font-black text-blue-900 dark:text-blue-400 uppercase tracking-[0.2em]">{t.term.name} {!t.term.isActive && "(ARCHIVADA)"}</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        </div>
                        <div className="px-4 space-y-4">
                            {t.zonesData.map((z: any) => {
                                const efficiency = z.monthAvg.planned > 0 ? (z.monthAvg.actual / z.monthAvg.planned) : 1;
                                const isGood = efficiency >= 0.85;
                                return (
                                    <div key={z.zone.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <h5 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
                                                    {z.zone.name === 'General' ? company.name : z.zone.name}
                                                </h5>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Zona de Operación</p>
                                            </div>
                                            <div className={`px-4 py-2 rounded-2xl flex flex-col items-center ${isGood ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                                                <span className="text-[8px] font-black uppercase mb-0.5">KPI%</span>
                                                <span className="text-xl font-black leading-none">{Math.round(efficiency * 100)}%</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border dark:border-gray-800">
                                            <div className="text-center border-r dark:border-gray-700">
                                                <span className="block text-[8px] font-black text-gray-400 uppercase mb-1">Prom. Real</span>
                                                <span className="text-2xl font-black text-blue-600">{fmt(z.monthAvg.actual)}</span>
                                            </div>
                                            <div className="text-center">
                                                <span className="block text-[8px] font-black text-gray-400 uppercase mb-1">Meta Mensual</span>
                                                <span className="text-2xl font-black text-gray-400">{fmt(z.monthAvg.planned)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-[1px] bg-gray-100 dark:bg-gray-800"></div>
                                                <p className="text-[9px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.3em] px-2">Desglose Semanal</p>
                                                <div className="flex-1 h-[1px] bg-gray-100 dark:bg-gray-800"></div>
                                            </div>
                                            <div className="grid grid-cols-5 gap-2">
                                                {z.weeklyMetrics.map((wm: any, i: number) => (
                                                    <div key={i} className={`p-2.5 rounded-xl text-center border-2 transition-all ${wm.weeklyAvg.hasRounding ? 'bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:border-blue-800' : 'bg-white dark:bg-gray-900 border-gray-50 dark:border-gray-800'}`}>
                                                        <span className="block text-[8px] font-bold text-gray-400 uppercase mb-1">S{i+1}</span>
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span className={`text-xs font-black ${wm.weeklyAvg.hasRounding ? 'text-blue-600 dark:text-blue-400' : 'dark:text-white'}`}>
                                                                {fmt(wm.weeklyAvg.actual)}
                                                            </span>
                                                            {wm.weeklyAvg.hasRounding && <Wand2 size={8} className="text-blue-400"/>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  if (isLoadingData) return <div className="flex items-center justify-center p-40"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 no-print px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-600 dark:text-blue-400">
             <LayoutDashboard size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Reportes Ejecutivos</h2>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em]">JZL OS Data Intelligence</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <button onClick={handleExportExcel} className="flex-1 sm:flex-none bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-6 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><FileSpreadsheet size={18}/> Excel</button>
             <button onClick={handlePrint} className="flex-1 sm:flex-none bg-gray-900 dark:bg-gray-800 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><Printer size={18}/> Imprimir</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 md:p-10 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 mb-8 mx-4 md:mx-0 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Periodo Mensual</label>
            <input type="month" value={selectedDateStr} onChange={e => setSelectedDateStr(e.target.value)} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-2xl text-xs font-black dark:text-white outline-none" />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Corte de Semana</label>
            <select value={selectedWeekIdx} onChange={e => setSelectedWeekIdx(parseInt(e.target.value))} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-2xl text-xs font-black dark:text-white outline-none">
                {weeks.map((w, i) => <option key={i} value={i}>{w.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Socio Comercial</label>
            <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-2xl text-xs font-black dark:text-white outline-none">
              <option value="all">Consolidado Total</option>
              {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Terminales</label>
              <button onClick={() => setIsTerminalDropdownOpen(!isTerminalDropdownOpen)} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-2xl text-xs flex justify-between items-center dark:text-white font-black uppercase">
                  <span>{selectedTerminalIds.length} Seleccionadas</span>
                  <ChevronDown size={18} />
              </button>
              {isTerminalDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-[2rem] shadow-2xl z-50 p-4">
                      <div className="max-h-60 overflow-y-auto space-y-1">
                          {availableTerminalsForSelectedCompany.map(t => (
                              <button key={t.id} onClick={() => setSelectedTerminalIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])} className={`w-full p-4 flex items-center gap-4 rounded-xl text-[10px] uppercase font-black ${selectedTerminalIds.includes(t.id) ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}>
                                  {selectedTerminalIds.includes(t.id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                                  {t.name} {!t.isActive && "(ARC)"}
                              </button>
                          ))}
                      </div>
                  </div>
              )}
          </div>
        </div>
      </div>

      <div id="report-content" className="space-y-10">
        {COMPANIES.filter(c => selectedCompanyId === 'all' || c.id === selectedCompanyId).map((company) => {
            const { terminalsData, grandWeeklyTotals } = getReportData(company.id);
            if (terminalsData.length === 0) return null;
            
            return (
                <div key={company.id} className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div className="bg-white dark:bg-gray-900 p-8 md:p-16 rounded-[2.5rem] md:rounded-[3.5rem] border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden">
                        <div className="text-center mb-12">
                            <h1 className="text-3xl md:text-5xl font-black text-blue-900 dark:text-white uppercase tracking-tighter leading-none mb-4">AIRPORT TRAVEL ADVISORS</h1>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">S.A. DE C.V. • DEPARTAMENTO DE OPERACIONES</p>
                        </div>
                        
                        <div className="bg-blue-900 text-white px-8 py-6 rounded-3xl font-black text-[10px] uppercase mb-12 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                <span className="bg-white/20 px-4 py-2 rounded-xl">{company.name}</span>
                                <span className="text-white/60">REPORTE ESTADÍSTICO</span>
                            </div>
                            <span className="bg-white/10 px-4 py-2 rounded-xl">{MONTHS[selectedMonth]} {selectedYear}</span>
                        </div>

                        <WeeklyTrendChart data={grandWeeklyTotals.map((g, i) => ({ label: weeksToDisplay[i].label, actual: g.actual, planned: g.planned }))}/>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-10 rounded-[2.5rem] text-center border border-blue-100 dark:border-blue-800/50">
                                <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-4">Promedio Real Mensual</h4>
                                <div className="text-4xl md:text-6xl font-black text-blue-900 dark:text-blue-400 tracking-tighter">
                                  {fmt(terminalsData.reduce((acc, t) => acc + t.terminalMonthAvg.actual, 0) / (terminalsData.length || 1))}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-10 rounded-[2.5rem] text-center border dark:border-gray-800">
                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Eficiencia de Ocupación</h4>
                                <div className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter">
                                    {Math.round((terminalsData.reduce((acc, t) => acc + t.terminalMonthAvg.actual, 0) / (terminalsData.reduce((acc, t) => acc + t.terminalMonthAvg.planned, 0) || 1)) * 100)}%
                                </div>
                            </div>
                        </div>

                        <RenderMetricsResponsive company={company} terminalsData={terminalsData} />

                        <div className="mt-16 pt-16 border-t dark:border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-16 px-10">
                            <div className="text-center">
                                <div className="h-[1px] bg-gray-200 dark:bg-gray-700 w-full mb-4"></div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Gerencia de Operaciones</p>
                            </div>
                            <div className="text-center">
                                <div className="h-[1px] bg-gray-200 dark:bg-gray-700 w-full mb-4"></div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Dirección Regional</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default Reports;
