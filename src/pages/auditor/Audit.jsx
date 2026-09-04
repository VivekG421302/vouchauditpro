import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Modal from '../../components/ui/Modal.jsx';
import CollabChat from '../../components/collab/CollabChat.jsx';
import CollabDocuments from '../../components/collab/CollabDocuments.jsx';
import StatusPhotosPanel from '../../components/collab/StatusPhotosPanel.jsx';
import TeamPanel from '../../components/collab/TeamPanel.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { vouchFormatDate, vouchDaysUntil } from '../../lib/db.js';
import { formatMoney } from '../../lib/format.js';
import { toast } from '../../store/useToastStore.js';

const TABS = ['overview', 'scanning', 'documents', 'status', 'chat', 'team'];
const TAB_LABEL = { status: 'Status & Photos', scanning: 'Audit Scan' };

export default function AuditorAudit() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const auditorId = session?.auditorId;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('id');

  const [assignments, setAssignments] = useState(null);
  useEffect(() => {
    if (locationId || !auditorId) return;
    api.getAssignmentsForAuditor(auditorId).then((list) =>
      setAssignments(list.filter((l) => ['monitoring', 'fulfillment_completed'].includes(l.status)))
    );
  }, [api, auditorId, locationId]);

  const [loc, setLoc] = useState(undefined);
  const [tab, setTab] = useState('overview');
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [scanSummary, setScanSummary] = useState(null);

  function load() {
    api.getLocation(locationId).then((l) => setLoc(l || null));
  }

  useEffect(() => {
    if (!locationId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, api]);

  useEffect(() => {
    if (tab !== 'scanning' || !loc) return;
    setScanSummary(null);
    api.getScanSummary(loc.id).then(setScanSummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, loc?.id, api]);

  if (!locationId) {
    return (
      <AppShell role="auditor" title="Audit Activity">
        <h1 className="font-display text-xl font-bold text-ink-950 mb-4">Audit Activity</h1>
        <div className="space-y-2.5 max-w-xl">
          {assignments === null && <p className="text-sm text-slate-400 py-10 text-center">Loading…</p>}
          {assignments && assignments.length === 0 && (
            <p className="text-sm text-slate-400 py-10 text-center">No active or scheduled audits yet — apply from the Marketplace.</p>
          )}
          {assignments &&
            assignments.map((l) => (
              <Link key={l.id} to={`/auditor/audit?id=${l.id}`} className="block bg-white border border-slate-200 rounded-2xl p-4 shadow-card hover:shadow-md transition">
                <p className="font-display font-semibold text-ink-950">{l.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {l.auditType} · {l.address}
                </p>
              </Link>
            ))}
        </div>
      </AppShell>
    );
  }

  if (loc === undefined) {
    return (
      <AppShell role="auditor" title="Audit Activity">
        <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
      </AppShell>
    );
  }

  if (loc === null) {
    return (
      <AppShell role="auditor" title="Audit Activity">
        <p className="text-sm text-slate-400 py-16 text-center">
          Assignment not found.{' '}
          <button className="text-brand-600 font-medium" onClick={() => navigate('/auditor/audit')}>
            Back to Audit Activity
          </button>
        </p>
      </AppShell>
    );
  }

  const me = loc.assignedAuditors.find((a) => a.id === auditorId) || loc.caAuditors.find((a) => a.id === auditorId) || { id: auditorId, name: session.name };
  const daysToEnd = vouchDaysUntil(loc.expectedEnd || loc.endDate);
  const canSignOff = daysToEnd !== null && daysToEnd <= 2 && !me.signedOff;
  const isLead = loc.leadAuditorId === auditorId;
  const hasLead = !!loc.leadAuditorId;

  function handleExtensionResponse(response) {
    api.respondToExtension(loc.id, auditorId, response).then(() => {
      toast(
        response === 'continue' ? 'Confirmed for the extended period' : "Noted — you're off this location after the current period",
        response === 'continue' ? 'check-circle-2' : 'log-out',
        response === 'continue' ? 'emerald' : 'amber'
      );
      load();
    });
  }

  function handleSignOff() {
    api.submitSignOff(loc.id, auditorId).then(() => {
      toast('Sign-off submitted — attach any closing documents under Status & Photos', 'file-check-2', 'emerald');
      load();
    });
  }

  function handleLeaveSubmit(e) {
    e.preventDefault();
    api.requestLeave(loc.id, auditorId, leaveReason).then(() => {
      setLeaveOpen(false);
      setLeaveReason('');
      toast('Leave request sent to your CA', 'log-out', 'amber');
      load();
    });
  }

  return (
    <AppShell role="auditor" title={loc.name}>
      <Link to="/auditor/audit" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ink-950 mb-3 transition">
        <Icon name="arrow-left" className="w-3.5 h-3.5" />
        All Assignments
      </Link>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-950">{loc.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loc.auditType} · {loc.address}
          </p>
        </div>
        <button
          onClick={() => setIdModalOpen(true)}
          className="shrink-0 bg-ink-950 text-white text-xs font-medium px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5"
        >
          <Icon name="badge-check" className="w-3.5 h-3.5" />
          Show ID
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {loc.cancelled && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
            <Icon name="ban" className="w-4 h-4 shrink-0 mt-0.5" />
            <span>This audit has been cancelled by the CA.{loc.cancelReason ? ` Reason: ${loc.cancelReason}` : ''}</span>
          </div>
        )}
        {!loc.cancelled && loc.postponed && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
            <Icon name="clock" className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              This audit has been postponed by the CA.{loc.cancelReason ? ` Reason: ${loc.cancelReason}` : ''} We'll notify you once it's
              rescheduled.
            </span>
          </div>
        )}
        {loc.onHold && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
            <Icon name="pause" className="w-4 h-4 shrink-0 mt-0.5" />
            <span>The CA has put this audit on hold for now.</span>
          </div>
        )}
        {loc.extended && me.extensionResponse === null && (
          <div className="bg-brand-50 border border-brand-100 text-brand-700 text-xs rounded-xl px-4 py-3">
            <div className="flex items-start gap-2 mb-2">
              <Icon name="calendar-clock" className="w-4 h-4 shrink-0 mt-0.5" />
              <span>This audit has been extended to {vouchFormatDate(loc.expectedEnd)}. Can you continue through the extended period?</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleExtensionResponse('continue')} className="text-[11px] font-medium bg-ink-950 text-white px-3 py-1.5 rounded-lg">
                Continue
              </button>
              <button onClick={() => handleExtensionResponse('leaving')} className="text-[11px] font-medium border border-brand-200 text-brand-700 px-3 py-1.5 rounded-lg">
                I'll Leave
              </button>
            </div>
          </div>
        )}
        {loc.extended && me.extensionResponse === 'leaving' && (
          <div className="bg-slate-100 border border-slate-200 text-slate-600 text-xs rounded-xl px-4 py-3">
            You've opted out of the extended period ending {vouchFormatDate(loc.expectedEnd)}.
          </div>
        )}
        {me.leaveRequested && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-4 py-3">
            Your leave request is with the CA for review: "{me.leaveReason}"
          </div>
        )}
      </div>

      <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1 mb-4 overflow-x-auto max-w-full">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3.5 py-2 text-xs font-medium rounded-lg capitalize transition ${
              tab === t ? 'bg-white shadow-card text-ink-950' : 'text-slate-500'
            }`}
          >
            {TAB_LABEL[t] || t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
              <h3 className="font-display font-semibold text-ink-950 mb-3">Assignment Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500">Window</p>
                  <p className="font-medium text-ink-950 mt-0.5">
                    {vouchFormatDate(loc.startDate)} – {vouchFormatDate(loc.expectedEnd || loc.endDate)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500">Timing</p>
                  <p className="font-medium text-ink-950 mt-0.5">{loc.timing}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500">Allowance / Day</p>
                  <p className="font-medium text-ink-950 mt-0.5">{formatMoney(loc.requirement.allowance)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500">Progress</p>
                  <p className="font-medium text-ink-950 mt-0.5">{loc.progress || 0}%</p>
                </div>
              </div>
              {loc.description && <p className="text-xs text-slate-500 mt-4">{loc.description}</p>}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Site Contacts</p>
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
          </div>
          <div className="space-y-3">
            <Link
              to={`/auditor/file-sharing?id=${loc.id}`}
              className="w-full bg-white border border-slate-200 text-ink-950 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
            >
              <Icon name="wifi" className="w-4 h-4" />
              Remote / Local Sharing
            </Link>
            {loc.auditGuide ? (
              <button
                onClick={() => toast(`Opening "${loc.auditGuide}"`, 'book-open', 'brand')}
                className="w-full bg-white border border-slate-200 text-ink-950 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
              >
                <Icon name="book-open" className="w-4 h-4" />
                Audit Guide
              </button>
            ) : (
              <p className="text-[11px] text-slate-400 text-center">No audit guide provided for this location.</p>
            )}
            {canSignOff ? (
              <button
                onClick={handleSignOff}
                className="w-full bg-emerald-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-emerald-700 inline-flex items-center justify-center gap-1.5"
              >
                <Icon name="file-check-2" className="w-4 h-4" />
                Submit Sign-Off
              </button>
            ) : me.signedOff ? (
              <p className="text-xs text-emerald-700 font-medium text-center inline-flex items-center justify-center gap-1.5 w-full">
                <Icon name="check-circle-2" className="w-4 h-4" />
                Signed off
              </p>
            ) : null}
            <button
              onClick={() => setLeaveOpen(true)}
              className="w-full bg-white border border-red-200 text-red-600 text-sm font-medium py-2.5 rounded-lg hover:bg-red-50 inline-flex items-center justify-center gap-1.5"
            >
              <Icon name="log-out" className="w-4 h-4" />
              Request Leave / Drop Out
            </button>
          </div>
        </div>
      )}

      {tab === 'scanning' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h3 className="font-display font-semibold text-ink-950">Audit Scanning</h3>
              <p className="text-xs text-slate-500 mt-0.5">Upload inventory, scan barcodes bin by bin, and reconcile discrepancies for this audit.</p>
            </div>
            <span
              className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                isLead ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Icon name={isLead ? 'crown' : 'scan-barcode'} className="w-3 h-3" />
              {isLead ? 'You are Audit Lead' : 'You are Audit Executive'}
            </span>
          </div>
          {!hasLead && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-3.5 py-2.5 my-3 flex items-start gap-2">
              <Icon name="info" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Your CA hasn't set an Audit Lead for this engagement yet. You can still scan items as they get assigned once a Lead uploads the inventory sheet.</span>
            </div>
          )}
          {!scanSummary ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading…</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 my-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <p className="font-display text-lg font-bold text-ink-950">
                    {scanSummary.binsDone}/{scanSummary.binsTotal}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Bins Done</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <p className="font-display text-lg font-bold text-ink-950">{scanSummary.items}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Items Loaded</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <p className={`font-display text-lg font-bold ${scanSummary.pendingReco ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {scanSummary.pendingReco}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Pending Reco</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                {isLead
                  ? 'As Lead, you can upload the inventory sheet, work the full scanning workspace, and resolve reconciliation.'
                  : 'As Executive, you scan items bin by bin in a streamlined mobile flow — your Lead handles uploads and reconciliation.'}
              </p>
              <Link
                to={`/auditor/scan?locationId=${loc.id}`}
                className="w-full bg-ink-950 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-ink-900 inline-flex items-center justify-center gap-1.5"
              >
                <Icon name="scan-barcode" className="w-4 h-4" />
                {scanSummary.started ? 'Open Audit Scanning' : 'Start Audit Scanning'}
              </Link>
            </>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <CollabDocuments locationId={loc.id} viewer={{ name: session.name, role: 'Auditor' }} perms={{ canRequest: true, canFulfill: false, canVerify: true }} />
      )}

      {tab === 'status' && <StatusPhotosPanel locationId={loc.id} viewerName={session.name} />}

      {tab === 'chat' && <CollabChat locationId={loc.id} viewer={{ name: session.name, role: 'Auditor' }} />}

      {tab === 'team' && <TeamPanel loc={loc} viewerId={auditorId} />}

      <Modal open={idModalOpen} onClose={() => setIdModalOpen(false)} title="" maxWidth="max-w-xs">
        <div className="bg-ink-950 -m-6 p-6 rounded-2xl text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white text-ink-950 flex items-center justify-center text-xl font-bold font-mono mb-3">
            {session.initials}
          </div>
          <p className="text-white font-display font-semibold text-lg">{session.name}</p>
          <p className="text-slate-400 text-xs font-mono mt-0.5">{auditorId}</p>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-slate-400 text-[11px]">On assignment at</p>
            <p className="text-white text-sm font-medium">{loc.name}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 mt-4 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <Icon name="shield-check" className="w-3 h-3" />
            Vouch Verified Field Auditor
          </span>
        </div>
      </Modal>

      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Request Leave / Drop Out" maxWidth="max-w-sm">
        <form className="space-y-3" onSubmit={handleLeaveSubmit}>
          <textarea
            required
            rows={3}
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
            placeholder="Why do you need to leave this assignment?"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white resize-none"
          />
          <button className="w-full bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-red-700">Send Request</button>
        </form>
      </Modal>
    </AppShell>
  );
}
