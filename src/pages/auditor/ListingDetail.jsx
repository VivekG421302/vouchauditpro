import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import MasterDetail from '../../components/ui/MasterDetail.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { vouchFormatDate } from '../../lib/db.js';
import { formatMoney } from '../../lib/format.js';
import { toast } from '../../store/useToastStore.js';

export default function AuditorListingDetail() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const auditorId = session?.auditorId;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('id');

  const [state, setState] = useState(undefined); // undefined = loading, null = not found, else { m, loc, conflict }
  const [applying, setApplying] = useState(false);

  function load() {
    api.getMarketplace().then((list) => {
      const m = list.find((x) => x.id === listingId);
      if (!m) {
        setState(null);
        return;
      }
      api.getLocation(listingId).then((loc) => {
        const conflictCheck = loc ? api.hasDateConflict(auditorId, loc.startDate, loc.endDate) : Promise.resolve(false);
        conflictCheck.then((conflict) => setState({ m, loc, conflict }));
      });
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, api]);

  if (state === undefined) {
    return (
      <AppShell role="auditor" title="Listing">
        <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
      </AppShell>
    );
  }

  if (state === null) {
    return (
      <AppShell role="auditor" title="Listing">
        <p className="text-sm text-slate-400 py-16 text-center">
          Listing not found.{' '}
          <button className="text-brand-600 font-medium" onClick={() => navigate('/auditor/marketplace')}>
            Back to Marketplace
          </button>
        </p>
      </AppShell>
    );
  }

  const { m, loc, conflict } = state;

  function handleApply() {
    setApplying(true);
    api.applyToProject(m.id).then((updated) => {
      setApplying(false);
      if (!updated) return;
      toast(`Application sent for "${updated.name}" — added to your calendar once confirmed`, 'check-circle-2', 'emerald');
      load();
    });
  }

  const left = (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
        <h3 className="font-display font-semibold text-ink-950 mb-3">Assignment Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[11px] text-slate-500">Audit Type</p>
            <p className="font-medium text-ink-950 mt-0.5">{m.type}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[11px] text-slate-500">Location</p>
            <p className="font-medium text-ink-950 mt-0.5">{m.location}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[11px] text-slate-500">Spots</p>
            <p className="font-medium text-ink-950 mt-0.5">
              {m.filled}/{m.spots} filled
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[11px] text-slate-500">Allowance / Day</p>
            <p className="font-medium text-ink-950 mt-0.5">{formatMoney(m.payout)}</p>
          </div>
          {loc && (
            <>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-500">Dates</p>
                <p className="font-medium text-ink-950 mt-0.5">
                  {vouchFormatDate(loc.startDate)} – {vouchFormatDate(loc.endDate)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-500">Timing</p>
                <p className="font-medium text-ink-950 mt-0.5">{loc.timing}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-500">Payment After</p>
                <p className="font-medium text-ink-950 mt-0.5">{loc.requirement.paymentAfterDays} days</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-500">Audit Guide</p>
                <p className="font-medium text-ink-950 mt-0.5 truncate">{loc.auditGuide || 'Not provided'}</p>
              </div>
            </>
          )}
        </div>
        {loc?.description && <p className="text-xs text-slate-500 mt-4">{loc.description}</p>}
        {loc?.requirement.note && (
          <p className="text-[11px] text-slate-500 bg-amber-50 border border-amber-100 rounded-lg p-2.5 mt-3">
            <span className="font-medium text-amber-700">Note from CA:</span> {loc.requirement.note}
          </p>
        )}
      </div>

      {loc?.contacts?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Site Contacts</p>
          <div className="space-y-2">
            {loc.contacts.map((c, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-ink-950">{c.name}</p>
                <p className="text-slate-500">
                  {c.title || ''} {c.phone ? `· ${c.phone}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  let btnLabel = 'Apply Now';
  let btnIcon = 'send';
  let btnClass = 'bg-ink-950 text-white hover:bg-ink-800';
  if (m.applied) {
    btnLabel = 'Applied';
    btnIcon = 'check-circle-2';
    btnClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  } else if (conflict) {
    btnLabel = 'Dates Clash';
    btnIcon = 'calendar-x';
    btnClass = 'bg-slate-100 text-slate-400 cursor-not-allowed';
  }

  const right = (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
      <div className="w-11 h-11 rounded-xl bg-ink-950 text-white flex items-center justify-center mb-3">
        <Icon name="building-2" className="w-5 h-5" />
      </div>
      <p className="font-display font-semibold text-ink-950">{m.company}</p>
      <p className="text-xs text-slate-500 mt-0.5">{m.location}</p>
      <div className="mt-4 pt-4 border-t border-slate-100">
        <span className="text-2xl font-display font-bold text-ink-950">{formatMoney(m.payout)}</span>
        <span className="text-xs text-slate-500 block">per auditor</span>
      </div>
      {conflict && !m.applied && (
        <div className="mt-3 flex items-start gap-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <Icon name="calendar-x" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>These dates overlap with an audit you're already confirmed for — you can't apply here.</span>
        </div>
      )}
      <button
        disabled={m.applied || conflict || applying}
        onClick={handleApply}
        className={`mt-4 w-full inline-flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg transition ${btnClass}`}
      >
        <Icon name={btnIcon} className="w-4 h-4" />
        {btnLabel}
      </button>
    </div>
  );

  return (
    <AppShell role="auditor" title={m.name}>
      <MasterDetail
        title={m.name}
        subtitle={`${m.company} · ${m.location}`}
        backHref="/auditor/marketplace"
        backLabel="Marketplace"
        left={left}
        right={right}
      />
    </AppShell>
  );
}
