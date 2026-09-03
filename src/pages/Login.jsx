import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui/Icon.jsx';
import { useAuthStore } from '../store/useAuthStore.js';
import { useVouchStore } from '../store/useVouchStore.js';

const DEMO_ACCOUNTS = [
  { role: 'Admin', username: 'admin@vouch.com' },
  { role: 'CA', username: 'ca@vouch.com' },
  { role: 'Auditor', username: 'auditor@vouch.com' },
  { role: 'Company', username: 'company@vouch.com' },
];

const ROLE_HOME = {
  admin: '/admin/dashboard',
  ca: '/ca/dashboard',
  auditor: '/auditor/home',
  company: '/company/analytics',
};

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const resetDemoData = useVouchStore((s) => s.resetDemoData);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const session = await login(username, password);
    setSubmitting(false);
    if (!session) {
      setError('Invalid email or password.');
      return;
    }
    navigate(ROLE_HOME[session.role] || '/');
  }

  function fillDemo(demoUsername) {
    setUsername(demoUsername);
    setPassword('password');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-[920px] grid lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
        {/* left: brand panel */}
        <div className="hidden lg:flex flex-col justify-between bg-ink-950 text-white p-10 relative overflow-hidden grain">
          <div className="radar-ring text-brand-400" style={{ width: 260, height: 260, top: -80, right: -80 }} />
          <div
            className="radar-ring r2 text-brand-400"
            style={{ width: 180, height: 180, bottom: -60, left: -60, top: 'auto', right: 'auto' }}
          />
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
              <Icon name="shield-check" className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Vouch</span>
          </div>
          <div className="relative z-10">
            <h1 className="font-display text-3xl font-semibold leading-tight">
              Audit operations,
              <br />
              verified in the field.
            </h1>
            <p className="text-slate-400 text-sm mt-3 max-w-xs">
              Geofenced check-ins, transparent payouts and a live approval chain from CA to Admin to Auditor.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-6 text-xs font-mono text-slate-400">
            <span>RBAC</span>
            <span>·</span>
            <span>JWT-ready</span>
            <span>·</span>
            <span>SMTP-ready</span>
          </div>
        </div>

        {/* right: login form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-ink-950 flex items-center justify-center">
              <Icon name="shield-check" className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-ink-950">Vouch</span>
          </div>

          <h2 className="font-display text-xl font-semibold text-ink-950">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">Use one of the 4 demo accounts below, or tap a role to autofill.</p>

          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                placeholder="admin@vouch.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                placeholder="password"
              />
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <button
              disabled={submitting}
              className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 transition inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Icon name="log-in" className="w-4 h-4" />
              Sign in
            </button>
          </form>

          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Quick demo access</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => fillDemo(acc.username)}
                  className="text-left px-3 py-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 transition"
                >
                  <span className="block text-xs font-semibold text-ink-950">{acc.role}</span>
                  <span className="block text-[10px] font-mono text-slate-400">{acc.username}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={resetDemoData}
            className="mt-6 text-[11px] text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 self-start"
          >
            <Icon name="rotate-ccw" className="w-3 h-3" />
            Reset demo data
          </button>
        </div>
      </div>
    </div>
  );
}
