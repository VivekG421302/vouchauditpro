import { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { toast } from '../../store/useToastStore.js';

const EMPTY_FORM = { name: '', industry: '', address: '', lat: '', lng: '', radius: '150', username: '', password: '' };

export default function AdminCompanies() {
  const api = useVouchStore((s) => s.api);
  const [rows, setRows] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [locateStatus, setLocateStatus] = useState('');
  const [error, setError] = useState('');

  function load() {
    Promise.all([api.getCompanies(), api.getCompanyAccounts()]).then(([companies, accounts]) =>
      setRows(companies.map((c) => ({ company: c, account: accounts.find((a) => a.name === c.name) || null })))
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  function handleField(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleUseMyLocation() {
    setLocateStatus('Locating…');
    if (!navigator.geolocation) {
      setLocateStatus("Geolocation isn't available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
        const acc = Math.round(pos.coords.accuracy);
        setLocateStatus(`Located — accurate to within ~${acc}m${acc > 100 ? ' (coarse fix; try a mobile device outdoors for better precision)' : ''}.`);
      },
      () => setLocateStatus("Couldn't get your location — enter coordinates manually."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    api
      .registerCompanyAccount(form)
      .then(() => {
        setModalOpen(false);
        setForm(EMPTY_FORM);
        setLocateStatus('');
        toast(`${form.name} onboarded with a portal login`, 'building-2', 'emerald');
        load();
      })
      .catch((err) => setError(err.message || 'Could not create that account'));
  }

  return (
    <AppShell role="admin" title="Companies">
      <div className="flex items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Companies</h1>
          <p className="text-slate-500 text-sm mt-0.5">Every client company on the platform, and whether they have a portal login.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-700 shadow-soft transition"
        >
          <Icon name="building-2" className="w-4 h-4" />
          Onboard Company
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Industry</th>
              <th className="px-4 py-3 font-medium">Branches</th>
              <th className="px-4 py-3 font-medium">Portal Login</th>
            </tr>
          </thead>
          <tbody>
            {rows && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  No companies yet — onboard the first one.
                </td>
              </tr>
            )}
            {rows &&
              rows.map(({ company: c, account }) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-semibold font-mono">
                        {c.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-ink-950">{c.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.industry}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.branches.length}</td>
                  <td className="px-4 py-3">
                    {account ? (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">{account.username}</span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200">No portal login</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Onboard Company">
        <form className="space-y-3.5" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-medium text-slate-600">Company Name</label>
            <input required name="name" value={form.name} onChange={handleField} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" placeholder="e.g. Marigold Foods Pvt. Ltd." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Industry</label>
            <input required name="industry" value={form.industry} onChange={handleField} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" placeholder="e.g. Food & Beverage" />
          </div>
          <p className="text-xs font-medium text-slate-600 pt-1">First Branch — Geofence Setup</p>
          <div>
            <label className="text-[11px] text-slate-500">Branch Address</label>
            <input required name="address" value={form.address} onChange={handleField} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" placeholder="e.g. Baner, Pune" />
          </div>
          <button type="button" onClick={handleUseMyLocation} className="text-[11px] font-medium text-brand-600 inline-flex items-center gap-1">
            <Icon name="locate-fixed" className="w-3 h-3" />
            Use My Location
          </button>
          {locateStatus && <p className="text-[11px] text-slate-500">{locateStatus}</p>}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Latitude</label>
              <input required name="lat" value={form.lat} onChange={handleField} className="mt-1 w-full px-2.5 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" placeholder="18.5596" />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Longitude</label>
              <input required name="lng" value={form.lng} onChange={handleField} className="mt-1 w-full px-2.5 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" placeholder="73.7799" />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Radius (m)</label>
              <input required name="radius" value={form.radius} onChange={handleField} className="mt-1 w-full px-2.5 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-600 pt-1">Portal Login</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Username / Email</label>
              <input required name="username" value={form.username} onChange={handleField} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" placeholder="company@vouch.com" />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Password</label>
              <input required type="password" name="password" value={form.password} onChange={handleField} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 mt-2">Onboard Company</button>
        </form>
      </Modal>
    </AppShell>
  );
}
