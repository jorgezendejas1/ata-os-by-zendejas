import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface AppSettings {
  primary_color: string;
  table_density: 'compact' | 'normal' | 'relaxed';
  font_size: 'small' | 'normal' | 'large';
  reports_show_sparklines: boolean;
  reports_show_fractions: boolean;
  reports_show_attendance_table: boolean;
  sidebar_collapsed: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  primary_color: '#2563EB',
  table_density: 'normal',
  font_size: 'normal',
  reports_show_sparklines: true,
  reports_show_fractions: true,
  reports_show_attendance_table: true,
  sidebar_collapsed: false,
};

function rowsToSettings(rows: any[]): AppSettings {
  const mapped: AppSettings = { ...DEFAULT_APP_SETTINGS };
  for (const row of rows) {
    switch (row.key) {
      case 'primary_color':
        mapped.primary_color = row.value;
        break;
      case 'table_density':
        if (['compact', 'normal', 'relaxed'].includes(row.value)) {
          mapped.table_density = row.value;
        }
        break;
      case 'font_size':
        if (['small', 'normal', 'large'].includes(row.value)) {
          mapped.font_size = row.value;
        }
        break;
      case 'reports_show_sparklines':
        mapped.reports_show_sparklines = row.value === 'true';
        break;
      case 'reports_show_fractions':
        mapped.reports_show_fractions = row.value === 'true';
        break;
      case 'reports_show_attendance_table':
        mapped.reports_show_attendance_table = row.value === 'true';
        break;
      case 'sidebar_collapsed':
        mapped.sidebar_collapsed = row.value === 'true';
        break;
    }
  }
  return mapped;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (supabase.from('app_settings' as any).select('*') as any).then(({ data }: any) => {
      if (cancelled) return;
      if (data && data.length > 0) {
        setSettings(rowsToSettings(data));
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const strValue = String(value);
      setSettings(prev => ({ ...prev, [key]: value }));
      await supabase.from('app_settings' as any).upsert(
        {
          key,
          value: strValue,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'key' } as any
      );
    },
    []
  );

  const resetToDefaults = useCallback(async () => {
    setSettings(DEFAULT_APP_SETTINGS);
    const rows = (Object.keys(DEFAULT_APP_SETTINGS) as Array<keyof AppSettings>).map(k => ({
      key: k,
      value: String(DEFAULT_APP_SETTINGS[k]),
      updated_at: new Date().toISOString(),
    }));
    await supabase.from('app_settings' as any).upsert(rows as any, { onConflict: 'key' } as any);
  }, []);

  return { settings, loading, updateSetting, resetToDefaults };
}