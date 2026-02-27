import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '../types';

const defaultSettings: Settings = {
  claudeApiKey: '',
  stockApiKey: '',
  currency: 'USD',
};

interface SettingsState extends Settings {
  setCurrency: (currency: 'USD' | 'JPY') => void;
  setStockApiKey: (key: string) => void;
  resetToDefault: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setCurrency: (currency) => set({ currency }),
      setStockApiKey: (stockApiKey) => set({ stockApiKey }),
      resetToDefault: () => set(defaultSettings),
    }),
    { name: 'ai-portfolio-settings' }
  )
);
