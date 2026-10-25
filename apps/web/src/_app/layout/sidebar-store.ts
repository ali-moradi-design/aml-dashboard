import { create } from "zustand";
import { persist } from "zustand/middleware";

type SidebarState = {
  collapsed: boolean;
  toggle: () => void;
};

/** Sidebar open/closed, remembered per browser. */
export const useSidebarStore = create<SidebarState>()(
  persist((set) => ({ collapsed: false, toggle: () => set((s) => ({ collapsed: !s.collapsed })) }), { name: "aml-sidebar" }),
);
