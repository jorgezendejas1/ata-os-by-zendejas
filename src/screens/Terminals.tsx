import React from 'react';
import { MapPin } from 'lucide-react';

const Terminals: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center">
        <div className="inline-flex p-5 bg-blue-50 dark:bg-blue-900/30 rounded-3xl text-blue-600 dark:text-blue-400 mb-6">
          <MapPin size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">Terminales</h2>
        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Módulo en construcción</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 max-w-md mx-auto">
          La gestión dinámica de terminales (activación, empresas permitidas, horarios) se habilitará en la siguiente fase.
        </p>
      </div>
    </div>
  );
};

export default Terminals;
