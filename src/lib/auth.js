/* ============================================================
   VOUCH — auth / session layer (src/lib/auth.js)
   ------------------------------------------------------------
   Ported from assets/js/auth.js. Stand-in for real auth. login()
   checks the 4 seeded accounts in db.js (after IndexedDB has
   loaded) and stores a mock session (shaped like a decoded JWT)
   in localStorage. login() returns a Promise so the call site is
   already shaped like the future POST /api/auth/login call.
============================================================ */
import { VouchDB } from './db.js';

const VOUCH_SESSION_KEY = 'vouch_session';

export const VouchAuth = {
  login(username, password) {
    return VouchDB.ready.then(() => {
      const db = VouchDB.get();
      const acc = db.accounts.find(
        (a) =>
          a.username.toLowerCase() === String(username).trim().toLowerCase() &&
          a.password === password
      );
      if (!acc) return null;
      const session = {
        token: 'mock-jwt.' + btoa(acc.username + ':' + acc.role) + '.' + Date.now(),
        username: acc.username,
        role: acc.role,
        name: acc.name,
        initials: acc.initials,
        label: acc.label,
        auditorId: acc.auditorId || null,
        issuedAt: Date.now(),
      };
      localStorage.setItem(VOUCH_SESSION_KEY, JSON.stringify(session));
      return session;
    });
  },
  getSession() {
    try {
      return JSON.parse(localStorage.getItem(VOUCH_SESSION_KEY));
    } catch (e) {
      return null;
    }
  },
  logout() {
    localStorage.removeItem(VOUCH_SESSION_KEY);
  },
};
