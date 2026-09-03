import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import MasterDetail from '../../components/ui/MasterDetail.jsx';
import Modal from '../../components/ui/Modal.jsx';
import AuditorProfileModal from '../../components/shared/AuditorProfileModal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { vouchFormatDate } from '../../lib/db.js';
import { formatMoney } from '../../lib/format.js';
import { toast } from '../../store/useToastStore.js';

function initialsOf(name) {
  return name.split(' ').map((s) => s[0]).slice(0, 2).join('');
}

export default function CaFulfillmentDetail() {
  const api = useVouchStore((s) => s.api);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('id');

  const [loc, setLoc] = useState(undefined); // undefined = loading, null = not found
  const [selected, setSelected] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [urgentOpen, setUrgentOpen] = useState(false);
  const [urgentNote, setUrgentNote] = useState('');

  function load() {
    api.getLocation(locationId).then((l) => {
      setLoc(l || null);
      setSelected([]);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, api]);

  if (loc === undefined) {
    return (
      <AppShell role="ca" title="Location Fulfillment">
        <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
      </AppShell>
    );
  }

  if (loc === null) {
    return (
      <AppShell role="ca" title="Location Fulfillment">
        <p className="text-sm text-slate-400 py-16 text-center">
          Location not found.{' '}
          <button className="text-brand-600 font-medium" onClick={() => navigate('/ca/fulfillment')}>
            Back to Fulfillment
          </button>
        </p>
      </AppShell>
    );
  }

  const isPending = loc.status === 'fulfillment_pending';
  const teamSoFar = [
    ...loc.caAuditors.map((a) => ({ ...a, locked: true })),
    ...loc.assignedAuditors.map((a) => ({ ...a, locked: true })),
  ];

  function toggleApplicant(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleConfirm(e) {
    e.preventDefault();
    if (!selected.length) {
      toast('Select at least one applicant first', 'alert-triangle', 'amber');
      return;
    }
    api.fulfillLocation(loc.id, selected).then(() => {
      toast('Fulfillment complete — location moved to Completed', 'check-check', 'emerald');
      navigate('/ca/fulfillment');
    });
  }

  function handleUrgentSubmit(e) {
    e.preventDefault();
    api.requestUrgentAuditors(locationId, urgentNote).then(() => {
      setUrgentOpen(false);
      setUrgentNote('');
      toast('Urgent request sent — our team will reach out shortly (extra charges apply)', 'zap', 'red');
      load();
    });
  }

  const left = (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-ink-950">{isPending ? 'Applicants' : 'Confirmed Team'}</h3>
        <span className="text-[11px] font-mono text-brand-700 bg-brand-50 border border-brand-100 px-2 py-1 rounded-full">
          {teamSoFar.length} / {loc.requirement.auditorsNeeded} filled
        </span>
      </div>

      {teamSoFar.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Already locked in</p>
          <div className="space-y-2 mb-4">
            {teamSoFar.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center">
                    {initialsOf(a.name)}
                  </div>
                  <p className="text-xs font-medium text-ink-950">{a.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="text-[10px] font-medium text-slate-500 hover:text-brand-600" onClick={() => setProfileId(a.id)}>
                    Profile
                  </button>
                  <span className="text-[10px] text-emerald-700 font-medium">Confirmed</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {isPending ? (
        <>
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Applied — select to fulfill</p>
          <form className="space-y-2" onSubmit={handleConfirm}>
            {loc.applicants.length ? (
              loc.applicants.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:border-brand-300"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selected.includes(a.id)}
                      onChange={() => toggleApplicant(a.id)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="w-8 h-8 rounded-full bg-ink-950 text-white text-xs font-semibold flex items-center justify-center">
                      {initialsOf(a.name)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-ink-950">{a.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {a.experience} · ★ {a.rating}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="text-[10px] font-medium text-slate-500 hover:text-brand-600"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setProfileId(a.id);
                      }}
                    >
                      Profile
                    </button>
                    <span className="text-[10px] text-slate-400">Applied {a.appliedOn}</span>
                  </div>
                </label>
              ))
            ) : (
              <p className="text-xs text-slate-400">
                No applications yet — auditors will apply from the marketplace, or you can request urgent placement.
              </p>
            )}
            {loc.applicants.length > 0 && (
              <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 mt-2">
                Confirm Selected &amp; Complete Fulfillment
              </button>
            )}
          </form>
        </>
      ) : (
        <p className="text-xs text-emerald-700 font-medium mt-2 inline-flex items-center gap-1.5">
          <Icon name="check-check" className="w-4 h-4" />
          Fully staffed — waiting on the audit start date.
        </p>
      )}
    </div>
  );

  const right = (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-11 h-11 rounded-xl bg-ink-950 text-white flex items-center justify-center">
            <Icon name="map-pin" className="w-5 h-5" />
          </div>
          {loc.urgent ? (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200">
              Urgent Requested
            </span>
          ) : (
            <StatusBadge status={isPending ? 'pending' : 'approved'} />
          )}
        </div>
        <p className="font-display font-semibold text-ink-950">{loc.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{loc.description || ''}</p>
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Window</span>
            <span className="font-medium text-ink-950 text-right">
              {vouchFormatDate(loc.startDate)} – {vouchFormatDate(loc.endDate)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Timing</span>
            <span className="font-medium text-ink-950">{loc.timing}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Allowance</span>
            <span className="font-medium text-ink-950">{formatMoney(loc.requirement.allowance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Payment after</span>
            <span className="font-medium text-ink-950">{loc.requirement.paymentAfterDays} days</span>
          </div>
          {loc.auditGuide && (
            <div className="flex justify-between">
              <span className="text-slate-500">Audit guide</span>
              <span className="font-medium text-ink-950 text-right truncate max-w-[160px]">{loc.auditGuide}</span>
            </div>
          )}
        </div>
        {loc.requirement.note && (
          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5 mt-3">
            {loc.requirement.note}
          </p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Contacts</p>
        <div className="space-y-2">
          {(loc.contacts || []).length ? (
            loc.contacts.map((c, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-ink-950">{c.name}</p>
                <p className="text-slate-500">
                  {c.title || ''} {c.phone ? `· ${c.phone}` : ''}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">No contacts on file.</p>
          )}
        </div>
      </div>

      {isPending && (
        <button
          disabled={loc.urgent}
          onClick={() => setUrgentOpen(true)}
          className="w-full bg-white border border-red-200 text-red-600 text-sm font-medium py-2.5 rounded-lg hover:bg-red-50 inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          <Icon name="zap" className="w-4 h-4" />
          {loc.urgent ? 'Urgent Request Sent' : 'Request Urgent Auditors'}
        </button>
      )}
    </>
  );

  return (
    <AppShell role="ca" title="Location Fulfillment">
      <MasterDetail
        title={loc.name}
        subtitle={`${loc.auditType} · ${loc.address}`}
        backHref="/ca/fulfillment"
        backLabel="Fulfillment"
        left={left}
        right={right}
      />

      <Modal open={urgentOpen} onClose={() => setUrgentOpen(false)} title="Request Urgent Auditors">
        <p className="text-xs text-slate-500 mb-3">
          Vouch will place remaining auditors on priority for this location. Additional urgent-placement charges apply.
        </p>
        <form className="space-y-3" onSubmit={handleUrgentSubmit}>
          <textarea
            rows={3}
            value={urgentNote}
            onChange={(e) => setUrgentNote(e.target.value)}
            placeholder="Anything our team should know (e.g. how many spots are still open, deadline)"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white resize-none"
          />
          <button className="w-full bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-red-700">
            Send Urgent Request
          </button>
        </form>
      </Modal>

      <AuditorProfileModal auditorId={profileId} onClose={() => setProfileId(null)} />
    </AppShell>
  );
}
