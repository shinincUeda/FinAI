import { create } from 'zustand';

interface AutoUpdateState {
  isUpdating: boolean;
  lastUpdatedAt: number | null;
  isMarketOpen: boolean;
  /** 手動更新トリガー: インクリメントするとuseAutoStockUpdateが即時フェッチを実行する */
  _manualTrigger: number;
  setIsUpdating: (v: boolean) => void;
  setLastUpdatedAt: (v: number) => void;
  setIsMarketOpen: (v: boolean) => void;
  triggerManualUpdate: () => void;
}

export const useAutoUpdateStore = create<AutoUpdateState>((set) => ({
  isUpdating: false,
  lastUpdatedAt: null,
  isMarketOpen: false,
  _manualTrigger: 0,
  setIsUpdating: (v) => set({ isUpdating: v }),
  setLastUpdatedAt: (v) => set({ lastUpdatedAt: v }),
  setIsMarketOpen: (v) => set({ isMarketOpen: v }),
  triggerManualUpdate: () => set((s) => ({ _manualTrigger: s._manualTrigger + 1 })),
}));
