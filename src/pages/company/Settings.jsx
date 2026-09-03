import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import ThemePicker from '../../components/shared/ThemePicker.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';

export default function CompanySettings() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [theme, setThemeState] = useState('light');
  const [company, setCompany] = useState(undefined);

  useEffect(() => {
    Promise.all([api.getSettings(), api.getCompanyByName(session.name)]).then(([settings, c]) => {
      setThemeState(settings.theme || 'light');
      setCompany(c || null);
    });
  }, [api, session.name]);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <AppShell role="company" title="Settings">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your profile, appearance, and company record.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
          <div className="w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center text-lg font-semibold font-mono mb-3">
            {session?.initials || '--'}
          </div>
          <p className="font-display font-semibold text-ink-950">{session?.name}</p>
          <p className="text-xs text-slate-500">{session?.label || 'Client — Company Portal'}</p>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Username</span>
              <span className="font-medium text-ink-950">{session?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Role</span>
              <span className="font-medium text-ink-950 capitalize">{session?.role}</span>
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

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
            <h3 className="font-display font-semibold text-ink-950 mb-3">Appearance</h3>
            <ThemePicker activeTheme={theme} onChange={setThemeState} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
            <h3 className="font-display font-semibold text-ink-950 mb-1">Company on File</h3>
            <p className="text-xs text-slate-500 mb-4">Read-only — reach out to Vouch support to change your registered company name or industry.</p>
            {company === undefined && <p className="text-xs text-slate-400">Loading…</p>}
            {company === null && <p className="text-xs text-slate-400">No company record found for this account.</p>}
            {company && (
              <div className="grid sm:grid-cols-3 gap-3 max-w-2xl">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Name</p>
                  <p className="text-xs font-medium text-ink-950 mt-0.5">{company.name}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Industry</p>
                  <p className="text-xs font-medium text-ink-950 mt-0.5">{company.industry}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Branches</p>
                  <p className="text-xs font-medium text-ink-950 mt-0.5">
                    {company.branches.length} on file —{' '}
                    <Link to="/company/branches" className="text-brand-600">
                      manage
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
