export type Role = 'MASTER' | 'REPORTES' | 'GENERICO';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  name: string;
  createdAt: string;
  assignedTerminals?: string[];
}

export interface Company {
  id: string;
  name: string;
  short_name?: string;
  abbreviation?: string;
  color?: string;
  text_color?: string;
}

export interface Terminal {
  id: string;
  name: string;
  allowedCompanies?: string[];
  allowedSchedules?: string[];
  hasZones: boolean;
  isActive: boolean;
}

export interface Zone {
  id: string;
  name: string;
  terminalId: string;
  isDummy?: boolean;
}

export interface Schedule {
  id: string;
  time: string;
}

export interface RecordEditLog {
  date: string;
  editorName: string;
  field: 'Meta' | 'Real';
  oldValue: number;
  newValue: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  companyId: string;
  companyName: string;
  terminalId: string;
  terminalName: string;
  zoneId?: string;
  zoneName?: string;
  scheduleId: string;
  scheduleTime: string;
  promoterCount: number;
  plannedCount?: number;
  supervisorSignature: string;
  dateRegistered: string;
  timeRegistered: string;
  createdAt: string;
  history?: RecordEditLog[];
}

export interface AttendanceFormEntry {
  uid: string;
  zoneId?: string;
  scheduleId: string;
  companyId: string;
  promoterCount: number;
  plannedCount: number;
  signature: string | null;
  isSelected: boolean;
}

export interface StaffingEntry {
  date: string;
  terminalId: string;
  zoneId: string;
  companyId: string;
  count: number;
}

export interface PositionTarget {
  terminalId: string;
  zoneId: string;
  companyId: string;
  count: number;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'STUCK';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  createdAt: string;
}

export interface EmailAutomationConfig {
  recipients: string[];
  enabled: boolean;
  lastSentWeekId: string;
}

export interface SentEmailLog {
  id: string;
  date: string;
  recipients: string;
  subject: string;
  content: string;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string;
}
