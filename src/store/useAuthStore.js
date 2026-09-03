import { create } from 'zustand';
import { VouchAuth } from '../lib/auth.js';

export const useAuthStore = create((set) => ({
  session: VouchAuth.getSession(),
  async login(username, password) {
    const session = await VouchAuth.login(username, password);
    if (session) set({ session });
    return session;
  },
  logout() {
    VouchAuth.logout();
    set({ session: null });
  },
}));
