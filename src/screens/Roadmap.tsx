
import React, { useState, useEffect } from 'react';
// Removed non-existent import getSystemManifest
import { getTasks, saveTask, deleteTask, showToast } from '../services/db';
import { Task, TaskStatus, TaskPriority } from '../types';
import { Plus, Trash2, Calendar as CalendarIcon, CheckCircle2, BookOpen, Loader2, AlertCircle, RefreshCw, ShieldCheck, Clock, Flag, LayoutList, ChevronRight } from 'lucide-react';

const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  'TODO': { label: 'Por hacer', bg: 'bg-slate-400', text: 'text-white' },
  'IN_PROGRESS': { label: 'En Proceso', bg: 'bg-blue-500', text: 'text-white' },
  'STUCK': { label: 'Estancado', bg: 'bg-rose-500', text: 'text-white' },
  'DONE': { label: 'Listo', bg: 'bg-emerald-500', text: 'text-white' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; text: string }> = {
  'LOW': { label: 'Baja', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', text: 'text-blue-700' },
  'MEDIUM': { label: 'Media', bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', text: 'text-indigo-700' },
  'HIGH': { label: 'Alta', bg: 'bg-gray-900 text-white dark:bg-gray-800 dark:text-gray-100', text: 'text-white' },
};

const Roadmap: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshTasks();
  }, []);

  const refreshTasks = async () => {
    setIsRefreshing(true);
    try {
        const data = await getTasks();
        setTasks(data);
    } catch (err) {
        // Error already handled by showToast in db.ts
    } finally {
        setIsRefreshing(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || isAddingTask) return;

    setIsAddingTask(true);

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: newTaskTitle,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    try {
      await saveTask(newTask);
      setTasks(prev => [newTask, ...prev]);
      setNewTaskTitle('');
      showToast("Tarea creada correctamente", "success");
      setTimeout(refreshTasks, 500); 
    } catch (err: any) {
      // Error already handled by showToast in db.ts
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleUpdate = async (task: Task, updates: Partial<Task>) => {
    const updatedTask = { ...task, ...updates };
    try {
      await saveTask(updatedTask);
      setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    } catch (err) {
      // Error already handled by showToast in db.ts
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar esta tarea de Supabase permanentemente?')) {
      try {
        await deleteTask(id);
        setTasks(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        // Error already handled by showToast in db.ts
      }
    }
  };

  const getProgress = () => {
      if (tasks.length === 0) return 0;
      const done = tasks.filter(t => t.status === 'DONE').length;
      return (done / tasks.length) * 100;
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 p-2 md:p-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="bg-rose-100 dark:bg-rose-900/30 p-3.5 rounded-2xl text-rose-600 dark:text-rose-400 shadow-sm relative">
             <CheckCircle2 size={32}/>
             {isRefreshing && <div className="absolute -top-1 -right-1 animate-spin text-blue-500 bg-white dark:bg-gray-900 rounded-full"><RefreshCw size={14}/></div>}
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Roadmap JZL</h2>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em]">Sincronización Cloud Real-Time</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center w-full md:w-auto">
             <button 
                onClick={refreshTasks}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl text-gray-400 hover:text-blue-600 transition-all shadow-sm active:scale-95"
                title="Refrescar datos"
             >
                <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
             </button>
             
             <div className="w-full sm:w-64 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex justify-between text-[9px] font-black text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest">
                      <span>Progreso Global</span>
                      <span className="text-blue-600">{Math.round(getProgress())}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                         className="h-full bg-blue-600 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                         style={{ width: `${getProgress()}%` }}
                      ></div>
                  </div>
             </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden mb-10 transition-colors">
        {/* Desktop Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-0 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
           <div className="col-span-1 p-5 text-center border-r dark:border-gray-800">#</div>
           <div className="col-span-5 p-5 border-r dark:border-gray-800">Requerimiento Técnico</div>
           <div className="col-span-2 p-5 text-center border-r dark:border-gray-800">Estado</div>
           <div className="col-span-2 p-5 text-center border-r dark:border-gray-800">Prioridad</div>
           <div className="col-span-2 p-5 text-center">Entrega</div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {tasks.length === 0 && !isAddingTask && !isRefreshing ? (
                <div className="p-24 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto text-slate-200">
                        <LayoutList size={40} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Sin tareas registradas en la nube</p>
                </div>
            ) : (
                tasks.map((task, idx) => (
                    <div key={task.id} className="group transition-all">
                        {/* Desktop Layout */}
                        <div className="hidden md:grid grid-cols-12 gap-0 hover:bg-slate-50 dark:hover:bg-blue-900/5 transition-colors items-stretch">
                            <div className="col-span-1 border-r dark:border-gray-800 flex items-center justify-center p-2 relative">
                                <button 
                                    onClick={() => handleDelete(task.id)}
                                    className="absolute inset-0 flex items-center justify-center text-rose-500 opacity-0 group-hover:opacity-100 transition-all bg-rose-50 dark:bg-rose-900/30"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <span className="text-[10px] font-black text-slate-300 group-hover:opacity-0">{idx + 1}</span>
                            </div>

                            <div className="col-span-5 border-r dark:border-gray-800 relative flex items-center">
                                 <div className="w-1.5 h-full absolute left-0 top-0" style={{ backgroundColor: task.status === 'DONE' ? '#10b981' : task.status === 'IN_PROGRESS' ? '#3b82f6' : task.status === 'STUCK' ? '#f43f5e' : '#94a3b8' }}></div>
                                 <input 
                                    type="text" 
                                    value={task.title}
                                    onChange={(e) => handleUpdate(task, { title: e.target.value })}
                                    className={`w-full h-full p-5 pl-8 bg-transparent outline-none text-gray-800 dark:text-gray-200 font-black text-sm tracking-tight transition-all focus:bg-white dark:focus:bg-gray-800 ${task.status === 'DONE' ? 'line-through opacity-30' : ''}`}
                                 />
                            </div>

                            <div className="col-span-2 border-r dark:border-gray-800 p-4 flex items-center justify-center">
                                <select 
                                    value={task.status}
                                    onChange={(e) => handleUpdate(task, { status: e.target.value as TaskStatus })}
                                    className={`w-full p-2.5 appearance-none text-center text-[10px] font-black uppercase rounded-xl cursor-pointer outline-none transition-all shadow-sm ${STATUS_CONFIG[task.status].bg} ${STATUS_CONFIG[task.status].text}`}
                                >
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key} className="bg-white text-gray-800">{config.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 border-r dark:border-gray-800 p-4 flex items-center justify-center">
                                 <select 
                                    value={task.priority}
                                    onChange={(e) => handleUpdate(task, { priority: e.target.value as TaskPriority })}
                                    className={`w-full p-2.5 appearance-none text-center text-[10px] font-black uppercase rounded-xl cursor-pointer outline-none transition-all border border-transparent ${PRIORITY_CONFIG[task.priority].bg}`}
                                >
                                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key} className="bg-white text-gray-800 font-bold">{config.label}</option>
                                    ))}
                                 </select>
                            </div>

                            <div className="col-span-2 p-4 flex items-center justify-center">
                                <input 
                                    type="date"
                                    value={task.dueDate}
                                    onChange={(e) => handleUpdate(task, { dueDate: e.target.value })}
                                    className="w-full text-center text-[11px] text-gray-600 dark:text-gray-400 font-black bg-slate-50 dark:bg-gray-800 p-2.5 rounded-xl outline-none cursor-pointer transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                                />
                            </div>
                        </div>

                        {/* Mobile Layout (Cards) */}
                        <div className="md:hidden p-6 space-y-6">
                            <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: task.status === 'DONE' ? '#10b981' : task.status === 'IN_PROGRESS' ? '#3b82f6' : task.status === 'STUCK' ? '#f43f5e' : '#94a3b8' }}></div>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tarea #{idx + 1}</span>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={task.title}
                                        onChange={(e) => handleUpdate(task, { title: e.target.value })}
                                        className={`w-full bg-transparent outline-none text-base font-black text-gray-900 dark:text-white leading-tight tracking-tight ${task.status === 'DONE' ? 'line-through opacity-30' : ''}`}
                                    />
                                </div>
                                <button 
                                    onClick={() => handleDelete(task.id)}
                                    className="p-3 text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-2xl active:scale-90 transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><RefreshCw size={8}/> Estado</label>
                                    <select 
                                        value={task.status}
                                        onChange={(e) => handleUpdate(task, { status: e.target.value as TaskStatus })}
                                        className={`w-full p-3 appearance-none text-center text-[10px] font-black uppercase rounded-2xl cursor-pointer outline-none transition-all ${STATUS_CONFIG[task.status].bg} ${STATUS_CONFIG[task.status].text}`}
                                    >
                                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Flag size={8}/> Prioridad</label>
                                    <select 
                                        value={task.priority}
                                        onChange={(e) => handleUpdate(task, { priority: e.target.value as TaskPriority })}
                                        className={`w-full p-3 appearance-none text-center text-[10px] font-black uppercase rounded-2xl cursor-pointer outline-none transition-all ${PRIORITY_CONFIG[task.priority].bg}`}
                                    >
                                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white dark:bg-gray-900 p-2 rounded-xl text-gray-400 shadow-sm">
                                        <Clock size={16} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Fecha de Entrega</p>
                                        <input 
                                            type="date"
                                            value={task.dueDate}
                                            onChange={(e) => handleUpdate(task, { dueDate: e.target.value })}
                                            className="bg-transparent text-[11px] font-black text-gray-700 dark:text-gray-300 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-800/50">
                                    Sync <CheckCircle2 size={10} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Footer Add Task - Redesigned for Responsiveness */}
        <div className="bg-slate-50/50 dark:bg-gray-800/30 border-t dark:border-gray-800">
            <form onSubmit={handleAddTask} className="flex flex-col md:flex-row items-stretch md:items-center">
                <div className="hidden md:flex items-center justify-center p-6 border-r dark:border-gray-800 text-blue-500">
                    {isAddingTask ? <Loader2 size={24} className="animate-spin" /> : <Plus size={28} strokeWidth={3} />}
                </div>
                <div className="flex-1 border-b md:border-b-0 md:border-r dark:border-gray-800">
                    <input 
                        type="text" 
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        disabled={isAddingTask}
                        placeholder={isAddingTask ? "Sincronizando..." : "Nuevo requerimiento o bug..."}
                        className="w-full h-16 md:h-20 bg-transparent outline-none text-sm md:text-base font-black text-gray-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-gray-600 px-6 md:px-10 uppercase tracking-tighter"
                    />
                </div>
                <div className="p-4 md:p-6 flex items-center justify-between gap-4 md:w-auto">
                     <button 
                        type="submit" 
                        disabled={!newTaskTitle || isAddingTask}
                        className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-blue-100 dark:shadow-none active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30"
                     >
                        {isAddingTask ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {isAddingTask ? 'Sincronizando' : 'Agregar'}
                     </button>
                     <div className="hidden lg:flex items-center gap-2 text-[9px] font-black text-slate-300 dark:text-gray-700 uppercase tracking-widest whitespace-nowrap">
                        <ShieldCheck size={14}/> JZL Cloud v1.2
                     </div>
                </div>
            </form>
        </div>
      </div>

      {/* Analytics Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         {Object.entries(STATUS_CONFIG).map(([key, conf]) => {
             const count = tasks.filter(t => t.status === key).length;
             return (
                <div key={key} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-1 transition-all hover:translate-y-[-2px] hover:shadow-md group">
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{conf.label}</span>
                       <div className={`w-2 h-2 rounded-full ${conf.bg} ${count > 0 ? 'animate-pulse' : 'opacity-20'}`}></div>
                    </div>
                    <span className={`text-3xl font-black text-gray-900 dark:text-white tracking-tighter`}>
                        {count}
                    </span>
                    <div className="mt-2 text-[8px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest group-hover:text-blue-500 transition-colors">
                        KPI: {count > 0 ? 'ACTIVO' : 'CUMPLIDO'}
                    </div>
                </div>
             );
         })}
      </div>
    </div>
  );
};

export default Roadmap;
