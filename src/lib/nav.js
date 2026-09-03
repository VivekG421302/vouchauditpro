// Ported from assets/js/components/sidebar.js VOUCH_NAV.
// `path` values are React Router paths (relative to the role's base,
// e.g. /ca/dashboard), replacing the original *.html hrefs.
export const VOUCH_NAV = {
  admin: [
    { icon: 'layout-dashboard', label: 'Control Center', path: '/admin/dashboard' },
    { icon: 'users', label: 'User Management', path: '/admin/users' },
    { icon: 'building-2', label: 'Companies', path: '/admin/companies' },
    { icon: 'clipboard-check', label: 'Project Approvals', path: '/admin/approvals' },
    { icon: 'siren', label: 'Escalations', path: '/admin/escalations' },
    { icon: 'receipt', label: 'Invoices & Payouts', path: '/admin/invoices' },
    { icon: 'settings', label: 'Settings', path: '/admin/settings' },
  ],
  ca: [
    { icon: 'layout-dashboard', label: 'Dashboard', path: '/ca/dashboard' },
    { icon: 'folder-plus', label: 'Create Project', path: '/ca/create-project' },
    { icon: 'clipboard-list', label: 'Fulfillment', path: '/ca/fulfillment' },
    { icon: 'wallet', label: 'Payments', path: '/ca/payments' },
    { icon: 'history', label: 'History', path: '/ca/history' },
    { icon: 'building-2', label: 'Company & Locations', path: '/ca/companies' },
    { icon: 'settings', label: 'Settings', path: '/ca/settings' },
  ],
  company: [
    { icon: 'gauge', label: 'Progress Analytics', path: '/company/analytics' },
    { icon: 'clipboard-list', label: 'My Audits', path: '/company/audits' },
    { icon: 'map-pin', label: 'Branches', path: '/company/branches' },
    { icon: 'wallet', label: 'Billing', path: '/company/billing' },
    { icon: 'upload-cloud', label: 'Data Ingestion', path: '/company/ingestion' },
    { icon: 'settings', label: 'Settings', path: '/company/settings' },
  ],
  auditor: [
    { icon: 'home', label: 'Home', path: '/auditor/home' },
    { icon: 'store', label: 'Marketplace', path: '/auditor/marketplace' },
    { icon: 'clipboard-list', label: 'Audit Activity', path: '/auditor/audit' },
    { icon: 'scan-face', label: 'Geo-Selfie', path: '/auditor/geo-selfie' },
    { icon: 'receipt', label: 'Receipts', path: '/auditor/receipts' },
    { icon: 'wifi', label: 'File Sharing', path: '/auditor/file-sharing' },
    { icon: 'user', label: 'Profile', path: '/auditor/profile' },
    { icon: 'settings', label: 'Settings', path: '/auditor/settings' },
  ],
};
