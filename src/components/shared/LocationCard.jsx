import { Icon } from '../ui/Icon.jsx';

export function ContactChip({ contact }) {
  const initials = (contact.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="shrink-0 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full pl-1.5 pr-3.5 py-1.5 min-w-max">
      {contact.photo ? (
        <img src={contact.photo} alt={contact.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-ink-950 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-950 truncate max-w-[140px]">{contact.name}</p>
        <p className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">{contact.phone || contact.title || ''}</p>
      </div>
    </div>
  );
}

export default function LocationCard({ branch, children }) {
  const contacts = branch.contacts || [];
  const lat = typeof branch.lat === 'number' ? branch.lat.toFixed(4) : branch.lat;
  const lng = typeof branch.lng === 'number' ? branch.lng.toFixed(4) : branch.lng;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-[42%] shrink-0 p-4 sm:border-r border-slate-100">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
              <Icon name="map-pin" className="w-4 h-4 text-brand-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-950 truncate">{branch.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{branch.address || ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
              {lat}, {lng}
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
              ±{branch.radius}m geofence
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0 p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Contacts</p>
          {contacts.length ? (
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mb-1">
              {contacts.map((c, i) => (
                <ContactChip key={i} contact={c} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No contact persons added yet.</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
