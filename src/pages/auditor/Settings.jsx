import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import ThemePicker from '../../components/shared/ThemePicker.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';

const NOTIF_PREFS = [
  { id: 'reminder', label: 'Audit reminders', desc: 'A day-before nudge for your scheduled audits.' },
  { id: 'extension', label: 'Extension requests', desc: 'When a CA extends an audit and needs your response.' },
  { id: 'urgent', label: 'Urgent placement invites', desc: 'Priority audits that need auditors fast.' },
  { id: 'payment', label: 'Payment updates', desc: 'When a receipt moves from pending to paid.' },
];

export default function AuditorSettings() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const auditorId = session?.auditorId;

  const [profile, setProfile] = useState(null);
  const [theme, setThemeState] = useState('light');
  const [notifPrefs, setNotifPrefs] = useState(() => Object.fromEntries(NOTIF_PREFS.map((p) => [p.id, true])));

  useEffect(() => {
    if (!auditorId) return;
    Promise.all([api.getAuditorProfile(auditorId), api.getSettings()]).then(([p, settings]) => {
      setProfile(p);
      setThemeState(settings.theme || 'light');
    });
  }, [api, auditorId]);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <AppShell role="auditor" title="Settings">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your profile, payouts, appearance, and notification preferences.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center text-base font-semibold font-mono shrink-0">
                {session?.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-ink-950 truncate">{session?.name}</p>
                <p className="text-xs text-slate-500">
                  {auditorId} · {session?.username}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-4 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
            >
              <Icon name="log-out" className="w-4 h-4" />
              Log Out
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
            <h3 className="font-display font-semibold text-ink-950 mb-3 text-sm">Payouts</h3>
            {profile ? (
              <div className="space-y-2">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500">Bank Account</p>
                  <p className="text-sm font-medium text-ink-950 mt-0.5">{profile.bankLinked}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500">KYC Status</p>
                  <p className="text-sm font-medium text-emerald-600 mt-0.5">{profile.kyc}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Loading…</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
            <h3 className="font-display font-semibold text-ink-950 mb-3">Appearance</h3>
            <ThemePicker activeTheme={theme} onChange={setThemeState} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
            <h3 className="font-display font-semibold text-ink-950 mb-3">Notifications</h3>
            <div className="space-y-4">
              {NOTIF_PREFS.map((p) => (
                <label key={p.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink-950">{p.label}</p>
                    <p className="text-[11px] text-slate-500">{p.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs[p.id]}
                    onChange={() => setNotifPrefs((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                    className="w-9 h-5 rounded-full appearance-none bg-slate-200 checked:bg-brand-600 relative cursor-pointer transition-colors before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform checked:before:translate-x-4"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
