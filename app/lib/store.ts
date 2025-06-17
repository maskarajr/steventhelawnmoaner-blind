import { create } from 'zustand';
import type { LeaderboardEntry } from '../types';

interface LeaderboardStore {
  entries: LeaderboardEntry[];
  setEntries: (entries: LeaderboardEntry[]) => void;
}

type SetState = {
  setState: (partial: Partial<LeaderboardStore>) => void;
};

export const useLeaderboardStore = create<LeaderboardStore>((set: SetState['setState']) => ({
  entries: [],
  setEntries: (entries: LeaderboardEntry[]) => set({ entries }),
})); 