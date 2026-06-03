import { create } from 'zustand';
import type { JobEntry, ProfilerDataset, ChannelKey } from './types';

interface AppState {
  theme: 'dark' | 'light';
  jobs: JobEntry[];
  dataset: ProfilerDataset | null;
  activeChannel: ChannelKey;
  activeStep: number;
  selectedBlock: [number, number] | null;
  logs: string[];

  setTheme: (t: 'dark' | 'light') => void;
  toggleTheme: () => void;
  addJob: (job: JobEntry) => void;
  updateJob: (id: string, updates: Partial<JobEntry>) => void;
  setDataset: (d: ProfilerDataset) => void;
  setActiveChannel: (c: ChannelKey) => void;
  setActiveStep: (s: number) => void;
  setSelectedBlock: (b: [number, number] | null) => void;
  addLog: (line: string) => void;
  clearLogs: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'light',
  jobs: [],
  dataset: null,
  activeChannel: 'y_channel',
  activeStep: 1,
  selectedBlock: null,
  logs: [],

  setTheme: (t) => {
    localStorage.setItem('theme', t);
    set({ theme: t });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
  addJob: (job) => set((s) => ({ jobs: [job, ...s.jobs] })),
  updateJob: (id, updates) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
    })),
  setDataset: (d) => set({ dataset: d }),
  setActiveChannel: (c) => set({ activeChannel: c }),
  setActiveStep: (s) => set({ activeStep: s }),
  setSelectedBlock: (b) => set({ selectedBlock: b }),
  addLog: (line) =>
    set((s) => ({ logs: [...s.logs.slice(-199), line] })),
  clearLogs: () => set({ logs: [] }),
}));
