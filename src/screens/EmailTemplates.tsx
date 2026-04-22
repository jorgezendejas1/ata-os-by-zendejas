import React from 'react';
import { Mails } from 'lucide-react';

const EmailTemplates: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center">
        <div className="inline-flex p-5 bg-blue-50 dark:bg-blue-900/30 rounded-3xl text-blue-600 dark:text-blue-400 mb-6">
          <Mails size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">Plantillas de Correo</h2>
        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Módulo en construcción</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 max-w-md mx-auto">
          La edición de plantillas (asunto, cuerpo, destinatarios BCC) se habilitará en la siguiente fase.
        </p>
      </div>
    </div>
  );
};

export default EmailTemplates;
