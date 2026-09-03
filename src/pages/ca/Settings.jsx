import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import ThemePicker from '../../components/shared/ThemePicker.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { toast } from '../../store/useToastStore.js';

export default function CaSettings() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [theme, setThemeState] = useState('light');
  const [guides, setGuides] = useState(null);
  const [guideName, setGuideName] = useState('');

  useEffect(() => {
    Promise.all([api.getSettings(), api.getAuditGuides()]).then(([settings, guideList]) => {
      setThemeState(settings.theme || 'light');
      setGuides(guideList);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  function handleGuideSubmit(e) {
    e.preventDefault();
    const name = guideName.trim();
    if (!name) return;
    api.addAuditGuide(name).then(() => {
      toast('Audit guide uploaded', 'upload', 'emerald');
      setGuideName('');
      api.getAuditGuides().then(setGuides);
    });
  }

  return (
    <AppShell role="ca" title="Settings">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your profile, appearance, and shared audit guides.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
          <div className="w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center text-lg font-semibold font-mono mb-3">
            {session?.initials || '--'}
          </div>
          <p className="font-display font-semibold text-ink-950">{session?.name}</p>
          <p className="text-xs text-slate-500">{session?.label || 'Chartered Accountant'}</p>
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
            <h3 className="font-display font-semibold text-ink-950 mb-3">Audit Guides Library</h3>
            <form className="flex gap-2 mb-4" onSubmit={handleGuideSubmit}>
              <input
                value={guideName}
                onChange={(e) => setGuideName(e.target.value)}
                placeholder="File name, e.g. Statutory_Audit_2026.pdf"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              />
              <button className="shrink-0 bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 inline-flex items-center gap-1.5">
                <Icon name="upload" className="w-4 h-4" />
                Upload
              </button>
            </form>
            <div id="guideList" className="space-y-2">
              {guides && guides.length ? (
                guides.map((g) => (
                  <div key={g.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon name="file-text" className="w-4 h-4 text-brand-600 shrink-0" />
                      <p className="text-xs font-medium text-ink-950 truncate">{g.name}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{g.id}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No audit guides uploaded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
