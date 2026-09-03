import { useEffect, useState } from 'react';
import AppShell from '../layout/AppShell.jsx';
import CaLocationCard from './CaLocationCard.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';

// Shared shell for CA pages that are just "one status, one grid of cards"
// (History, Payments). Fulfillment needs tabs so it stays its own page.
export default function LocationStatusList({ title, subtitle, status, priority, emptyIcon, emptyTitle, emptyMessage }) {
  const api = useVouchStore((s) => s.api);
  const [locations, setLocations] = useState(null);

  useEffect(() => {
    api.getLocationsByStatus(status).then(setLocations);
  }, [api, status]);

  return (
    <AppShell role="ca" title={title}>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">{title}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {locations && locations.length > 0 ? (
          locations.map((l) => <CaLocationCard key={l.id} loc={l} priority={priority} />)
        ) : locations ? (
          <div className="md:col-span-2">
            <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
