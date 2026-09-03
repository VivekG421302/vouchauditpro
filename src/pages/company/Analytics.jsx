import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import MasterDetail from '../../components/ui/MasterDetail.jsx';
import LocationCard from '../../components/shared/LocationCard.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';

const TONE_MAP = { emerald: 'bg-emerald-500', brand: 'bg-brand-500', amber: 'bg-amber-500', slate: 'bg-slate-300' };

export default function CompanyAnalytics() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const [state, setState] = useState(null);

  useEffect(() => {
    Promise.all([api.getCompanies(), api.getCompanyProgress()]).then(([companies, progress]) => {
      const company = companies.find((c) => c.name === session.name) || companies[0] || null;
      setState({ company, progress });
    });
  }, [api, session.name]);

  if (!state) {
    return (
      <AppShell role="company" title="Progress Analytics">
        <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
      </AppShell>
    );
  }

  const { company, progress } = state;

  const left = (
    <>
      <h3 className="font-display font-semibold text-sm text-ink-950">Your Branches</h3>
      {company && company.branches.length ? (
        <div className="space-y-4 mt-3">
          {company.branches.map((b) => (
            <LocationCard key={b.id} branch={b} />
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState
            icon="map-pin"
            title="No branches on file yet"
            message="Your CA sets up geofenced branches during onboarding — reach out to them if this looks empty."
          />
        </div>
      )}
    </>
  );

  const right = (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
        <div className="w-11 h-11 rounded-xl bg-ink-950 text-white flex items-center justify-center mb-3">
          <Icon name="building-2" className="w-5 h-5" />
        </div>
        <p className="font-display font-semibold text-ink-950">{company ? company.name : session.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{company ? company.industry : ''}</p>
        <Link
          to="/company/ingestion"
          className="mt-4 w-full inline-flex items-center justify-center gap-1.5 bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 transition"
        >
          <Icon name="upload-cloud" className="w-4 h-4" />
          Upload Documents
        </Link>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-sm text-ink-950">{progress.projectName}</h3>
          <span className="text-[11px] font-mono text-brand-700 bg-brand-50 border border-brand-100 px-2 py-1 rounded-full">In Progress</span>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="font-display text-3xl font-bold text-ink-950">{progress.pct}%</span>
          <span className="text-xs text-slate-500 mb-1">scope verified</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden mb-4">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500" style={{ width: `${progress.pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          <div className="bg-slate-50 rounded-lg py-2">
            <p className="font-display font-bold text-ink-950 text-sm">
              {progress.branchesAudited}/{progress.branchesTotal}
            </p>
            <p className="text-[10px] text-slate-500">Branches</p>
          </div>
          <div className="bg-slate-50 rounded-lg py-2">
            <p className="font-display font-bold text-ink-950 text-sm">
              {progress.itemsVerified}/{progress.itemsTotal}
            </p>
            <p className="text-[10px] text-slate-500">Items</p>
          </div>
          <div className="bg-slate-50 rounded-lg py-2">
            <p className="font-display font-bold text-emerald-600 text-sm">{progress.auditorsOnSite}</p>
            <p className="text-[10px] text-slate-500">On-Site</p>
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Branch Ratio</p>
        <div className="space-y-2.5">
          {progress.branchRatios.map((d) => (
            <div key={d.label}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-600 font-medium">{d.label}</span>
                <span className="font-mono text-slate-400">{d.pct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full ${TONE_MAP[d.tone]} rounded-full`} style={{ width: `${d.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <AppShell role="company" title="Progress Analytics">
      <MasterDetail title="Client Monitoring Hub" subtitle="Track live audit progress across your registered branches." left={left} right={right} />
    </AppShell>
  );
}
