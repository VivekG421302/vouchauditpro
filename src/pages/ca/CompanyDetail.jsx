import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import MasterDetail from '../../components/ui/MasterDetail.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Modal from '../../components/ui/Modal.jsx';
import LocationCard from '../../components/shared/LocationCard.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { toast } from '../../store/useToastStore.js';

const EMPTY_BRANCH = { name: '', address: '', lat: '', lng: '', radius: '150' };
const EMPTY_CONTACT = { name: '', title: '', phone: '' };

export default function CaCompanyDetail() {
  const api = useVouchStore((s) => s.api);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('id');

  const [company, setCompany] = useState(undefined);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchForm, setBranchForm] = useState(EMPTY_BRANCH);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactBranchId, setContactBranchId] = useState(null);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [contactPhoto, setContactPhoto] = useState(null);
  const fileInputRef = useRef(null);

  function load() {
    api.getCompany(companyId).then((c) => setCompany(c || null));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, api]);

  if (company === undefined) {
    return (
      <AppShell role="ca" title="Company Detail">
        <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
      </AppShell>
    );
  }

  if (company === null) {
    return (
      <AppShell role="ca" title="Company Detail">
        <p className="text-sm text-slate-400 py-16 text-center">
          Company not found.{' '}
          <button className="text-brand-600 font-medium" onClick={() => navigate('/ca/companies')}>
            Back to Company & Locations
          </button>
        </p>
      </AppShell>
    );
  }

  function handleBranchSubmit(e) {
    e.preventDefault();
    api
      .addBranch(companyId, {
        name: branchForm.name,
        address: branchForm.address,
        lat: parseFloat(branchForm.lat),
        lng: parseFloat(branchForm.lng),
        radius: parseInt(branchForm.radius, 10),
      })
      .then(() => {
        setBranchModalOpen(false);
        setBranchForm(EMPTY_BRANCH);
        toast('Branch added', 'map-pin', 'emerald');
        load();
      });
  }

  function openContactModal(branchId) {
    setContactBranchId(branchId);
    setContactForm(EMPTY_CONTACT);
    setContactPhoto(null);
    setContactModalOpen(true);
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setContactPhoto(reader.result);
    reader.readAsDataURL(file);
  }

  function handleContactSubmit(e) {
    e.preventDefault();
    api
      .addContact(companyId, contactBranchId, { ...contactForm, photo: contactPhoto })
      .then(() => {
        setContactModalOpen(false);
        setContactForm(EMPTY_CONTACT);
        setContactPhoto(null);
        toast('Contact added', 'user-plus', 'emerald');
        load();
      });
  }

  const totalContacts = company.branches.reduce((n, b) => n + (b.contacts?.length || 0), 0);

  const left = (
    <>
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm text-ink-950">Branches &amp; Geofences</h3>
        <button
          onClick={() => setBranchModalOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          <Icon name="plus" className="w-3.5 h-3.5" />
          Add Branch
        </button>
      </div>
      {company.branches.length ? (
        <div className="space-y-4 mt-3">
          {company.branches.map((b) => (
            <div key={b.id} className="relative group">
              <LocationCard branch={b} />
              <button
                onClick={() => openContactModal(b.id)}
                className="absolute top-3 right-3 text-[11px] font-medium text-brand-600 bg-white border border-brand-200 rounded-full px-2.5 py-1 shadow-sm hover:bg-brand-50 transition opacity-0 group-hover:opacity-100"
              >
                + Contact
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState
            icon="map-pin"
            title="No branches yet"
            message="Add a geofenced branch for this company to start scheduling audits."
            actionLabel="Add Branch"
            onAction={() => setBranchModalOpen(true)}
          />
        </div>
      )}
    </>
  );

  const right = (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
      <div className="w-12 h-12 rounded-xl bg-ink-950 text-white flex items-center justify-center font-display font-bold mb-3">
        {company.name.slice(0, 2).toUpperCase()}
      </div>
      <p className="font-display font-semibold text-ink-950">{company.name}</p>
      <p className="text-xs text-slate-500 mt-0.5">{company.industry}</p>
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Branches</span>
          <span className="font-medium text-ink-950">{company.branches.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Contacts</span>
          <span className="font-medium text-ink-950">{totalContacts}</span>
        </div>
      </div>
      <Link
        to={`/ca/create-project?company=${encodeURIComponent(company.name)}`}
        className="mt-4 w-full inline-flex items-center justify-center gap-1.5 bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 transition"
      >
        <Icon name="clipboard-list" className="w-4 h-4" />
        Create Project
      </Link>
    </div>
  );

  return (
    <AppShell role="ca" title="Company Detail">
      <MasterDetail
        title={company.name}
        subtitle={company.industry}
        backHref="/ca/companies"
        backLabel="Company & Locations"
        left={left}
        right={right}
      />

      <Modal open={branchModalOpen} onClose={() => setBranchModalOpen(false)} title="Add Branch">
        <form className="space-y-3.5" onSubmit={handleBranchSubmit}>
          <div>
            <label className="text-xs font-medium text-slate-600">Branch Name</label>
            <input
              required
              value={branchForm.name}
              onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              placeholder="e.g. Nagpur Retail Cluster"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Address</label>
            <input
              required
              value={branchForm.address}
              onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              placeholder="e.g. Sitabuldi, Nagpur"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Latitude</label>
              <input
                required
                value={branchForm.lat}
                onChange={(e) => setBranchForm((f) => ({ ...f, lat: e.target.value }))}
                className="mt-1 w-full px-2.5 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                placeholder="21.1458"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Longitude</label>
              <input
                required
                value={branchForm.lng}
                onChange={(e) => setBranchForm((f) => ({ ...f, lng: e.target.value }))}
                className="mt-1 w-full px-2.5 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                placeholder="79.0882"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Radius (m)</label>
              <input
                required
                value={branchForm.radius}
                onChange={(e) => setBranchForm((f) => ({ ...f, radius: e.target.value }))}
                className="mt-1 w-full px-2.5 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 mt-2">
            Save Branch
          </button>
        </form>
      </Modal>

      <Modal open={contactModalOpen} onClose={() => setContactModalOpen(false)} title="Add Contact Person">
        <form className="space-y-3.5" onSubmit={handleContactSubmit}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
              {contactPhoto ? (
                <img src={contactPhoto} className="w-full h-full object-cover rounded-full" alt="" />
              ) : (
                <Icon name="user" className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <label className="text-xs font-medium text-brand-600 cursor-pointer hover:text-brand-700">
              Upload photo
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoChange} />
            </label>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Full Name</label>
            <input
              required
              value={contactForm.name}
              onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              placeholder="e.g. Aisha Verma"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Title</label>
            <input
              required
              value={contactForm.title}
              onChange={(e) => setContactForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              placeholder="e.g. Warehouse Manager"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Phone</label>
            <input
              required
              value={contactForm.phone}
              onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              placeholder="+91 98XXX XXXXX"
            />
          </div>
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 mt-2">
            Save Contact
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}
