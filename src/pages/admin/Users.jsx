import { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell.jsx';
import Modal from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import AuditorProfileModal from '../../components/shared/AuditorProfileModal.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { toast } from '../../store/useToastStore.js';

const EMPTY_REGISTER_FORM = { name: '', role: 'CA', email: '' };

export default function AdminUsers() {
  const api = useVouchStore((s) => s.api);
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM);
  const [ratingTarget, setRatingTarget] = useState(null); // { id, name, rating }
  const [ratingDelta, setRatingDelta] = useState('');
  const [ratingNote, setRatingNote] = useState('');
  const [profileAuditorId, setProfileAuditorId] = useState(null);

  function load() {
    api.getUsers().then(setUsers);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const rows = users ? users.filter((u) => (u.name + u.email).toLowerCase().includes(search.toLowerCase())) : null;

  function handleSetStatus(id, status) {
    api.setUserStatus(id, status).then((u) => {
      toast(`${u.name} marked as ${status}`, status === 'Active' ? 'check-circle-2' : 'ban', status === 'Active' ? 'emerald' : 'red');
      load();
    });
  }

  function handleViewProfile(name) {
    api.getAuditorByName(name).then((auditor) => {
      if (!auditor) {
        toast(`No auditor profile found for ${name}`, 'alert-triangle', 'amber');
        return;
      }
      setProfileAuditorId(auditor.id);
    });
  }

  function openRatingModal(name) {
    api.getAuditorByName(name).then((auditor) => {
      if (!auditor) {
        toast(`No auditor profile found for ${name}`, 'alert-triangle', 'amber');
        return;
      }
      setRatingTarget(auditor);
      setRatingDelta('');
      setRatingNote('');
    });
  }

  function handleRegisterSubmit(e) {
    e.preventDefault();
    api.createUser(registerForm).then(() => {
      setRegisterOpen(false);
      setRegisterForm(EMPTY_REGISTER_FORM);
      toast(`${registerForm.name} registered — invite email sent`, 'mail-check', 'emerald');
      load();
    });
  }

  function handleRatingSubmit(e) {
    e.preventDefault();
    const delta = parseFloat(ratingDelta);
    api.applyRatingChange(ratingTarget.id, delta, ratingNote).then((a) => {
      setRatingTarget(null);
      toast(`${a.name}'s rating is now ${a.rating}`, delta < 0 ? 'flag' : 'star', delta < 0 ? 'red' : 'emerald');
    });
  }

  return (
    <AppShell role="admin" title="User Management">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">User Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Every CA and Auditor account on the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white w-52"
          />
          <button
            onClick={() => setRegisterOpen(true)}
            className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-700 shadow-soft transition shrink-0"
          >
            <Icon name="user-plus" className="w-4 h-4" />
            Register User
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows &&
              rows.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-semibold font-mono">
                        {u.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-ink-950">{u.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">{u.joined}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      {u.role === 'Auditor' && (
                        <button onClick={() => handleViewProfile(u.name)} className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-200">
                          Profile
                        </button>
                      )}
                      {u.role === 'Auditor' && (
                        <button onClick={() => openRatingModal(u.name)} className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-200">
                          Rating
                        </button>
                      )}
                      {u.status !== 'Active' && (
                        <button onClick={() => handleSetStatus(u.id, 'Active')} className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100">
                          Activate
                        </button>
                      )}
                      {u.status !== 'Suspended' && (
                        <button onClick={() => handleSetStatus(u.id, 'Suspended')} className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100">
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={registerOpen} onClose={() => setRegisterOpen(false)} title="Register User">
        <form className="space-y-3.5" onSubmit={handleRegisterSubmit}>
          <div>
            <label className="text-xs font-medium text-slate-600">Full Name</label>
            <input
              required
              value={registerForm.name}
              onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Role</label>
            <select
              value={registerForm.role}
              onChange={(e) => setRegisterForm((f) => ({ ...f, role: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
            >
              <option>CA</option>
              <option>Auditor</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Email</label>
            <input
              required
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
            />
          </div>
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 mt-2">Register &amp; Send Invite</button>
        </form>
      </Modal>

      <Modal open={!!ratingTarget} onClose={() => setRatingTarget(null)} title="Adjust Rating" maxWidth="max-w-sm">
        {ratingTarget && (
          <form className="space-y-3.5" onSubmit={handleRatingSubmit}>
            <p className="text-sm font-medium text-ink-950">{ratingTarget.name}</p>
            <p className="text-xs text-slate-500">Current rating: {ratingTarget.rating}</p>
            <div>
              <label className="text-xs font-medium text-slate-600">Delta (e.g. -0.2 or +0.1)</label>
              <input
                required
                type="number"
                step="0.1"
                value={ratingDelta}
                onChange={(e) => setRatingDelta(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Reason</label>
              <textarea
                required
                rows={2}
                value={ratingNote}
                onChange={(e) => setRatingNote(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white resize-none"
              />
            </div>
            <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700">Apply Change</button>
          </form>
        )}
      </Modal>

      <AuditorProfileModal auditorId={profileAuditorId} onClose={() => setProfileAuditorId(null)} />
    </AppShell>
  );
}
