import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Placeholder from './pages/Placeholder.jsx';
import CaDashboard from './pages/ca/Dashboard.jsx';
import CaFulfillment from './pages/ca/Fulfillment.jsx';
import CaFulfillmentDetail from './pages/ca/FulfillmentDetail.jsx';
import CaCompanies from './pages/ca/Companies.jsx';
import CaCompanyDetail from './pages/ca/CompanyDetail.jsx';
import CaCreateProject from './pages/ca/CreateProject.jsx';
import CaAddLocation from './pages/ca/AddLocation.jsx';
import CaHistory from './pages/ca/History.jsx';
import CaPayments from './pages/ca/Payments.jsx';
import CaMonitorDetail from './pages/ca/MonitorDetail.jsx';
import CaPaymentDetail from './pages/ca/PaymentDetail.jsx';
import CaSettings from './pages/ca/Settings.jsx';
import AuditorHome from './pages/auditor/Home.jsx';
import AuditorMarketplace from './pages/auditor/Marketplace.jsx';
import AuditorListingDetail from './pages/auditor/ListingDetail.jsx';
import AuditorReceipts from './pages/auditor/Receipts.jsx';
import AuditorFileSharing from './pages/auditor/FileSharing.jsx';
import AuditorProfile from './pages/auditor/Profile.jsx';
import AuditorSettings from './pages/auditor/Settings.jsx';
import AuditorInvoice from './pages/auditor/Invoice.jsx';
import AuditorGeoSelfie from './pages/auditor/GeoSelfie.jsx';
import AuditorAudit from './pages/auditor/Audit.jsx';
import CompanyAnalytics from './pages/company/Analytics.jsx';
import CompanyAudits from './pages/company/Audits.jsx';
import CompanyAuditDetail from './pages/company/AuditDetail.jsx';
import CompanyBranches from './pages/company/Branches.jsx';
import CompanyBilling from './pages/company/Billing.jsx';
import CompanyBillingDetail from './pages/company/BillingDetail.jsx';
import CompanyIngestion from './pages/company/Ingestion.jsx';
import CompanySettings from './pages/company/Settings.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminApprovals from './pages/admin/Approvals.jsx';
import AdminCompanies from './pages/admin/Companies.jsx';
import AdminEscalations from './pages/admin/Escalations.jsx';
import AdminInvoices from './pages/admin/Invoices.jsx';
import AdminUsers from './pages/admin/Users.jsx';
import AdminSettings from './pages/admin/Settings.jsx';
import ScanWorkspace from './pages/auditor/scan/Workspace.jsx';

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

export default function App() {
  return (
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
  );
}
