
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '../services/db';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableFooter } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Save, Zap, BarChart3 } from 'lucide-react';

const COMPANIES_ALL = [
  { id: 'c1', label: 'UVC', color: '#92d050', textColor: 'black' },
  { id: 'c2', label: 'XCA', color: '#948a54', textColor: 'white' },
  { id: 'c3', label: 'VDP', color: '#f8cbad', textColor: 'black' },
  { id: 'c4', label: 'CID', color: '#bdd7ee', textColor: 'black' },
  { id: 'c5', label: 'KRY', color: '#ffff00', textColor: 'black' },
  { id: 'c6', label: 'KRY G', color: '#afafaf', textColor: 'black' },
];

const POWER_TERMINALS = [
  { id: 'NAL', label: 'NAL', companies: ['c1', 'c2'] },
  { id: 'T2', label: 'T2', companies: ['c1', 'c2', 'c4', 'c5'] },
  { id: 'T3', label: 'T3', companies: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] },
  { id: 'T4', label: 'T4', companies: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] },
];

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

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

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

interface PowerGrid {
  [companyId: string]: { [dayDate: string]: number };
}

const Powers: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [weekNumber, setWeekNumber] = useState(1);
  const [terminal, setTerminal] = useState('T3');
  const [grid, setGrid] = useState<PowerGrid>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any[]>([]);

  const weeks = useMemo(() => getMonthWeeks(year, month), [year, month]);
  const activeWeek = useMemo(() => weeks.find(w => w.number === weekNumber) || weeks[0], [weeks, weekNumber]);
  const weekDays = useMemo(() => activeWeek ? getWeekDays(activeWeek.start) : [], [activeWeek]);
  const terminalConfig = useMemo(() => POWER_TERMINALS.find(t => t.id === terminal)!, [terminal]);
  const allowedCompanies = useMemo(() => COMPANIES_ALL.filter(c => terminalConfig.companies.includes(c.id)), [terminalConfig]);

  useEffect(() => {
    if (weeks.length > 0 && !weeks.find(w => w.number === weekNumber)) {
      setWeekNumber(weeks[0].number);
    }
  }, [weeks, weekNumber]);

  const loadData = useCallback(async () => {
    if (!activeWeek) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('powers_entries')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .eq('week_number', weekNumber)
        .eq('terminal_id', terminal);

      if (error) throw error;

      const newGrid: PowerGrid = {};
      for (const c of allowedCompanies) {
        newGrid[c.id] = {};
        for (const d of weekDays) {
          newGrid[c.id][formatDateStr(d)] = 0;
        }
      }

      if (data) {
        for (const row of data as any[]) {
          if (newGrid[row.company_id] && newGrid[row.company_id][row.day_date] !== undefined) {
            newGrid[row.company_id][row.day_date] = Number(row.count);
          }
        }
      }

      setGrid(newGrid);
    } catch (err) {
      console.error('Error loading powers:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year, weekNumber, terminal, activeWeek, weekDays, allowedCompanies]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateCell = (companyId: string, dayDate: string, value: number) => {
    setGrid(prev => ({
      ...prev,
      [companyId]: { ...prev[companyId], [dayDate]: value },
    }));
  };

  const handleSave = async () => {
    if (!activeWeek) return;
    setSaving(true);
    try {
      const records: any[] = [];
      for (const companyId of Object.keys(grid)) {
        for (const dayDate of Object.keys(grid[companyId])) {
          records.push({
            month, year, week_number: weekNumber,
            terminal_id: terminal,
            company_id: companyId,
            day_date: dayDate,
            count: grid[companyId][dayDate],
            updated_at: new Date().toISOString(),
          });
        }
      }

      const { error } = await supabase
        .from('powers_entries')
        .upsert(records, { onConflict: 'month,year,week_number,terminal_id,company_id,day_date' });

      if (error) throw error;
      showToast('Powers guardados correctamente', 'success');
    } catch (err) {
      console.error('Save error:', err);
      showToast('Error al guardar powers', 'error');
    } finally {
      setSaving(false);
    }
  };

  const loadMonthlySummary = async () => {
    setShowSummary(true);
    try {
      const { data, error } = await supabase
        .from('powers_entries')
        .select('*')
        .eq('month', month)
        .eq('year', year);

      if (error) throw error;

      // Group by terminal + company
      const summary: Record<string, Record<string, number>> = {};
      for (const t of POWER_TERMINALS) {
        summary[t.id] = {};
        for (const cId of t.companies) {
          summary[t.id][cId] = 0;
        }
      }

      for (const row of (data || []) as any[]) {
        if (summary[row.terminal_id] && summary[row.terminal_id][row.company_id] !== undefined) {
          summary[row.terminal_id][row.company_id] += Number(row.count);
        }
      }

      setSummaryData(POWER_TERMINALS.map(t => ({
        terminal: t.id,
        label: t.label,
        companies: t.companies.map(cId => ({
          id: cId,
          label: COMPANIES_ALL.find(c => c.id === cId)?.label || cId,
          total: summary[t.id][cId] || 0,
        })),
        total: Object.values(summary[t.id]).reduce((a, b) => a + b, 0),
      })));
    } catch (err) {
      console.error('Summary error:', err);
    }
  };

  const getDayTotal = (dayDate: string) => {
    return Object.values(grid).reduce((sum, days) => sum + (days[dayDate] || 0), 0);
  };

  const getCompanyWeekTotal = (companyId: string) => {
    return Object.values(grid[companyId] || {}).reduce((sum, v) => sum + v, 0);
  };

  const getCompany = (id: string) => COMPANIES_ALL.find(c => c.id === id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl">
          <Zap className="text-yellow-600 dark:text-yellow-400" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Powers</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Línea de contacto por terminal</p>
        </div>
      </div>

      {/* Selectors */}
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
        <Button variant="outline" size="sm" onClick={loadMonthlySummary} className="gap-2">
          <BarChart3 size={14} /> Resumen del mes
        </Button>
      </div>

      {/* Terminal Tabs */}
      <Tabs value={terminal} onValueChange={setTerminal}>
        <TabsList>
          {POWER_TERMINALS.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="font-black text-xs uppercase tracking-wider">{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {POWER_TERMINALS.map(t => (
          <TabsContent key={t.id} value={t.id}>
            <div className="rounded-2xl border bg-background overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest sticky left-0 bg-background z-10">Empresa</TableHead>
                    {weekDays.map(d => (
                      <TableHead key={formatDateStr(d)} className="text-[10px] font-black uppercase tracking-widest text-center min-w-[70px]">
                        <div>{DAY_NAMES[d.getDay()]}</div>
                        <div className="text-muted-foreground font-normal">{d.getDate()}/{d.getMonth() + 1}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-center bg-muted/50">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allowedCompanies.map(company => (
                    <TableRow key={company.id}>
                      <TableCell className="sticky left-0 bg-background z-10">
                        <Badge style={{ backgroundColor: company.color, color: company.textColor }} className="font-black text-xs px-3 py-1">
                          {company.label}
                        </Badge>
                      </TableCell>
                      {weekDays.map(d => {
                        const dayDate = formatDateStr(d);
                        return (
                          <TableCell key={dayDate} className="text-center p-1">
                            <Input
                              type="number" min="0"
                              value={grid[company.id]?.[dayDate] ?? 0}
                              onChange={e => updateCell(company.id, dayDate, Number(e.target.value) || 0)}
                              className="w-16 text-center text-sm mx-auto h-8"
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center bg-muted/50">
                        <span className="font-black text-sm">{getCompanyWeekTotal(company.id)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-black text-xs uppercase sticky left-0 bg-muted z-10">Total</TableCell>
                    {weekDays.map(d => {
                      const dayDate = formatDateStr(d);
                      return (
                        <TableCell key={dayDate} className="text-center font-black text-sm">
                          {getDayTotal(dayDate)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-black text-sm bg-muted">
                      {weekDays.reduce((s, d) => s + getDayTotal(formatDateStr(d)), 0)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      {/* Monthly Summary */}
      {showSummary && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground uppercase tracking-tight">
              Resumen mensual — {MONTHS[month]} {year}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowSummary(false)}>Cerrar</Button>
          </div>
          {summaryData.map(termData => (
            <div key={termData.terminal} className="rounded-2xl border bg-background p-4">
              <h3 className="text-sm font-black uppercase tracking-widest mb-2">{termData.label}</h3>
              <div className="flex flex-wrap gap-3">
                {termData.companies.map((c: any) => {
                  const comp = getCompany(c.id);
                  return (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border">
                      <Badge style={{ backgroundColor: comp?.color, color: comp?.textColor }} className="font-black text-[10px] px-2 py-0.5">
                        {c.label}
                      </Badge>
                      <span className="font-black text-sm">{c.total}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Total</span>
                  <span className="font-black text-sm">{termData.total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Powers;
