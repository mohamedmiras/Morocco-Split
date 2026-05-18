import { create } from 'zustand';

export const useSidebarStore = create((set) => ({
  isMobileOpen: false,
  toggleMobile: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
  closeMobile: () => set({ isMobileOpen: false }),
  openMobile: () => set({ isMobileOpen: true }),
}));
