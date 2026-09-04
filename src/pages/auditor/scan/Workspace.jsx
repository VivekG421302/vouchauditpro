import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../../components/layout/AppShell.jsx';
import { Icon } from '../../../components/ui/Icon.jsx';
import { useVouchStore } from '../../../store/useVouchStore.js';
import { useAuthStore } from '../../../store/useAuthStore.js';
import ScanUpload from './Upload.jsx';

// Tabs mirror the original standalone pages (index.html=audit,
// executive.html, reco.html, upload.html). Lead sees all four; Executive
// only ever sees the executive view (guard() in the original redirected
// away from every other page for non-leads).
const LEAD_TABS = ['upload', 'audit', 'reco'];

export default function ScanWorkspace() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const auditorId = session?.auditorId;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('locationId');

  const [loc, setLoc] = useState(undefined); // undefined = loading, null = guard failed
  const [tab, setTab] = useState('upload');

  useEffect(() => {
    if (!locationId || !auditorId) {
      setLoc(null);
      return;
    }
    api.getLocation(locationId).then((l) => {
      const onTeam = l && [...(l.caAuditors || []), ...(l.assignedAuditors || [])].some((a) => a.id === auditorId);
      setLoc(onTeam ? l : null);
    });
  }, [api, locationId, auditorId]);

  if (loc === undefined) {
    return (
      <AppShell role="auditor" title="Audit Scanning">
        <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
      </AppShell>
    );
  }

  if (loc === null) {
    return (
      <AppShell role="auditor" title="Audit Scanning">
        <p className="text-sm text-slate-400 py-16 text-center">
          {locationId ? "You're not confirmed on this assignment." : 'No assignment specified.'}{' '}
          <button className="text-brand-600 font-medium" onClick={() => navigate('/auditor/audit')}>
            Back to Audit Activity
          </button>
        </p>
      </AppShell>
    );
  }

  const isLead = loc.leadAuditorId === auditorId;

  if (!isLead) {
    return (
      <AppShell role="auditor" title="Audit Scanning">
        <Link to={`/auditor/audit?id=${loc.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ink-950 mb-3">
          <Icon name="arrow-left" className="w-3.5 h-3.5" />
          {loc.name}
        </Link>
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Icon name="scan-barcode" className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-ink-950">Executive scanning view</p>
          <p className="text-xs text-slate-500 mt-1">
            The streamlined bin-by-bin scanning flow for Audit Executives hasn't been ported to React yet — coming in a later session.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="auditor" title="Audit Scanning">
      <Link to={`/auditor/audit?id=${loc.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ink-950 mb-3">
        <Icon name="arrow-left" className="w-3.5 h-3.5" />
        {loc.name}
      </Link>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-950">Audit Scanning</h1>
          <p className="text-slate-500 text-sm mt-0.5">{loc.name}</p>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200 inline-flex items-center gap-1">
          <Icon name="crown" className="w-3 h-3" />
          Audit Lead
        </span>
      </div>

      <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1 mb-5 overflow-x-auto max-w-full">
        {LEAD_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3.5 py-2 text-xs font-medium rounded-lg capitalize transition ${tab === t ? 'bg-white shadow-card text-ink-950' : 'text-slate-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'upload' && <ScanUpload locationId={loc.id} />}

      {tab !== 'upload' && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <p className="text-sm font-semibold text-ink-950 capitalize">{tab}</p>
          <p className="text-xs text-slate-500 mt-1">This tab hasn't been ported to React yet — coming in a later session.</p>
        </div>
      )}
    </AppShell>
  );
}
