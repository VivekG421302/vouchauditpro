import { create } from 'zustand';
import { VouchDB } from '../lib/db.js';
import { VouchAPI } from '../lib/api.js';

// Wrap every VouchAPI method so that, after it resolves, the store's `db`
// mirror is refreshed from VouchDB.get(). Components read state via
// useVouchStore(s => s.db.something) and call mutations via
// useVouchStore(s => s.api.someMethod) — same call signatures as the
// original VouchAPI, just reactive.
function wrapApi(refresh) {
  const wrapped = {};
  for (const key of Object.keys(VouchAPI)) {
    if (key.startsWith('_')) continue;
    const fn = VouchAPI[key];
    if (typeof fn !== 'function') continue;
    wrapped[key] = (...args) =>
      Promise.resolve(fn(...args)).then((result) => {
        refresh();
        return result;
      });
  }
  return wrapped;
}

export const useVouchStore = create((set, get) => {
  const refresh = () => set({ db: VouchDB.get() });
  return {
    db: null,
    ready: false,
    api: wrapApi(refresh),
    refresh,
    async hydrate() {
      if (get().ready) return;
      await VouchDB.ready;
      set({ db: VouchDB.get(), ready: true });
    },
    async resetDemoData() {
      await VouchDB.reset();
      refresh();
    },
  };
});
