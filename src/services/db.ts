
import { supabase } from '@/integrations/supabase/client';
import { AttendanceRecord, User, StaffingEntry, Task, PositionTarget, EmailAutomationConfig, SentEmailLog, AppNotification } from '../types';
import { INITIAL_MASTER_USER } from '../constants';

// --- GLOBAL NOTIFICATIONS HELPER ---
export const showToast = (message: string, type: AppNotification['type'] = 'info', title?: string) => {
  const event = new CustomEvent('app-notify', {
    detail: { id: Math.random().toString(36).substring(2), message, type, title }
  });
  window.dispatchEvent(event);
};

// --- USUARIOS ---

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    showToast("No se pudieron cargar los usuarios", "error");
    return [];
  }
  return (data || []) as unknown as User[];
};

export const saveUser = async (user: User) => {
  const { error } = await supabase.from('users').upsert(user as any);
  if (error) {
    showToast("Error al guardar usuario", "error");
    throw error;
  }
  showToast("Usuario actualizado correctamente", "success");
};

export const deleteUser = async (id: string) => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) {
    showToast("No se pudo eliminar el usuario", "error");
    throw error;
  }
  showToast("Usuario eliminado", "info");
};

export const authenticate = async (email: string, pass: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('password_hash', pass)
    .single();
  
  if (error) return null;
  return data as unknown as User;
};

// --- REGISTROS DE ASISTENCIA ---

export const getRecords = async (): Promise<AttendanceRecord[]> => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .order('dateRegistered', { ascending: false })
    .order('timeRegistered', { ascending: false });
    
  if (error) {
    console.error('Error fetching records:', error.message);
    return [];
  }
  return (data || []) as unknown as AttendanceRecord[];
};

export const saveRecords = async (newRecords: AttendanceRecord[]) => {
  const { error } = await supabase.from('attendance_records').insert(newRecords as any[]);
  if (error) {
    showToast("Error crítico al sincronizar asistencias", "error");
    console.error('Error saving records:', error);
    throw error;
  }
  showToast(`Sincronización exitosa: ${newRecords.length} registros`, "success");
};

export const updateAttendanceRecord = async (record: AttendanceRecord, editorName?: string) => {
  const { error } = await supabase.from('attendance_records').update(record as any).eq('id', record.id);
  if (error) {
    showToast("No se pudo actualizar el registro", "error");
    throw error;
  }
  showToast("Registro actualizado correctamente", "success");
};

export const deleteAttendanceRecord = async (id: string) => {
  const { error } = await supabase.from('attendance_records').delete().eq('id', id);
  if (error) {
    showToast("Error al eliminar registro de asistencia", "error");
    throw error;
  }
  showToast("Registro eliminado de la bitácora", "info");
};

// --- DISTRIBUCIÓN (STAFFING) ---

export const getStaffing = async (terminalId: string, year: number, month: number): Promise<StaffingEntry[]> => {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  let query = supabase
    .from('staffing')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (terminalId !== 'all') {
    query = query.eq('terminalId', terminalId);
  }
    
  const { data, error } = await query;
  
  if (error) {
    console.error("Error loading staffing:", error);
    return [];
  }
  
  return (data || []).map((item: any) => ({
    date: item.date,
    terminalId: item.terminalId || item.terminalid || item.terminal_id,
    zoneId: item.zoneId || item.zoneid || item.zone_id,
    companyId: item.companyId || item.companyid || item.company_id,
    count: Number(item.count || 0)
  }));
};

export const saveStaffingBatch = async (entries: StaffingEntry[]) => {
  if (entries.length === 0) return;

  const dbEntries = entries.map(e => ({
    date: e.date,
    terminalId: e.terminalId,
    zoneId: e.zoneId,
    companyId: e.companyId,
    count: e.count
  }));

  const { error } = await supabase
    .from('staffing')
    .upsert(dbEntries as any[], { onConflict: 'date,terminalId,zoneId,companyId' })
    .select();
  
  if (error) {
    console.error("Staffing Error:", error);
    throw error;
  }
  
  showToast("Distribución sincronizada con éxito", "success");
};

export const getPlannedCount = async (date: string, terminalId: string, zoneId: string | undefined, companyId: string): Promise<number | null> => {
  const zoneKey = zoneId || 'default';
  
  const { data, error } = await supabase
    .from('staffing')
    .select('count')
    .eq('date', date)
    .eq('terminalId', terminalId)
    .eq('zoneId', zoneKey)
    .eq('companyId', companyId)
    .maybeSingle();
    
  if (error || !data) return null;
  return Number(data.count);
};

// --- METAS (TARGETS) ---

export const getTargets = async (): Promise<PositionTarget[]> => {
  const { data, error } = await supabase.from('targets').select('*');
  if (error) return [];
  
  return (data || []).map((item: any) => ({
    terminalId: item.terminalId || item.terminalid || item.terminal_id,
    zoneId: item.zoneId || item.zoneid || item.zone_id,
    companyId: item.companyId || item.companyid || item.company_id,
    count: Number(item.count || 0)
  }));
};

export const saveTargets = async (targets: PositionTarget[]) => {
  const { error } = await supabase.from('targets').upsert(targets as any[], { onConflict: 'terminalId,zoneId,companyId' });
  
  if (error) {
    console.error("Targets Error:", error);
    showToast(`Error Metas: ${error.message}`, "error");
    throw error;
  }
  showToast("Posiciones actualizadas correctamente", "success");
};

// --- ROADMAP (TAREAS) ---

export const getTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase.from('tasks').select('*');
  if (error) return [];
  
  return (data || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate || t.due_date,
    createdAt: t.createdAt || t.created_at
  })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const saveTask = async (task: Task) => {
  const { error } = await supabase.from('tasks').upsert(task as any);
  if (error) throw error;
};

export const deleteTask = async (id: string) => {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
};

// --- CONFIGURACIÓN ---

export const getEmailConfig = async (): Promise<EmailAutomationConfig> => {
  const { data, error } = await supabase.from('config').select('*').eq('id', 'email_automation').maybeSingle();
  if (error || !data) return { recipients: [], enabled: false, lastSentWeekId: '' };
  return (data as any).value;
};

export const saveEmailConfig = async (config: EmailAutomationConfig) => {
  const { error } = await supabase.from('config').upsert({ id: 'email_automation', value: config } as any);
  if (error) throw error;
};

export const getEmailLogs = async (): Promise<SentEmailLog[]> => {
  const { data, error } = await supabase.from('email_logs').select('*').order('date', { ascending: false });
  if (error) return [];
  return (data || []) as unknown as SentEmailLog[];
};

export const saveEmailLog = async (log: SentEmailLog) => {
  await supabase.from('email_logs').insert(log as any);
};

export const initDB = async () => {
  try {
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await saveUser(INITIAL_MASTER_USER as User);
    }
  } catch (e) {
    console.warn("DB Init warning:", e);
  }
};

export type AppTheme = 'light' | 'dark' | 'system';
export const getTheme = (): AppTheme => (localStorage.getItem('app_ui_theme') as AppTheme) || 'system';
export const saveTheme = (theme: AppTheme) => localStorage.setItem('app_ui_theme', theme);

// --- PROMOTORES ---

export interface Promoter {
  id: string;
  company_id: string;
  name: string;
  terminal_id: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const getPromoters = async (): Promise<Promoter[]> => {
  const { data, error } = await supabase
    .from("promoters")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) { showToast("Error al cargar promotores", "error"); return []; }
  return (data || []) as Promoter[];
};

export const updatePromoter = async (p: Promoter): Promise<void> => {
  const { error } = await supabase
    .from("promoters")
    .update({ ...p, updated_at: new Date().toISOString() })
    .eq("id", p.id);
  if (error) { showToast("Error al actualizar promotor", "error"); throw error; }
  showToast("Promotor actualizado", "success");
};

export const deletePromoter = async (id: string): Promise<void> => {
  const { error } = await supabase.from('promoters').delete().eq('id', id);
  if (error) { showToast('No se pudo eliminar el promotor', 'error'); throw error; }
  showToast('Promotor eliminado', 'info');
};

// --- EMPRESAS (COMPANIES) ---

export interface Company {
  id?: string;
  name: string;
  short_name: string;
  abbreviation: string;
  color: string;
  text_color: string;
  active: boolean;
  terminals: string[];
  created_at?: string;
}

export const getCompanies = async (): Promise<Company[]> => {
  const { data, error } = await supabase.from('companies' as any).select('*').order('name');
  if (error) { showToast('Error al cargar empresas', 'error'); return []; }
  return (data || []) as unknown as Company[];
};

export const saveCompany = async (c: Company): Promise<void> => {
  const { error } = await supabase.from('companies' as any).upsert(c as any);
  if (error) { showToast('Error al guardar empresa', 'error'); throw error; }
  showToast('Empresa guardada', 'success');
};

export const deleteCompany = async (id: string): Promise<void> => {
  const { error } = await supabase.from('companies' as any).delete().eq('id', id);
  if (error) { showToast('Error al eliminar empresa', 'error'); throw error; }
  showToast('Empresa eliminada', 'info');
};

// --- ADC (AVISOS DE COMPROMISO) ---

export interface AdcRecord {
  id?: string;
  month: number;
  year: number;
  week_number: number;
  week_start: string;
  week_end: string;
  company_id: string;
  promoter_name: string;
  adc_date: string;
  terminal_id: string;
  desarrollo: string;
  tipo_adc: string;
  supervisor_ata: string;
  supervisor_desarrollo: string;
  se_retira_tia: boolean;
  tercer_aviso: boolean;
  descripcion: string;
  fecha_limite: string;
}

export const getAdcRecords = async (
  month: number, year: number, week_number: number, company_id: string
): Promise<AdcRecord[]> => {
  const { data, error } = await supabase
    .from("adc_records").select("*")
    .eq("month", month).eq("year", year)
    .eq("week_number", week_number).eq("company_id", company_id);
  if (error) { showToast("Error al cargar ADCs", "error"); return []; }
  return (data || []) as AdcRecord[];
};

export const saveAdcRecords = async (records: AdcRecord[]): Promise<void> => {
  const { error } = await supabase.from("adc_records").insert(records as any[]);
  if (error) { showToast("Error al guardar ADCs", "error"); throw error; }
  showToast(`${records.length} ADC(s) guardados correctamente`, "success");
};

export const clearAdcRecords = async (
  month: number, year: number, week_number: number, company_id: string
): Promise<void> => {
  const { error } = await supabase.from("adc_records").delete()
    .eq("month", month).eq("year", year)
    .eq("week_number", week_number).eq("company_id", company_id);
  if (error) { showToast("Error al limpiar ADCs", "error"); throw error; }
};
