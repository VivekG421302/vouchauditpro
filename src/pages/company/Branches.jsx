import { useEffect, useRef, useState } from 'react';
import AppShell from '../../components/layout/AppShell.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Modal from '../../components/ui/Modal.jsx';
import LocationCard from '../../components/shared/LocationCard.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { toast } from '../../store/useToastStore.js';

const EMPTY_BRANCH = { name: '', address: '', lat: '', lng: '', radius: '150' };
const EMPTY_CONTACT = { name: '', title: '', phone: '' };

export default function CompanyBranches() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);

  const [company, setCompany] = useState(undefined);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchForm, setBranchForm] = useState(EMPTY_BRANCH);
  const [locateStatus, setLocateStatus] = useState('');
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactBranchId, setContactBranchId] = useState(null);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [contactPhoto, setContactPhoto] = useState(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestBranch, setRequestBranch] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const fileInputRef = useRef(null);

  function load() {
    api.getCompanies().then((companies) => setCompany(companies.find((c) => c.name === session.name) || null));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, session.name]);

  function handleBranchSubmit(e) {
    e.preventDefault();
    api
      .addBranch(company.id, {
        name: branchForm.name,
        address: branchForm.address,
        lat: parseFloat(branchForm.lat),
        lng: parseFloat(branchForm.lng),
        radius: parseInt(branchForm.radius, 10),
      })
      .then(() => {
        setBranchModalOpen(false);
        setBranchForm(EMPTY_BRANCH);
        setLocateStatus('');
        toast('Branch added to your directory', 'map-pin', 'emerald');
        load();
      });
  }

  function handleUseMyLocation() {
    setLocateStatus('Locating…');
    if (!navigator.geolocation) {
      setLocateStatus("Geolocation isn't available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBranchForm((f) => ({ ...f, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
        const acc = Math.round(pos.coords.accuracy);
        setLocateStatus(`Located — accurate to within ~${acc}m${acc > 100 ? ' (coarse fix; a mobile device outdoors will be more precise)' : ''}.`);
      },
      () => setLocateStatus("Couldn't get your location — enter coordinates manually."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
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
    api.addContact(company.id, contactBranchId, { ...contactForm, photo: contactPhoto }).then(() => {
      setContactModalOpen(false);
      setContactForm(EMPTY_CONTACT);
      setContactPhoto(null);
      toast('Contact added', 'user-plus', 'emerald');
      load();
    });
  }

  function openRequestModal(branch) {
    setRequestBranch(branch);
    setRequestMessage('');
    setRequestModalOpen(true);
  }

  // Company can't create a project directly — this notifies the CA instead,
  // keeping the CA as project owner per the existing architecture.
  function handleRequestSubmit(e) {
    e.preventDefault();
    api
      .createCompanyRequest({
        companyName: session.name,
        type: 'new_audit',
        branchId: requestBranch.id,
        branchName: requestBranch.name,
        message: requestMessage,
      })
      .then(() => {
        setRequestModalOpen(false);
        setRequestMessage('');
        toast('Request sent to your CA', 'clipboard-plus', 'emerald');
      });
  }

  return (
    <AppShell role="company" title="Branches">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Branches</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Your branch directory — kept on file so your CA can pick from real data instead of re-typing it when setting up a project.
          </p>
        </div>
        {company && (
          <button
            onClick={() => setBranchModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-700 shadow-soft transition"
          >
            <Icon name="map-pin-plus" className="w-4 h-4" />
            Add Branch
          </button>
        )}
      </div>

      {company === undefined && <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>}
      {company === null && (
        <p className="text-sm text-slate-400 py-16 text-center">
          We couldn't find a company record matching your account. Contact Vouch support to get set up.
        </p>
      )}

      {company && company.branches.length === 0 && (
        <EmptyState
          icon="map-pin"
          title="No branches on file yet"
          message="Add your first branch — name, address, and geofence — so your CA can select it when setting up an audit."
          actionLabel="Add Branch"
          onAction={() => setBranchModalOpen(true)}
        />
      )}

      {company && company.branches.length > 0 && (
        <div className="space-y-3">
          {company.branches.map((b) => (
            <div key={b.id} className="relative group">
              <LocationCard branch={b} />
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => openRequestModal(b)}
                  className="text-[11px] font-medium text-brand-600 bg-white border border-brand-200 rounded-full px-2.5 py-1 shadow-sm hover:bg-brand-50 transition inline-flex items-center gap-1"
                >
                  <Icon name="clipboard-plus" className="w-3 h-3" />
                  Request Audit
                </button>
                <button
                  onClick={() => openContactModal(b.id)}
                  className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded-full px-2.5 py-1 shadow-sm hover:bg-slate-50 transition"
                >
                  + Contact
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="text-[11px] font-medium text-brand-600 inline-flex items-center gap-1"
          >
            <Icon name="locate-fixed" className="w-3 h-3" />
            Use My Location
          </button>
          {locateStatus && <p className="text-[11px] text-slate-500">{locateStatus}</p>}
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
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 mt-2">Save Branch</button>
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
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 mt-2">Save Contact</button>
        </form>
      </Modal>

      <Modal open={requestModalOpen} onClose={() => setRequestModalOpen(false)} title="Request Audit">
        {requestBranch && (
          <form className="space-y-3.5" onSubmit={handleRequestSubmit}>
            <p className="text-xs font-medium text-ink-950 inline-flex items-center gap-1">
              <Icon name="map-pin" className="w-3.5 h-3.5 text-brand-600" />
              {requestBranch.name}
            </p>
            <div>
              <label className="text-xs font-medium text-slate-600">Message to your CA</label>
              <textarea
                required
                rows={3}
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="What kind of audit, and any timing preferences?"
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white resize-none"
              />
            </div>
            <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700">Send Request</button>
          </form>
        )}
      </Modal>
    </AppShell>
  );
}
