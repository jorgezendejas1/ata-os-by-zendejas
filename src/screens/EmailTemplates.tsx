import React, { useState, useEffect, useMemo } from 'react';
import { Mails, ChevronDown, ChevronUp, Save, Loader2, Eye } from 'lucide-react';
import { getEmailTemplates, saveEmailTemplate, EmailTemplate, showToast } from '../services/db';

const MONTHS_LOWER = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function getCurrentWeekVars() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToThu = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;
  const start = new Date(now);
  start.setDate(now.getDate() - daysToThu);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: String(start.getDate()).padStart(2, '0'),
    end: String(end.getDate()).padStart(2, '0'),
    month: MONTHS_LOWER[end.getMonth()],
    year: String(end.getFullYear()),
  };
}

function applyVars(template: string, vars: Record<string, string>) {
  return template
    .replace(/\{start\}/g, vars.start)
    .replace(/\{end\}/g, vars.end)
    .replace(/\{month\}/g, vars.month)
    .replace(/\{year\}/g, vars.year);
}

const EmailTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, EmailTemplate>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bccText, setBccText] = useState<Record<string, string>>({});

  const vars = useMemo(() => getCurrentWeekVars(), []);

  useEffect(() => {
    getEmailTemplates().then(data => {
      setTemplates(data);
      const d: Record<string, EmailTemplate> = {};
      const b: Record<string, string> = {};
      data.forEach(t => {
        d[t.email_type] = { ...t };
        b[t.email_type] = t.bcc_recipients.join(', ');
      });
      setDrafts(d);
      setBccText(b);
      setLoading(false);
    });
  }, []);

  const updateDraft = (id: string, patch: Partial<EmailTemplate>) => {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleSave = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    const bcc = bccText[id].split(',').map(e => e.trim()).filter(Boolean);
    const final = { ...draft, bcc_recipients: bcc };
    setSavingId(id);
    try {
      await saveEmailTemplate(final);
      setTemplates(prev => prev.map(t => t.email_type === id ? final : t));
    } catch {/* */} finally { setSavingId(null); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-40 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Cargando plantillas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 p-2 md:p-0 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-10 px-4 md:px-0">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-3.5 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm">
          <Mails size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Plantillas de Correo</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Variables: {'{start} {end} {month} {year}'}</p>
        </div>
      </div>

      <div className="space-y-3">
        {templates.map(t => {
          const isOpen = expanded === t.email_type;
          const draft = drafts[t.email_type] || t;
          const previewSubject = applyVars(draft.subject_template, vars);
          return (
            <div key={t.email_type} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : t.email_type)}
                className="w-full p-5 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-mono font-black rounded-md">{t.email_type}</span>
                    <span className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">{t.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1.5">
                    <Eye size={11} /> {previewSubject}
                  </p>
                </div>
                {isOpen ? <ChevronUp size={20} className="text-gray-400 shrink-0" /> : <ChevronDown size={20} className="text-gray-400 shrink-0" />}
              </button>

              {isOpen && (
                <div className="border-t dark:border-gray-800 p-6 space-y-5 bg-gray-50/30 dark:bg-gray-800/20">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Asunto (subject_template)</label>
                    <input
                      value={draft.subject_template}
                      onChange={e => updateDraft(t.email_type, { subject_template: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono outline-none focus:ring-4 focus:ring-blue-500/10"
                    />
                    <p className="text-[10px] text-gray-400 mt-1.5">Vista previa: <span className="font-bold text-gray-600 dark:text-gray-300">{previewSubject}</span></p>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Cuerpo (body_template)</label>
                    <textarea
                      value={draft.body_template}
                      onChange={e => updateDraft(t.email_type, { body_template: e.target.value })}
                      rows={10}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-mono outline-none focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                      Destinatarios BCC (separados por coma)
                    </label>
                    <textarea
                      value={bccText[t.email_type] || ''}
                      onChange={e => setBccText(prev => ({ ...prev, [t.email_type]: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10"
                      placeholder="email1@dominio.com, email2@dominio.com"
                    />
                    <p className="text-[10px] text-gray-400 mt-1.5">{(bccText[t.email_type] || '').split(',').filter(s => s.trim()).length} destinatarios</p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSave(t.email_type)}
                      disabled={savingId === t.email_type}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {savingId === t.email_type ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Guardar plantilla
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmailTemplates;
