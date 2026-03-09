// services/db.ts - LocalStorage-based database service for ATA OS
// This will be migrated to Lovable Cloud (Supabase) in a future step

import { User, AttendanceRecord, StaffingEntry, PositionTarget, Task, EmailAutomationConfig, SentEmailLog, AppNotification } from '../types';
import { INITIAL_MASTER_USER } from '../constants';

export type AppTheme = 'light' | 'dark' | 'system';

const KEYS = {
  USERS: 'ata_os_users',
  RECORDS: 'ata_os_records',
  STAFFING: 'ata_os_staffing',
  TARGETS: 'ata_os_targets',
  TASKS: 'ata_os_tasks',
  EMAIL_CONFIG: 'ata_os_email_config',
  EMAIL_LOGS: 'ata_os_email_logs',
  THEME: 'ata_os_theme',
};

// --- Toast / Notification System ---
export const showToast = (message: string, type: AppNotification['type'] = 'info', title?: string) => {
  const notification: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type,
    message,
    title
  };
  window.dispatchEvent(new CustomEvent('app-notify', { detail: notification }));
};

// --- Init ---
export const initDB = async (): Promise<void> => {
  const users = localStorage.getItem(KEYS.USERS);
  if (!users) {
    localStorage.setItem(KEYS.USERS, JSON.stringify([INITIAL_MASTER_USER]));
  }
  // Initialize other stores if empty
  if (!localStorage.getItem(KEYS.RECORDS)) localStorage.setItem(KEYS.RECORDS, JSON.stringify([]));
  if (!localStorage.getItem(KEYS.STAFFING)) localStorage.setItem(KEYS.STAFFING, JSON.stringify([]));
  if (!localStorage.getItem(KEYS.TARGETS)) localStorage.setItem(KEYS.TARGETS, JSON.stringify([]));
  if (!localStorage.getItem(KEYS.TASKS)) localStorage.setItem(KEYS.TASKS, JSON.stringify([]));
};

// --- Theme ---
export const getTheme = (): AppTheme => {
  return (localStorage.getItem(KEYS.THEME) as AppTheme) || 'system';
};

export const saveTheme = (theme: AppTheme): void => {
  localStorage.setItem(KEYS.THEME, theme);
};

// --- Auth ---
export const authenticate = async (email: string, password: string): Promise<User | null> => {
  const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]') as User[];
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password_hash === password);
  return user || null;
};

// --- Users ---
export const getUsers = async (): Promise<User[]> => {
  return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
};

export const saveUser = async (user: User): Promise<void> => {
  const users = await getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  showToast("Usuario guardado correctamente", "success");
};

export const deleteUser = async (id: string): Promise<void> => {
  const users = await getUsers();
  localStorage.setItem(KEYS.USERS, JSON.stringify(users.filter(u => u.id !== id)));
  showToast("Usuario eliminado", "error");
};

// --- Records ---
export const getRecords = async (): Promise<AttendanceRecord[]> => {
  return JSON.parse(localStorage.getItem(KEYS.RECORDS) || '[]');
};

export const saveRecords = async (newRecords: AttendanceRecord[]): Promise<void> => {
  const existing = await getRecords();
  localStorage.setItem(KEYS.RECORDS, JSON.stringify([...existing, ...newRecords]));
  showToast(`${newRecords.length} registros sincronizados`, "success");
};

export const updateAttendanceRecord = async (record: AttendanceRecord, editorName: string): Promise<void> => {
  const records = await getRecords();
  const idx = records.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    const old = records[idx];
    const history = old.history || [];
    
    if (old.plannedCount !== record.plannedCount) {
      history.push({ date: new Date().toISOString(), editorName, field: 'Meta', oldValue: old.plannedCount || 0, newValue: record.plannedCount || 0 });
    }
    if (old.promoterCount !== record.promoterCount) {
      history.push({ date: new Date().toISOString(), editorName, field: 'Real', oldValue: old.promoterCount, newValue: record.promoterCount });
    }
    
    records[idx] = { ...record, history };
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
    showToast("Registro actualizado", "info");
  }
};

export const deleteAttendanceRecord = async (id: string): Promise<void> => {
  const records = await getRecords();
  localStorage.setItem(KEYS.RECORDS, JSON.stringify(records.filter(r => r.id !== id)));
  showToast("Registro eliminado permanentemente", "error");
};

export const getPlannedCount = async (date: string, terminalId: string, zoneId: string | undefined, companyId: string): Promise<number | null> => {
  const staffing = JSON.parse(localStorage.getItem(KEYS.STAFFING) || '[]') as StaffingEntry[];
  const entry = staffing.find(s => s.date === date && s.terminalId === terminalId && s.zoneId === (zoneId || 'default') && s.companyId === companyId);
  return entry ? entry.count : null;
};

// --- Staffing ---
export const getStaffing = async (terminalId: string, year: number, month: number): Promise<StaffingEntry[]> => {
  const all = JSON.parse(localStorage.getItem(KEYS.STAFFING) || '[]') as StaffingEntry[];
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  return all.filter(s => {
    if (terminalId !== 'all' && s.terminalId !== terminalId) return false;
    return s.date.startsWith(monthStr);
  });
};

export const saveStaffingBatch = async (entries: StaffingEntry[]): Promise<void> => {
  const all = JSON.parse(localStorage.getItem(KEYS.STAFFING) || '[]') as StaffingEntry[];
  
  entries.forEach(entry => {
    const idx = all.findIndex(s => s.date === entry.date && s.terminalId === entry.terminalId && s.zoneId === entry.zoneId && s.companyId === entry.companyId);
    if (idx >= 0) {
      all[idx] = entry;
    } else {
      all.push(entry);
    }
  });
  
  localStorage.setItem(KEYS.STAFFING, JSON.stringify(all));
  showToast(`${entries.length} entradas de staffing guardadas`, "success");
};

// --- Targets ---
export const getTargets = async (): Promise<PositionTarget[]> => {
  return JSON.parse(localStorage.getItem(KEYS.TARGETS) || '[]');
};

export const saveTargets = async (targets: PositionTarget[]): Promise<void> => {
  localStorage.setItem(KEYS.TARGETS, JSON.stringify(targets));
  showToast("Posiciones guardadas correctamente", "success");
};

// --- Tasks ---
export const getTasks = async (): Promise<Task[]> => {
  return JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
};

export const saveTask = async (task: Task): Promise<void> => {
  const tasks = await getTasks();
  const idx = tasks.findIndex(t => t.id === task.id);
  if (idx >= 0) {
    tasks[idx] = task;
  } else {
    tasks.push(task);
  }
  localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
};

export const deleteTask = async (id: string): Promise<void> => {
  const tasks = await getTasks();
  localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks.filter(t => t.id !== id)));
};

// --- Email Config ---
export const getEmailConfig = async (): Promise<EmailAutomationConfig | null> => {
  const data = localStorage.getItem(KEYS.EMAIL_CONFIG);
  return data ? JSON.parse(data) : null;
};

export const getEmailLogs = async (): Promise<SentEmailLog[]> => {
  return JSON.parse(localStorage.getItem(KEYS.EMAIL_LOGS) || '[]');
};
