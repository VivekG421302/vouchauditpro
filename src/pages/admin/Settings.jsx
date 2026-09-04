import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import ThemePicker from '../../components/shared/ThemePicker.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { usePwaInstall } from '../../lib/usePwaInstall.js';
import { toast } from '../../store/useToastStore.js';

export default function AdminSettings() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { canInstall, installed, promptInstall } = usePwaInstall();

  const [theme, setThemeState] = useState('light');
  const [rbac, setRbac] = useState(null);

  useEffect(() => {
    api.getSettings().then((settings) => {
      setThemeState(settings.theme || 'light');
      setRbac(settings.rbac || []);
    });
  }, [api]);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <AppShell role="admin" title="Settings">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Appearance, role permissions, and app install.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
          <div className="w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center text-lg font-semibold font-mono mb-3">
            {session?.initials || '--'}
          </div>
          <p className="font-display font-semibold text-ink-950">{session?.name}</p>
          <p className="text-xs text-slate-500">{session?.label || 'Platform Admin'}</p>
          <button
            onClick={handleLogout}
            className="w-full mt-4 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
          >
            <Icon name="log-out" className="w-4 h-4" />
            Log Out
          </button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
            <h3 className="font-display font-semibold text-ink-950 mb-3">Appearance</h3>
            <ThemePicker activeTheme={theme} onChange={setThemeState} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
            <h3 className="font-display font-semibold text-ink-950 mb-3">Role Permissions</h3>
            <div className="overflow-hidden border border-slate-200 rounded-xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Users</th>
                    <th className="px-4 py-3 font-medium">Projects</th>
                    <th className="px-4 py-3 font-medium">Invoices</th>
                    <th className="px-4 py-3 font-medium">Settings</th>
                  </tr>
                </thead>
                <tbody>
                  {rbac === null && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-400">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {rbac &&
                    rbac.map((r) => (
                      <tr key={r.role} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{r.role}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{r.users}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{r.projects}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{r.invoices}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{r.settings}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-ink-950">Install as App</h3>
              <span
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                  installed ? 'bg-emerald-50 text-emerald-700' : canInstall ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {installed ? 'Installed' : canInstall ? 'Available' : 'Not available on this browser'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Install Vouch as a standalone app for faster access and offline support for previously visited pages.
            </p>
            {!installed && (
              <button
                disabled={!canInstall}
                onClick={() =>
                  promptInstall().then((outcome) => {
                    if (outcome === 'accepted') toast('Vouch installed', 'check-circle-2', 'emerald');
                    else if (outcome === 'dismissed') toast('Install dismissed', 'x', 'ink');
                  })
                }
                className="inline-flex items-center gap-1.5 bg-ink-950 text-white text-xs font-medium px-3.5 py-2 rounded-lg hover:bg-ink-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="download" className="w-3.5 h-3.5" />
                Install
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
