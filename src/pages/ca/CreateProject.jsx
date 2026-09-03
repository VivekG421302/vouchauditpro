import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { toast } from '../../store/useToastStore.js';

export default function CaCreateProject() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselect = searchParams.get('company') || '';

  const [companies, setCompanies] = useState(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getCompanies().then((list) => {
      setCompanies(list);
      if (preselect && list.some((c) => c.name === preselect)) setCompany(preselect);
      else if (list.length) setCompany(list[0].name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  function handleSubmit(e) {
    e.preventDefault();
    const finalCompany = company === '__new__' ? newCompany || 'Unnamed Company' : company;
    setSubmitting(true);
    api.createProjectDraft({ name, company: finalCompany, description, ca: session.name }).then((project) => {
      toast('Project details saved — now add a location', 'folder-plus', 'brand');
      navigate(`/ca/add-location?projectId=${project.id}`);
    });
  }

  return (
    <AppShell role="ca" title="Create Project">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Create Project</h1>
        <p className="text-slate-500 text-sm mt-0.5">Step 1 of 2 — basic project details. You'll add locations next.</p>
      </div>

      <div className="flex items-center gap-2 mb-5 max-w-2xl">
        <div className="flex-1 h-1.5 rounded-full bg-ink-950" />
        <div className="flex-1 h-1.5 rounded-full bg-slate-200" />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5 sm:p-6 max-w-2xl">
        {companies && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-medium text-slate-600">Project Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. FY26 Statutory Audit"
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Client Company</label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option value="__new__">+ New / ad-hoc company</option>
              </select>
            </div>
            {company === '__new__' && (
              <div>
                <label className="text-xs font-medium text-slate-600">New Company Name</label>
                <input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="e.g. Marigold Foods Pvt. Ltd."
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-slate-600">Description</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this audit engagement covering?"
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white resize-none"
              />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
              <Icon name="info" className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                Next you'll add one or more audit locations — each with its own site details and auditor requirement. The whole
                project goes to Admin for approval once you're done adding locations.
              </p>
            </div>
            <button
              disabled={submitting}
              className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Icon name="arrow-right" className="w-4 h-4" />
              Continue to Add Location
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
