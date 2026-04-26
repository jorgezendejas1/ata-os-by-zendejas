import React, { useState, useEffect, useMemo } from 'react';
import { ZONES } from '../constants';
import { getTargets, saveTargets } from '../services/db';
import { PositionTarget } from '../types';
import { Save, Target, Building2, Info, CheckCircle2, LayoutList, Table2, FileText, Download, Calendar as CalendarIcon, Printer, ShieldCheck, Loader2, Plus, Minus, ChevronDown, ChevronUp, MapPin, Briefcase } from 'lucide-react';
import { useTerminals } from '../hooks/useTerminals';
import { useCompanies } from '../hooks/useCompanies';

declare var html2pdf: any;

const Targets: React.FC = () => {
  const { terminals: TERMINALS } = useTerminals();
  const { companies: COMPANIES } = useCompanies();
  const companyHeaderStyle = (companyId: string): React.CSSProperties => {
    const c = COMPANIES.find(co => co.id === companyId);
    return c
      ? { backgroundColor: c.color, color: c.textColor }
      : { backgroundColor: '#f3f4f6', color: '#000' };
  };
  const companyDotStyle = (companyId: string): React.CSSProperties => {
    const c = COMPANIES.find(co => co.id === companyId);
    return { backgroundColor: c?.color || '#3B82F6' };
  };
  const [targets, setTargets] = useState<PositionTarget[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'EDIT' | 'PDF'>('EDIT');
  const activeTerminals = useMemo(() => TERMINALS.filter(t => t.isActive), [TERMINALS]);
  const [expandedTerminalMobile, setExpandedTerminalMobile] = useState<string | null>(null);

  // Sincroniza el panel móvil expandido con la primera terminal activa real
  useEffect(() => {
    if (!expandedTerminalMobile && activeTerminals.length > 0) {
      setExpandedTerminalMobile(activeTerminals[0].id);
    }
  }, [activeTerminals, expandedTerminalMobile]);

  useEffect(() => {
    getTargets().then(setTargets);
  }, []);

  const handleInputChange = (termId: string, zoneId: string, compId: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setTargets(prev => {
        const exists = prev.findIndex(t => t.terminalId === termId && t.zoneId === zoneId && t.companyId === compId);
        const newTargets = [...prev];
        if (exists >= 0) {
            newTargets[exists] = { ...newTargets[exists], count: numValue };
        } else {
            newTargets.push({ terminalId: termId, zoneId, companyId: compId, count: numValue });
        }
        return newTargets;
    });
    setSaveSuccess(false);
  };

  const getTargetValue = (termId: string, zoneId: string, compId: string) => {
      const t = targets.find(item => item.terminalId === termId && item.zoneId === zoneId && item.companyId === compId);
      return t ? t.count : 0;
  };

  const saveAll = async () => {
      setIsSaving(true);
      try {
          await saveTargets(targets);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err) {
          console.error("Save targets error:", err);
      } finally {
          setIsSaving(false);
      }
  };

  const calculateTotals = () => {
      const totals: Record<string, number> = {};
      COMPANIES.forEach(c => totals[c.id] = 0);
      targets.forEach(t => {
          if (totals[t.companyId] !== undefined) totals[t.companyId] += t.count;
      });
      return totals;
  };

  const companyTotals = calculateTotals();

  const handlePrint = async () => {
    const element = document.getElementById('targets-report-content');
    if (!element) return;
    setIsPrinting(true);
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Posiciones_Autorizadas_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    try {
      const pdf = await html2pdf().from(element).set(opt).toPdf().get('pdf');
      const blobUrl = URL.createObjectURL(pdf.output('blob'));
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
          printWindow.addEventListener('load', () => { printWindow.print(); });
      }
    } catch (err) {
      console.error("Print error:", err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const renderEditView = () => (
    <div className="space-y-6 md:space-y-12 animate-in fade-in duration-300">
        {activeTerminals.map(term => {
            const relevantCompanies = term.allowedCompanies 
                ? term.allowedCompanies.map(id => COMPANIES.find(c => c.id === id)!).filter(Boolean)
                : COMPANIES;
            
            const zones = term.hasZones 
                ? ZONES.filter(z => z.terminalId === term.id) 
                : [{ id: 'default', name: 'General', terminalId: term.id }];

            const headerLabel = term.id === 't1' ? 'T2 NAL' : term.id.toUpperCase();
            const isExpandedMobile = expandedTerminalMobile === term.id;

            return (
                <div key={term.id} className="bg-white dark:bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all">
                    {/* Terminal Header */}
                    <div 
                      className={`px-6 py-5 md:px-10 md:py-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center transition-colors ${isExpandedMobile ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-gray-50/30 dark:bg-gray-900'}`}
                      onClick={() => setExpandedTerminalMobile(isExpandedMobile ? null : term.id)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600 text-white p-2.5 rounded-2xl hidden md:block">
                                <Building2 size={24}/>
                            </div>
                            <div>
                                <h3 className="font-black text-lg md:text-2xl text-blue-900 dark:text-white uppercase tracking-tighter">
                                    {term.name}
                                </h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:block">Configuración de Posiciones</p>
                            </div>
                        </div>
                        <div className="md:hidden">
                            {isExpandedMobile ? <ChevronUp size={24} className="text-gray-400" /> : <ChevronDown size={24} className="text-gray-400" />}
                        </div>
                    </div>
                    
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto no-scrollbar">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 text-left">
                                    <th className="p-6 w-56 font-black uppercase text-xl tracking-widest bg-gray-900 text-white text-center">
                                        {headerLabel}
                                    </th>
                                    {relevantCompanies.map(comp => (
                                        <th key={comp.id} style={companyHeaderStyle(comp.id)} className="p-6 text-center font-black text-[10px] uppercase tracking-widest min-w-[140px] border-r border-white/10">
                                            {comp.name}
                                        </th>
                                    ))}
                                    <th className="p-6 text-center font-black text-white bg-blue-600 w-28 text-[10px] uppercase tracking-widest">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {zones.map(zone => {
                                    const rowTotal = relevantCompanies.reduce((acc, c) => acc + getTargetValue(term.id, zone.id, c.id), 0);
                                    return (
                                        <tr key={zone.id} className="hover:bg-blue-50/20 transition-colors">
                                            <td className="p-6 font-black text-gray-700 dark:text-gray-400 border-r border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20 uppercase text-xs">
                                                {zone.name}
                                            </td>
                                            {relevantCompanies.map(comp => (
                                                <td key={comp.id} className="p-0 border-r border-gray-100 dark:border-gray-800">
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        step="0.01"
                                                        value={getTargetValue(term.id, zone.id, comp.id)}
                                                        onChange={(e) => handleInputChange(term.id, zone.id, comp.id, e.target.value)}
                                                        className="w-full h-20 text-center outline-none transition-all font-black text-xl text-gray-800 dark:text-white bg-transparent focus:bg-blue-50/50 dark:focus:bg-blue-900/10"
                                                    />
                                                </td>
                                            ))}
                                            <td className="p-6 text-center font-black text-blue-600 dark:text-blue-400 bg-gray-50/50 dark:bg-gray-800/30 text-lg tabular-nums">
                                                {rowTotal.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className={`md:hidden space-y-4 p-4 bg-gray-50/50 dark:bg-gray-950/20 transition-all ${isExpandedMobile ? 'block' : 'hidden'}`}>
                        {zones.map(zone => {
                            const zoneTotal = relevantCompanies.reduce((acc, c) => acc + getTargetValue(term.id, zone.id, c.id), 0);
                            return (
                                <div key={zone.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                                    <div className="flex justify-between items-center border-b dark:border-gray-800 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                                            <div>
                                                <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tighter">{zone.name}</h4>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Zona de Operación</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black text-blue-600 dark:text-blue-400 leading-none">{zoneTotal.toFixed(2)}</span>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total Zona</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {relevantCompanies.map(comp => {
                                            const val = getTargetValue(term.id, zone.id, comp.id);
                                            return (
                                                <div key={comp.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-3">
                                                        <div style={companyDotStyle(comp.id)} className="w-3 h-3 rounded-full"></div>
                                                        <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tighter">{comp.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => handleInputChange(term.id, zone.id, comp.id, (Math.max(0, val - 1)).toString())}
                                                            className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-600 shadow-sm"
                                                        >
                                                            <Minus size={16} />
                                                        </button>
                                                        <input 
                                                            type="number"
                                                            step="0.01"
                                                            value={val}
                                                            onChange={(e) => handleInputChange(term.id, zone.id, comp.id, e.target.value)}
                                                            className="w-12 text-center font-black text-base bg-transparent dark:text-white outline-none"
                                                        />
                                                        <button 
                                                            onClick={() => handleInputChange(term.id, zone.id, comp.id, (val + 1).toString())}
                                                            className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-600 shadow-sm"
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        })}
    </div>
  );

  const renderPdfView = () => (
    <div id="targets-report-content" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in zoom-in-95 duration-500 pb-10">
        {COMPANIES.map(company => (
            <div key={company.id} className="bg-white p-10 rounded-none shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-200 relative overflow-hidden break-inside-avoid print:shadow-none print:border-none print:p-0 print:mb-20">
                <div className="absolute top-0 left-0 w-full h-2 bg-blue-900"></div>
                <div className="flex justify-between items-start mb-10">
                    <div className="space-y-1">
                        <h3 className="text-[14px] font-black text-blue-900 leading-tight">AIRPORT TRAVEL ADVISORS</h3>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.1em]">S.A. DE C.V. • Departamento de Operaciones</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Documento Oficial</p>
                        <p className="text-[10px] font-bold text-gray-800">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
                <div className="text-center mb-10">
                    <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Relación de Posiciones Autorizadas</h2>
                    <div className="h-[1px] w-12 bg-gray-200 mx-auto mb-3"></div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{company.name}</h1>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-6 mb-10 rounded-xl relative">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumen General</span>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">Activo</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold text-gray-700 uppercase">Posiciones Totales Acumuladas</span>
                        <span className="text-3xl font-black text-gray-900 tracking-tighter">{companyTotals[company.id].toFixed(2)}</span>
                    </div>
                </div>
                <div className="space-y-8">
                    {TERMINALS.map(term => {
                        if (term.allowedCompanies && !term.allowedCompanies.includes(company.id)) return null;
                        const zones = term.hasZones ? ZONES.filter(z => z.terminalId === term.id) : [{ id: 'default', name: 'General', terminalId: term.id }];
                        const termTotal = zones.reduce((acc, z) => acc + getTargetValue(term.id, z.id, company.id), 0);
                        return (
                            <div key={term.id} className="animate-in fade-in slide-in-from-bottom-2">
                                <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-widest border-b border-gray-900/10 pb-2 mb-3">{term.name} {!term.isActive && "(ARC)"}</h4>
                                <div className="space-y-2">
                                    {zones.map(zone => {
                                        const val = getTargetValue(term.id, zone.id, company.id);
                                        if (!term.hasZones && zone.id === 'default') return null;
                                        return (
                                            <div key={zone.id} className="flex items-center gap-2 group">
                                                <span className="text-[10px] font-bold text-gray-600 uppercase shrink-0">{zone.name}</span>
                                                <div className="flex-1 border-b border-dotted border-gray-300 translate-y-[-2px]"></div>
                                                <span className="text-[11px] font-black text-gray-900 tabular-nums">{val.toFixed(2)}</span>
                                            </div>
                                        );
                                    })}
                                    <div className="flex justify-between items-center pt-2 mt-2">
                                        <span className="text-[11px] font-black text-blue-900 uppercase">Subtotal Terminal</span>
                                        <span className="text-sm font-black text-blue-900 tabular-nums underline decoration-blue-900/30 underline-offset-4">{termTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-16 pt-10 border-t border-gray-100 grid grid-cols-2 gap-10">
                    <div className="text-center">
                        <div className="h-[1px] bg-gray-300 w-full mb-2"></div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Elaboró</p>
                        <p className="text-[10px] font-black text-gray-800 uppercase mt-1">Sist. JZL Operating System</p>
                    </div>
                    <div className="text-center">
                        <div className="h-[1px] bg-gray-300 w-full mb-2"></div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Autorizó</p>
                        <p className="text-[10px] font-black text-gray-800 uppercase mt-1">Dirección General</p>
                    </div>
                </div>
            </div>
        ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 no-print px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="bg-rose-100 dark:bg-rose-900/30 p-3.5 rounded-2xl text-rose-600 dark:text-rose-400 shadow-sm">
            <Target size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">Posiciones Master</h2>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Contrato • Plan de Operaciones</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="flex bg-white dark:bg-gray-900 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <button onClick={() => setViewMode('EDIT')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'EDIT' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}><Table2 size={16} />Configurar</button>
                <button onClick={() => setViewMode('PDF')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'PDF' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}><FileText size={16} />Oficial</button>
            </div>
            
            <div className="flex gap-2">
                {viewMode === 'PDF' && (
                    <button onClick={handlePrint} disabled={isPrinting} className="flex-1 sm:flex-none bg-gray-900 dark:bg-gray-800 hover:bg-black text-white px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 disabled:opacity-50">
                        {isPrinting ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                        Imprimir
                    </button>
                )}
                <button onClick={saveAll} disabled={isSaving} className={`flex-1 sm:flex-none px-8 py-3.5 rounded-2xl flex items-center justify-center gap-3 transition-all font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 ${saveSuccess ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100 dark:shadow-none'}`}>
                    {saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
                    {isSaving ? 'Guardando...' : saveSuccess ? '¡Salvado!' : 'Sincronizar'}
                </button>
            </div>
        </div>
      </div>

      {viewMode === 'EDIT' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 px-4 md:px-0">
            {COMPANIES.map(company => (
                <div key={company.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center text-center transition-all hover:translate-y-[-2px] hover:shadow-md">
                    <div className="text-[9px] uppercase font-black text-gray-400 mb-2 tracking-widest">{company.name}</div>
                    <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{companyTotals[company.id].toFixed(2)}</div>
                    <div className="mt-4 w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div style={companyDotStyle(company.id)} className="h-full w-full opacity-40"></div>
                    </div>
                </div>
            ))}
        </div>
      )}

      <div className="px-4 md:px-0">
        {viewMode === 'EDIT' ? renderEditView() : renderPdfView()}
      </div>

      {/* Footer Info */}
      {viewMode === 'EDIT' && (
        <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 px-4 md:px-0 no-print">
            <div className="flex items-start gap-4 text-[10px] text-gray-400 max-w-lg">
                <Info className="shrink-0 mt-0.5 text-blue-500" size={18}/>
                <p className="leading-relaxed font-black uppercase tracking-widest opacity-80 text-center md:text-left">
                    Esta configuración define la base de meta para el cálculo de eficiencia ejecutiva. En móvil, pulsa sobre la terminal para desplegar u ocultar los controles de edición.
                </p>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.3em]">
                <ShieldCheck size={14}/>
                JZL OS Secure Storage
            </div>
        </div>
      )}
    </div>
  );
};

export default Targets;