
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showToast, getEmailLogs, getEmailTemplates, EmailTemplate } from '../services/db';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Mail, Send, CheckCircle2, FileText, ChevronDown, ChevronUp, Eye, RefreshCw } from 'lucide-react';

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

const TO_FIXED = ['karladavila@airport-ta.com', 'dbriseno@ata-supervisor.com'];

const BCC_CID = ['vtrava@elcid.com.mx','efhernandez@elcid.com.mx','alexruizrame@hotmail.com','josepepepepe@hotmail.com','ocitherlet@elcid.com.mx','fhernandez@ata-supervisor.com'];
const BCC_SUN: string[] = [];
const BCC_XCA = ['mdominguezdu@mexicodestinationclub.com','sanguiano@mexicodestinationclub.com','mnavarroc@mexicodestinationclub.com','jgonzalezr@experienciasxcaret.com.mx','mhernandezch@experienciasxcaret.com.mx','padelmoral@mexicodestinationclub.com','fhernandez@ata-supervisor.com','aolimon@mexicodestinationclub.com'];
const BCC_VDP = ['gtemktb@villagroupcancun.com','adireccionmktcan@villagroup.com','bob.kistner@taferresorts.com','miguel.juarez@taferresorts.com','fgc1422@gmail.com','asismarketing@villagroup.com','marin.manuel14@yahoo.com.mx','auxmkt@taferresorts.com','fhernandez@ata-supervisor.com'];
const BCC_KRY = ['tfischer@kivc.com','eliz07-11@hotmail.com','gsierra@kivc.com','ccomeau@kivc.com','fhernandez@ata-supervisor.com'];
const BCC_PREMIOS = [...new Set([...BCC_CID,...BCC_SUN,...BCC_XCA,...BCC_VDP,...BCC_KRY,'gbernal@grand-club.com'])];
const BCC_MODULOS = ['sanguiano@mexicodestinationclub.com','gtemktb@villagroupcancun.com','rroths@airport-ta.com','jruiz@airport-ta.com','elizgarcia@airport-ta.com','gsierra@kivc.com','marin.manuel14@yahoo.com.mx','mnavarroc@mexicodestinationclub.com','padelmoral@mexicodestinationclub.com','fhernandez@ata-supervisor.com'];

interface EmailDef {
  email_type: string;
  company_id: string;
  label: string;
  bcc: string[];
  subjectFn: (startDay: string, endDay: string, monthName: string, year: number) => string;
}

const EMAIL_DEFS: EmailDef[] = [
  { email_type: 'ASISTENCIA_CID', company_id: 'c4', label: 'Asistencia CID', bcc: BCC_CID,
    subjectFn: (s,e,m,y) => `CID - ${s} al ${e} de ${m}  ${y} - Reporte` },
  { email_type: 'ASISTENCIA_SUN', company_id: 'c1', label: 'Asistencia Sunset', bcc: BCC_SUN,
    subjectFn: (s,e,m,y) => `SUN - ${s} al ${e} de ${m}  ${y} - Reporte` },
  { email_type: 'ASISTENCIA_XCA', company_id: 'c2', label: 'Asistencia XCA', bcc: BCC_XCA,
    subjectFn: (s,e,m,y) => `XCA - ${s} al ${e} de ${m}  ${y} - Reporte` },
  { email_type: 'ASISTENCIA_VDP', company_id: 'c3', label: 'Asistencia VDP', bcc: BCC_VDP,
    subjectFn: (s,e,m,y) => `VDP - ${s} al ${e} de ${m}  ${y} - Reporte` },
  { email_type: 'ASISTENCIA_KRY', company_id: 'c5', label: 'Asistencia KRY', bcc: BCC_KRY,
    subjectFn: (s,e,m,y) => `KRY - ${s} al ${e} de ${m}  ${y} - Reporte` },
  { email_type: 'PREMIOS', company_id: '', label: 'Premios', bcc: BCC_PREMIOS,
    subjectFn: (s,e,m,y) => `PREMIOS - ${s} al ${e} de ${m}  ${y}` },
  { email_type: 'MODULOS_T4', company_id: '', label: 'Módulos T4', bcc: BCC_MODULOS,
    subjectFn: (s,e,m,y) => `T4 POSICIONES DE MÓDULOS - ${s} al ${e} de ${m}  ${y}` },
];

const FIRMA = `\n\nJorge Zendejas Lovera\nSupervisor | Airport Travel Advisors\nCel. 998 939 0506`;

interface QueueEntry {
  id?: string;
  month: number;
  year: number;
  week_number: number;
  email_type: string;
  company_id: string;
  subject: string;
  body: string;
  to_recipients: string[];
  bcc_recipients: string[];
  status: string;
  sent_at?: string;
}

const Correos: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [weekNumber, setWeekNumber] = useState(1);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [expandedBcc, setExpandedBcc] = useState<Record<string, boolean>>({});
  const [editingBody, setEditingBody] = useState<string | null>(null);
  const [editBodyText, setEditBodyText] = useState('');
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbTemplates, setDbTemplates] = useState<Record<string, EmailTemplate>>({});

  useEffect(() => {
    getEmailTemplates().then(data => {
      if (data && data.length > 0) {
        const map: Record<string, EmailTemplate> = {};
        data.forEach(t => { map[t.email_type] = t; });
        setDbTemplates(map);
      }
    }).catch(() => {/* fallback a EMAIL_DEFS */});
  }, []);

  const weeks = useMemo(() => getMonthWeeks(year, month), [year, month]);
  const activeWeek = useMemo(() => weeks.find(w => w.number === weekNumber) || weeks[0], [weeks, weekNumber]);

  useEffect(() => {
    if (weeks.length > 0 && !weeks.find(w => w.number === weekNumber)) {
      setWeekNumber(weeks[0].number);
    }
  }, [weeks, weekNumber]);

  const generateSubject = useCallback((def: EmailDef) => {
    if (!activeWeek) return '';
    const startDay = String(activeWeek.start.getDate()).padStart(2, '0');
    const endDay = String(activeWeek.end.getDate()).padStart(2, '0');
    const monthName = MONTHS_LOWER[activeWeek.end.getMonth()];
    const yr = activeWeek.end.getFullYear();
    const tpl = dbTemplates[def.email_type];
    if (tpl?.subject_template) {
      return tpl.subject_template
        .replace(/\{start\}/g, startDay)
        .replace(/\{end\}/g, endDay)
        .replace(/\{month\}/g, monthName)
        .replace(/\{year\}/g, String(yr));
    }
    return def.subjectFn(startDay, endDay, monthName, yr);
  }, [activeWeek, dbTemplates]);

  const generateBody = useCallback((def: EmailDef) => {
    if (!activeWeek) return '';
    const startDay = String(activeWeek.start.getDate()).padStart(2, '0');
    const endDay = String(activeWeek.end.getDate()).padStart(2, '0');
    const monthName = MONTHS_LOWER[activeWeek.end.getMonth()];
    const yr = activeWeek.end.getFullYear();
    const tpl = dbTemplates[def.email_type];
    if (tpl?.body_template) {
      return tpl.body_template
        .replace(/\{start\}/g, startDay)
        .replace(/\{end\}/g, endDay)
        .replace(/\{month\}/g, monthName)
        .replace(/\{year\}/g, String(yr));
    }
    return `Buen día,\n\nAdjunto el reporte correspondiente a la semana del ${startDay} al ${endDay} de ${monthName} ${yr}.${FIRMA}`;
  }, [activeWeek, dbTemplates]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_queue')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .eq('week_number', weekNumber);

      if (error) throw error;
      setQueueEntries((data || []) as unknown as QueueEntry[]);

      const logs = await getEmailLogs();
      setEmailLogs(logs);
    } catch (err) {
      console.error('Error loading queue:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year, weekNumber]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const getQueueEntry = (emailType: string) => {
    return queueEntries.find(e => e.email_type === emailType);
  };

  const handlePrepareAll = async () => {
    if (!activeWeek) return;
    setLoading(true);
    try {
      const records = EMAIL_DEFS.map(def => ({
        month, year, week_number: weekNumber,
        email_type: def.email_type,
        company_id: def.company_id || '',
        subject: generateSubject(def),
        body: generateBody(def),
        to_recipients: TO_FIXED,
        bcc_recipients: def.bcc,
        status: 'DRAFT',
      }));

      for (const rec of records) {
        const existing = getQueueEntry(rec.email_type);
        if (existing?.id) {
          await supabase.from('email_queue').update({
            subject: rec.subject,
            body: rec.body,
            to_recipients: rec.to_recipients,
            bcc_recipients: rec.bcc_recipients,
          } as any).eq('id', existing.id);
        } else {
          await supabase.from('email_queue').insert(rec as any);
        }
      }

      showToast('7 correos preparados como borrador', 'success');
      await loadQueue();
    } catch (err) {
      console.error('Prepare error:', err);
      showToast('Error al preparar correos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSent = async (emailType: string) => {
    const entry = getQueueEntry(emailType);
    if (!entry?.id) return;
    try {
      await supabase.from('email_queue').update({
        status: 'SENT',
        sent_at: new Date().toISOString(),
      } as any).eq('id', entry.id);
      showToast('Correo marcado como enviado', 'success');
      await loadQueue();
    } catch (err) {
      showToast('Error al marcar como enviado', 'error');
    }
  };

  const handleSaveBody = async () => {
    if (!editingBody) return;
    const entry = getQueueEntry(editingBody);
    if (!entry?.id) return;
    try {
      await supabase.from('email_queue').update({ body: editBodyText } as any).eq('id', entry.id);
      showToast('Cuerpo actualizado', 'success');
      setEditingBody(null);
      await loadQueue();
    } catch (err) {
      showToast('Error al guardar cuerpo', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 p-2 md:p-0 animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3.5 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm">
            <Mail size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Correos</h2>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em]">7 correos semanales</p>
          </div>
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
        <Button onClick={handlePrepareAll} disabled={loading} className="gap-2">
          <FileText size={14} /> Preparar todos
        </Button>
        <Button variant="outline" size="sm" onClick={loadQueue} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Email List */}
      <div className="space-y-3">
        {EMAIL_DEFS.map(def => {
          const entry = getQueueEntry(def.email_type);
          const isSent = entry?.status === 'SENT';
          const isDraft = entry?.status === 'DRAFT';
          const bccExpanded = expandedBcc[def.email_type] || false;

          return (
            <div key={def.email_type} className={`rounded-2xl border p-4 space-y-2 ${isSent ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-background'}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge variant={isSent ? 'default' : isDraft ? 'secondary' : 'outline'} className={`text-[10px] font-black uppercase shrink-0 ${isSent ? 'bg-emerald-600' : ''}`}>
                    {isSent ? 'ENVIADO' : isDraft ? 'BORRADOR' : 'SIN PREPARAR'}
                  </Badge>
                  <span className="text-sm font-bold text-foreground truncate">
                    {entry?.subject || generateSubject(def)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isDraft && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { setEditingBody(def.email_type); setEditBodyText(entry?.body || ''); }}>
                        <Eye size={14} /> Ver cuerpo
                      </Button>
                      <Button size="sm" onClick={() => handleMarkSent(def.email_type)} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle2 size={14} /> Marcar enviado
                      </Button>
                    </>
                  )}
                  {isSent && entry?.sent_at && (
                    <span className="text-[10px] text-muted-foreground font-bold">
                      {new Date(entry.sent_at).toLocaleString('es-MX')}
                    </span>
                  )}
                </div>
              </div>

              {/* Recipients */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div><span className="font-bold">To:</span> {TO_FIXED.join(', ')}</div>
                <div className="flex items-start gap-1">
                  <span className="font-bold shrink-0">BCC ({def.bcc.length}):</span>
                  <div className="flex-1">
                    {bccExpanded ? (
                      <span>{def.bcc.join(', ')}</span>
                    ) : (
                      <span>{def.bcc.slice(0, 2).join(', ')}{def.bcc.length > 2 ? ` +${def.bcc.length - 2} más` : ''}</span>
                    )}
                    {def.bcc.length > 2 && (
                      <button
                        onClick={() => setExpandedBcc(prev => ({ ...prev, [def.email_type]: !bccExpanded }))}
                        className="ml-1 text-blue-500 hover:underline inline-flex items-center"
                      >
                        {bccExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Body Editor Modal */}
      {editingBody && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-2xl p-6 space-y-4">
            <h3 className="text-lg font-black uppercase tracking-tight">
              Editar cuerpo — {EMAIL_DEFS.find(d => d.email_type === editingBody)?.label}
            </h3>
            <Textarea
              value={editBodyText}
              onChange={e => setEditBodyText(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingBody(null)}>Cancelar</Button>
              <Button onClick={handleSaveBody}><Send size={14} /> Guardar cuerpo</Button>
            </div>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="space-y-3">
        <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Historial de envíos</h2>
        {emailLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay registros de envíos anteriores.</p>
        ) : (
          <div className="rounded-2xl border bg-background overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Fecha</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Asunto</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Destinatarios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs.slice(0, 20).map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">{log.date}</TableCell>
                    <TableCell className="text-xs font-bold">{log.subject}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[300px]">{log.recipients}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Correos;
