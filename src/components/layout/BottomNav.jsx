import { NavLink } from 'react-router-dom';
import { Icon } from '../ui/Icon.jsx';

export default function BottomNav({ active }) {
  const cls = (id) => `flex flex-col items-center gap-1 px-3 py-1 rounded-xl ${active === id ? 'text-brand-600' : 'text-slate-400'}`;
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 flex items-center justify-around py-2.5">
      <NavLink to="/auditor/home" className={cls('home')}>
        <Icon name="home" className="w-5 h-5" />
        <span className="text-[10px] font-medium">Home</span>
      </NavLink>
      <NavLink to="/auditor/marketplace" className={cls('marketplace')}>
        <Icon name="store" className="w-5 h-5" />
        <span className="text-[10px] font-medium">Market</span>
      </NavLink>
      <NavLink to="/auditor/geo-selfie" className="flex flex-col items-center gap-1 -mt-6">
        <span className="w-12 h-12 rounded-full bg-ink-950 text-white flex items-center justify-center shadow-lg">
          <Icon name="scan-face" className="w-5 h-5" />
        </span>
      </NavLink>
      <NavLink to="/auditor/receipts" className={cls('receipts')}>
        <Icon name="receipt" className="w-5 h-5" />
        <span className="text-[10px] font-medium">Receipts</span>
      </NavLink>
      <NavLink to="/auditor/profile" className={cls('profile')}>
        <Icon name="user" className="w-5 h-5" />
        <span className="text-[10px] font-medium">Profile</span>
      </NavLink>
    </nav>
  );
}
