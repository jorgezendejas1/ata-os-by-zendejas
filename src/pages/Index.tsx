

import React, { useState, useEffect, useCallback } from 'react';
import { User, AppNotification } from '../types';
import { initDB, getTheme, saveTheme, AppTheme } from '../services/db';
import Login from '../screens/Login';
import Attendance from '../screens/Attendance';
import Reports from '../screens/Reports';
import Users from '../screens/Users';
import Staffing from '../screens/Staffing';
import Roadmap from '../screens/Roadmap';
import RecordsManagement from '../screens/RecordsManagement';
import Targets from '../screens/Targets';
import AdminControl from '../screens/AdminControl';
import Promoters from '../screens/Promoters';
import { LayoutDashboard, Users as UsersIcon, Users2, FileText, LogOut, Menu, X, CalendarClock, KanbanSquare, Database, Target, Sun, Moon, Monitor, Loader2, Plane, CheckCircle2, AlertCircle, Info, AlertTriangle, ChevronRight, ChevronLeft, BookOpen, Library } from 'lucide-react';

const NotificationToast: React.FC<{ notification: AppNotification; onDismiss: (id: string) => void }> = ({ notification, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), 5000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }[notification.type];

  const colors = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50',
    error: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50',
    warning: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50',
    info: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50'
  }[notification.type];

  return (
    <div className={`p-4 rounded-[1.5rem] border shadow-2xl flex items-start gap-3 animate-in slide-in-from-right-10 duration-300 w-full max-w-[320px] mb-3 pointer-events-auto backdrop-blur-md ${colors}`}>
      <div className="shrink-0 mt-0.5"><Icon size={20} /></div>
      <div className="flex-1 min-w-0">
        {notification.title && <p className="text-[10px] font-black uppercase tracking-widest mb-1">{notification.title}</p>}
        <p className="text-sm font-bold leading-tight">{notification.message}</p>
      </div>
      <button onClick={() => onDismiss(notification.id)} className="shrink-0 text-current opacity-40 hover:opacity-100 transition-opacity p-1"><X size={16}/></button>
    </div>
  );
};

const Index: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'ATTENDANCE' | 'REPORTS' | 'USERS' | 'STAFFING' | 'ROADMAP' | 'RECORDS' | 'TARGETS' | 'ADMIN_CONTROL' | 'PROMOTERS'>('ATTENDANCE');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<AppTheme>('system');
  const [isInitializing, setIsInitializing] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    const startup = async () => {
      try {
        await initDB();
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        const storedTheme = getTheme();
        setTheme(storedTheme);
        applyTheme(storedTheme);
      } catch (err) {
        console.error("Startup error:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    startup();

    const handleNotify = (e: any) => {
      setNotifications(prev => [...prev, e.detail]);
    };
    window.addEventListener('app-notify', handleNotify);
    return () => window.removeEventListener('app-notify', handleNotify);
  }, []);

  const applyTheme = (newTheme: AppTheme) => {
    const root = window.document.documentElement;
    if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
    applyTheme(newTheme);
  };

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('current_user', JSON.stringify(u));
    if (u.role === 'GENERICO') setCurrentView('ATTENDANCE');
    else setCurrentView('REPORTS');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('current_user');
    setCurrentView('ATTENDANCE');
  };

  const NavItem = ({ view, icon: Icon, label, collapsed = false }: { view: any, icon: any, label: string, collapsed?: boolean }) => (
    <button
      onClick={() => { setCurrentView(view); setIsMobileMenuOpen(false); }}
      title={collapsed ? label : undefined}
      className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} w-full ${collapsed ? 'px-0 py-3' : 'px-5 py-4'} rounded-2xl transition-all duration-300 ${
        currentView === view 
          ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 dark:shadow-none' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-4'}`}>
        <Icon size={collapsed ? 20 : 22} strokeWidth={currentView === view ? 2.5 : 2} />
        {!collapsed && <span className={`font-black text-xs uppercase tracking-widest ${currentView === view ? 'translate-x-1' : ''} transition-transform`}>{label}</span>}
      </div>
      {!collapsed && currentView === view && <ChevronRight size={14} className="opacity-50" />}
    </button>
  );

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-900">
        <div className="text-center animate-in fade-in duration-700">
          <Plane className="text-white mb-8 mx-auto animate-bounce-subtle" size={80} />
          <div className="space-y-2">
            <Loader2 className="animate-spin text-blue-300 mx-auto" size={32} />
            <p className="text-blue-100 font-black tracking-[0.4em] uppercase text-[9px] animate-pulse">ATA OS Cloud Engine</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-gray-950 transition-colors duration-300 selection:bg-blue-100">
      {/* Notifications Layer */}
      <div className="fixed top-20 md:top-6 right-4 left-4 md:left-auto z-[100] pointer-events-none flex flex-col items-center md:items-end">
        {notifications.map(n => (
          <NotificationToast key={n.id} notification={n} onDismiss={dismissNotification} />
        ))}
      </div>

      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 z-40 px-5 flex items-center justify-between no-print shadow-sm">
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl transition-all active:scale-90">
          <Menu size={20} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-black text-blue-900 dark:text-white uppercase tracking-tighter leading-none">ATA OS</span>
          <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.3em]">Cloud v1.2</span>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-blue-500/30">
          {user.name.charAt(0)}
        </div>
      </header>

      {/* Sidebar Drawer for Mobile */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-500 md:hidden no-print ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
        <aside className={`absolute left-0 top-0 bottom-0 w-[85%] max-w-[320px] bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) p-8 flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex justify-between items-center mb-12">
             <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
                  <Plane size={24} />
                </div>
                <div>
                  <span className="font-black text-xl text-gray-900 dark:text-white uppercase tracking-tighter">ATA OS</span>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Enterprise Mobile</p>
                </div>
             </div>
             <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><X size={24} /></button>
          </div>
          
          <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
            <NavItem view="ATTENDANCE" icon={LayoutDashboard} label="Asistencias" />
            {(user.role === 'MASTER' || user.role === 'REPORTES') && (
              <>
                <div className="py-4 px-2 text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.4em]">Gestión de Datos</div>
                <NavItem view="REPORTS" icon={FileText} label="Reportes" />
                <NavItem view="RECORDS" icon={Database} label="Bitácora" />
                <NavItem view="STAFFING" icon={CalendarClock} label="Distribución" />
                <NavItem view="TARGETS" icon={Target} label="Posiciones" />
                <NavItem view="PROMOTERS" icon={Users2} label="Promotores" />
              </>
            )}
            {user.role === 'MASTER' && (
              <>
                <div className="py-4 px-2 text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.4em]">Sistemas</div>
                <NavItem view="ADMIN_CONTROL" icon={Library} label="ADN & Roadmap" />
                <NavItem view="USERS" icon={UsersIcon} label="Accesos" />
              </>
            )}
          </nav>

          <div className="mt-auto pt-8 border-t border-gray-100 dark:border-gray-800">
             <button onClick={handleLogout} className="flex items-center gap-4 w-full px-5 py-4 text-rose-600 bg-rose-50 dark:bg-rose-900/20 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95"><LogOut size={20} /> Cerrar Sesión</button>
          </div>
        </aside>
      </div>

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col ${isSidebarCollapsed ? 'w-[72px]' : 'w-64'} bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 h-screen fixed left-0 top-0 z-10 no-print transition-all duration-300 ease-in-out`}>
        {!isSidebarCollapsed && (
          <div className="p-10">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
                <Plane size={24} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">ATA OS</h1>
            </div>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] ml-1">Cloud Infrastructure</p>
          </div>
        )}
        {isSidebarCollapsed && (
          <div className="py-6 flex justify-center">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <Plane size={20} />
            </div>
          </div>
        )}
        
        <nav className={`flex-1 ${isSidebarCollapsed ? 'px-3' : 'px-6'} space-y-1.5 overflow-y-auto no-scrollbar`}>
          <NavItem view="ATTENDANCE" icon={LayoutDashboard} label="Asistencias" collapsed={isSidebarCollapsed} />
          {(user.role === 'MASTER' || user.role === 'REPORTES') && (
            <>
               {!isSidebarCollapsed && <div className="pt-6 pb-2 px-2 text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.4em]">Gestión de Datos</div>}
               {isSidebarCollapsed && <div className="pt-4" />}
               <NavItem view="REPORTS" icon={FileText} label="Reportes" collapsed={isSidebarCollapsed} />
               <NavItem view="RECORDS" icon={Database} label="Bitácora" collapsed={isSidebarCollapsed} />
               <NavItem view="STAFFING" icon={CalendarClock} label="Distribución" collapsed={isSidebarCollapsed} />
               <NavItem view="TARGETS" icon={Target} label="Posiciones" collapsed={isSidebarCollapsed} />
               <NavItem view="PROMOTERS" icon={Users2} label="Promotores" collapsed={isSidebarCollapsed} />
            </>
          )}
          {user.role === 'MASTER' && (
            <>
             {!isSidebarCollapsed && <div className="pt-6 pb-2 px-2 text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.4em]">Sistemas</div>}
             {isSidebarCollapsed && <div className="pt-4" />}
             <NavItem view="ADMIN_CONTROL" icon={Library} label="ADN & Roadmap" collapsed={isSidebarCollapsed} />
             <NavItem view="USERS" icon={UsersIcon} label="Usuarios" collapsed={isSidebarCollapsed} />
            </>
          )}
        </nav>

        <div className={`${isSidebarCollapsed ? 'p-3' : 'p-8'} space-y-6`}>
          {!isSidebarCollapsed && (
            <>
              <div className="flex bg-slate-50 dark:bg-gray-800 p-1 rounded-[1.2rem] border dark:border-gray-700">
                <button onClick={() => handleThemeChange('light')} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center transition-all ${theme === 'light' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}><Sun size={18}/></button>
                <button onClick={() => handleThemeChange('dark')} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-white dark:bg-gray-700 text-blue-400 shadow-sm' : 'text-gray-400'}`}><Moon size={18}/></button>
                <button onClick={() => handleThemeChange('system')} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center transition-all ${theme === 'system' ? 'bg-white dark:bg-gray-700 text-purple-500 shadow-sm' : 'text-gray-400'}`}><Monitor size={18}/></button>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-[1.5rem] border border-gray-100 dark:border-gray-800">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-500/30">{user.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-900 dark:text-gray-100 truncate uppercase tracking-tight">{user.name}</p>
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
              
              <button onClick={handleLogout} className="flex items-center gap-3 w-full px-5 py-4 text-[10px] text-rose-500 font-black uppercase tracking-[0.2em] hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all"><LogOut size={16} /> Salir</button>
            </>
          )}
          {isSidebarCollapsed && (
            <button onClick={handleLogout} title="Cerrar Sesión" className="flex items-center justify-center w-full py-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all"><LogOut size={18} /></button>
          )}
          
          {/* Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            className="flex items-center justify-center w-full py-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all duration-200"
            title={isSidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>

      <main className={`flex-1 ${isSidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-64'} min-h-screen pt-20 md:pt-0 p-4 md:p-12 transition-all duration-300 ease-in-out overflow-x-hidden`}>
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          {currentView === 'ATTENDANCE' && <Attendance user={user} onSuccess={() => {}} />}
          {currentView === 'REPORTS' && (user.role === 'MASTER' || user.role === 'REPORTES') && <Reports user={user} />}
          {currentView === 'STAFFING' && (user.role === 'MASTER' || user.role === 'REPORTES') && <Staffing />}
          {currentView === 'TARGETS' && (user.role === 'MASTER' || user.role === 'REPORTES') && <Targets />}
          {currentView === 'USERS' && user.role === 'MASTER' && <Users />}
          {currentView === 'ADMIN_CONTROL' && user.role === 'MASTER' && <AdminControl />}
          {currentView === 'RECORDS' && (user.role === 'MASTER' || user.role === 'REPORTES') && <RecordsManagement user={user} />}
          {currentView === 'PROMOTERS' && (user.role === 'MASTER' || user.role === 'REPORTES') && <Promoters />}
        </div>
      </main>
    </div>
  );
};

export default Index;
