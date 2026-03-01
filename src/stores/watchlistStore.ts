import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WatchlistItem, AnalysisHistoryEntry } from '../types';
import { initialWatchlist } from '../data/initialData';

interface WatchlistState {
  items: WatchlistItem[];
  setItems: (items: WatchlistItem[]) => void;
  addItem: (item: WatchlistItem) => void;
  updateItem: (id: string, updates: Partial<WatchlistItem>) => void;
  removeItem: (id: string) => void;
  resetToInitial: () => void;
  addAnalysisEntry: (id: string, entry: AnalysisHistoryEntry) => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      items: initialWatchlist,
      setItems: (items) => set({ items }),
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      resetToInitial: () => set({ items: initialWatchlist }),
      addAnalysisEntry: (id, entry) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? { ...i, analysisHistory: [entry, ...(i.analysisHistory || [])] }
              : i
          ),
        })),
    }),
    {
      name: 'ai-portfolio-watchlist',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
