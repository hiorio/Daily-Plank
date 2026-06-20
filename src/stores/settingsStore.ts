import { create } from 'zustand';
import { AppSettings, defaultSettings } from '../domain/settings';
import { loadSettings, saveSettings } from '../services/settingsService';

interface SettingsStore {
  settings: AppSettings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  hydrated: false,
  hydrate: async () => {
    const settings = await loadSettings();
    set({ settings, hydrated: true });
  },
  updateSetting: async (key, value) => {
    const next = { ...get().settings, [key]: value };
    set({ settings: next });
    await saveSettings(next);
  },
}));
