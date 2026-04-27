import React, { useState } from 'react';
import { Palette, RotateCcw, Check } from 'lucide-react';
import { useSettings } from '../contexts/AppSettingsContext';
import { AppSettings } from '../hooks/useAppSettings';

const Appearance: React.FC = () => {
  const { settings, updateSetting, resetToDefaults } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  const [hexInput, setHexInput] = useState(settings.primary_color);

  React.useEffect(() => {
    setHexInput(settings.primary_color);
  }, [settings.primary_color]);

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      updateSetting('primary_color', val);
    }
  };

  const densityOptions: Array<{ key: AppSettings['table_density']; label: string; desc: string; padding: string }> = [
    { key: 'compact', label: 'Compacta', desc: 'Padding reducido, ideal para reportes', padding: 'py-1 px-2' },
    { key: 'normal', label: 'Normal', desc: 'Balance estética / información', padding: 'py-2 px-3' },
    { key: 'relaxed', label: 'Relajada', desc: 'Más espacio, más legible', padding: 'py-4 px-4' },
  ];

  const fontOptions: Array<{ key: AppSettings['font_size']; label: string; cls: string }> = [
    { key: 'small', label: 'Pequeño', cls: 'text-xs' },
    { key: 'normal', label: 'Normal', cls: 'text-sm' },
    { key: 'large', label: 'Grande', cls: 'text-base' },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-20 p-2 md:p-0 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-10">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-3.5 rounded-2xl text-blue-600 dark:text-blue-400">
          <Palette size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">Apariencia</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">
            Configuración global del sistema
          </p>
        </div>
      </div>

      {/* SECCIÓN 1 — Color principal */}
      <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 mb-8">
        <div className="mb-6">
          <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white mb-1">
            Color Principal del Sistema
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Afecta botones, íconos y acentos en toda la app
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <input
            type="color"
            value={settings.primary_color}
            onChange={e => {
              setHexInput(e.target.value.toUpperCase());
              updateSetting('primary_color', e.target.value.toUpperCase());
            }}
            className="w-24 h-24 rounded-2xl border-2 border-gray-200 dark:border-gray-700 cursor-pointer"
          />
          <div className="flex-1 w-full md:w-auto">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
              Hex
            </label>
            <input
              type="text"
              value={hexInput}
              onChange={e => handleHexChange(e.target.value)}
              className="font-mono text-base px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 w-full md:w-48 uppercase"
              maxLength={7}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Preview</span>
            <button
              type="button"
              style={{ backgroundColor: settings.primary_color }}
              className="px-6 py-3 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all"
            >
              Botón Demo
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-6 italic">
          Los colores de cada empresa se gestionan desde el módulo Empresas.
        </p>
      </section>

      {/* SECCIÓN 2 — Densidad */}
      <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 mb-8">
        <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white mb-6">
          Densidad de Tablas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {densityOptions.map(opt => {
            const active = settings.table_density === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => updateSetting('table_density', opt.key)}
                className={`text-left rounded-2xl border-2 p-5 transition-all ${
                  active
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black text-sm uppercase tracking-tight text-gray-900 dark:text-white">
                    {opt.label}
                  </span>
                  {active && <Check size={18} className="text-blue-600" />}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4">{opt.desc}</p>
                {/* mini preview */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={`${opt.padding} text-[10px] text-gray-600 dark:text-gray-300 ${
                        i < 2 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                      }`}
                    >
                      Fila {i + 1}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* SECCIÓN 3 — Tipografía */}
      <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 mb-8">
        <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white mb-6">
          Escala de Texto
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {fontOptions.map(opt => {
            const active = settings.font_size === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => updateSetting('font_size', opt.key)}
                className={`text-left rounded-2xl border-2 p-5 transition-all ${
                  active
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black text-sm uppercase tracking-tight text-gray-900 dark:text-white">
                    {opt.label}
                  </span>
                  {active && <Check size={18} className="text-blue-600" />}
                </div>
                <p className={`${opt.cls} text-gray-700 dark:text-gray-300`}>
                  Aa Bb Cc 123
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* SECCIÓN 4 — Reportes */}
      <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 mb-8">
        <div className="mb-6">
          <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white mb-1">
            Configuración de Reportes PDF
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Controla qué secciones aparecen en los reportes
          </p>
        </div>
        <div className="space-y-3">
          <ToggleRow
            label="Mostrar gráficas de tendencia (sparklines)"
            checked={settings.reports_show_sparklines}
            onChange={v => updateSetting('reports_show_sparklines', v)}
          />
          <ToggleRow
            label="Mostrar fracciones debajo de cada punto (ej: 8.5/10.0)"
            checked={settings.reports_show_fractions}
            onChange={v => updateSetting('reports_show_fractions', v)}
          />
          <ToggleRow
            label="Incluir tabla de asistencia por día (Hoja 3 del PDF)"
            checked={settings.reports_show_attendance_table}
            onChange={v => updateSetting('reports_show_attendance_table', v)}
          />
        </div>
      </section>

      {/* SECCIÓN 5 — Reset */}
      <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8">
        <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white mb-2">
          Restablecer
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          Devuelve todos los valores a su configuración por defecto.
        </p>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-black text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <RotateCcw size={14} /> Restaurar configuración por defecto
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-rose-600">¿Confirmar restauración?</span>
            <button
              onClick={async () => {
                await resetToDefaults();
                setConfirmReset(false);
              }}
              className="px-5 py-2.5 rounded-2xl bg-rose-600 text-white font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all"
            >
              Sí, restaurar
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-5 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-black text-xs uppercase tracking-widest"
            >
              Cancelar
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

const ToggleRow: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({
  label,
  checked,
  onChange,
}) => (
  <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 cursor-pointer">
    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-6 w-6 mt-0.5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[1.5rem]' : 'translate-x-0.5'
        }`}
      />
    </button>
  </label>
);

export default Appearance;