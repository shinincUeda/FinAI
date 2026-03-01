import { create } from 'zustand';

interface AutoUpdateState {
  isUpdating: boolean;
  lastUpdatedAt: number | null;
  isMarketOpen: boolean;
  setIsUpdating: (v: boolean) => void;
  setLastUpdatedAt: (v: number) => void;
  setIsMarketOpen: (v: boolean) => void;
}

export const useAutoUpdateStore = create<AutoUpdateState>((set) => ({
  isUpdating: false,
  lastUpdatedAt: null,
  isMarketOpen: false,
  setIsUpdating: (v) => set({ isUpdating: v }),
  setLastUpdatedAt: (v) => set({ lastUpdatedAt: v }),
  setIsMarketOpen: (v) => set({ isMarketOpen: v }),
}));
