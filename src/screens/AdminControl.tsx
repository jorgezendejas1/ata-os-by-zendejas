
import React, { useState, useEffect } from 'react';
import { getTasks, saveTask, deleteTask, showToast } from '../services/db';
import { Task, TaskStatus } from '../types';
import { useTerminals } from '../hooks/useTerminals';
import { useCompanies } from '../hooks/useCompanies';
import { 
  Copy, 
  Zap, 
  Calendar, 
  ShieldCheck, 
  Layers,
  Clock,
  LayoutDashboard,
  Trash2,
  ChevronRight,
  Wand2,
  AlertTriangle,
  Briefcase,
  Star,
  Users,
  Target,
  UserCheck,
  TrendingUp,
  Award,
  Info
} from 'lucide-react';

const RoadmapColumn = ({ title, status, colTasks, dotColor, onUpdateStatus, onDeleteTask, children }: { title: string, status: TaskStatus, colTasks: Task[], dotColor: string, onUpdateStatus: (task: Task, newStatus: TaskStatus) => void, onDeleteTask: (id: string) => void, children?: React.ReactNode }) => (
  <div className="flex-1 flex flex-col min-w-[260px]">
    <div className="flex items-center justify-between mb-4 px-2">
      <h4 className="text-[11px] font-black uppercase tracking-tight text-slate-400 flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
        {title}
      </h4>
      <span className="text-[11px] font-medium text-slate-300">{colTasks.length}</span>
    </div>
    
    <div className="space-y-3 flex-1">
      {colTasks.map(task => (
        <div key={task.id} className="group bg-white/60 hover:bg-white border border-slate-100 rounded-2xl p-4 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-slate-200/50">
          <h5 className="text-[13px] font-bold text-slate-800 tracking-tight leading-snug mb-3">
            {task.title}
          </h5>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              {status !== 'DONE' && (
                <button 
                  onClick={() => onUpdateStatus(task, status === 'TODO' ? 'IN_PROGRESS' : 'DONE')}
                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                >
                  <ChevronRight size={14} strokeWidth={3} />
                </button>
              )}
              <button 
                onClick={() => onDeleteTask(task.id)}
                className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg"
              >
                <Trash2 size={14} strokeWidth={3} />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${
                task.priority === 'HIGH' ? 'bg-rose-50 text-rose-600' : 
                task.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 
                'bg-slate-100 text-slate-400'
              }`}>
                {task.priority === 'HIGH' ? 'ALTA' : task.priority === 'MEDIUM' ? 'MEDIA' : 'BAJA'}
              </span>
              <span className="text-[9px] font-bold text-slate-300 flex items-center gap-1">
                <Clock size={10} />
                {task.dueDate}
              </span>
            </div>
          </div>
        </div>
      ))}
      {children}
    </div>
  </div>
);

const AdminControl: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'ADN' | 'MANUAL'>('ADN');

  const { terminals } = useTerminals();
  const { companies } = useCompanies();

  const refreshTasks = async () => {
    try {
      const data = await getTasks();
      setTasks(data || []);
    } catch (err) {
      console.error("Error loading tasks:", err);
    }
  };

  useEffect(() => {
    refreshTasks();
  }, []);

  const copyBlueprint = () => {
    const blueprint = `# JZL OS - MASTER BLUEPRINT (v2.0.0)\n\n## 1. MISION\nAirport Travel Advisors (ATA) gestiona módulos en CUN.\n\n## 2. REGLAS CORE\n- Redondeo: >50% real en 1er/Ultimo horario -> 100% Meta.\n- Exclusión: T1/T4 restan c6 del acumulado.\n- Ciclo: Jueves-Miércoles.`;
    navigator.clipboard.writeText(blueprint);
    showToast("Master Blueprint copiado para soporte", "success", "Sistemas JZL");
  };

  const handleUpdateStatus = async (task: Task, newStatus: TaskStatus) => {
    const updated = { ...task, status: newStatus };
    await saveTask(updated);
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    showToast(`Estado: ${newStatus}`, "info");
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm("¿Eliminar del Roadmap?")) {
      await deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      showToast("Tarea eliminada", "error");
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: newTaskTitle,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    await saveTask(newTask);
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    setIsAddingTask(false);
  };


  return (
    <div className="max-w-7xl mx-auto pb-20 p-2 md:p-0 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3.5 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm">
            <LayoutDashboard size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Centro de Mando</h2>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em]">JZL OS Operations Control</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="flex bg-white/50 p-1 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setActiveSubTab('ADN')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'ADN' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}
            >
              ADN
            </button>
            <button 
              onClick={() => setActiveSubTab('MANUAL')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'MANUAL' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}
            >
              Manual
            </button>
          </div>
          <button 
            onClick={copyBlueprint}
            className="bg-white/70 backdrop-blur-md text-slate-600 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-xl transition-all border border-slate-200/50 active:scale-95 text-[10px] font-black uppercase tracking-widest"
          >
            <Copy size={16} />
            Blueprint
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {activeSubTab === 'ADN' ? (
            <>
              <section className="bg-white/80 backdrop-blur-md p-8 md:p-10 rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/40">
                <div className="flex items-center gap-2 mb-10">
                  <Layers className="text-slate-400" size={20} />
                  <h3 className="text-lg font-black text-slate-900 tracking-tighter uppercase">Identidades del Sistema</h3>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
                  {companies.map(c => (
                    <div key={c.id} className="group p-3 bg-white border border-slate-50 rounded-2xl flex flex-col items-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-slate-200/50 cursor-default">
                      <div className="w-10 h-10 rounded-full shadow-inner flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: c.color, color: c.textColor }}>
                        <span className="text-[9px] font-black mix-blend-difference" style={{ color: c.textColor }}>{c.id}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-slate-800 truncate leading-none mb-1 uppercase tracking-tighter">{c.name}</p>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{c.id}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {terminals.map(t => (
                    <div key={t.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between transition-all hover:bg-white hover:shadow-md">
                      <div className="flex items-center gap-4">
                        <div className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        <div>
                          <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-tighter">{t.name}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {t.id}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${t.isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        {t.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                  <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                    <Wand2 size={20} />
                  </div>
                  <h4 className="text-[13px] font-black text-slate-900 mb-2 uppercase tracking-tight">Redondeo JZL (50% al 100%)</h4>
                  <p className="text-[12px] text-slate-500 leading-relaxed font-bold">
                    Optimización de reportes: En el primer/último horario, si la asistencia es &gt;50% de la meta, se consolida automáticamente al 100%.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                  <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                    <AlertTriangle size={20} />
                  </div>
                  <h4 className="text-[13px] font-black text-slate-900 mb-2 uppercase tracking-tight">Protocolo Exclusión T1/T4</h4>
                  <p className="text-[12px] text-slate-500 leading-relaxed font-bold">
                    Limpieza de datos: Las capturas de Krystal Grand (c6) en T1 y T4 se omiten del acumulado para precisión contractual.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                  <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                    <Calendar size={20} />
                  </div>
                  <h4 className="text-[13px] font-black text-slate-900 mb-2 uppercase tracking-tight">Ciclo Jueves-Miércoles</h4>
                  <p className="text-[12px] text-slate-500 leading-relaxed font-bold">
                    Alineación financiera: La semana operativa inicia estrictamente los jueves para sincronización con ATA.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                    <ShieldCheck size={20} />
                  </div>
                  <h4 className="text-[13px] font-black text-slate-900 mb-2 uppercase tracking-tight">Inmutabilidad Audit Log</h4>
                  <p className="text-[12px] text-slate-500 leading-relaxed font-bold">
                    Seguridad crítica: Cada edición manual genera un rastro digital inmutable con autoría y timestamp exacto.
                  </p>
                </div>
              </section>
            </>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <section className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] -mr-32 -mt-32"></div>
                <div className="relative">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-3">
                      <Briefcase size={28} className="text-blue-400" />
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Airport Travel Advisors</h3>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-right">
                       <p className="text-[8px] font-black text-blue-300 uppercase tracking-widest">Presidente</p>
                       <p className="text-xs font-black uppercase">Adolfo Giles</p>
                    </div>
                  </div>
                  
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium mb-8">
                    Airport Travel Advisors (ATA), con razón social <span className="text-white font-black italic">Airport Travel Advisors, S.A. de C.V.</span>, es la entidad crítica de enlace entre el flujo masivo de pasajeros internacionales y los conglomerados de hospitalidad más potentes del Caribe Mexicano. Opera como un <span className="text-blue-400 font-bold">canal de marketing directo y lead generation</span> especializado en propiedad vacacional.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center mb-3 text-blue-400">
                        <Target size={18} />
                      </div>
                      <p className="text-[10px] font-black text-blue-400 uppercase mb-2 tracking-widest">Misión Core</p>
                      <p className="text-[11px] text-slate-200">Capitalizar el flujo masivo en los nodos aeroportuarios más activos de LATAM.</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-xl flex items-center justify-center mb-3 text-amber-400">
                        <UserCheck size={18} />
                      </div>
                      <p className="text-[10px] font-black text-amber-400 uppercase mb-2 tracking-widest">Primer Contacto</p>
                      <p className="text-[11px] text-slate-200">Explotar la desorientación logística inicial brindando orientación y valor.</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-3 text-emerald-400">
                        <TrendingUp size={18} />
                      </div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase mb-2 tracking-widest">Shark Tank</p>
                      <p className="text-[11px] text-slate-200">Metodología de captación perfeccionada en entornos de alta competencia.</p>
                    </div>
                  </div>

                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                       <Award size={14} className="text-blue-400"/> Mecanismo Operativo en Terminales
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "El éxito reside en el valor percibido del incentivo. Al ofrecer tours icónicos con descuentos del 50-70% a cambio de una mañana en un resort, la propuesta se vuelve económicamente racional para el viajero."
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <Users size={20} className="text-slate-400" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Socios Comerciales & Clubes Vacacionales</h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {[
                    { 
                      id: 'c1', 
                      name: 'Grupo Sunset (Sunset)', 
                      desc: 'Grupo hotelero con presencia en destinos turísticos de México y el Caribe. Enfoque en experiencias vacacionales de calidad.',
                      color: '#92d050',
                      usp: 'Experiencias vacacionales premium'
                    },
                    { 
                      id: 'c2', 
                      name: 'Grupo Xcaret', 
                      desc: 'Paradigma de sostenibilidad fundado por Miguel Quintana Pali. El modelo "All-Fun Inclusive" integra acceso ilimitado a parques icónicos (Xel-Há, Xplor) y transporte directo.',
                      color: '#948a54',
                      usp: 'Referente Mundial en Recreación Sostenible'
                    },
                    { 
                      id: 'c3', 
                      name: 'The Villa Group (Villa del Palmar)', 
                      desc: 'Arquitectura de inspiración colonial. complejos que combinan hospitalidad de 5 estrellas con funcionalidad de residencias familiares en Costa Mujeres y Los Cabos.',
                      color: '#f8cbad',
                      usp: 'Gourmet Todo Incluido & Programa V-Level'
                    },
                    { 
                      id: 'c4', 
                      name: 'El Cid Resorts', 
                      desc: 'Cadena con raíces en Mazatlán. Reconocida por el ECVC (puntos anuales) y el "Platinum All-inclusive Plan" con servicios exclusivos de mayordomía y lounges privados.',
                      color: '#bdd7ee',
                      usp: 'Estructuras más flexibles de la industria'
                    },
                    { 
                      id: 'c5', 
                      name: 'Krystal Hotels & Resorts', 
                      desc: 'Marca de Grupo Hotelero Santa Fe. Diversificación de marcas (Hotels, Urban, Altitude) para atender perfiles desde negocios hasta familias en busca de balance costo-calidad.',
                      color: '#ffff00',
                      usp: 'Diversión Familiar y Descanso al Mejor Precio'
                    },
                    { 
                      id: 'c6', 
                      name: 'Krystal Grand', 
                      desc: 'Segmento de ultra-lujo. Destaca la categoría "Altitude" con concierge exclusivo y gastronomía de especialidad francesa y oriental. Experiencia "Beyond All-Inclusive".',
                      color: '#afafaf',
                      usp: 'Sofisticación y Relajación Exclusiva para Adultos'
                    }
                  ].map(partner => (
                    <div key={partner.id} className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="shrink-0 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner relative" style={{ backgroundColor: partner.color }}>
                            <span className="text-xl font-black text-white mix-blend-difference">{partner.id}</span>
                            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-md">
                              <Star size={12} className="text-amber-500 fill-amber-500" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3 flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">{partner.name}</h4>
                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full uppercase tracking-widest">{partner.usp}</span>
                          </div>
                          <p className="text-[13px] text-slate-500 dark:text-gray-400 leading-relaxed font-medium">
                            {partner.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-800/50">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 text-white p-3 rounded-2xl">
                    <Info size={24} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-black text-blue-900 dark:text-blue-400 uppercase tracking-widest mb-2">El Rol de ATA como Filtro de Calidad</h4>
                    <p className="text-sm text-blue-800/70 dark:text-blue-300/60 leading-relaxed font-medium">
                      Los asesores actúan como el primer filtro del embudo de ventas. Mediante interacciones breves, pre-califican prospectos por perfil demográfico y económico (hotel, tarjeta, composición familiar), ahorrando millones en marketing ineficiente.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        <section className="lg:col-span-4 bg-slate-100/30 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-100 shadow-inner flex flex-col h-full min-h-[600px]">
          <div className="flex justify-between items-center mb-10 px-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 text-white rounded-xl">
                <Zap size={18} />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-none">Desarrollo</h3>
            </div>
            <button onClick={refreshTasks} className="text-slate-400 hover:text-slate-900 transition-colors">
              <Clock size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-10 flex-1">
            <RoadmapColumn 
              title="Prioridades" 
              status="TODO" 
              dotColor="bg-slate-300" 
              colTasks={tasks.filter(t => t.status === 'TODO' || t.status === 'STUCK')} 
              onUpdateStatus={handleUpdateStatus}
              onDeleteTask={handleDeleteTask}
            >
              {!isAddingTask && (
                <button 
                  onClick={() => setIsAddingTask(true)}
                  className="w-full py-4 border border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 hover:text-blue-500 hover:bg-white/50 transition-all uppercase tracking-widest"
                >
                  + Nueva Tarea
                </button>
              )}
              {isAddingTask && (
                <form onSubmit={handleAddTask} className="bg-white p-5 rounded-[1.5rem] border border-blue-100 shadow-2xl">
                  <textarea 
                    autoFocus
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="Descripción..."
                    className="w-full bg-transparent outline-none text-[13px] font-bold text-slate-800 mb-4 resize-none h-16"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Añadir</button>
                    <button type="button" onClick={() => setIsAddingTask(false)} className="px-3 py-3 text-slate-400 font-bold text-[10px] uppercase">X</button>
                  </div>
                </form>
              )}
            </RoadmapColumn>
            <RoadmapColumn 
              title="En Proceso" 
              status="IN_PROGRESS" 
              dotColor="bg-blue-500" 
              colTasks={tasks.filter(t => t.status === 'IN_PROGRESS')} 
              onUpdateStatus={handleUpdateStatus}
              onDeleteTask={handleDeleteTask}
            />
            <RoadmapColumn 
              title="Desplegado" 
              status="DONE" 
              dotColor="bg-emerald-500" 
              colTasks={tasks.filter(t => t.status === 'DONE')} 
              onUpdateStatus={handleUpdateStatus}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminControl;
