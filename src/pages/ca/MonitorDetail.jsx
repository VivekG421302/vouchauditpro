import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Modal from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import CollabChat from '../../components/collab/CollabChat.jsx';
import CollabDocuments from '../../components/collab/CollabDocuments.jsx';
import CollabRemoteShare from '../../components/collab/CollabRemoteShare.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { vouchFormatDate } from '../../lib/db.js';
import { toast } from '../../store/useToastStore.js';

const TABS = ['overview', 'chat', 'documents', 'remote share'];

function initialsOf(name) {
  return name.split(' ').map((s) => s[0]).slice(0, 2).join('');
}

export default function CaMonitorDetail() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('id');

  const [loc, setLoc] = useState(undefined);
  const [tab, setTab] = useState('overview');
  const [scanSummary, setScanSummary] = useState(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [expectedEnd, setExpectedEnd] = useState('');
  const [attendanceAuditorId, setAttendanceAuditorId] = useState(null);

  function load() {
    api.getLocation(locationId).then((l) => setLoc(l || null));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, api]);

  useEffect(() => {
    if (!loc) return;
    setScanSummary(null);
    api.getScanSummary(loc.id).then(setScanSummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc?.id, api]);

  if (loc === undefined) {
    return (
      <AppShell role="ca" title="Monitor">
        <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
      </AppShell>
    );
  }

  if (loc === null) {
    return (
      <AppShell role="ca" title="Monitor">
        <p className="text-sm text-slate-400 py-16 text-center">
          Location not found.{' '}
          <button className="text-brand-600 font-medium" onClick={() => navigate('/ca/dashboard')}>
            Back to Dashboard
          </button>
        </p>
      </AppShell>
    );
  }

  function handleToggleHold() {
    api.toggleLocationHold(loc.id).then(() => {
      toast(loc.onHold ? 'Audit resumed' : 'Location marked on hold', 'pause', 'amber');
      load();
    });
  }

  function handleComplete() {
    api.moveLocationToPayment(loc.id).then(() => {
      toast('Audit marked complete — moved to Payments', 'check-check', 'emerald');
      navigate('/ca/payments');
    });
  }

  function handleExtendSubmit(e) {
    e.preventDefault();
    api.markLocationExtended(loc.id, expectedEnd).then(() => {
      setExtendOpen(false);
      setExpectedEnd('');
      toast('Location marked as extended', 'calendar-clock', 'brand');
      load();
    });
  }

  const attendanceAuditor = loc.assignedAuditors.find((a) => a.id === attendanceAuditorId) || null;

  function handleSetLead() {
    api.setLeadAuditor(loc.id, attendanceAuditorId).then(() => {
      setAttendanceAuditorId(null);
      toast(`${attendanceAuditor.name} is now the Audit Lead — they'll see the full Audit Scanning workspace`, 'crown', 'brand');
      load();
    });
  }

  const leadName = loc.leadAuditorId ? loc.assignedAuditors.find((a) => a.id === loc.leadAuditorId)?.name : null;

  return (
    <AppShell role="ca" title={loc.name}>
      <div className="mb-5">
        <Link to="/ca/dashboard" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ink-950 mb-3 transition">
          <Icon name="arrow-left" className="w-3.5 h-3.5" />
          Dashboard
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink-950">{loc.name}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {loc.auditType} · {loc.address}
        </p>
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
            {t}
          </button>
        ))}
      </div>

      {tab === 'chat' && <CollabChat locationId={loc.id} viewer={{ name: session.name, role: 'CA' }} />}
      {tab === 'documents' && (
        <CollabDocuments locationId={loc.id} viewer={{ name: session.name, role: 'CA' }} perms={{ canRequest: true, canFulfill: false, canVerify: true }} />
      )}
      {tab === 'remote share' && <CollabRemoteShare locationId={loc.id} viewer={{ name: session.name, role: 'CA' }} />}

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 space-y-4 min-w-0">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-ink-950">Audit Progress</h3>
                <span className="text-xs font-mono text-brand-700 bg-brand-50 border border-brand-100 px-2 py-1 rounded-full">
                  {loc.progress || 0}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full ${loc.onHold ? 'bg-amber-500' : 'bg-brand-500'}`}
                  style={{ width: `${loc.progress || 0}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {loc.onHold && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                    On Hold
                  </span>
                )}
                {loc.extended && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-brand-50 text-brand-700 border-brand-100">
                    Extended to {vouchFormatDate(loc.expectedEnd)}
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleToggleHold}
                  className="flex-1 border border-slate-200 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
                >
                  <Icon name={loc.onHold ? 'play' : 'pause'} className="w-4 h-4" />
                  {loc.onHold ? 'Resume Audit' : 'Mark as On Hold'}
                </button>
                <button
                  onClick={() => setExtendOpen(true)}
                  className="flex-1 border border-slate-200 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
                >
                  <Icon name="calendar-clock" className="w-4 h-4" />
                  {loc.extended ? 'Update Extension' : 'Mark as Extended'}
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 bg-ink-950 text-white text-sm font-medium py-2 rounded-lg hover:bg-ink-900 inline-flex items-center justify-center gap-1.5"
                >
                  <Icon name="check-check" className="w-4 h-4" />
                  Mark Audit Complete
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
              <h3 className="font-display font-semibold text-ink-950 mb-4">Auditors on Site</h3>
              <div className="space-y-2.5">
                {loc.assignedAuditors.length ? (
                  loc.assignedAuditors.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAttendanceAuditorId(a.id)}
                      className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-3 transition text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-ink-950 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                          {initialsOf(a.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-ink-950 truncate inline-flex items-center gap-1">
                            {a.name}
                            {a.id === loc.leadAuditorId && <Icon name="crown" className="w-3 h-3 text-amber-500" />}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {a.id === loc.leadAuditorId ? 'Audit Lead · ' : ''}
                            {a.present || 0} present · {a.absent || 0} absent
                          </p>
                        </div>
                      </div>
                      <Icon name="chevron-right" className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No auditors assigned yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 min-w-0">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-ink-950 text-white flex items-center justify-center">
                  <Icon name="radar" className="w-5 h-5" />
                </div>
                <StatusBadge status="approved" />
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
                  <span className="text-slate-500">Team size</span>
                  <span className="font-medium text-ink-950">
                    {loc.assignedAuditors.length} / {loc.requirement.auditorsNeeded}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Audit Scanning</p>
              {!scanSummary ? (
                <p className="text-xs text-slate-400">Loading…</p>
              ) : (
                <>
                  {leadName ? (
                    <p className="text-xs text-ink-950 mb-3">
                      <Icon name="crown" className="w-3 h-3 text-amber-500 inline -mt-0.5 mr-1" />
                      {leadName} is Lead
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 mb-3">
                      No Audit Lead set yet — auditors can't upload or reconcile until you set one.
                    </p>
                  )}
                  {scanSummary.started ? (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-sm font-bold text-ink-950">
                          {scanSummary.binsDone}/{scanSummary.binsTotal}
                        </p>
                        <p className="text-[9px] text-slate-500">Bins</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-sm font-bold text-ink-950">{scanSummary.items}</p>
                        <p className="text-[9px] text-slate-500">Items</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className={`text-sm font-bold ${scanSummary.pendingReco ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {scanSummary.pendingReco}
                        </p>
                        <p className="text-[9px] text-slate-500">Reco</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Scanning hasn't started for this audit yet.</p>
                  )}
                </>
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

            <button
              onClick={() => toast("Our team has been notified and will follow up shortly", 'life-buoy', 'brand')}
              className="w-full bg-white border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
            >
              <Icon name="life-buoy" className="w-4 h-4" />
              Auditor Didn't Reach Site? Contact Support
            </button>
          </div>
        </div>
      )}

      <Modal open={extendOpen} onClose={() => setExtendOpen(false)} title="Mark as Extended" maxWidth="max-w-sm">
        <form className="space-y-3" onSubmit={handleExtendSubmit}>
          <div>
            <label className="text-xs font-medium text-slate-600">New Expected End Date</label>
            <input
              required
              type="date"
              value={expectedEnd}
              onChange={(e) => setExpectedEnd(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
            />
          </div>
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700">
            Save Extension
          </button>
        </form>
      </Modal>

      <Modal open={!!attendanceAuditor} onClose={() => setAttendanceAuditorId(null)} title="Attendance" maxWidth="max-w-md">
        {attendanceAuditor && (
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-ink-950 text-white text-sm font-semibold flex items-center justify-center">
                {initialsOf(attendanceAuditor.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-950 inline-flex items-center gap-1.5">
                  {attendanceAuditor.name}
                  {attendanceAuditorId === loc.leadAuditorId && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                      <Icon name="crown" className="w-2.5 h-2.5" />
                      Lead
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">{attendanceAuditor.phone || ''}</p>
              </div>
            </div>
            <button
              disabled={attendanceAuditorId === loc.leadAuditorId}
              onClick={handleSetLead}
              className={`w-full mb-4 border text-sm font-medium py-2 rounded-lg inline-flex items-center justify-center gap-1.5 ${
                attendanceAuditorId === loc.leadAuditorId
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon name="crown" className="w-4 h-4" />
              {attendanceAuditorId === loc.leadAuditorId ? 'Audit Lead for this engagement' : 'Set as Audit Lead'}
            </button>
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="bg-slate-50 rounded-lg py-2.5">
                <p className="font-display font-bold text-emerald-600">{attendanceAuditor.present || 0}</p>
                <p className="text-[10px] text-slate-500">Present</p>
              </div>
              <div className="bg-slate-50 rounded-lg py-2.5">
                <p className="font-display font-bold text-amber-600">{attendanceAuditor.absent || 0}</p>
                <p className="text-[10px] text-slate-500">Absent</p>
              </div>
              <div className="bg-slate-50 rounded-lg py-2.5">
                <p className="font-display font-bold text-ink-950">{attendanceAuditor.overtimeHours || 0}h</p>
                <p className="text-[10px] text-slate-500">Overtime</p>
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Check-Ins</p>
            <div className="space-y-2.5">
              {(attendanceAuditor.attendance || []).length ? (
                attendanceAuditor.attendance.map((rec, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                        <Icon name="scan-face" className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-ink-950 font-medium text-xs">{rec.date}</p>
                        <p className="text-[11px] text-slate-400">
                          In {rec.checkIn || rec.time} · Out {rec.checkOut || '—'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-medium ${rec.status.startsWith('Flagged') ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {rec.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No check-ins recorded yet.</p>
              )}
            </div>
            <button
              onClick={() => {
                setAttendanceAuditorId(null);
                toast(`Support notified about ${attendanceAuditor.name} — we'll follow up shortly`, 'life-buoy', 'brand');
              }}
              className="w-full mt-4 bg-white border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
            >
              <Icon name="life-buoy" className="w-4 h-4" />
              Report No-Show / Contact Support
            </button>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
