import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Modal from '../../components/ui/Modal.jsx';
import CollabChat from '../../components/collab/CollabChat.jsx';
import CollabDocuments from '../../components/collab/CollabDocuments.jsx';
import CollabStatus from '../../components/collab/CollabStatus.jsx';
import CollabRemoteShare from '../../components/collab/CollabRemoteShare.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { vouchDaysUntil } from '../../lib/db.js';
import { toast } from '../../store/useToastStore.js';

const TABS = ['status', 'documents', 'findings', 'chat', 'remote share'];
const PHOTO_TONE = {
  Damage: 'bg-red-50 text-red-600 border-red-200',
  Suspicious: 'bg-amber-50 text-amber-700 border-amber-200',
  General: 'bg-slate-100 text-slate-500 border-slate-200',
  'Sign-Off Document': 'bg-brand-50 text-brand-700 border-brand-100',
};

function FindingsPanel({ loc, onDispute }) {
  const photos = loc.photos || [];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-semibold text-ink-950">Findings from the Field</h3>
        <span className="text-[11px] text-slate-400">{photos.length} logged</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Damage, suspicious activity, and general photo proofs logged by the field auditor — visible to you as they're added, not just at the end.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {photos.length === 0 && (
          <p className="text-xs text-slate-400 col-span-2">No findings logged yet — this fills in as the field auditor adds photo proofs.</p>
        )}
        {photos.map((p) => (
          <div key={p.id} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="relative aspect-video bg-slate-100">
              <img src={p.url} className="w-full h-full object-cover" alt={p.type} />
              <span className={`absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full border ${PHOTO_TONE[p.type] || PHOTO_TONE.General}`}>
                {p.type}
              </span>
              {p.disputed && (
                <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200 inline-flex items-center gap-1">
                  <Icon name="flag" className="w-3 h-3" />
                  Disputed
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="text-[11px] text-slate-500">
                {p.by || 'Field auditor'} · {p.ts}
              </p>
              {p.remark && <p className="text-xs text-ink-950 mt-1">{p.remark}</p>}
              {p.disputed ? (
                <p className="text-[11px] text-red-600 mt-2 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                  Your note: {p.disputeNote || '—'} · sent to your CA for review.
                </p>
              ) : (
                <button onClick={() => onDispute(p.id)} className="mt-2 text-[11px] font-medium text-red-600 inline-flex items-center gap-1">
                  <Icon name="flag" className="w-3 h-3" />
                  Dispute this finding
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompanyAuditDetail() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('id');

  const [loc, setLoc] = useState(undefined);
  const [tab, setTab] = useState('status');
  const [scanSummary, setScanSummary] = useState(null);
  const [disputeId, setDisputeId] = useState(null);
  const [disputeNote, setDisputeNote] = useState('');
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [postponeReason, setPostponeReason] = useState('');

  function load() {
    api.getLocation(locationId).then((l) => setLoc(l || null));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, api]);

  useEffect(() => {
    if (!loc) return;
    api.getScanSummary(loc.id).then(setScanSummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc?.id, api]);

  if (loc === undefined) {
    return (
      <AppShell role="company" title="Audit">
        <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
      </AppShell>
    );
  }

  if (loc === null) {
    return (
      <AppShell role="company" title="Audit">
        <p className="text-sm text-slate-400 py-16 text-center">
          Audit not found.{' '}
          <Link to="/company/audits" className="text-brand-600 font-medium">
            Back to My Audits
          </Link>
        </p>
      </AppShell>
    );
  }

  const daysToStart = vouchDaysUntil(loc.startDate);
  const pendingDocs = (loc.documentRequests || []).filter((d) => d.status === 'pending');
  const showDeadlineBanner = pendingDocs.length > 0 && daysToStart !== null && daysToStart <= 3;

  function handleDisputeSubmit(e) {
    e.preventDefault();
    api.disputeFinding(locationId, disputeId, disputeNote).then(() => {
      setDisputeId(null);
      setDisputeNote('');
      toast('Finding disputed — sent to your CA for review', 'flag', 'amber');
      load();
    });
  }

  function handlePostponeSubmit(e) {
    e.preventDefault();
    api
      .createCompanyRequest({
        companyName: session.name,
        type: 'postponement',
        locationId,
        locationName: loc.name,
        message: postponeReason,
      })
      .then(() => {
        setPostponeOpen(false);
        setPostponeReason('');
        toast("Postponement request sent to your CA — they'll confirm the new schedule", 'calendar-clock', 'amber');
      });
  }

  return (
    <AppShell role="company" title={loc.name}>
      <div className="mb-5">
        <Link to="/company/audits" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ink-950 mb-3 transition">
          <Icon name="arrow-left" className="w-3.5 h-3.5" />
          My Audits
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-950">{loc.name}</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {loc.auditType} · {loc.address}
            </p>
          </div>
          {!loc.postponed && !loc.cancelled && loc.status !== 'history' && (
            <button
              onClick={() => setPostponeOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition"
            >
              <Icon name="calendar-clock" className="w-3.5 h-3.5" />
              Request Postponement
            </button>
          )}
        </div>
      </div>

      {showDeadlineBanner && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <Icon name="alarm-clock" className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">
              {pendingDocs.length} document{pendingDocs.length === 1 ? '' : 's'} still pending
            </span>{' '}
            — this audit {daysToStart < 0 ? 'has already started' : daysToStart === 0 ? 'starts today' : `starts in ${daysToStart} day${daysToStart === 1 ? '' : 's'}`}.
            Fulfill outstanding requests under the Documents tab to avoid delays.
          </p>
        </div>
      )}

      {loc.postponed && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <Icon name="calendar-x" className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600">
            <span className="font-semibold">This audit is postponed.</span> {loc.cancelReason || 'Your CA will confirm a new schedule.'}
          </p>
        </div>
      )}

      {scanSummary?.started && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-4 mb-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Audit Scanning Progress</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 rounded-lg p-2">
              <p className="text-sm font-bold text-ink-950">
                {scanSummary.binsDone}/{scanSummary.binsTotal}
              </p>
              <p className="text-[9px] text-slate-500">Bins Scanned</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <p className="text-sm font-bold text-ink-950">{scanSummary.items}</p>
              <p className="text-[9px] text-slate-500">Items Loaded</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <p className={`text-sm font-bold ${scanSummary.pendingReco ? 'text-amber-600' : 'text-emerald-600'}`}>{scanSummary.pendingReco}</p>
              <p className="text-[9px] text-slate-500">Pending Reco</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1 mb-4 overflow-x-auto max-w-full">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3.5 py-2 text-xs font-medium rounded-lg capitalize transition ${
              tab === t ? 'bg-white shadow-card text-ink-950' : 'text-slate-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'status' && <CollabStatus locationId={loc.id} />}
      {tab === 'documents' && (
        <CollabDocuments locationId={loc.id} viewer={{ name: session.name, role: 'Company' }} perms={{ canRequest: false, canFulfill: true, canVerify: false }} />
      )}
      {tab === 'findings' && <FindingsPanel loc={loc} onDispute={setDisputeId} />}
      {tab === 'chat' && <CollabChat locationId={loc.id} viewer={{ name: session.name, role: 'Company' }} />}
      {tab === 'remote share' && <CollabRemoteShare locationId={loc.id} viewer={{ name: session.name, role: 'Company' }} />}

      <Modal open={!!disputeId} onClose={() => setDisputeId(null)} title="Dispute Finding" maxWidth="max-w-sm">
        <form className="space-y-3" onSubmit={handleDisputeSubmit}>
          <textarea
            required
            rows={3}
            value={disputeNote}
            onChange={(e) => setDisputeNote(e.target.value)}
            placeholder="Why are you disputing this finding?"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white resize-none"
          />
          <button className="w-full bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-red-700">Send Dispute</button>
        </form>
      </Modal>

      <Modal open={postponeOpen} onClose={() => setPostponeOpen(false)} title="Request Postponement" maxWidth="max-w-sm">
        <form className="space-y-3" onSubmit={handlePostponeSubmit}>
          <textarea
            required
            rows={3}
            value={postponeReason}
            onChange={(e) => setPostponeReason(e.target.value)}
            placeholder="Why do you need to postpone this audit?"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white resize-none"
          />
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700">Send Request</button>
        </form>
      </Modal>
    </AppShell>
  );
}
