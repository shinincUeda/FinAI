import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Alert } from '../types';
import { initialAlerts } from '../data/initialData';

interface AlertsState {
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (id: string, updates: Partial<Alert>) => void;
  removeAlert: (id: string) => void;
  resetToInitial: () => void;
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set) => ({
      alerts: initialAlerts,
      setAlerts: (alerts) => set({ alerts }),
      addAlert: (alert) => set((state) => ({ alerts: [...state.alerts, alert] })),
      updateAlert: (id, updates) =>
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),
      removeAlert: (id) => set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),
      resetToInitial: () => set({ alerts: initialAlerts }),
    }),
    { name: 'ai-portfolio-alerts' }
  )
);
