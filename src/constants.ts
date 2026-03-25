
import { Company, Schedule, Terminal, Zone } from './types';

export const COMPANIES: Company[] = [
  { id: 'c1', name: 'Unlimited Vacation Club' },
  { id: 'c2', name: 'Grupo Xcaret' },
  { id: 'c3', name: 'Villa del Palmar' },
  { id: 'c4', name: 'El Cid' },
  { id: 'c5', name: 'Krystal' },
  { id: 'c6', name: 'Krystal Grand' },
];

export const SCHEDULES: Schedule[] = [
  { id: 'h_0900', time: '09:00' },
  { id: 'h_1000', time: '10:00' },
  { id: 'h_1200', time: '12:00' },
  { id: 'h_1400', time: '14:00' },
  { id: 'h_1600', time: '16:00' },
  { id: 'h_1800', time: '18:00' },
  { id: 'h_1900', time: '19:00' },
  { id: 'h_2000', time: '20:00' },
  { id: 'h_2030', time: '20:30' },
  { id: 'h_2100', time: '21:00' },
  { id: 'h_cierre', time: 'CIERRE' },
];

export const TERMINALS: Terminal[] = [
  { 
    id: 't1', 
    name: 'Terminal 1', 
    hasZones: false, 
    allowedCompanies: ['c1', 'c2', 'c3', 'c4', 'c5'],
    allowedSchedules: ['h_0900', 'h_1200', 'h_1600', 'h_2000'],
    isActive: false
  },
  { 
    id: 't2n', 
    name: 'T2 Nacional', 
    hasZones: true, 
    allowedCompanies: ['c1', 'c2'], 
    allowedSchedules: ['h_0900', 'h_1000', 'h_1200', 'h_1600', 'h_1800', 'h_2000', 'h_cierre'],
    isActive: true
  },
  { 
    id: 't2i', 
    name: 'T2 Internacional', 
    hasZones: false, 
    allowedCompanies: ['c1', 'c4', 'c5'], 
    allowedSchedules: ['h_1000', 'h_1200', 'h_1400', 'h_1600', 'h_1900', 'h_2100'],
    isActive: true
  }, 
  { 
    id: 't3', 
    name: 'Terminal 3', 
    hasZones: false, 
    allowedCompanies: ['c1', 'c4', 'c3', 'c5', 'c2', 'c6'],
    allowedSchedules: ['h_0900', 'h_1200', 'h_1600', 'h_1800', 'h_2030'],
    isActive: true
  },
  { 
    id: 't4', 
    name: 'Terminal 4', 
    hasZones: false, 
    allowedCompanies: ['c1', 'c4', 'c3', 'c5', 'c2', 'c6'],
    allowedSchedules: ['h_0900', 'h_1200', 'h_1600', 'h_1900', 'h_2100'],
    isActive: true
  }
];

export const ZONES: Zone[] = [
  { id: 'z1', name: 'Bandas A', terminalId: 't2n' },
  { id: 'z2', name: 'Bandas B', terminalId: 't2n' },
  { id: 'z3', name: 'Star', terminalId: 't2n' },
  { id: 'z4', name: 'Pasillo', terminalId: 't2n' },
];

export const DEFAULT_ALLOCATIONS: Record<string, Record<string, Record<string, number>>> = {
  't1': {
    'default': { 'c1': 5, 'c2': 5, 'c3': 5, 'c4': 2, 'c5': 3 }
  },
  't2n': {
    'z1': { 'c1': 10, 'c2': 10 }, 
    'z2': { 'c1': 2, 'c2': 2 },   
    'z3': { 'c1': 5, 'c2': 5 },   
    'z4': { 'c1': 10, 'c2': 9 },  
  },
  't2i': {
    'default': { 
      'c1': 10, 'c4': 3, 'c5': 4
    }
  },
  't3': {
    'default': {
      'c1': 18, 'c4': 5, 'c3': 9, 'c5': 5, 'c2': 12, 'c6': 7
    }
  },
  't4': {
    'default': {
      'c1': 15, 'c4': 4, 'c3': 8, 'c5': 4, 'c2': 12, 'c6': 6
    }
  }
};

export const INITIAL_MASTER_USER = {
  id: 'u_master',
  email: 'admin@airport.com',
  password_hash: 'admin123',
  role: 'MASTER',
  name: 'Master Admin',
  createdAt: new Date().toISOString()
};
