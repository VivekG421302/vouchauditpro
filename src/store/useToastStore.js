import { create } from 'zustand';

let idCounter = 0;

export const useToastStore = create((set) => ({
  toasts: [],
  push(msg, icon = 'check-circle-2', tone = 'ink') {
    const id = ++idCounter;
    set((state) => ({ toasts: [...state.toasts, { id, msg, icon, tone }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3200);
  },
  dismiss(id) {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

// Convenience non-hook accessor, mirrors calling vouchToast(msg, icon, tone) directly.
export function toast(msg, icon, tone) {
  useToastStore.getState().push(msg, icon, tone);
}
