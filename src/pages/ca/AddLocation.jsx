import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { formatMoney } from '../../lib/format.js';
import { toast } from '../../store/useToastStore.js';

const AUDIT_TYPES = ['Statutory Audit', 'Inventory Audit', 'Tax Audit', 'Cash Audit', 'Asset Audit'];

const EMPTY_LOCATION_FORM = {
  name: '',
  address: '',
  auditType: AUDIT_TYPES[0],
  timing: '',
  description: '',
  startDate: '',
  endDate: '',
  auditGuide: '',
  newGuideName: '',
  auditorsNeeded: '2',
  allowance: '6000',
  paymentAfterDays: '7',
  note: '',
};

export default function CaAddLocation() {
  const api = useVouchStore((s) => s.api);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [project, setProject] = useState(undefined);
  const [guides, setGuides] = useState([]);
  const [roster, setRoster] = useState([]);
  const [locationsSoFar, setLocationsSoFar] = useState([]);

  const [form, setForm] = useState(EMPTY_LOCATION_FORM);
  const [contacts, setContacts] = useState([{ name: '', title: '', phone: '' }]);
  const [selectedAuditors, setSelectedAuditors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  function refreshSummary(pid) {
    api.getLocationsByProject(pid).then(setLocationsSoFar);
  }

  useEffect(() => {
    Promise.all([api.getProject(projectId), api.getAuditGuides(), api.getAuditorRoster()]).then(
      ([proj, guideList, rosterList]) => {
        setProject(proj || null);
        setGuides(guideList);
        setRoster(rosterList);
        if (proj) refreshSummary(proj.id);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, api]);

  if (project === undefined) {
    return (
      <AppShell role="ca" title="Add Location">
        <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
      </AppShell>
    );
  }

  if (project === null) {
    return (
      <AppShell role="ca" title="Add Location">
        <p className="text-sm text-slate-400">
          Project not found.{' '}
          <button className="text-brand-600 font-medium" onClick={() => navigate('/ca/create-project')}>
            Start a new project
          </button>
        </p>
      </AppShell>
    );
  }

  const budget = (parseInt(form.auditorsNeeded, 10) || 0) * (parseInt(form.allowance, 10) || 0);

  function updateField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function updateContact(idx, field, value) {
    setContacts((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function addContactRow() {
    setContacts((rows) => [...rows, { name: '', title: '', phone: '' }]);
  }

  function removeContactRow(idx) {
    setContacts((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows));
  }

  function toggleAuditor(a) {
    setSelectedAuditors((prev) =>
      prev.some((x) => x.id === a.id) ? prev.filter((x) => x.id !== a.id) : [...prev, { id: a.id, name: a.name, phone: a.phone }]
    );
  }

  function resetForm() {
    setForm(EMPTY_LOCATION_FORM);
    setContacts([{ name: '', title: '', phone: '' }]);
    setSelectedAuditors([]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const finishGuide =
      form.auditGuide === '__upload__'
        ? api.addAuditGuide(form.newGuideName.trim() || 'Untitled Guide.pdf').then((g) => g.name)
        : Promise.resolve(form.auditGuide || null);

    finishGuide
      .then((auditGuide) =>
        api.addLocation(projectId, {
          name: form.name,
          address: form.address,
          contacts: contacts.filter((c) => c.name.trim()),
          auditType: form.auditType,
          description: form.description,
          startDate: form.startDate,
          endDate: form.endDate,
          timing: form.timing,
          auditGuide,
          requirement: {
            auditorsNeeded: parseInt(form.auditorsNeeded, 10),
            allowance: parseInt(form.allowance, 10),
            paymentAfterDays: parseInt(form.paymentAfterDays, 10),
            note: form.note,
          },
          caAuditors: selectedAuditors,
        })
      )
      .then((loc) => {
        toast(`${loc.name} added to the project`, 'map-pin-plus', 'emerald');
        resetForm();
        refreshSummary(projectId);
        setSubmitting(false);
      });
  }

  function handleFinish() {
    api.submitProjectForApproval(project.id).then(() => {
      toast('Project submitted — awaiting Admin approval', 'send', 'brand');
      navigate('/ca/dashboard');
    });
  }

  return (
    <AppShell role="ca" title="Add Location">
      <div className="mb-5">
        <Link
          to="/ca/create-project"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ink-950 mb-3 transition"
        >
          <Icon name="arrow-left" className="w-3.5 h-3.5" />
          Start over
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink-950">Add Location</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {project.name} · {project.company}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-5 max-w-3xl">
        <div className="flex-1 h-1.5 rounded-full bg-ink-950" />
        <div className="flex-1 h-1.5 rounded-full bg-ink-950" />
      </div>

      {locationsSoFar.length > 0 && (
        <div className="max-w-3xl mb-5">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink-950">
                {locationsSoFar.length} location{locationsSoFar.length === 1 ? '' : 's'} added to this project
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {locationsSoFar.map((l) => (
                <span
                  key={l.id}
                  className="text-[11px] font-medium bg-slate-50 border border-slate-200 text-ink-950 px-2.5 py-1 rounded-full inline-flex items-center gap-1"
                >
                  <Icon name="map-pin" className="w-3 h-3 text-brand-600" />
                  {l.name}
                </span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => document.querySelector('[name=locName]')?.focus()}
                className="flex-1 border border-slate-200 text-ink-950 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
              >
                <Icon name="plus" className="w-4 h-4" />
                Add Another Location
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 bg-ink-950 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-ink-900 inline-flex items-center justify-center gap-1.5"
              >
                <Icon name="send" className="w-4 h-4" />
                Finish &amp; Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5 sm:p-6 max-w-3xl">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <p className="text-xs font-semibold text-ink-950 uppercase tracking-wide mb-3">Location Details</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Location Name</label>
                <input
                  required
                  name="locName"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Andheri East Warehouse"
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Address</label>
                <input
                  required
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="e.g. Andheri East, Mumbai"
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">Contact Person(s)</label>
                  <button
                    type="button"
                    onClick={addContactRow}
                    className="text-[11px] font-medium text-brand-600 inline-flex items-center gap-1"
                  >
                    <Icon name="plus" className="w-3 h-3" />
                    Add contact
                  </button>
                </div>
                <div className="space-y-2">
                  {contacts.map((c, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        value={c.name}
                        onChange={(e) => updateContact(idx, 'name', e.target.value)}
                        placeholder="Contact name"
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                      />
                      <input
                        value={c.title}
                        onChange={(e) => updateContact(idx, 'title', e.target.value)}
                        placeholder="Role (e.g. Site Manager)"
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                      />
                      <div className="flex gap-2">
                        <input
                          value={c.phone}
                          onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                          placeholder="Phone"
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeContactRow(idx)}
                          className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 shrink-0"
                        >
                          <Icon name="x" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Audit Type</label>
                  <select
                    value={form.auditType}
                    onChange={(e) => updateField('auditType', e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                  >
                    {AUDIT_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Timing</label>
                  <input
                    required
                    value={form.timing}
                    onChange={(e) => updateField('timing', e.target.value)}
                    placeholder="e.g. 09:00 AM – 06:00 PM"
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="What should the auditors focus on here?"
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Start Date</label>
                  <input
                    required
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateField('startDate', e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">End Date</label>
                  <input
                    required
                    type="date"
                    value={form.endDate}
                    onChange={(e) => updateField('endDate', e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Audit Guide</label>
                <select
                  value={form.auditGuide}
                  onChange={(e) => updateField('auditGuide', e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                >
                  <option value="">No guide</option>
                  {guides.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                  <option value="__upload__">+ Upload a new guide…</option>
                </select>
                {form.auditGuide === '__upload__' && (
                  <input
                    type="text"
                    value={form.newGuideName}
                    onChange={(e) => updateField('newGuideName', e.target.value)}
                    placeholder="File name, e.g. Cash_Audit_Checklist.pdf"
                    className="mt-2 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-ink-950 uppercase tracking-wide mb-3">Auditor Requirement</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Number of Auditors</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.auditorsNeeded}
                  onChange={(e) => updateField('auditorsNeeded', e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Allowance / Auditor (₹)</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.allowance}
                  onChange={(e) => updateField('allowance', e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">Payment Released After (days)</label>
              <input
                required
                type="number"
                min="0"
                value={form.paymentAfterDays}
                onChange={(e) => updateField('paymentAfterDays', e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              />
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">Note for Applying Auditors</label>
              <textarea
                rows={2}
                value={form.note}
                onChange={(e) => updateField('note', e.target.value)}
                placeholder="e.g. Safety shoes required on the warehouse floor."
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white resize-none"
              />
            </div>
            <div className="mt-3 flex items-center justify-between bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
              <span className="text-xs text-brand-700 font-medium">Location Budget</span>
              <span className="font-mono text-sm font-semibold text-brand-700">{formatMoney(budget)}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-ink-950 uppercase tracking-wide mb-1">
              Add Your Own Auditors <span className="normal-case font-normal text-slate-400">(optional)</span>
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Auditors you add here are locked in immediately — the marketplace only fills remaining open spots.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {roster.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:border-brand-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedAuditors.some((x) => x.id === a.id)}
                    onChange={() => toggleAuditor(a)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink-950 truncate">{a.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{a.experience}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              disabled={submitting}
              className="flex-1 bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Icon name="map-pin-plus" className="w-4 h-4" />
              Save Location
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
