
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPromoters, getAdcRecords, Promoter, AdcRecord, showToast } from '../services/db';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Save, Trophy, RefreshCw } from 'lucide-react';

const COMPANIES = [
  { id: 'c1', label: 'Sunset', color: '#92d050', textColor: 'black' },
  { id: 'c2', label: 'XCA', color: '#948a54', textColor: 'white' },
  { id: 'c3', label: 'VDP', color: '#f8cbad', textColor: 'black' },
  { id: 'c4', label: 'CID', color: '#bdd7ee', textColor: 'black' },
  { id: 'c5', label: 'KRY', color: '#ffff00', textColor: 'black' },
  { id: 'c6', label: 'KRY G', color: '#afafaf', textColor: 'black' },
];

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const T3_POINTS = [60, 48, 36, 24, 12, 0];
const T4_POINTS = [70, 60, 50, 40, 30, 20];

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
    if (end.getMonth() !== month) break;
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

function calcAdcScore(adcPct: number): number {
  if (adcPct === 0) return 10;
  if (adcPct <= 1) return 8;
  if (adcPct <= 3) return 6;
  if (adcPct <= 5) return 4;
  if (adcPct <= 8) return 2;
  return 0;
}

interface PremioEntry {
  company_id: string;
  eficiencia: number;
  show_factor: number;
  gerente_pw1: number;
  asistencia_score: number;
  adc_pct: number;
  adc_score: number;
  total_score: number;
  lugar: number;
}

function calcTotal(e: PremioEntry, terminal: string): number {
  const base = e.eficiencia + e.show_factor + e.asistencia_score + e.adc_score;
  return Math.round((terminal === 'T3' ? base + e.gerente_pw1 : base) * 10) / 10;
}

function rankEntries(entries: PremioEntry[]): PremioEntry[] {
  const sorted = [...entries].sort((a, b) => b.total_score - a.total_score);
  return entries.map(e => ({
    ...e,
    lugar: sorted.findIndex(s => s.company_id === e.company_id) + 1,
  }));
}

const Premios: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [weekNumber, setWeekNumber] = useState(1);
  const [terminal, setTerminal] = useState<'T3' | 'T4'>('T3');
  const [entries, setEntries] = useState<PremioEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const weeks = useMemo(() => getMonthWeeks(year, month), [year, month]);
  const activeWeek = useMemo(() => weeks.find(w => w.number === weekNumber) || weeks[0], [weeks, weekNumber]);

  useEffect(() => {
    if (weeks.length > 0 && !weeks.find(w => w.number === weekNumber)) {
      setWeekNumber(weeks[0].number);
    }
  }, [weeks, weekNumber]);

  const loadData = useCallback(async () => {
    if (!activeWeek) return;
    setLoading(true);
    try {
      const weekStart = formatDateStr(activeWeek.start);
      const weekEnd = formatDateStr(activeWeek.end);

      const { data: existingEntries } = await supabase
        .from('premios_entries')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .eq('week_number', weekNumber)
        .eq('terminal_id', terminal);

      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('terminalId', terminal)
        .gte('dateRegistered', weekStart)
        .lte('dateRegistered', weekEnd);

      const allPromoters = await getPromoters();
      const terminalPromoters = allPromoters.filter(p => p.terminal_id === terminal);

      const adcByCompany: Record<string, AdcRecord[]> = {};
      for (const c of COMPANIES) {
        adcByCompany[c.id] = await getAdcRecords(month, year, weekNumber, c.id);
      }

      const newEntries: PremioEntry[] = COMPANIES.map(company => {
        const existing = (existingEntries || []).find((e: any) => e.company_id === company.id);

        const companyAttendance = (attendanceData || []).filter((r: any) => r.companyId === company.id);
        const validRecords = companyAttendance.filter((r: any) => r.plannedCount && r.plannedCount > 0);
        const asistencia = validRecords.length > 0
          ? validRecords.reduce((sum: number, r: any) => sum + (r.promoterCount / r.plannedCount) * 100, 0) / validRecords.length
          : 0;

        const companyPromoters = terminalPromoters.filter(p => p.company_id === company.id);
        const companyAdcs = (adcByCompany[company.id] || []).filter(a => a.terminal_id === terminal);
        const adcPct = companyPromoters.length > 0
          ? (companyAdcs.length / companyPromoters.length) * 100
          : 0;

        const eficiencia = existing ? Number(existing.eficiencia) : 0;
        const show_factor = existing ? Number(existing.show_factor) : 0;
        const gerente_pw1 = existing ? Number(existing.gerente_pw1) : 0;
        const roundedAdcPct = Math.round(adcPct * 10) / 10;
        const adc_score = calcAdcScore(roundedAdcPct);

        const entry: PremioEntry = {
          company_id: company.id,
          eficiencia,
          show_factor,
          gerente_pw1,
          asistencia_score: Math.round(asistencia * 10) / 10,
          adc_pct: roundedAdcPct,
          adc_score,
          total_score: 0,
          lugar: 0,
        };
        entry.total_score = calcTotal(entry, terminal);
        return entry;
      });

      setEntries(rankEntries(newEntries));
    } catch (err) {
      console.error('Error loading premios:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year, weekNumber, terminal, activeWeek]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateEntry = (companyId: string, field: keyof PremioEntry, value: number) => {
    setEntries(prev => {
      const updated = prev.map(e => {
        if (e.company_id !== companyId) return e;
        const newE = { ...e, [field]: value };
        newE.total_score = calcTotal(newE, terminal);
        return newE;
      });
      return rankEntries(updated);
    });
  };

  const handleSave = async () => {
    if (!activeWeek) return;
    setSaving(true);
    try {
      const records = entries.map(e => ({
        month, year, week_number: weekNumber,
        terminal_id: terminal,
        company_id: e.company_id,
        eficiencia: e.eficiencia,
        show_factor: e.show_factor,
        gerente_pw1: e.gerente_pw1,
        asistencia_score: e.asistencia_score,
        adc_pct: e.adc_pct,
        adc_score: e.adc_score,
        total_score: e.total_score,
        lugar: e.lugar,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('premios_entries')
        .upsert(records as any[], { onConflict: 'month,year,week_number,terminal_id,company_id' });

      if (error) throw error;
      showToast('Premios guardados correctamente', 'success');
    } catch (err) {
      console.error('Save error:', err);
      showToast('Error al guardar premios', 'error');
    } finally {
      setSaving(false);
    }
  };

  const points = terminal === 'T3' ? T3_POINTS : T4_POINTS;
  const getCompany = (id: string) => COMPANIES.find(c => c.id === id)!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
          <Trophy className="text-amber-600 dark:text-amber-400" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Premios</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Competencia semanal por terminal</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-36">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Mes</label>
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-24">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Año</label>
          <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="text-center" />
        </div>
        <div className="w-56">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Semana</label>
          <Select value={String(weekNumber)} onValueChange={v => setWeekNumber(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {weeks.map(w => <SelectItem key={w.number} value={String(w.number)}>{w.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Recalcular
        </Button>
      </div>

      <Tabs value={terminal} onValueChange={v => setTerminal(v as 'T3' | 'T4')}>
        <TabsList>
          <TabsTrigger value="T3" className="font-black text-xs uppercase tracking-wider">Terminal 3 · Máx 60pts</TabsTrigger>
          <TabsTrigger value="T4" className="font-black text-xs uppercase tracking-wider">Terminal 4 · Máx 70pts</TabsTrigger>
        </TabsList>

        <TabsContent value="T3">
          <ScoreTable entries={entries} terminal="T3" points={T3_POINTS} showGerentePW1={true} onUpdate={updateEntry} getCompany={getCompany} />
        </TabsContent>
        <TabsContent value="T4">
          <ScoreTable entries={entries} terminal="T4" points={T4_POINTS} showGerentePW1={false} onUpdate={updateEntry} getCompany={getCompany} />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save size={16} /> {saving ? 'Guardando...' : 'Guardar semana'}
        </Button>
      </div>

      <div className="bg-muted/50 rounded-2xl p-4 border">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Tabla de puntos — {terminal}</p>
        <div className="flex flex-wrap gap-2">
          {points.map((pts, i) => (
            <span key={i} className="text-xs font-bold px-3 py-1 bg-background rounded-xl border">
              {i + 1}° → {pts} pts
            </span>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-2xl p-4 border">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Jerarquía ADC Score</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '0% ADC', score: 10 },
            { label: '≤1%', score: 8 },
            { label: '≤3%', score: 6 },
            { label: '≤5%', score: 4 },
            { label: '≤8%', score: 2 },
            { label: '>8%', score: 0 },
          ].map((r, i) => (
            <span key={i} className="text-xs font-bold px-3 py-1 bg-background rounded-xl border">
              {r.label} → {r.score} pts
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ScoreTableProps {
  entries: PremioEntry[];
  terminal: string;
  points: number[];
  showGerentePW1: boolean;
  onUpdate: (companyId: string, field: keyof PremioEntry, value: number) => void;
  getCompany: (id: string) => { id: string; label: string; color: string; textColor: string };
}

const ScoreTable: React.FC<ScoreTableProps> = ({ entries, terminal, points, showGerentePW1, onUpdate, getCompany }) => {
  const sorted = [...entries].sort((a, b) => a.lugar - b.lugar);

  return (
    <div className="overflow-x-auto rounded-2xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[10px] font-black uppercase tracking-widest w-10">#</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Empresa</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Eficiencia</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">
              <div>Show Factor</div>
              <div className="text-[8px] font-medium text-muted-foreground normal-case tracking-normal">(en %)</div>
            </TableHead>
            {showGerentePW1 && <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Gte PW1</TableHead>}
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Asist %</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">% ADC</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">ADC Score</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Total</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Lugar</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(entry => {
            const company = getCompany(entry.company_id);
            const pts = entry.lugar >= 1 && entry.lugar <= points.length ? points[entry.lugar - 1] : 0;
            return (
              <TableRow key={entry.company_id}>
                <TableCell className="font-black text-sm">{entry.lugar}</TableCell>
                <TableCell>
                  <Badge style={{ backgroundColor: company.color, color: company.textColor }} className="font-black text-xs px-3 py-1">
                    {company.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number" step="0.1" min="0"
                    value={entry.eficiencia || ''}
                    onChange={e => onUpdate(entry.company_id, 'eficiencia', Number(e.target.value) || 0)}
                    className="w-20 text-center text-sm mx-auto h-8"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number" step="0.1" min="0"
                    value={entry.show_factor || ''}
                    onChange={e => onUpdate(entry.company_id, 'show_factor', Number(e.target.value) || 0)}
                    className="w-20 text-center text-sm mx-auto h-8"
                  />
                </TableCell>
                {showGerentePW1 && (
                  <TableCell className="text-center">
                    <Input
                      type="number" step="1" min="0" max="10"
                      value={entry.gerente_pw1 || ''}
                      onChange={e => onUpdate(entry.company_id, 'gerente_pw1', Number(e.target.value) || 0)}
                      className="w-20 text-center text-sm mx-auto h-8"
                    />
                  </TableCell>
                )}
                <TableCell className="text-center">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{entry.asistencia_score.toFixed(1)}%</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{entry.adc_pct.toFixed(1)}%</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{entry.adc_score}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-lg font-black">{entry.total_score.toFixed(1)}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`text-lg font-black ${entry.lugar === 1 ? 'text-amber-500' : entry.lugar === 2 ? 'text-gray-400' : entry.lugar === 3 ? 'text-orange-700' : 'text-muted-foreground'}`}>
                    {entry.lugar}°
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{pts}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default Premios;
