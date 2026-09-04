import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Placeholder from './pages/Placeholder.jsx';

// Every route-level page is lazy-loaded so the initial bundle only ships
// Login + routing plumbing; each role's pages (and heavy deps like
// @zxing/library / leaflet / xlsx, pulled in transitively by a few pages)
// only download once that route is actually visited.
const CaDashboard = lazy(() => import('./pages/ca/Dashboard.jsx'));
const CaFulfillment = lazy(() => import('./pages/ca/Fulfillment.jsx'));
const CaFulfillmentDetail = lazy(() => import('./pages/ca/FulfillmentDetail.jsx'));
const CaCompanies = lazy(() => import('./pages/ca/Companies.jsx'));
const CaCompanyDetail = lazy(() => import('./pages/ca/CompanyDetail.jsx'));
const CaCreateProject = lazy(() => import('./pages/ca/CreateProject.jsx'));
const CaAddLocation = lazy(() => import('./pages/ca/AddLocation.jsx'));
const CaHistory = lazy(() => import('./pages/ca/History.jsx'));
const CaPayments = lazy(() => import('./pages/ca/Payments.jsx'));
const CaMonitorDetail = lazy(() => import('./pages/ca/MonitorDetail.jsx'));
const CaPaymentDetail = lazy(() => import('./pages/ca/PaymentDetail.jsx'));
const CaSettings = lazy(() => import('./pages/ca/Settings.jsx'));

const AuditorHome = lazy(() => import('./pages/auditor/Home.jsx'));
const AuditorMarketplace = lazy(() => import('./pages/auditor/Marketplace.jsx'));
const AuditorListingDetail = lazy(() => import('./pages/auditor/ListingDetail.jsx'));
const AuditorReceipts = lazy(() => import('./pages/auditor/Receipts.jsx'));
const AuditorFileSharing = lazy(() => import('./pages/auditor/FileSharing.jsx'));
const AuditorProfile = lazy(() => import('./pages/auditor/Profile.jsx'));
const AuditorSettings = lazy(() => import('./pages/auditor/Settings.jsx'));
const AuditorInvoice = lazy(() => import('./pages/auditor/Invoice.jsx'));
const AuditorGeoSelfie = lazy(() => import('./pages/auditor/GeoSelfie.jsx'));
const AuditorAudit = lazy(() => import('./pages/auditor/Audit.jsx'));
const ScanWorkspace = lazy(() => import('./pages/auditor/scan/Workspace.jsx'));

const CompanyAnalytics = lazy(() => import('./pages/company/Analytics.jsx'));
const CompanyAudits = lazy(() => import('./pages/company/Audits.jsx'));
const CompanyAuditDetail = lazy(() => import('./pages/company/AuditDetail.jsx'));
const CompanyBranches = lazy(() => import('./pages/company/Branches.jsx'));
const CompanyBilling = lazy(() => import('./pages/company/Billing.jsx'));
const CompanyBillingDetail = lazy(() => import('./pages/company/BillingDetail.jsx'));
const CompanyIngestion = lazy(() => import('./pages/company/Ingestion.jsx'));
const CompanySettings = lazy(() => import('./pages/company/Settings.jsx'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const AdminApprovals = lazy(() => import('./pages/admin/Approvals.jsx'));
const AdminCompanies = lazy(() => import('./pages/admin/Companies.jsx'));
const AdminEscalations = lazy(() => import('./pages/admin/Escalations.jsx'));
const AdminInvoices = lazy(() => import('./pages/admin/Invoices.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/Users.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/Settings.jsx'));

// Route path -> nav label, used to title the still-placeholder pages.
// Full list mirrors the original pages/<role>/*.html sitemap.
const CA_PAGES = [];

const AUDITOR_PAGES = [];

const COMPANY_PAGES = [];

const ADMIN_PAGES = [];

function placeholderRoutes(role, pages) {
  return pages.map(([path, title]) => (
    <Route key={path} path={path} element={<Placeholder role={role} title={title} />} />
  ));
}

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-brand-600 animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/ca" element={<ProtectedRoute role="ca" />}>
          <Route path="dashboard" element={<CaDashboard />} />
          <Route path="fulfillment" element={<CaFulfillment />} />
          <Route path="fulfillment-detail" element={<CaFulfillmentDetail />} />
          <Route path="companies" element={<CaCompanies />} />
          <Route path="company-detail" element={<CaCompanyDetail />} />
          <Route path="create-project" element={<CaCreateProject />} />
          <Route path="add-location" element={<CaAddLocation />} />
          <Route path="history" element={<CaHistory />} />
          <Route path="payments" element={<CaPayments />} />
          <Route path="monitor-detail" element={<CaMonitorDetail />} />
          <Route path="payment-detail" element={<CaPaymentDetail />} />
          <Route path="settings" element={<CaSettings />} />
          {placeholderRoutes('ca', CA_PAGES)}
        </Route>

        <Route path="/auditor" element={<ProtectedRoute role="auditor" />}>
          <Route path="home" element={<AuditorHome />} />
          <Route path="marketplace" element={<AuditorMarketplace />} />
          <Route path="listing-detail" element={<AuditorListingDetail />} />
          <Route path="receipts" element={<AuditorReceipts />} />
          <Route path="file-sharing" element={<AuditorFileSharing />} />
          <Route path="profile" element={<AuditorProfile />} />
          <Route path="settings" element={<AuditorSettings />} />
          <Route path="invoice" element={<AuditorInvoice />} />
          <Route path="geo-selfie" element={<AuditorGeoSelfie />} />
          <Route path="audit" element={<AuditorAudit />} />
          <Route path="scan" element={<ScanWorkspace />} />
          {placeholderRoutes('auditor', AUDITOR_PAGES)}
        </Route>

        <Route path="/company" element={<ProtectedRoute role="company" />}>
          <Route path="analytics" element={<CompanyAnalytics />} />
          <Route path="audits" element={<CompanyAudits />} />
          <Route path="audit-detail" element={<CompanyAuditDetail />} />
          <Route path="branches" element={<CompanyBranches />} />
          <Route path="billing" element={<CompanyBilling />} />
          <Route path="billing-detail" element={<CompanyBillingDetail />} />
          <Route path="ingestion" element={<CompanyIngestion />} />
          <Route path="settings" element={<CompanySettings />} />
          {placeholderRoutes('company', COMPANY_PAGES)}
        </Route>

        <Route path="/admin" element={<ProtectedRoute role="admin" />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="approvals" element={<AdminApprovals />} />
          <Route path="companies" element={<AdminCompanies />} />
          <Route path="escalations" element={<AdminEscalations />} />
          <Route path="invoices" element={<AdminInvoices />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
          {placeholderRoutes('admin', ADMIN_PAGES)}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
