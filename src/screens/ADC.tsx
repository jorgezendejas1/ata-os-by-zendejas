
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAdcRecords, saveAdcRecords, clearAdcRecords, getPromoters, AdcRecord, Promoter } from '../services/db';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { ClipboardPaste, Trash2, Save, ListChecks } from 'lucide-react';

const COMPANIES = [
  { id: 'c1', label: 'UVC', color: '#92d050', textColor: 'black' },
  { id: 'c2', label: 'XCA', color: '#948a54', textColor: 'white' },
  { id: 'c3', label: 'VDP', color: '#f8cbad', textColor: 'black' },
  { id: 'c4', label: 'CID', color: '#bdd7ee', textColor: 'black' },
  { id: 'c5', label: 'KRY', color: '#ffff00', textColor: 'black' },
  { id: 'c6', label: 'KRY G', color: '#afafaf', textColor: 'black' },
];

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function getMonthWeeks(year: number, month: number) {
  const firstDayOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstDayOfMonth.getDay();
  const daysToSubtract = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;
  const startOfSem1 = new Date(year, month, 1 - daysToSubtract);
  const weeks: { number: number; start: Date; end: Date; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const start = new Date(startOfSem1);
    start.setDate(startOfSem1.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    if (i > 0 && start > new Date(year, month + 1, 0)) break;
    const startStr = `${start.getDate()} ${MONTHS[start.getMonth()].substring(0, 3)}`;
    const endStr = `${end.getDate()} ${MONTHS[end.getMonth()].substring(0, 3)}`;
    weeks.push({
      number: i + 1,
      start,
      end,
      label: `Semana ${i + 1} · ${startStr}-${endStr}`,
    });
  }
  return weeks;
}

function formatDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ADC: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [weekNumber, setWeekNumber] = useState(1);
  const [companyId, setCompanyId] = useState('c1');
  const [activeTab, setActiveTab] = useState('report');
  
  // Report tab state
  const [pasteText, setPasteText] = useState('');
  const [parsedRecords, setParsedRecords] = useState<AdcRecord[]>([]);
  const [savedRecords, setSavedRecords] = useState<AdcRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  // List tab state
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [adcRecords, setAdcRecords] = useState<AdcRecord[]>([]);

  const weeks = useMemo(() => getMonthWeeks(year, month), [year, month]);
  const currentWeek = weeks.find(w => w.number === weekNumber) || weeks[0];

  // Load saved ADC records
  const loadSavedRecords = useCallback(async () => {
    if (!currentWeek) return;
    const records = await getAdcRecords(month, year, weekNumber, companyId);
    setSavedRecords(records);
  }, [month, year, weekNumber, companyId, currentWeek]);

  // Load data for list tab
  const loadListData = useCallback(async () => {
    const [proms, adcs] = await Promise.all([
      getPromoters(),
      getAdcRecords(month, year, weekNumber, companyId)
    ]);
    setPromoters(proms);
    setAdcRecords(adcs);
  }, [month, year, weekNumber, companyId]);

  useEffect(() => {
    loadSavedRecords();
    loadListData();
  }, [loadSavedRecords, loadListData]);

  // Ensure weekNumber is valid when weeks change
  useEffect(() => {
    if (!weeks.find(w => w.number === weekNumber)) {
      setWeekNumber(weeks[0]?.number || 1);
    }
  }, [weeks, weekNumber]);

  const mapTerminal = (val: string): string => {
    const v = val.toLowerCase().trim();
    if (v === 'terminal 3') return 'T3';
    if (v === 'terminal 4') return 'T4';
    if (v === 't2 nacional' || v === 't2 internacional' || v === 'terminal 2') return 'T2';
    return val.trim().toUpperCase();
  };

  const parseText = () => {
    if (!pasteText.trim() || !currentWeek) return;
    const lines = pasteText.trim().split('\n');
    const records: AdcRecord[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('Administración')) continue;
      const cols = line.split('\t');
      if (cols[0].trim() === '#') continue;
      if (!/^\d+$/.test(cols[0].trim())) continue;
      if (cols.length < 11) continue;
      records.push({
        month,
        year,
        week_number: weekNumber,
        week_start: formatDateStr(currentWeek.start),
        week_end: formatDateStr(currentWeek.end),
        company_id: companyId,
        promoter_name: (cols[1] || '').trim(),
        adc_date: (cols[2] || '').trim().split(' ')[0],
        terminal_id: mapTerminal(cols[4] || ''),
        desarrollo: (cols[5] || '').trim(),
        tipo_adc: (cols[6] || '').trim(),
        supervisor_ata: (cols[8] || '').trim(),
        supervisor_desarrollo: (cols[9] || '').trim(),
        descripcion: (cols[10] || '').trim(),
        fecha_limite: (cols[13] || '').trim(),
        se_retira_tia: false,
        tercer_aviso: false,
      });
    }
    setParsedRecords(records);
  };

  const handleSave = async () => {
    if (parsedRecords.length === 0) return;
    setLoading(true);
    try {
      await clearAdcRecords(month, year, weekNumber, companyId);
      await saveAdcRecords(parsedRecords);
      setParsedRecords([]);
      setPasteText('');
      await loadSavedRecords();
      await loadListData();
    } catch { /* toast handled in db */ }
    setLoading(false);
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      await clearAdcRecords(month, year, weekNumber, companyId);
      setPasteText('');
      setParsedRecords([]);
      setSavedRecords([]);
      await loadListData();
    } catch { /* toast handled in db */ }
    setLoading(false);
  };

  // List tab calculations
  const companyPromoters = useMemo(() => 
    promoters.filter(p => p.company_id === companyId), 
    [promoters, companyId]
  );

  const promoterAvisos = useMemo(() => {
    return companyPromoters.map(p => {
      const count = adcRecords.filter(
        r => r.promoter_name.toLowerCase().trim() === p.name.toLowerCase().trim()
      ).length;
      return { ...p, avisos: count };
    });
  }, [companyPromoters, adcRecords]);

  // Summary calculations
  const terminalSummary = useMemo(() => {
    const terminals = [...new Set(companyPromoters.map(p => p.terminal_id))].sort();
    const rows = terminals.map(tid => {
      const I = companyPromoters.filter(p => p.terminal_id === tid).length;
      const F = adcRecords.filter(r => r.terminal_id === tid).length;
      const E = I > 0 ? (F / I * 100) : null;
      return { terminal: tid, I, F, E };
    });
    const totalI = rows.reduce((s, r) => s + r.I, 0);
    const totalF = rows.reduce((s, r) => s + r.F, 0);
    const totalE = totalI > 0 ? (totalF / totalI * 100) : null;
    return { rows, totalI, totalF, totalE };
  }, [companyPromoters, adcRecords]);

  const displayRecords = parsedRecords.length > 0 ? parsedRecords : savedRecords;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">ADC</h1>
        <p className="text-sm text-muted-foreground">Avisos de Compromiso</p>
      </div>

      {/* Global selectors */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mes</label>
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Año</label>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Semana</label>
          <Select value={String(weekNumber)} onValueChange={v => setWeekNumber(Number(v))}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {weeks.map(w => <SelectItem key={w.number} value={String(w.number)}>{w.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Company tabs */}
      <div className="flex flex-wrap gap-2">
        {COMPANIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCompanyId(c.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              companyId === c.id ? 'ring-2 ring-offset-2 ring-gray-400 scale-105' : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: c.color, color: c.textColor }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Main tabs: R and L */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="report" className="gap-2"><ClipboardPaste size={14} /> Reporte (R)</TabsTrigger>
          <TabsTrigger value="list" className="gap-2"><ListChecks size={14} /> Lista (L)</TabsTrigger>
        </TabsList>

        {/* Tab R - Report */}
        <TabsContent value="report" className="space-y-4">
          <Textarea
            rows={20}
            value={pasteText}
            onChange={e => { setPasteText(e.target.value); setParsedRecords([]); }}
            placeholder="Copia la tabla completa de ata-erp.com (Administración Folios ATA) y pégala aquí con Ctrl+V. El sistema detectará automáticamente el formato y extraerá los datos relevantes."
            className="font-mono text-xs"
          />
          <div className="flex gap-3">
            <Button onClick={parseText} disabled={!pasteText.trim()}>
              <ClipboardPaste size={16} /> Procesar
            </Button>
            {parsedRecords.length > 0 && (
              <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                <Save size={16} /> Guardar ({parsedRecords.length})
              </Button>
            )}
            <Button variant="destructive" onClick={handleClear} disabled={loading}>
              <Trash2 size={16} /> Limpiar
            </Button>
          </div>

          {/* Validation message after parsing */}
          {pasteText.trim() && parsedRecords.length > 0 && (
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
              ✓ {parsedRecords.length} registros detectados — revisa el preview y presiona Guardar para confirmar
            </div>
          )}
          {pasteText.trim() && parsedRecords.length === 0 && savedRecords.length === 0 && (
            <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              ⚠ No se detectaron registros válidos. Asegúrate de copiar toda la tabla desde ata-erp.com incluyendo las filas de datos.
            </div>
          )}

          {/* Preview table */}
          {displayRecords.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-muted text-xs font-black uppercase tracking-widest text-muted-foreground">
                {parsedRecords.length > 0 ? `Preview: ${parsedRecords.length} registros parseados` : `${savedRecords.length} registros guardados`}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Promotor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Terminal</TableHead>
                    <TableHead>Desarrollo</TableHead>
                    <TableHead>Tipo Falta</TableHead>
                    <TableHead>Supervisor ATA</TableHead>
                    <TableHead>Supervisor Desarrollo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRecords.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium text-xs">{r.promoter_name}</TableCell>
                      <TableCell className="text-xs">{r.adc_date}</TableCell>
                      <TableCell className="text-xs">{r.terminal_id}</TableCell>
                      <TableCell className="text-xs">{r.desarrollo}</TableCell>
                      <TableCell className="text-xs">{r.tipo_adc}</TableCell>
                      <TableCell className="text-xs">{r.supervisor_ata}</TableCell>
                      <TableCell className="text-xs">{r.supervisor_desarrollo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Tab L - List */}
        <TabsContent value="list" className="space-y-6">
          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-muted text-xs font-black uppercase tracking-widest text-muted-foreground">
              {companyPromoters.length} promotores · {COMPANIES.find(c => c.id === companyId)?.label}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Terminal</TableHead>
                  <TableHead className="text-center">Avisos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoterAvisos.map((p, i) => (
                  <TableRow key={p.id} style={p.avisos > 0 ? { backgroundColor: '#fffde7' } : {}}>
                    <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                    <TableCell className="font-medium text-xs">{p.name}</TableCell>
                    <TableCell className="text-xs">{p.terminal_id}</TableCell>
                    <TableCell className="text-center text-xs font-bold">{p.avisos}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary panel */}
          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-muted text-xs font-black uppercase tracking-widest text-muted-foreground">
              Resumen % ADC
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Terminal</TableHead>
                  <TableHead className="text-center">Promotores (I)</TableHead>
                  <TableHead className="text-center">Avisos semana (F)</TableHead>
                  <TableHead className="text-center">% ADC (E)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terminalSummary.rows.map(r => (
                  <TableRow key={r.terminal}>
                    <TableCell className="font-medium text-xs">{r.terminal}</TableCell>
                    <TableCell className="text-center text-xs">{r.I}</TableCell>
                    <TableCell className="text-center text-xs">{r.F}</TableCell>
                    <TableCell className="text-center text-xs font-bold">
                      {r.E !== null ? `${r.E.toFixed(1)}%` : '--'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-black bg-muted/50">
                  <TableCell className="text-xs">TOTAL</TableCell>
                  <TableCell className="text-center text-xs">{terminalSummary.totalI}</TableCell>
                  <TableCell className="text-center text-xs">{terminalSummary.totalF}</TableCell>
                  <TableCell className="text-center text-xs">
                    {terminalSummary.totalE !== null ? `${terminalSummary.totalE.toFixed(1)}%` : '--'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ADC;
