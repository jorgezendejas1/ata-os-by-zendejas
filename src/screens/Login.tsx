
import React, { useState } from 'react';
import { authenticate } from '../services/db';
import { User } from '../types';
import { Plane, MousePointer2, ShieldCheck, FileText, UserCircle, Loader2, Lock, Mail } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsAuthenticating(true);
    setError('');
    try {
        const user = await authenticate(email, password);
        if (user) {
          onLogin(user);
        } else {
          setError('Credenciales inválidas');
        }
    } catch (err) {
        setError('Error al conectar con el servidor');
    } finally {
        setIsAuthenticating(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setError('');
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  const demoAccounts = [
    { role: 'Master', email: 'admin@airport.com', pass: 'admin123', icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { role: 'Reportes', email: 'reporte1@airport.com', pass: 'reporte1', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-gray-950 flex items-center justify-center p-6 md:p-10">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl p-8 md:p-12 w-full max-w-md animate-in fade-in zoom-in duration-700 border border-white/10 relative overflow-hidden">
        
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[80px] -mr-10 -mt-10"></div>
        
        <div className="text-center mb-12 relative">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-[2rem] mb-6 shadow-xl shadow-blue-600/20">
            <Plane size={40} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-2">ATA OS</h1>
          <p className="text-gray-400 dark:text-gray-500 font-black uppercase text-[9px] tracking-[0.4em]">Intelligence Platform Cloud</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Mail size={12}/> Email Institucional</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-6 py-4 rounded-2xl border-2 border-transparent bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:border-blue-600/30 transition-all font-bold text-sm" 
              placeholder="usuario@airport.com" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Lock size={12}/> Contraseña Cloud</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-6 py-4 rounded-2xl border-2 border-transparent bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:border-blue-600/30 transition-all font-bold text-sm" 
              placeholder="••••••••" 
            />
          </div>
          
          {error && (
            <div className="text-rose-500 text-[11px] font-black uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 py-3 rounded-xl text-center animate-in shake duration-300">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isAuthenticating} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[1.8rem] shadow-2xl shadow-blue-600/30 transition-all active:scale-95 flex justify-center items-center gap-3 uppercase tracking-widest text-xs"
          >
            {isAuthenticating ? <Loader2 className="animate-spin" size={20} /> : 'Autenticar en la Nube'}
          </button>
        </form>
        
        <div className="mt-12 relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-[1px] flex-1 bg-gray-100 dark:bg-gray-800"></div>
            <span className="text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.3em]">Acceso Seguro</span>
            <div className="h-[1px] flex-1 bg-gray-100 dark:bg-gray-800"></div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {demoAccounts.map((account) => (
              <button 
                key={account.role} 
                type="button" 
                onClick={() => handleQuickFill(account.email, account.pass)} 
                className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all active:scale-[0.98] group ${account.bg}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl bg-white dark:bg-gray-900 shadow-sm ${account.color}`}><account.icon size={18} /></div>
                  <div className="text-left">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${account.color}`}>{account.role}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono opacity-60 lowercase">{account.email}</p>
                  </div>
                </div>
                <MousePointer2 size={16} className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
          <p className="text-[9px] text-center text-gray-400 dark:text-gray-600 mt-10 font-black tracking-[0.4em] uppercase">ATA OS v1.2 &bull; Enterprise 2025</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
