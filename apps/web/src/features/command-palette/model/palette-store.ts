import { create } from "zustand";

type PaletteState = { open: boolean; setOpen: (open: boolean) => void };

/** Open state shared by the Ctrl K shortcut and the app bar search box. */
export const usePaletteStore = create<PaletteState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
