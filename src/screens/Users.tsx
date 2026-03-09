import React, { useState, useEffect } from 'react';
import { getUsers, saveUser, deleteUser, showToast } from '../services/db';
import { User, Role } from '../types';
import { TERMINALS } from '../constants';
import { UserPlus, Trash2, Edit2, Shield, Search, Loader2, X, CheckSquare, Square, Mail, Lock, User as UserIcon, Terminal as TerminalIcon, AlertCircle, MoreVertical, Globe, ShieldCheck } from 'lucide-react';

const getTerminalShortName = (id: string): string => {
    const terminal = TERMINALS.find(t => t.id === id);
    if (!terminal) return '';
    if (terminal.id === 't1') return 'NACIONAL';
    if (terminal.id === 't2') return 'T2';
    if (terminal.id === 't3') return 'T3';
    if (terminal.id === 't4') return 'T4';
    return terminal.name;
};

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'GENERICO' as Role,
    assignedTerminals: [] as string[]
  });

  const refreshUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: user.password_hash,
        role: user.role,
        assignedTerminals: user.assignedTerminals || []
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'GENERICO', assignedTerminals: [] });
    }
    setIsModalOpen(true);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showToast("El nombre es obligatorio", "warning");
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showToast("Ingresa un correo electrónico válido", "warning");
      return false;
    }

    if (formData.password.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres", "warning");
      return false;
    }

    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const canHaveAssignments = formData.role === 'REPORTES' || formData.role === 'GENERICO';
    
    const newUser: User = {
      id: editingUser ? editingUser.id : `u_${Date.now()}`,
      name: formData.name,
      email: formData.email.toLowerCase().trim(),
      password_hash: formData.password,
      role: formData.role,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
      assignedTerminals: canHaveAssignments && formData.assignedTerminals.length > 0 
        ? formData.assignedTerminals 
        : undefined
    };

    try {
      await saveUser(newUser);
      await refreshUsers();
      setIsModalOpen(false);
    } catch (err) {
      // Error handled in db.ts via showToast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario permanentemente del Cloud?')) {
      try {
        await deleteUser(id);
        await refreshUsers();
      } catch (err) {
        // Error handled in db.ts
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const RoleBadge = ({ role }: { role: Role }) => {
    const configs = {
      MASTER: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50',
      REPORTES: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50',
      GENERICO: 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700'
    };
    return (
      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${configs[role]}`}>
        {role}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-40 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Sincronizando Usuarios...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 p-2 md:p-0 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3.5 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm">
             <Shield size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Gestión de Accesos</h2>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em]">Directorio Centralizado Cloud</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-4 top-4 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm font-medium"
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-100 dark:shadow-none transition-all active:scale-95 font-black uppercase text-[10px] tracking-widest"
          >
            <UserPlus size={18} />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b dark:border-gray-800">
                <th className="p-6">Perfil del Usuario</th>
                <th className="p-6">Permisos de Terminal</th>
                <th className="p-6">Nivel de Acceso</th>
                <th className="p-6">Seguridad</th>
                <th className="p-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No se encontraron usuarios</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                    <tr key={u.id} className="group hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-inner transition-transform group-hover:scale-110 ${
                            u.role === 'MASTER' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 
                            u.role === 'REPORTES' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight">{u.name}</p>
                            <p className="text-[11px] font-medium text-gray-400 lowercase">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        {u.assignedTerminals && u.assignedTerminals.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {u.assignedTerminals!.map(tid => (
                                  <span key={tid} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-[9px] font-black text-gray-500 dark:text-gray-400 rounded-md border border-gray-200 dark:border-gray-700 uppercase">
                                    {getTerminalShortName(tid)}
                                  </span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800/50 uppercase tracking-widest inline-flex items-center gap-1.5">
                                <Globe size={10} /> Acceso Global
                            </span>
                        )}
                      </td>
                      <td className="p-6">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-1.5 text-gray-300 dark:text-gray-700">
                          <Lock size={12}/>
                          <span className="font-mono text-xs mt-1">••••••••</span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenModal(u)} className="p-3 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all shadow-sm active:scale-90 border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                            <Edit2 size={18} />
                          </button>
                          {u.role !== 'MASTER' && (
                            <button onClick={() => handleDelete(u.id)} className="p-3 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all shadow-sm active:scale-90 border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4 px-4">
        {filteredUsers.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-800">
                <AlertCircle size={40} className="text-gray-200 mx-auto mb-4" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No se encontraron usuarios</p>
            </div>
        ) : (
            filteredUsers.map(u => (
                <div key={u.id} className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-inner ${
                                u.role === 'MASTER' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 
                                u.role === 'REPORTES' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                                {u.name.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm leading-none mb-1">{u.name}</h4>
                                <p className="text-[10px] font-medium text-gray-400 lowercase">{u.email}</p>
                            </div>
                        </div>
                        <RoleBadge role={u.role} />
                    </div>

                    <div className="space-y-3">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Habilitación Operativa</p>
                        <div className="flex flex-wrap gap-2">
                            {u.assignedTerminals && u.assignedTerminals.length > 0 ? (
                                u.assignedTerminals!.map(tid => (
                                    <span key={tid} className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-[10px] font-black text-gray-500 dark:text-gray-400 rounded-xl border border-gray-100 dark:border-gray-700 uppercase">
                                        {getTerminalShortName(tid)}
                                    </span>
                                ))
                            ) : (
                                <span className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-[10px] font-black text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800/50 uppercase flex items-center gap-2">
                                    <Globe size={12} /> Acceso Completo
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase">
                            <ShieldCheck size={14} /> ATA Secure
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleOpenModal(u)} className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-black uppercase text-[10px] border border-blue-100 dark:border-blue-800/50 active:scale-95 transition-all">
                                <Edit2 size={14} /> Editar
                            </button>
                            {u.role !== 'MASTER' && (
                                <button onClick={() => handleDelete(u.id)} className="p-2.5 text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800/50 active:scale-95 transition-all">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* Modal Rediseñado */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[60] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="px-8 py-8 md:px-10 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
               <div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">{editingUser ? 'Actualizar Credenciales' : 'Registro de Nuevo Usuario'}</h3>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Gestión de identidad ATA Cloud</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white dark:bg-gray-900 rounded-2xl text-gray-400 hover:text-gray-600 dark:hover:text-white shadow-sm transition-all border dark:border-gray-800"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2"><UserIcon size={12} className="text-blue-500"/> Nombre Completo</label>
                  <input 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-2xl text-sm font-bold outline-none transition-all dark:text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Mail size={12} className="text-blue-500"/> Email Institucional</label>
                  <input 
                    required 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    placeholder="usuario@airport.com"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-2xl text-sm font-bold outline-none transition-all dark:text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Lock size={12} className="text-blue-500"/> Contraseña de Acceso</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-2xl text-sm font-mono outline-none transition-all dark:text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Shield size={12} className="text-blue-500"/> Nivel de Privilegios</label>
                  <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value as Role})} 
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-2xl text-sm font-black uppercase outline-none transition-all dark:text-white appearance-none cursor-pointer"
                  >
                    <option value="GENERICO">Genérico (Operativo)</option>
                    <option value="REPORTES">Reportes (Gerencia)</option>
                    <option value="MASTER">Master (Sistemas)</option>
                  </select>
                </div>
              </div>
              
              {(formData.role === 'REPORTES' || formData.role === 'GENERICO') && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2"><TerminalIcon size={12} className="text-blue-500"/> Terminales Habilitadas</label>
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full uppercase">Opcional</span>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TERMINALS.filter(t => t.isActive).map(t => (
                      <button 
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (formData.assignedTerminals.includes(t.id)) {
                            setFormData({...formData, assignedTerminals: formData.assignedTerminals.filter(id => id !== t.id)});
                          } else {
                            setFormData({...formData, assignedTerminals: [...formData.assignedTerminals, t.id]});
                          }
                        }}
                        className={`p-4 flex items-center gap-4 rounded-2xl text-[10px] font-black uppercase transition-all border-2 ${
                          formData.assignedTerminals.includes(t.id) 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg translate-x-1' 
                            : 'bg-white dark:bg-gray-900 border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'
                        }`}
                      >
                        {formData.assignedTerminals.includes(t.id) ? <CheckSquare size={16}/> : <Square size={16} className="text-gray-300 dark:text-gray-700"/>}
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] font-black text-gray-400 mt-4 text-center uppercase tracking-widest flex items-center justify-center gap-2">
                    <AlertCircle size={10} className="text-blue-400"/> Sin selección = Acceso a todo el aeropuerto
                  </p>
                </div>
              )}
            </div>

            <div className="p-8 md:p-10 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-800 flex flex-col sm:flex-row gap-4">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 px-8 py-4 text-xs font-black text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all uppercase tracking-widest border border-transparent hover:border-gray-200 dark:hover:border-gray-700 order-2 sm:order-1"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-[2] px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-100 dark:shadow-none font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 order-1 sm:order-2"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                {editingUser ? 'Actualizar Usuario' : 'Confirmar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
