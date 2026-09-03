import { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell.jsx';
import CaLocationCard from '../../components/ca/CaLocationCard.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';

export default function CaFulfillment() {
  const api = useVouchStore((s) => s.api);
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState(null);
  const [completed, setCompleted] = useState(null);

  useEffect(() => {
    api.getLocationsByStatus('fulfillment_pending').then(setPending);
    api.getLocationsByStatus('fulfillment_completed').then(setCompleted);
  }, [api]);

  return (
    <AppShell role="ca" title="Fulfillment">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Fulfillment</h1>
        <p className="text-slate-500 text-sm mt-0.5">Select auditors for open locations, then track who's ready to start.</p>
      </div>

      <div className="inline-flex bg-slate-100 rounded-xl p-1 mb-5">
        <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
          Pending
        </TabButton>
        <TabButton active={tab === 'completed'} onClick={() => setTab('completed')}>
          Completed
        </TabButton>
      </div>

      {tab === 'pending' && (
        <div className="grid md:grid-cols-2 gap-4">
          {pending && pending.length > 0 ? (
            pending.map((l) => <CaLocationCard key={l.id} loc={l} priority="fulfillment-pending" />)
          ) : pending ? (
            <div className="md:col-span-2">
              <EmptyState
                icon="clipboard-list"
                title="No open locations"
                message="Locations show up here once their project is approved and awaiting a full auditor team."
              />
            </div>
          ) : null}
        </div>
      )}

      {tab === 'completed' && (
        <div className="grid md:grid-cols-2 gap-4">
          {completed && completed.length > 0 ? (
            completed.map((l) => <CaLocationCard key={l.id} loc={l} priority="fulfillment-completed" />)
          ) : completed ? (
            <div className="md:col-span-2">
              <EmptyState
                icon="check-check"
                title="Nothing fulfilled yet"
                message="Locations move here once you've selected a full auditor team — they wait here until their start date."
              />
            </div>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
        active ? 'bg-white shadow-card text-ink-950' : 'text-slate-500'
      }`}
    >
      {children}
    </button>
  );
}
