import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { toast } from '../../store/useToastStore.js';

const EMPTY_FORM = { name: '', industry: '', address: '', lat: '', lng: '', radius: '150' };

export default function CaCompanies() {
  const api = useVouchStore((s) => s.api);
  const [companies, setCompanies] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  function load() {
    api.getCompanies().then(setCompanies);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  function handleField(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    api.addCompany(form).then(() => {
      setModalOpen(false);
      setForm(EMPTY_FORM);
      load();
      toast('Company & geofenced branch added', 'building-2', 'emerald');
    });
  }

  return (
    <AppShell role="ca" title="Company & Locations">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Company &amp; Locations</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage client companies and geofenced audit branches.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-700 shadow-soft transition"
        >
          <Icon name="building-2" className="w-4 h-4" />
          Add Company
        </button>
      </div>

      {companies && companies.length === 0 && (
        <EmptyState
          icon="building-2"
          title="No companies yet"
          message="Add your first client company and its first geofenced branch to get started."
          actionLabel="Add Company"
          onAction={() => setModalOpen(true)}
        />
      )}

      {companies && companies.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {companies.map((c) => (
            <Link
              key={c.id}
              to={`/ca/company-detail?id=${c.id}`}
              className="block bg-white border border-slate-200 rounded-2xl shadow-card p-5 hover:border-brand-300 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-display font-semibold text-ink-950">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.industry}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Icon name="building-2" className="w-4 h-4 text-slate-500" />
                </div>
              </div>
              <div className="space-y-2">
                {c.branches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                        <Icon name="map-pin" className="w-3.5 h-3.5 text-brand-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-ink-950 truncate">{b.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full shrink-0">
                      ±{b.radius}m
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-brand-600 font-medium mt-3 inline-flex items-center gap-1">
                View details <Icon name="arrow-right" className="w-3 h-3" />
              </p>
            </Link>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Company">
        <form className="space-y-3.5" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-medium text-slate-600">Company Name</label>
            <input
              required
              name="name"
              value={form.name}
              onChange={handleField}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              placeholder="e.g. Marigold Foods Pvt. Ltd."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Industry</label>
            <input
              required
              name="industry"
              value={form.industry}
              onChange={handleField}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              placeholder="e.g. Food & Beverage"
            />
          </div>
          <p className="text-xs font-medium text-slate-600 pt-1">First Branch — Geofence Setup</p>
          <div>
            <label className="text-[11px] text-slate-500">Branch Address</label>
            <input
              required
              name="address"
              value={form.address}
              onChange={handleField}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              placeholder="e.g. Baner, Pune"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Latitude</label>
              <input
                required
                name="lat"
                value={form.lat}
                onChange={handleField}
                className="mt-1 w-full px-2.5 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                placeholder="18.5596"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Longitude</label>
              <input
                required
                name="lng"
                value={form.lng}
                onChange={handleField}
                className="mt-1 w-full px-2.5 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                placeholder="73.7799"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Radius (m)</label>
              <input
                required
                name="radius"
                value={form.radius}
                onChange={handleField}
                className="mt-1 w-full px-2.5 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 mt-2">
            Save Company &amp; Branch
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}
