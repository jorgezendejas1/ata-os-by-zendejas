
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '../services/db';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { Save, FileDown, LayoutGrid } from 'lucide-react';
import { useCompanies } from '../hooks/useCompanies';

const EMPTY_COMPANY = { id: '', label: 'Vacío', color: '#ffffff', textColor: 'black' };

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_LOWER = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

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

interface ModuleEntry {
  module_number: number;
  company_id: string;
  notes: string;
}

const ModulosT4: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [weekNumber, setWeekNumber] = useState(1);
  const [entries, setEntries] = useState<ModuleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const weeks = useMemo(() => getMonthWeeks(year, month), [year, month]);
  const activeWeek = useMemo(() => weeks.find(w => w.number === weekNumber) || weeks[0], [weeks, weekNumber]);

  useEffect(() => {
    if (weeks.length > 0 && !weeks.find(w => w.number === weekNumber)) {
      setWeekNumber(weeks[0].number);
    }
  }, [weeks, weekNumber]);

  // Init 20 empty modules
  useEffect(() => {
    setEntries(Array.from({ length: 20 }, (_, i) => ({ module_number: i + 1, company_id: '', notes: '' })));
  }, []);

  const loadData = useCallback(async () => {
    if (!activeWeek) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('modules_entries')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .eq('week_number', weekNumber)
        .order('module_number');

      if (error) throw error;

      if (data && data.length > 0) {
        setEntries(Array.from({ length: 20 }, (_, i) => {
          const existing = data.find((d: any) => d.module_number === i + 1);
          return {
            module_number: i + 1,
            company_id: existing ? (existing as any).company_id : '',
            notes: existing ? ((existing as any).notes || '') : '',
          };
        }));
      } else {
        setEntries(Array.from({ length: 20 }, (_, i) => ({ module_number: i + 1, company_id: '', notes: '' })));
      }
    } catch (err) {
      console.error('Error loading modules:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year, weekNumber, activeWeek]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateEntry = (moduleNum: number, field: 'company_id' | 'notes', value: string) => {
    setEntries(prev => prev.map(e => e.module_number === moduleNum ? { ...e, [field]: value } : e));
  };

  const handleSave = async () => {
    if (!activeWeek) return;
    setSaving(true);
    try {
      const weekStart = formatDateStr(activeWeek.start);
      const weekEnd = formatDateStr(activeWeek.end);
      const records = entries.map(e => ({
        month, year, week_number: weekNumber,
        week_start: weekStart, week_end: weekEnd,
        module_number: e.module_number,
        company_id: e.company_id || '',
        notes: e.notes,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('modules_entries')
        .upsert(records as any[], { onConflict: 'month,year,week_number,module_number' });

      if (error) throw error;
      showToast('Asignación de módulos guardada', 'success');
    } catch (err) {
      console.error('Save error:', err);
      showToast('Error al guardar módulos', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getCompany = (id: string) => COMPANIES.find(c => c.id === id) || COMPANIES[0];

  const handleExportPDF = () => {
    if (!activeWeek) return;
    // Para el PDF, el rango es sábado a viernes (jueves+2 = sábado, miércoles+2 = viernes)
    const pdfStart = new Date(activeWeek.start);
    pdfStart.setDate(pdfStart.getDate() + 2);
    const pdfEnd = new Date(activeWeek.end);
    pdfEnd.setDate(pdfEnd.getDate() + 2);
    const startDay = String(pdfStart.getDate()).padStart(2, '0');
    const endDay = String(pdfEnd.getDate()).padStart(2, '0');
    const monthName = MONTHS_LOWER[pdfEnd.getMonth()];
    const yr = pdfEnd.getFullYear();
    const dateRange = `${startDay} al ${endDay} de ${monthName} ${yr}`;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto;">
        <h1 style="text-align: center; font-size: 22px; font-weight: 900; margin-bottom: 4px; letter-spacing: 2px;">T4 POSICIONES DE MÓDULOS</h1>
        <p style="text-align: center; font-size: 13px; color: #555; margin-bottom: 24px;">${dateRange}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr>
              <th style="border: 1px solid #333; padding: 8px 12px; background: #1e293b; color: white; text-align: center; width: 80px;">Módulo</th>
              <th style="border: 1px solid #333; padding: 8px 12px; background: #1e293b; color: white; text-align: center;">Empresa</th>
              <th style="border: 1px solid #333; padding: 8px 12px; background: #1e293b; color: white; text-align: center; width: 200px;">Notas</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(e => {
              const company = getCompany(e.company_id);
              return `<tr>
                <td style="border: 1px solid #ccc; padding: 8px 12px; text-align: center; font-weight: bold;">${e.module_number}</td>
                <td style="border: 1px solid #ccc; padding: 8px 12px; text-align: center; background: ${company.color}; color: ${company.textColor}; font-weight: bold;">${company.label}</td>
                <td style="border: 1px solid #ccc; padding: 8px 12px; font-size: 11px; color: #555;">${e.notes}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <p style="text-align: center; font-size: 10px; color: #999; margin-top: 20px;">ATA OS by Zendejas · Generado el ${new Date().toLocaleDateString('es-MX')}</p>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    const w = window as any;
    if (w.html2pdf) {
      w.html2pdf().set({
        margin: 10,
        filename: `T4_Modulos_${dateRange.replace(/\s/g, '_')}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
      }).from(container).save().then(() => {
        document.body.removeChild(container);
      });
    } else {
      showToast('html2pdf no disponible', 'error');
      document.body.removeChild(container);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-2xl">
          <LayoutGrid className="text-violet-600 dark:text-violet-400" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Módulos T4</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Asignación semanal de posiciones</p>
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
      </div>

      {activeWeek && (
        <p className="text-sm text-muted-foreground font-bold">
          Semana del {formatDateStr(activeWeek.start)} al {formatDateStr(activeWeek.end)}
        </p>
      )}

      {/* Table */}
      <div className="rounded-2xl border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase tracking-widest w-20 text-center"># Módulo</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Empresa asignada</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(entry => {
              const company = getCompany(entry.company_id);
              return (
                <TableRow key={entry.module_number}>
                  <TableCell className="text-center font-black text-lg">{entry.module_number}</TableCell>
                  <TableCell className="text-center" style={{ backgroundColor: entry.company_id ? company.color : undefined }}>
                    <Select value={entry.company_id || '__empty__'} onValueChange={v => updateEntry(entry.module_number, 'company_id', v === '__empty__' ? '' : v)}>
                      <SelectTrigger className="w-40 mx-auto border-0 bg-transparent font-bold" style={{ color: entry.company_id ? company.textColor : undefined }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANIES.map(c => (
                          <SelectItem key={c.id || '__empty__'} value={c.id || '__empty__'}>
                            <span className="flex items-center gap-2">
                              {c.id && <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: c.color, border: '1px solid #ccc' }} />}
                              {c.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={entry.notes}
                      onChange={e => updateEntry(entry.module_number, 'notes', e.target.value)}
                      placeholder="Notas..."
                      className="h-8 text-sm"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleExportPDF} className="gap-2">
          <FileDown size={16} /> Exportar PDF
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save size={16} /> {saving ? 'Guardando...' : 'Guardar asignación'}
        </Button>
      </div>
    </div>
  );
};

export default ModulosT4;
