
import React, { useState, useEffect } from 'react';
import { getTasks, showToast } from '../services/db';
import { Task, TaskStatus, TaskPriority } from '../types';
import { COMPANIES, TERMINALS } from '../constants';
import { 
  BookOpen, 
  Copy, 
  Terminal, 
  Info, 
  Briefcase, 
  Code, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Calendar, 
  ShieldCheck, 
  Box, 
  Layers,
  CheckCircle2,
  Clock,
  Flag,
  Layout
} from 'lucide-react';

const STATUS_STYLE: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  'TODO': { label: 'Por hacer', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
  'IN_PROGRESS': { label: 'En Proceso', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
  'STUCK': { label: 'Estancado', bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400' },
  'DONE': { label: 'Listo', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
};

const PRIORITY_STYLE: Record<TaskPriority, { label: string; icon: any }> = {
  'LOW': { label: 'Baja', icon: Flag },
  'MEDIUM': { label: 'Media', icon: Flag },
  'HIGH': { label: 'Alta', icon: Flag },
};

const SectionHeader = ({ id, title, icon: Icon, expandedSection, setExpandedSection }: { id: string, title: string, icon: any, expandedSection: string | null, setExpandedSection: (id: string | null) => void }) => (
  <button 
    onClick={() => setExpandedSection(expandedSection === id ? null : id)}
    className={`w-full flex items-center justify-between p-6 md:p-8 rounded-[2rem] transition-all border ${
      expandedSection === id 
        ? 'bg-blue-600 text-white border-blue-600 shadow-xl' 
        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
    }`}
  >
    <div className="flex items-center gap-4">
      <Icon size={24} />
      <span className="font-black text-lg uppercase tracking-tighter">{title}</span>
    </div>
    {expandedSection === id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
  </button>
);

const Documentation: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>('adn');

  useEffect(() => {
    getTasks().then(setTasks);
  }, []);

  const copyBlueprint = () => {
    const blueprint = `# ATA OS - REPLICA SPECIFICATION (v2.0.0)\n\n## 1. MISION\nAirport Travel Advisors (ATA) opera espacios en CUN. ATA OS gestiona la asistencia y el redondeo ejecutivo.\n\n## 2. REGLAS\n- Redondeo 50%: 1er/Último horario, si >50% real -> 100% meta.\n- Exclusión c6: En T1 y T4 se excluye Krystal Grand del total.\n- Ciclo: Jueves a Miércoles.\n\n## 3. IDS\nCompanies: c1-c6. Terminals: t1-t4.`;
    navigator.clipboard.writeText(blueprint);
    showToast("Blueprint copiado al portapapeles", "success");
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-0 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3.5 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm">
            <BookOpen size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Centro de Control Técnico</h2>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em]">ATA OS Documentation & Roadmap</p>
          </div>
        </div>
        <button 
          onClick={copyBlueprint}
          className="bg-gray-900 dark:bg-gray-800 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 font-black uppercase text-[10px] tracking-widest border border-transparent hover:border-blue-500/50"
        >
          <Copy size={18} />
          Copiar Blueprint
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Documentation */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: ADN */}
          <div className="space-y-4">
            <SectionHeader id="adn" title="ADN del Proyecto" icon={Zap} expandedSection={expandedSection} setExpandedSection={setExpandedSection} />
            {expandedSection === 'adn' && (
              <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-8 animate-in slide-in-from-top-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <Terminal size={14}/> Regla del 50%
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                      En reportes ejecutivos, si el horario es el <span className="text-gray-900 dark:text-white font-bold">primero o el último</span> de la terminal y la asistencia real supera el <span className="text-gray-900 dark:text-white font-bold">50% de la meta</span>, se redondea automáticamente al 100%.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={14}/> Ciclo Operativo
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                      La semana operativa de ATA OS inicia oficialmente los <span className="text-gray-900 dark:text-white font-bold">Jueves</span> y concluye los <span className="text-gray-900 dark:text-white font-bold">Miércoles</span>, adaptándose al flujo de facturación de ATA.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                      <Box size={14}/> Exclusión c6 (KG)
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                      En las terminales <span className="text-gray-900 dark:text-white font-bold">T1 y T4</span>, los datos de Krystal Grand (c6) se capturan pero se <span className="text-rose-600 font-bold">excluyen de los totales</span> globales para mantener la precisión contractual.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={14}/> ATA Integrity
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                      Toda modificación de asistencia genera un <span className="text-gray-900 dark:text-white font-bold">log de auditoría</span> inmutable con el nombre del editor, valor anterior y nuevo valor.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Diccionario */}
          <div className="space-y-4">
            <SectionHeader id="dict" title="Diccionario de Identidades" icon={Layers} expandedSection={expandedSection} setExpandedSection={setExpandedSection} />
            {expandedSection === 'dict' && (
              <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-8 animate-in slide-in-from-top-4">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Socios Comerciales (Companies)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {COMPANIES.map(c => (
                      <div key={c.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center gap-3 border dark:border-gray-700">
                        <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: 
                          c.id === 'c1' ? '#92d050' : 
                          c.id === 'c2' ? '#948a54' :
                          c.id === 'c3' ? '#f8cbad' :
                          c.id === 'c4' ? '#bdd7ee' :
                          c.id === 'c5' ? '#ffff00' : '#afafaf'
                        }}></div>
                        <div>
                          <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase">{c.name}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">{c.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Infraestructura (Terminals)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TERMINALS.map(t => (
                      <div key={t.id} className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-6 rounded-full ${t.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                          <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase">{t.name}</span>
                        </div>
                        <span className={`text-[8px] font-black px-2 py-1 rounded-full ${t.isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                          {t.isActive ? 'ACTIVA' : 'ARCHIVADA'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Roadmap Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                  <Layout size={20} className="text-blue-600" /> Roadmap
                </h3>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Estado de Implementación</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full text-[10px] font-black text-blue-600 uppercase">
                {tasks.length} Tareas
              </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar max-h-[600px] pr-2">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 opacity-30">
                  <Briefcase size={40} />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-4">Cargando Tareas...</p>
                </div>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 group hover:border-blue-500/30 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                         <div className={`w-1 h-3 rounded-full ${task.status === 'DONE' ? 'bg-emerald-500' : task.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                         <h5 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate max-w-[180px]">{task.title}</h5>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${STATUS_STYLE[task.status].bg} ${STATUS_STYLE[task.status].text}`}>
                        {STATUS_STYLE[task.status].label}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                          <Clock size={10} />
                          {task.dueDate}
                        </div>
                        <div className={`flex items-center gap-1 text-[9px] font-bold ${task.priority === 'HIGH' ? 'text-rose-500' : 'text-gray-400'}`}>
                          <Flag size={10} />
                          {PRIORITY_STYLE[task.priority].label}
                        </div>
                      </div>
                      <div className="text-[8px] font-black text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">CLOUD SYNCED</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-8 border-t dark:border-gray-800">
              <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase mb-3">
                <span>KPI CUMPLIMIENTO</span>
                <span className="text-blue-600">{Math.round((tasks.filter(t => t.status === 'DONE').length / (tasks.length || 1)) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all duration-1000"
                  style={{ width: `${(tasks.filter(t => t.status === 'DONE').length / (tasks.length || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
