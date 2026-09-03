import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import NotificationsPanel from './NotificationsPanel.jsx';
import BottomNav from './BottomNav.jsx';
import ToastHost from '../ui/ToastHost.jsx';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useVouchStore } from '../../store/useVouchStore.js';
import { toast } from '../../store/useToastStore.js';

const COLLAPSE_KEY = 'vouch_sidebar_collapsed';
const BOTTOM_NAV_IDS = ['home', 'marketplace', 'geo-selfie', 'receipts', 'profile'];

export default function AppShell({ role, title, children }) {
  const session = useAuthStore((s) => s.session);
  const db = useVouchStore((s) => s.db);
  const routerLocation = useLocation();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const notifications = useMemo(() => {
    if (!db?.notifications) return [];
    const personId = role === 'auditor' ? session?.auditorId : session?.name;
    return db.notifications
      .filter((n) => n.recipientRole === role && (n.recipientId === personId || !n.recipientId))
      .slice(0, 30);
  }, [db, role, session]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const bottomNavActive = useMemo(() => {
    if (role !== 'auditor') return null;
    const seg = routerLocation.pathname.split('/')[2] || '';
    return BOTTOM_NAV_IDS.includes(seg) ? seg : null;
  }, [role, routerLocation.pathname]);

  function handleNotifAction(n, action) {
    // Ported behavior stub — full Continue/Leave handling (extension odds
    // flow) gets wired up when the Auditor role pages are ported.
    toast(action === 'continue' ? 'Continuing on this audit.' : 'You have left this audit.', 'check-circle-2', 'ink');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={role} collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <Topbar
        title={title}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onOpenMobile={() => setMobileOpen(true)}
        onToggleNotifications={() => setNotifOpen((v) => !v)}
        unreadCount={unreadCount}
      />
      <main className={`pt-[65px] transition-[margin-left] duration-200 ${collapsed ? 'lg:ml-[76px]' : 'lg:ml-64'} ${role === 'auditor' ? 'pb-20 lg:pb-0' : ''}`}>
        <div className="p-4 sm:p-6 max-w-[1400px] mx-auto fade-in">{children}</div>
      </main>
      {role === 'auditor' && <BottomNav active={bottomNavActive} />}
      <NotificationsPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onAction={handleNotifAction}
      />
      {notifOpen && <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />}
      <ToastHost />
    </div>
  );
}
