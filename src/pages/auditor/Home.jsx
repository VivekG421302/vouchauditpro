import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import AttendanceCalendar from '../../components/shared/AttendanceCalendar.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { vouchDaysUntil, vouchFormatDate } from '../../lib/db.js';

function parseVouchDate(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.split(' ');
  if (parts.length !== 3) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = months.indexOf(parts[1]);
  if (m < 0) return null;
  return new Date(parseInt(parts[2], 10), m, parseInt(parts[0], 10));
}

const MILESTONES = [10, 25, 50, 100];

export default function AuditorHome() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const auditorId = session?.auditorId;

  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [todays, setTodays] = useState(null);

  useEffect(() => {
    if (!auditorId) return;
    Promise.all([
      api.getAuditorProfile(auditorId),
      api.getAssignmentsForAuditor(auditorId),
      api.getAttendanceForAuditor(auditorId),
      api.getTodaysAssignmentForAuditor(auditorId),
    ]).then(([p, a, att, t]) => {
      setProfile(p);
      setAssignments(a);
      setAttendance(att);
      setTodays(t);
    });
  }, [api, auditorId]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const loaded = profile && assignments && attendance;

  let monthlyStats = null;
  if (loaded) {
    const now = new Date();
    const thisMonth = attendance.filter((a) => {
      const d = parseVouchDate(a.date);
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const present = thisMonth.filter((a) => a.status === 'Verified' || a.status === 'Late').length;
    const onTimePct = thisMonth.length
      ? Math.round((thisMonth.filter((a) => a.status === 'Verified').length / thisMonth.length) * 100)
      : 100;
    monthlyStats = { present, live: assignments.filter((a) => a.status === 'monitoring').length, onTimePct };
  }

  const active = loaded ? assignments.filter((l) => l.status === 'monitoring') : [];
  const scheduled = loaded ? assignments.filter((l) => l.status === 'fulfillment_completed') : [];

  const badges = profile?.badges || [];
  const completed = badges.some((b) => b.startsWith('Milestone'))
    ? parseInt((badges.find((b) => b.startsWith('Milestone')) || '').match(/\d+/)?.[0] || 0, 10)
    : 0;
  const nextMilestone = MILESTONES.find((m) => m > completed) || MILESTONES[MILESTONES.length - 1];
  const milestonePct = Math.min(100, Math.round((completed / nextMilestone) * 100));

  return (
    <AppShell role="auditor" title="Home">
      {!loaded ? (
        <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
      ) : (
        <>
          <div className="mb-5">
            <p className="text-sm text-slate-500">{greeting},</p>
            <h1 className="font-display text-2xl font-bold text-ink-950">{session.name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {profile.kyc} Auditor
              </span>
              <span className="text-[11px] font-mono text-slate-400">{profile.experience}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-ink-950 text-white flex items-center justify-center text-xl font-semibold font-mono shrink-0">
                {session.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-display font-semibold text-ink-950 truncate">{profile.name}</p>
                  <span className="text-[10px] font-mono text-slate-400">{profile.id}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {profile.specialization} · {profile.baseCity}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Icon
                      key={i}
                      name="star"
                      className={`w-3.5 h-3.5 ${i < Math.round(profile.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                    />
                  ))}
                  <span className="text-xs font-mono text-slate-500 ml-1">{(profile.rating || 0).toFixed(1)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400">Bank</p>
                <p className="text-xs font-mono text-ink-950">{profile.bankLinked}</p>
              </div>
            </div>
            {profile.flags && profile.flags.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Icon name="alert-triangle" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  {profile.flags[0].note} — rating adjusted {profile.flags[0].delta > 0 ? '+' : ''}
                  {profile.flags[0].delta} on {profile.flags[0].date}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 bg-white border border-slate-200 rounded-2xl shadow-card p-4 mb-4">
            <div className="text-center px-1">
              <p className="font-display text-lg font-bold text-ink-950">{monthlyStats.present}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Days This Month</p>
            </div>
            <div className="text-center px-1">
              <p className="font-display text-lg font-bold text-ink-950">{monthlyStats.live}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Live Audits</p>
            </div>
            <div className="text-center px-1">
              <p className="font-display text-lg font-bold text-emerald-600">{monthlyStats.onTimePct}%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">On-time</p>
            </div>
          </div>

          <Link
            to="/auditor/geo-selfie"
            className="flex items-center justify-between bg-ink-950 text-white rounded-2xl shadow-soft p-4 mb-5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Icon name="scan-face" className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Check In</p>
                <p className="text-xs text-slate-400 truncate">
                  {todays ? `${todays.auditType} · ${todays.name}` : 'No audit scheduled today'}
                </p>
              </div>
            </div>
            <Icon name="arrow-right" className="w-4 h-4 shrink-0" />
          </Link>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h3 className="font-display font-semibold text-ink-950 mb-2.5">Active Audits</h3>
                <div className="space-y-2.5">
                  {active.length ? (
                    active.map((l) => (
                      <Link
                        key={l.id}
                        to={`/auditor/audit?id=${l.id}`}
                        className="block bg-white border border-slate-200 rounded-2xl p-4 shadow-card hover:shadow-md transition"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-display font-semibold text-ink-950 truncate">{l.name}</p>
                              {l.onHold && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  On Hold
                                </span>
                              )}
                              {l.extended && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                                  Extended
                                </span>
                              )}
                              {l.postponed && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                                  Postponed
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              {l.auditType} · {l.address}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-display font-bold text-brand-700">{l.progress || 0}%</p>
                            <p className="text-[10px] text-slate-400">progress</p>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 bg-white border border-dashed border-slate-300 rounded-2xl p-4 text-center">
                      No live audits right now — check the Marketplace to apply.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-display font-semibold text-ink-950 mb-2.5">Scheduled</h3>
                <div className="space-y-2.5">
                  {scheduled.length ? (
                    scheduled.map((l) => {
                      const days = vouchDaysUntil(l.startDate);
                      return (
                        <div key={l.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-card">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-display font-semibold text-ink-950 truncate">{l.name}</p>
                              <p className="text-xs text-slate-500">
                                {l.auditType} · starts {vouchFormatDate(l.startDate)}
                              </p>
                            </div>
                            <span className="text-[11px] font-mono text-brand-700 bg-brand-50 border border-brand-100 px-2 py-1 rounded-full shrink-0">
                              {days >= 0 ? `${days}d` : 'started'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 bg-white border border-dashed border-slate-300 rounded-2xl p-4 text-center">
                      Nothing scheduled yet.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-4">
                <h3 className="font-display font-semibold text-ink-950 mb-3 text-sm">This Month</h3>
                <AttendanceCalendar assignments={assignments} attendance={attendance} />
                <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Verified
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Late
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Flagged
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-4">
                <h3 className="font-display font-semibold text-ink-950 mb-2 text-sm">Badges &amp; Growth</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {badges.length ? (
                    badges.map((b) => (
                      <span
                        key={b}
                        className="text-[11px] font-medium bg-brand-50 text-brand-700 border border-brand-100 px-2.5 py-1 rounded-full inline-flex items-center gap-1"
                      >
                        <Icon name="badge-check" className="w-3 h-3" />
                        {b}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">Complete your first audit to start earning badges.</p>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-600 font-medium">Next milestone</span>
                  <span className="font-mono text-slate-400">
                    {completed} / {nextMilestone} audits
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${milestonePct}%` }} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
