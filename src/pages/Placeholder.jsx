import AppShell from '../components/layout/AppShell.jsx';
import { Icon } from '../components/ui/Icon.jsx';

export default function Placeholder({ role, title }) {
  return (
    <AppShell role={role} title={title}>
      <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center max-w-lg mx-auto mt-10">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <Icon name="construction" className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-ink-950">{title}</p>
        <p className="text-xs text-slate-500 mt-1">This page hasn't been ported to React yet — coming in a later session.</p>
      </div>
    </AppShell>
  );
}
