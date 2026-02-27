import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeeklyReport } from '../types';

interface ReportsState {
  reports: WeeklyReport[];
  addReport: (report: WeeklyReport) => void;
  removeReport: (id: string) => void;
  clearReports: () => void;
}

export const useReportsStore = create<ReportsState>()(
  persist(
    (set) => ({
      reports: [],
      addReport: (report) =>
        set((state) => ({ reports: [report, ...state.reports].slice(0, 50) })),
      removeReport: (id) =>
        set((state) => ({ reports: state.reports.filter((r) => r.id !== id) })),
      clearReports: () => set({ reports: [] }),
    }),
    { name: 'ai-portfolio-reports' }
  )
);
