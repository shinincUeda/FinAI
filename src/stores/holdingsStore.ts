import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Holding } from '../types';
import { initialHoldings } from '../data/initialData';

const STORAGE_KEY = 'ai-portfolio-holdings';

interface HoldingsState {
  holdings: Holding[];
  setHoldings: (holdings: Holding[]) => void;
  addHolding: (holding: Holding) => void;
  updateHolding: (id: string, updates: Partial<Holding>) => void;
  removeHolding: (id: string) => void;
  resetToInitial: () => void;
}

export const useHoldingsStore = create<HoldingsState>()(
  persist(
    (set) => ({
      holdings: initialHoldings,
      setHoldings: (holdings) => set({ holdings }),
      addHolding: (holding) =>
        set((state) => ({ holdings: [...state.holdings, holding] })),
      updateHolding: (id, updates) =>
        set((state) => ({
          holdings: state.holdings.map((h) =>
            h.id === id ? { ...h, ...updates, lastUpdated: new Date().toISOString().slice(0, 10) } : h
          ),
        })),
      removeHolding: (id) =>
        set((state) => ({ holdings: state.holdings.filter((h) => h.id !== id) })),
      resetToInitial: () => set({ holdings: initialHoldings }),
    }),
    { name: STORAGE_KEY }
  )
);
