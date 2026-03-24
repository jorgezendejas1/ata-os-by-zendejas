
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceRecord, StaffingEntry, PositionTarget } from '../types';
import { COMPANIES, TERMINALS, ZONES, SCHEDULES } from '../constants';
import { getRecords, getStaffing, getTargets, showToast } from '../services/db';
import { FileDown, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

/* ──────────────────────────  CONSTANTS  ────────────────────────── */

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_LOWER = ['enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre'];

const COMPANY_META: Record<string, { short: string; bg: string; text: string }> = {
  c1: { short: 'UVC',   bg: '#92d050', text: '#000' },
  c2: { short: 'XCA',   bg: '#948a54', text: '#fff' },
  c3: { short: 'VDP',   bg: '#f8cbad', text: '#000' },
  c4: { short: 'CID',   bg: '#bdd7ee', text: '#000' },
  c5: { short: 'KRY',   bg: '#ffff00', text: '#000' },
  c6: { short: 'KRY G', bg: '#afafaf', text: '#000' },
};

const TERMINAL_DISPLAY: Record<string, string> = {
  t2n: 'T2 NACIONAL', t2i: 'T2 INTERNACIONAL', t3: 'TERMINAL 3', t4: 'TERMINAL 4',
};

const FIRST_LAST: Record<string, { first: string; last: string }> = {
  t2i: { first: 'h_1000', last: 'h_2100' },
  t3:  { first: 'h_0900', last: 'h_2030' },
  t4:  { first: 'h_0900', last: 'h_2100' },
};

const RULE50_TERMINALS = new Set(['t2i', 't3', 't4']);

/* ──────────────────────────  WEEK HELPER  ────────────────────────── */

function getMonthWeeks(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const dow = firstDay.getDay();
  const daysBack = dow >= 4 ? dow - 4 : dow + 3;
  const sem1 = new Date(year, month, 1 - daysBack);
  const weeks: { number: number; start: Date; end: Date; label: string; days: Date[] }[] = [];
  for (let i = 0; i < 6; i++) {
    const start = new Date(sem1);
    start.setDate(sem1.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    if (i > 0 && start > new Date(year, month + 1, 0)) break;
    const s = `${start.getDate()} ${MONTHS[start.getMonth()].substring(0, 3)}`;
    const e = `${end.getDate()} ${MONTHS[end.getMonth()].substring(0, 3)}`;
    const days = Array.from({ length: 7 }, (_, d) => {
      const dd = new Date(start);
      dd.setDate(start.getDate() + d);
      return dd;
    });
    weeks.push({ number: i + 1, start, end, label: `Semana ${i + 1} · ${s}–${e}`, days });
  }
  return weeks;
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function semanticColor(pct: number) {
  if (pct >= 70) return { main: '#185FA5', line: '#B5D4F4', bg: '#E6F1FB' };
  if (pct >= 50) return { main: '#BA7517', line: '#FAC775', bg: '#FFF8E6' };
  return { main: '#A32D2D', line: '#F7C1C1', bg: '#FFF0F0' };
}

/* ──────────────────────────  COMPONENT  ────────────────────────── */

interface ReportsProps { user: { role: string; assignedTerminals?: string[] } }

const Reports: React.FC<ReportsProps> = ({ user }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [activeWeekIdx, setActiveWeekIdx] = useState(0);
  const [companyId, setCompanyId] = useState('c1');
  const [isExporting, setIsExporting] = useState(false);
  const [exportAllProgress, setExportAllProgress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [staffing, setStaffing] = useState<StaffingEntry[]>([]);
  const [targets, setTargets] = useState<PositionTarget[]>([]);

  const weeks = useMemo(() => getMonthWeeks(year, month), [year, month]);

  useEffect(() => { setActiveWeekIdx(0); }, [year, month]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [r, s, t] = await Promise.all([getRecords(), getStaffing('all', year, month), getTargets()]);
        setRecords(r);
        setStaffing(s);
        setTargets(t);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [year, month]);

  const activeWeek = weeks[Math.min(activeWeekIdx, weeks.length - 1)];

  /* Active terminals for current company (excluding T1) */
  const companyTerminals = useMemo(() =>
    TERMINALS.filter(t => t.isActive && t.id !== 't1' && t.allowedCompanies?.includes(companyId)),
  [companyId]);

  const companyTerminalNames = useMemo(() =>
    companyTerminals.map(t => {
      if (t.id === 't2n') return 'Nacional';
      if (t.id === 't2i') return 'T2';
      return t.name;
    }).join(' · '),
  [companyTerminals]);

  /* ── HELPERS ── */

  const getTarget = (termId: string, zoneId: string, cId: string) => {
    const t = targets.find(x => x.terminalId === termId && x.zoneId === zoneId && x.companyId === cId);
    return t ? Number(t.count) : 0;
  };

  const getStaffingForDay = (date: string, termId: string, zoneId: string, cId: string) => {
    const s = staffing.find(x => x.date === date && x.terminalId === termId && x.zoneId === zoneId && x.companyId === cId);
    return s ? Number(s.count) : 0;
  };

  const getRecordsForDay = (date: string, termId: string, zoneId: string | null, cId: string, schedId?: string) => {
    return records.filter(r =>
      r.dateRegistered === date &&
      r.terminalId === termId &&
      r.companyId === cId &&
      (zoneId && zoneId !== 'default' ? r.zoneId === zoneId : true) &&
      (schedId ? r.scheduleId === schedId : true)
    );
  };

  /* Apply 50% rule for a single cell */
  const apply50Rule = (real: number, planned: number, termId: string, schedId: string): { value: number; applied: boolean } => {
    if (!RULE50_TERMINALS.has(termId)) return { value: real, applied: false };
    const fl = FIRST_LAST[termId];
    if (!fl) return { value: real, applied: false };
    const isFirstOrLast = schedId === fl.first || schedId === fl.last;
    if (!isFirstOrLast) return { value: real, applied: false };
    if (planned > 0 && real >= planned * 0.5) return { value: planned, applied: true };
    return { value: real, applied: false };
  };

  /* Compute weekly average for one terminal/zone/company across a week */
  const weekAvg = (week: typeof activeWeek, termId: string, zoneId: string, cId: string) => {
    const terminal = TERMINALS.find(t => t.id === termId);
    const allowedScheds = terminal?.allowedSchedules || [];
    let totalEffective = 0;
    let totalPlanned = 0;
    let dayCount = 0;

    week.days.forEach(day => {
      const dStr = fmtDate(day);
      const planned = getStaffingForDay(dStr, termId, zoneId, cId);
      const dayRecs = getRecordsForDay(dStr, termId, zoneId === 'default' ? null : zoneId, cId);

      if (dayRecs.length > 0 || planned > 0) {
        let dayEffective = 0;
        // Sum across all schedules
        allowedScheds.forEach(sid => {
          const rec = dayRecs.find(r => r.scheduleId === sid);
          if (rec) {
            const { value } = apply50Rule(rec.promoterCount, planned, termId, sid);
            dayEffective += value;
          }
        });
        const schedCount = allowedScheds.length || 1;
        totalEffective += dayEffective / schedCount;
        totalPlanned += planned;
        dayCount++;
      }
    });

    const avg = dayCount > 0 ? totalEffective / dayCount : 0;
    const avgPlanned = dayCount > 0 ? totalPlanned / dayCount : 0;
    return { avg, avgPlanned };
  };

  /* Grand totals for company across all terminals for a given week */
  const companyWeekTotal = (week: typeof activeWeek) => {
    let sumAvg = 0, sumPlan = 0;
    companyTerminals.forEach(t => {
      const zones = t.hasZones ? ZONES.filter(z => z.terminalId === t.id) : [{ id: 'default', name: 'General', terminalId: t.id }];
      zones.forEach(z => {
        const { avg, avgPlanned } = weekAvg(week, t.id, z.id, companyId);
        sumAvg += avg;
        sumPlan += avgPlanned;
      });
    });
    return { occupied: sumAvg, planned: sumPlan };
  };

  /* ── KPI DATA ── */
  const activeTotal = useMemo(() => companyWeekTotal(activeWeek), [activeWeek, companyId, records, staffing, targets, companyTerminals]);
  const prevTotal = useMemo(() => {
    if (activeWeekIdx === 0) return null;
    return companyWeekTotal(weeks[activeWeekIdx - 1]);
  }, [activeWeekIdx, weeks, companyId, records, staffing, targets, companyTerminals]);

  const activePct = activeTotal.planned > 0 ? (activeTotal.occupied / activeTotal.planned) * 100 : 0;
  const prevPct = prevTotal && prevTotal.planned > 0 ? (prevTotal.occupied / prevTotal.planned) * 100 : null;
  const trend = prevPct !== null ? activePct - prevPct : 0;

  const monthAvgPct = useMemo(() => {
    let sum = 0, count = 0;
    weeks.forEach((w, i) => {
      if (i > activeWeekIdx) return;
      const t = companyWeekTotal(w);
      if (t.planned > 0) { sum += (t.occupied / t.planned) * 100; count++; }
    });
    return count > 0 ? sum / count : 0;
  }, [weeks, activeWeekIdx, companyId, records, staffing, targets, companyTerminals]);

  /* ── COMPANY TABS ── */
  const companyList = COMPANIES.filter(c => {
    return TERMINALS.some(t => t.isActive && t.id !== 't1' && t.allowedCompanies?.includes(c.id));
  });

  /* ── EXPORT PDF ── */
  const handleExportPDF = () => {
    const el = document.getElementById('reports-content');
    if (!el) return;
    const w = window as any;
    if (!w.html2pdf) { showToast('html2pdf no disponible', 'error'); return; }
    setIsExporting(true);
    const cm = COMPANY_META[companyId];
    const filename = `${cm.short} - Sem${activeWeek.number} - ${MONTHS[month]}.pdf`;
    w.html2pdf().set({
      margin: 10,
      filename,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
    }).from(el).save().then(() => setIsExporting(false)).catch(() => { setIsExporting(false); showToast('Error al exportar', 'error'); });
  };

  /* ── EXPORT ALL COMPANIES ── */
  const EXPORT_ORDER = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  const handleExportAll = async () => {
    const w = window as any;
    if (!w.html2pdf) { showToast('html2pdf no disponible', 'error'); return; }
    const originalCompany = companyId;
    setIsExporting(true);
    const total = EXPORT_ORDER.length;
    for (let i = 0; i < total; i++) {
      const cId = EXPORT_ORDER[i];
      const meta = COMPANY_META[cId];
      setExportAllProgress(`Generando ${i + 1} de ${total}... ${meta.short}`);
      setCompanyId(cId);
      // Wait for React to re-render with the new company
      await new Promise(r => setTimeout(r, 600));
      const el = document.getElementById('reports-content');
      if (!el) continue;
      const filename = `${meta.short} - Sem${activeWeek.number} - ${MONTHS[month]}.pdf`;
      await w.html2pdf().set({
        margin: 10,
        filename,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
      }).from(el).save();
      // Small delay between downloads
      await new Promise(r => setTimeout(r, 400));
    }
    setCompanyId(originalCompany);
    setExportAllProgress(null);
    setIsExporting(false);
    showToast(`${total} PDFs exportados correctamente`, 'success');
  };


  const getTermSchedules = (termId: string) => {
    const terminal = TERMINALS.find(t => t.id === termId);
    if (!terminal?.allowedSchedules) return [];
    return terminal.allowedSchedules.map(sid => SCHEDULES.find(s => s.id === sid)).filter(Boolean) as typeof SCHEDULES;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} />
        <span>Cargando datos…</span>
      </div>
    );
  }

  const cm = COMPANY_META[companyId];
  const companyName = COMPANIES.find(c => c.id === companyId)?.name || '';

  return (
    <div className="space-y-4">
      {/* ═══ SELECTORS ═══ */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={activeWeekIdx} onChange={e => setActiveWeekIdx(Number(e.target.value))}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          {weeks.map((w, i) => <option key={i} value={i}>{w.label}</option>)}
        </select>
        {!isExporting && (
          <button onClick={handleExportPDF}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
            <FileDown size={16} /> Exportar PDF
          </button>
        )}
      </div>

      {/* Company tabs */}
      <div className="flex flex-wrap gap-1.5">
        {companyList.map(c => {
          const meta = COMPANY_META[c.id];
          const active = c.id === companyId;
          return (
            <button key={c.id} onClick={() => setCompanyId(c.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: active ? meta.bg : 'transparent',
                color: active ? meta.text : 'var(--color-text-secondary, #888)',
                border: `1.5px solid ${active ? meta.bg : 'var(--color-border-tertiary, #e5e5e5)'}`,
                opacity: active ? 1 : 0.7,
              }}>
              {meta.short}
            </button>
          );
        })}
      </div>

      {/* ═══ REPORT CONTENT (for PDF) ═══ */}
      <div id="reports-content" className="space-y-6">

        {/* ═══ SECTION 1 — HEADER + KPIs ═══ */}
        <div className="rounded-xl p-5" style={{ border: '0.5px solid var(--color-border-tertiary, #e5e5e5)' }}>
          <div className="flex justify-between items-start mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-secondary, #888)' }}>
                Airport Travel Advisors S.A. de C.V.
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary, #888)' }}>
                Reporte de posiciones ocupadas · Periodo {year}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-medium">{cm.short}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary, #888)' }}>
                Semana {activeWeek.number} · {activeWeek.start.getDate()} {MONTHS_LOWER[activeWeek.start.getMonth()]}–{activeWeek.end.getDate()} {MONTHS_LOWER[activeWeek.end.getMonth()]} {year}
              </p>
              <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: cm.bg, color: cm.text }}>
                {companyTerminalNames}
              </span>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Pos. ocupadas" value={activeTotal.occupied.toFixed(1)} />
            <KpiCard label="Pos. vacías" value={Math.max(0, activeTotal.planned - activeTotal.occupied).toFixed(1)} />
            <KpiCard label={`% Sem ${activeWeek.number}`}
              value={`${activePct.toFixed(1)}%`}
              extra={trend !== 0 ? (
                <span className="flex items-center gap-0.5 text-[10px] font-medium"
                  style={{ color: trend > 0 ? '#185FA5' : '#A32D2D' }}>
                  {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(trend).toFixed(1)}%
                </span>
              ) : null} />
            <KpiCard label="Promedio mes" value={`${monthAvgPct.toFixed(1)}%`} />
          </div>
        </div>

        {/* ═══ SECTION 2 — WEEKLY HISTORY ═══ */}
        <div>
          <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary, #888)' }}>
            Histórico semanal
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weeks.map((w, i) => {
              const isFuture = i > activeWeekIdx;
              const isActive = i === activeWeekIdx;
              const isPast = i < activeWeekIdx;
              const tot = !isFuture ? companyWeekTotal(w) : { occupied: 0, planned: 0 };
              const pct = tot.planned > 0 ? (tot.occupied / tot.planned) * 100 : 0;
              return (
                <div key={i} className="flex-1 min-w-[120px] rounded-xl p-3 transition-all"
                  style={{
                    background: isActive ? '#E6F1FB' : isPast ? 'var(--color-background-secondary, #f9f9f9)' : 'transparent',
                    border: isActive ? '1.5px solid #378ADD' : isFuture ? '1.5px dashed var(--color-border-tertiary, #ddd)' : '1px solid var(--color-border-tertiary, #eee)',
                    opacity: isFuture ? 0.3 : 1,
                  }}>
                  <p className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary, #888)' }}>
                    Sem {w.number} · {w.start.getDate()}–{w.end.getDate()} {MONTHS[w.end.getMonth()].substring(0, 3)}
                  </p>
                  {isActive && <span className="text-[9px] font-semibold" style={{ color: '#378ADD' }}>semana actual</span>}
                  <p className="text-lg font-medium mt-1">{isFuture ? '—' : tot.occupied.toFixed(1)}</p>
                  <p className="text-[10px]" style={{ color: isFuture ? '#ccc' : semanticColor(pct).main }}>
                    {isFuture ? '—' : `${pct.toFixed(1)}%`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ SECTION 3 — TERMINAL BREAKDOWN + SPARKLINES ═══ */}
        <div>
          <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary, #888)' }}>
            Desglose por terminal
          </p>
          <div className="space-y-4">
            {companyTerminals.map(term => {
              const zones = term.hasZones
                ? ZONES.filter(z => z.terminalId === term.id)
                : [{ id: 'default', name: companyName, terminalId: term.id }];

              const totalTarget = zones.reduce((s, z) => s + getTarget(term.id, z.id, companyId), 0);

              return (
                <div key={term.id} className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--color-border-tertiary, #e5e5e5)' }}>
                  <div className="flex justify-between items-center px-4 py-3"
                    style={{ borderBottom: '0.5px solid var(--color-border-tertiary, #e5e5e5)' }}>
                    <p className="text-xs font-medium uppercase tracking-wide">{TERMINAL_DISPLAY[term.id] || term.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-secondary, #888)' }}>
                      Autorizado: {totalTarget.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    {zones.map((zone, zi) => {
                      /* Compute values per week */
                      const weekValues = weeks.map((w, wi) => {
                        if (wi > activeWeekIdx) return null;
                        const { avg, avgPlanned } = weekAvg(w, term.id, zone.id, companyId);
                        const target = getTarget(term.id, zone.id, companyId);
                        const pct = target > 0 ? (avg / target) * 100 : (avgPlanned > 0 ? (avg / avgPlanned) * 100 : 0);
                        return { avg, pct };
                      });

                      const currentVal = weekValues[activeWeekIdx];
                      const currentPct = currentVal?.pct || 0;
                      const sc = semanticColor(currentPct);
                      const target = getTarget(term.id, zone.id, companyId);

                      return (
                        <div key={zone.id} className="flex items-center px-4 py-2"
                          style={{ borderBottom: zi < zones.length - 1 ? '0.5px solid var(--color-border-tertiary, #eee)' : 'none' }}>
                          {/* Zone name */}
                          <div className="w-[70px] flex-shrink-0">
                            <p className="text-[10px] font-medium truncate">{zone.name}</p>
                          </div>
                          {/* Sparkline */}
                          <div className="flex-1 px-2">
                            <SparkLine weeks={weeks} values={weekValues} activeIdx={activeWeekIdx} />
                          </div>
                          {/* Right stats */}
                          <div className="w-[80px] flex-shrink-0 text-right">
                            <p className="text-sm font-medium" style={{ color: sc.main }}>{currentPct.toFixed(0)}%</p>
                            <p className="text-[9px]" style={{ color: 'var(--color-text-secondary, #aaa)' }}>
                              {(currentVal?.avg || 0).toFixed(1)} / {target.toFixed(1)}
                            </p>
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

        {/* ═══ SECTION 4 — ATTENDANCE DETAIL TABLES ═══ */}
        <div>
          <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary, #888)' }}>
            Registro de asistencia por día
          </p>
          <div className="space-y-5">
            {companyTerminals.map(term => {
              const zones = term.hasZones
                ? ZONES.filter(z => z.terminalId === term.id)
                : [{ id: 'default', name: companyName, terminalId: term.id }];
              const schedules = getTermSchedules(term.id);

              return zones.map(zone => (
                <AttendanceTable
                  key={`${term.id}-${zone.id}`}
                  termId={term.id}
                  termName={TERMINAL_DISPLAY[term.id] || term.name}
                  zoneName={zone.name}
                  zoneId={zone.id}
                  companyId={companyId}
                  week={activeWeek}
                  schedules={schedules}
                  records={records}
                  staffing={staffing}
                  targets={targets}
                />
              ));
            })}
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="flex justify-between items-center pt-4 text-[9px]" style={{ color: 'var(--color-text-secondary, #aaa)', borderTop: '0.5px solid var(--color-border-tertiary, #e5e5e5)' }}>
          <span>Airport Travel Advisors S.A. de C.V. · Jorge Zendejas Lovera, Supervisor</span>
          <span>{new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────  KPI CARD  ────────────────────────── */

function KpiCard({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3.5" style={{ background: 'var(--color-background-secondary, #f9f9f9)' }}>
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #888)' }}>{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-xl font-medium">{value}</span>
        {extra}
      </div>
    </div>
  );
}

/* ──────────────────────────  SPARKLINE  ────────────────────────── */

function SparkLine({ weeks, values, activeIdx }: {
  weeks: ReturnType<typeof getMonthWeeks>;
  values: (null | { avg: number; pct: number })[];
  activeIdx: number;
}) {
  const n = weeks.length;
  const xPositions = n <= 4 ? [28, 84, 140, 196] : [28, 84, 140, 196, 252];
  const viewW = n <= 4 ? 224 : 280;

  const MIN_Y = 8, MAX_Y = 34;
  const RANGE_Y = MAX_Y - MIN_Y;

  const validVals = values.filter(v => v !== null) as { avg: number; pct: number }[];
  const pctVals = validVals.map(v => v.pct);
  const minVal = pctVals.length > 0 ? Math.min(...pctVals) : 0;
  const maxVal = pctVals.length > 0 ? Math.max(...pctVals) : 100;
  const span = maxVal - minVal || 1;

  const getY = (pct: number) => MAX_Y - ((pct - minVal) / span) * RANGE_Y;

  const points: string[] = [];
  values.forEach((v, i) => {
    if (v !== null) points.push(`${xPositions[i]},${getY(v.pct).toFixed(1)}`);
  });

  const activePct = values[activeIdx]?.pct || 0;
  const activeSc = semanticColor(activePct);

  return (
    <svg viewBox={`0 0 ${viewW} 70`} preserveAspectRatio="none" width="100%" style={{ display: 'block' }}>
      {/* Line */}
      {points.length > 1 && (
        <polyline points={points.join(' ')} fill="none"
          stroke="#B5D4F4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {/* Points + labels */}
      {values.map((v, i) => {
        if (v === null) return null;
        const x = xPositions[i];
        const y = getY(v.pct);
        const isActive = i === activeIdx;
        const sc = semanticColor(v.pct);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={isActive ? 5.5 : 3.5}
              fill={isActive ? sc.main : '#B5D4F4'}
              stroke={isActive ? 'white' : 'none'} strokeWidth={isActive ? 2 : 0} />
            <text x={x} y={48} textAnchor="middle" fontSize="9"
              fill={isActive ? sc.main : '#999'} fontWeight={isActive ? '600' : '400'}>
              S{i + 1}
            </text>
            <text x={x} y={62} textAnchor="middle" fontSize="9"
              fill={isActive ? sc.main : '#bbb'}>
              {v.pct.toFixed(0)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ──────────────────────────  ATTENDANCE TABLE  ────────────────────────── */

function AttendanceTable({ termId, termName, zoneName, zoneId, companyId, week, schedules, records, staffing, targets }: {
  termId: string; termName: string; zoneName: string; zoneId: string; companyId: string;
  week: { number: number; start: Date; end: Date; days: Date[] };
  schedules: { id: string; time: string }[];
  records: AttendanceRecord[]; staffing: StaffingEntry[]; targets: PositionTarget[];
}) {
  const days = week.days;
  let hasRule = false;

  const target = targets.find(t => t.terminalId === termId && t.zoneId === zoneId && t.companyId === companyId);
  const targetVal = target ? Number(target.count) : 0;

  const fl = FIRST_LAST[termId];
  const canApplyRule = RULE50_TERMINALS.has(termId);

  /* Get staffing for each day */
  const dailyStaffing = days.map(d => {
    const dStr = fmtDate(d);
    const s = staffing.find(x => x.date === dStr && x.terminalId === termId && x.zoneId === zoneId && x.companyId === companyId);
    return s ? Number(s.count) : 0;
  });

  /* Cell data for each schedule x day */
  const cellData = schedules.map(sched => {
    return days.map((d, di) => {
      const dStr = fmtDate(d);
      const recs = records.filter(r =>
        r.dateRegistered === dStr && r.terminalId === termId && r.companyId === companyId &&
        (zoneId !== 'default' ? r.zoneId === zoneId : true) && r.scheduleId === sched.id
      );
      const real = recs.length > 0 ? recs.reduce((s, r) => s + r.promoterCount, 0) : null;
      const planned = dailyStaffing[di];

      if (real !== null && canApplyRule && fl) {
        const isFL = sched.id === fl.first || sched.id === fl.last;
        if (isFL && planned > 0 && real >= planned * 0.5) {
          hasRule = true;
          return { real, effective: planned, ruleApplied: true };
        }
      }
      return { real, effective: real, ruleApplied: false };
    });
  });

  /* Averages per schedule */
  const schedAvgs = cellData.map(row => {
    const vals = row.filter(c => c.real !== null).map(c => c.effective || 0);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });

  return (
    <div className="rounded-xl overflow-hidden text-[10px]" style={{ border: '0.5px solid var(--color-border-tertiary, #e5e5e5)' }}>
      <div className="px-3 py-2 font-medium text-xs" style={{ background: 'var(--color-background-secondary, #f5f5f5)' }}>
        {termName}{zoneId !== 'default' ? ` — ${zoneName}` : ''}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 500 }}>
          <thead>
            {/* Date row */}
            <tr style={{ background: '#f9f9f9' }}>
              <th className="px-2 py-1.5 text-left font-medium" style={{ borderBottom: '0.5px solid #eee', width: 70 }}>FECHA</th>
              {days.map((d, i) => (
                <th key={i} className="px-1 py-1.5 text-center font-medium" style={{ borderBottom: '0.5px solid #eee' }}>
                  {d.getDate()}-{MONTHS_LOWER[d.getMonth()].substring(0, 3)}
                </th>
              ))}
              <th className="px-2 py-1.5 text-center font-medium" style={{ borderBottom: '0.5px solid #eee' }}>PROM</th>
            </tr>
            {/* Target row */}
            <tr>
              <td className="px-2 py-1 font-medium" style={{ borderBottom: '0.5px solid #eee', color: '#888' }}>POS. POR ÁREA</td>
              {days.map((_, i) => (
                <td key={i} className="px-1 py-1 text-center" style={{ borderBottom: '0.5px solid #eee' }}>{targetVal}</td>
              ))}
              <td className="px-2 py-1 text-center" style={{ borderBottom: '0.5px solid #eee' }}>{targetVal}</td>
            </tr>
            {/* Staffing row */}
            <tr>
              <td className="px-2 py-1 font-medium" style={{ borderBottom: '0.5px solid #eee', color: '#888' }}>SALA / Hora</td>
              {dailyStaffing.map((v, i) => (
                <td key={i} className="px-1 py-1 text-center" style={{ borderBottom: '0.5px solid #eee' }}>{v}</td>
              ))}
              <td className="px-2 py-1 text-center" style={{ borderBottom: '0.5px solid #eee' }}>
                {dailyStaffing.length > 0 ? (dailyStaffing.reduce((a, b) => a + b, 0) / dailyStaffing.length).toFixed(1) : '—'}
              </td>
            </tr>
          </thead>
          <tbody>
            {schedules.map((sched, si) => (
              <tr key={sched.id}>
                <td className="px-2 py-1 font-medium" style={{ borderBottom: '0.5px solid #f0f0f0' }}>{sched.time}</td>
                {cellData[si].map((cell, di) => {
                  const cellStyle: React.CSSProperties = { borderBottom: '0.5px solid #f0f0f0' };
                  if (cell.ruleApplied) {
                    cellStyle.background = '#E6F1FB';
                    cellStyle.color = '#0C447C';
                    cellStyle.fontWeight = 600;
                  }
                  return (
                    <td key={di} className="px-1 py-1 text-center" style={cellStyle}>
                      {cell.real !== null ? (cell.ruleApplied ? `${cell.real} ★ ${cell.effective}` : cell.real) : ''}
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-center font-medium" style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                  {schedAvgs[si] !== null ? schedAvgs[si]!.toFixed(1) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasRule && (
        <p className="px-3 py-2 text-[9px]" style={{ color: '#0C447C', background: '#F0F7FF' }}>
          ★ Regla del 50% aplicada — La asistencia en este horario alcanzó o superó el 50% de las posiciones del plan de operaciones, por lo que se reconoce el 100% de ocupación.
        </p>
      )}
    </div>
  );
}

export default Reports;
