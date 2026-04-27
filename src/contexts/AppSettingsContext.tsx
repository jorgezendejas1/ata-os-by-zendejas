import { createContext, useContext } from 'react';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../hooks/useAppSettings';

interface AppSettingsContextValue {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export const AppSettingsContext = createContext<AppSettingsContextValue>({
  settings: DEFAULT_APP_SETTINGS,
  updateSetting: async () => {},
  resetToDefaults: async () => {},
});

export const useSettings = () => useContext(AppSettingsContext);