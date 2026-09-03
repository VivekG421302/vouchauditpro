/* ============================================================
   VOUCH — database layer (assets/js/db.js)
   ------------------------------------------------------------
   Persists app state in IndexedDB (database "vouch_idb", store
   "state", single record keyed "main") instead of localStorage —
   proper transactional writes, no 5MB string-size ceiling, and
   it survives reloads offline. Every other file still reads and
   writes through the same VouchDB.get()/save() pair as before:
   get() returns an in-memory mirror kept in sync with IndexedDB,
   so callers don't need to be async-aware themselves. The one
   rule: don't call VouchDB.get() until VouchDB.ready has resolved
   (api.js already chains off VouchDB.ready internally, so no
   page-level code needs to change).

   When the Spring Boot backend lands, VouchDB.get()/save() stay
   exactly where api.js calls them — only their bodies change from
   IndexedDB reads/writes to fetch() calls.
============================================================ */

const VOUCH_IDB_NAME = 'vouch_idb';
const VOUCH_IDB_VERSION = 1;
const VOUCH_IDB_STORE = 'state';
const VOUCH_IDB_KEY = 'main';

const VOUCH_SEED = {
  // ---- auth accounts (RBAC placeholder — will become server-side JWT issuance) ----
  accounts: [
    { username:'admin@vouch.com',   password:'password', role:'admin',    name:'Priya Menon',            initials:'PM', label:'Platform Admin' },
    { username:'ca@vouch.com',      password:'password', role:'ca',       name:'Ananya Bhatt',            initials:'AB', label:'Chartered Accountant' },
    { username:'auditor@vouch.com', password:'password', role:'auditor',  name:'Rohan Kulkarni',          initials:'RK', label:'Field Auditor', auditorId:'AU-01' },
    { username:'company@vouch.com', password:'password', role:'company',  name:'Zenith Retail Pvt. Ltd.', initials:'ZR', label:'Client — Company Portal' },
  ],

  auditors: [
    {id:'AU-01', name:'Rohan Kulkarni', phone:'+91 90220 11234', rating:4.8, experience:'6 yrs · Inventory & Statutory',
      specialization:'Inventory & Stock', baseCity:'Mumbai', kyc:'Verified', bankLinked:'HDFC •• 4471', joinDate:'14 Feb 2020',
      badges:['Inventory Expert','Milestone · 50 Audits','Fast Responder','Fraud Detection'], flags:[]},
    {id:'AU-02', name:'Divya Shah', phone:'+91 90220 55678', rating:4.6, experience:'4 yrs · Cash & Tax Audits',
      specialization:'Cash & Tax', baseCity:'Nagpur', kyc:'Verified', bankLinked:'ICICI •• 2290', joinDate:'02 Nov 2021',
      badges:['Tax Specialist','Fast Responder'], flags:[]},
    {id:'AU-03', name:'Kabir Sheikh', phone:'+91 90220 99887', rating:4.2, experience:'3 yrs · Asset Tagging',
      specialization:'Fixed Assets', baseCity:'Delhi', kyc:'Verified', bankLinked:'SBI •• 7712', joinDate:'19 May 2022',
      badges:['Milestone · 25 Audits'], flags:[]},
    {id:'AU-04', name:'Neha Kapoor', phone:'+91 90220 33445', rating:4.9, experience:'7 yrs · Statutory Audit Lead',
      specialization:'Statutory Audit', baseCity:'Mumbai', kyc:'Verified', bankLinked:'HDFC •• 9013', joinDate:'03 Jan 2019',
      badges:['Statutory Lead','Milestone · 100 Audits','Fraud Detection','Fast Responder'], flags:[]},
    {id:'AU-05', name:'Meera Iyer', phone:'+91 90220 77661', rating:4.4, experience:'2 yrs · Inventory Audit',
      specialization:'Inventory & Stock', baseCity:'Kolkata', kyc:'Verified', bankLinked:'Axis •• 3364', joinDate:'27 Jul 2023',
      badges:['Milestone · 10 Audits'], flags:[]},
    {id:'AU-06', name:'Farhan Qureshi', phone:'+91 90220 22114', rating:4.5, experience:'5 yrs · Tax & Vendor Ledger',
      specialization:'Tax & Ledger', baseCity:'Surat', kyc:'Verified', bankLinked:'Kotak •• 5528', joinDate:'11 Sep 2020',
      badges:['Tax Specialist','Milestone · 50 Audits'], flags:[]},
  ],

  auditGuides: [
    {id:'AG-01', name:'Standard Inventory Audit Checklist.pdf'},
    {id:'AG-02', name:'Statutory Audit — Field Guide v3.pdf'},
  ],

  users: [
    {id:'U-101', name:'Ananya Bhatt', role:'CA', email:'ananya.bhatt@vertexaudit.in', status:'Active', joined:'12 Jan 2025'},
    {id:'U-102', name:'Rohan Kulkarni', role:'Auditor', email:'rohan.k@vouch.field', status:'Active', joined:'03 Feb 2025'},
    {id:'U-103', name:'Meera Iyer', role:'Auditor', email:'meera.iyer@vouch.field', status:'Pending Verification', joined:'21 Jul 2026'},
    {id:'U-104', name:'Suresh Nair', role:'CA', email:'suresh.nair@nairassoc.com', status:'Active', joined:'19 Mar 2025'},
    {id:'U-105', name:'Kabir Sheikh', role:'Auditor', email:'kabir.sheikh@vouch.field', status:'Suspended', joined:'08 Sep 2024'},
    {id:'U-106', name:'Divya Shah', role:'Auditor', email:'divya.shah@vouch.field', status:'Active', joined:'15 May 2025'},
    {id:'U-107', name:'Farhan Qureshi', role:'CA', email:'farhan.q@meridiancas.com', status:'Pending Verification', joined:'02 Aug 2026'},
    {id:'U-108', name:'Neha Kapoor', role:'Auditor', email:'neha.kapoor@vouch.field', status:'Active', joined:'27 Jun 2025'},
  ],

  companies: [
    {id:'C-01', name:'Zenith Retail Pvt. Ltd.', industry:'Retail & FMCG', branches:[
      {id:'B-01', name:'Andheri East Warehouse', address:'Andheri East, Mumbai', lat:19.1197, lng:72.8468, radius:150,
        contacts:[
          {id:'CT-01', name:'Aisha Verma', title:'Warehouse Manager', phone:'+91 98200 11223', photo:null},
          {id:'CT-02', name:'Ravi Deshmukh', title:'Security Lead', phone:'+91 98200 44556', photo:null},
        ]},
      {id:'B-02', name:'Pune Distribution Hub', address:'Hinjewadi, Pune', lat:18.5913, lng:73.7389, radius:200,
        contacts:[
          {id:'CT-03', name:'Sonal Patil', title:'Site Coordinator', phone:'+91 98230 77889', photo:null},
        ]},
    ]},
    {id:'C-02', name:'Orbit Textiles Ltd.', industry:'Manufacturing', branches:[
      {id:'B-03', name:'Surat Plant 3', address:'Pandesara, Surat', lat:21.1458, lng:72.7797, radius:250,
        contacts:[
          {id:'CT-04', name:'Devendra Rathi', title:'Plant Supervisor', phone:'+91 98790 33221', photo:null},
        ]},
    ]},
  ],

  // ---- projects: lightweight containers, one CA project can hold many locations.
  // Aggregate fields (branch/auditorCount/payoutPerAuditor/budget/start/end/completion/
  // assigned/present/absent) are DERIVED from the project's locations — see
  // recomputeProjectAggregates() in api.js — and kept in sync so Admin/Auditor/Company
  // pages (which only ever read the project-level rollup) don't need to change.
  projects: [
    {id:'P-2201', name:'FY26 Statutory Audit', description:'Full statutory audit across the Zenith retail network for FY26.', company:'Zenith Retail Pvt. Ltd.', ca:'Ananya Bhatt', status:'approved',
      locations:['L-04','L-05','L-06','L-07']},
    {id:'P-2202', name:'Stock Reconciliation — Q2', description:'Quarterly stock reconciliation across two warehouses.', company:'Zenith Retail Pvt. Ltd.', ca:'Ananya Bhatt', status:'approved',
      locations:['L-01','L-02']},
    {id:'P-2203', name:'Vendor Ledger Verification', description:'Vendor ledger and payables verification at the Surat plant.', company:'Orbit Textiles Ltd.', ca:'Ananya Bhatt', status:'approved',
      locations:['L-03']},
    {id:'P-2204', name:'Annual Inventory Sweep', description:'Year-end inventory sweep — submitted, awaiting Admin approval.', company:'Zenith Retail Pvt. Ltd.', ca:'Ananya Bhatt', status:'pending',
      locations:['L-09']},
    {id:'P-2199', name:'FY25 Closing Audit', description:'Prior-year closing audit — fully paid and archived.', company:'Orbit Textiles Ltd.', ca:'Ananya Bhatt', status:'approved',
      locations:['L-08']},
  ],

  // ---- locations: the real unit of work in the CA journey. Every location belongs
  // to exactly one project and moves through: fulfillment_pending → fulfillment_completed
  // → monitoring → payment → history.
  locations: [
    // -- Fulfillment › Pending (has applicants waiting, start date far out) --
    {id:'L-01', projectId:'P-2202', name:'Pune Distribution Hub', address:'Hinjewadi, Pune',
      lat:18.5913, lng:73.7389,
      contacts:[{name:'Sonal Patil', title:'Site Coordinator', phone:'+91 98230 77889'}],
      auditType:'Inventory Audit', description:'Full SKU count and reconciliation against WMS records.',
      startDate:'2026-09-01', endDate:'2026-09-10', timing:'09:00 AM – 06:00 PM', auditGuide:'Standard Inventory Audit Checklist.pdf',
      requirement:{ auditorsNeeded:3, allowance:6000, paymentAfterDays:7, note:'Warehouse floor — safety shoes required.' },
      caAuditors:[{id:'AU-05', name:'Meera Iyer'}],
      applicants:[{id:'AU-01', name:'Rohan Kulkarni', rating:4.8, experience:'6 yrs · Inventory & Statutory', appliedOn:'12 Aug 2026'},
                  {id:'AU-02', name:'Divya Shah', rating:4.6, experience:'4 yrs · Cash & Tax Audits', appliedOn:'13 Aug 2026'}],
      assignedAuditors:[], status:'fulfillment_pending', urgent:false, urgentNote:'', extended:false, expectedEnd:null, onHold:false, progress:0,
      payment:{ total:18000, paid:0, dueDate:null, reimbursement:0, overtime:0 } },

    // -- Fulfillment › Pending, start date in 2 days → red dropshadow --
    {id:'L-02', projectId:'P-2202', name:'Nagpur Retail Cluster', address:'Sitabuldi, Nagpur',
      lat:21.1287, lng:79.0806,
      contacts:[{name:'Amit Joshi', title:'Cluster Manager', phone:'+91 98220 45566'}],
      auditType:'Inventory Audit', description:'Spot-check inventory across 4 retail outlets in the cluster.',
      startDate:'2026-08-19', endDate:'2026-08-24', timing:'10:00 AM – 05:00 PM', auditGuide:null,
      requirement:{ auditorsNeeded:2, allowance:5000, paymentAfterDays:7, note:'Carry outlet access letter.' },
      caAuditors:[], applicants:[{id:'AU-06', name:'Farhan Qureshi', rating:4.5, experience:'5 yrs · Tax & Vendor Ledger', appliedOn:'15 Aug 2026'}],
      assignedAuditors:[], status:'fulfillment_pending', urgent:false, urgentNote:'', extended:false, expectedEnd:null, onHold:false, progress:0,
      payment:{ total:10000, paid:0, dueDate:null, reimbursement:0, overtime:0 } },

    // -- Fulfillment › Completed (requirement met, waiting for audit start date) --
    {id:'L-03', projectId:'P-2203', name:'Surat Plant 3', address:'Pandesara, Surat',
      lat:21.1443, lng:72.7757,
      contacts:[{name:'Devendra Rathi', title:'Plant Supervisor', phone:'+91 98790 33221'}],
      auditType:'Tax Audit', description:'Vendor ledger cross-verification against GST filings.',
      startDate:'2026-08-22', endDate:'2026-09-02', timing:'09:30 AM – 06:00 PM', auditGuide:null,
      requirement:{ auditorsNeeded:2, auditorsNeeded_note:'', allowance:2200, paymentAfterDays:10, note:'Bring laptop for ledger cross-check.' },
      caAuditors:[{id:'AU-04', name:'Neha Kapoor'}],
      applicants:[], assignedAuditors:[
        {id:'AU-04', name:'Neha Kapoor', phone:'+91 90220 33445', present:0, absent:0, overtimeHours:0, attendance:[]},
        {id:'AU-06', name:'Farhan Qureshi', phone:'+91 90220 22114', present:0, absent:0, overtimeHours:0, attendance:[]},
      ],
      status:'fulfillment_completed', urgent:false, urgentNote:'', extended:false, expectedEnd:null, onHold:false, progress:0,
      payment:{ total:4400, paid:0, dueDate:null, reimbursement:0, overtime:0 } },

    // -- Monitor: in progress, on track --
    {id:'L-04', projectId:'P-2201', name:'Andheri East Warehouse', address:'Andheri East, Mumbai',
      lat:19.1197, lng:72.8468,
      contacts:[{name:'Aisha Verma', title:'Warehouse Manager', phone:'+91 98200 11223'}, {name:'Ravi Deshmukh', title:'Security Lead', phone:'+91 98200 44556'}],
      auditType:'Statutory Audit', description:'FY26 statutory audit — books, cash, and fixed assets.',
      startDate:'2026-08-14', endDate:'2026-08-29', timing:'09:00 AM – 06:00 PM', auditGuide:'Statutory Audit — Field Guide v3.pdf',
      requirement:{ auditorsNeeded:5, allowance:8500, paymentAfterDays:7, note:'ID badge issued on-site.' },
      caAuditors:[], applicants:[], assignedAuditors:[
        {id:'AU-01', name:'Rohan Kulkarni', phone:'+91 90220 11234', present:9, absent:1, overtimeHours:3, attendance:[
          {date:'11 Aug 2026', status:'Verified', time:'09:14 AM', checkIn:'09:14 AM', checkOut:'06:05 PM'},
          {date:'10 Aug 2026', status:'Verified', time:'09:02 AM', checkIn:'09:02 AM', checkOut:'06:20 PM'},
        ]},
        {id:'AU-04', name:'Neha Kapoor', phone:'+91 90220 33445', present:10, absent:0, overtimeHours:1, attendance:[
          {date:'11 Aug 2026', status:'Verified', time:'08:58 AM', checkIn:'08:58 AM', checkOut:'06:00 PM'},
        ]},
        {id:'AU-02', name:'Divya Shah', phone:'+91 90220 55678', present:8, absent:2, overtimeHours:0, attendance:[
          {date:'05 Aug 2026', status:'Flagged · Out of Range', time:'09:41 AM', checkIn:'09:41 AM', checkOut:'05:58 PM'},
        ]},
      ],
      status:'monitoring', urgent:false, urgentNote:'', extended:true, expectedEnd:'2026-09-05', onHold:false, progress:68,
      payment:{ total:42500, paid:0, dueDate:null, reimbursement:0, overtime:0 } },

    // -- Monitor: on hold --
    {id:'L-05', projectId:'P-2201', name:'Kolkata Cold Storage', address:'Taratala, Kolkata',
      lat:22.5041, lng:88.3149,
      contacts:[{name:'Bishwajit Sen', title:'Facility Head', phone:'+91 98300 66112'}],
      auditType:'Statutory Audit', description:'Statutory audit of cold-storage stock ledgers.',
      startDate:'2026-08-10', endDate:'2026-08-25', timing:'09:00 AM – 05:00 PM', auditGuide:null,
      requirement:{ auditorsNeeded:2, allowance:8000, paymentAfterDays:7, note:'' },
      caAuditors:[], applicants:[], assignedAuditors:[
        {id:'AU-05', name:'Meera Iyer', phone:'+91 90220 77661', present:3, absent:0, overtimeHours:0, attendance:[]},
      ],
      status:'monitoring', urgent:false, urgentNote:'', extended:false, expectedEnd:null, onHold:true, progress:22,
      payment:{ total:16000, paid:0, dueDate:null, reimbursement:0, overtime:0 } },

    // -- Monitor: extended past original end date --
    {id:'L-06', projectId:'P-2201', name:'Nashik Bottling Unit', address:'Satpur MIDC, Nashik',
      lat:20.011, lng:73.7903,
      contacts:[{name:'Priyanka Rao', title:'Unit Head', phone:'+91 98600 22119'}],
      auditType:'Statutory Audit', description:'Statutory audit — extended for a supplementary stock count.',
      startDate:'2026-07-28', endDate:'2026-08-12', timing:'09:00 AM – 06:00 PM', auditGuide:null,
      requirement:{ auditorsNeeded:2, allowance:8200, paymentAfterDays:7, note:'' },
      caAuditors:[], applicants:[], assignedAuditors:[
        {id:'AU-06', name:'Farhan Qureshi', phone:'+91 90220 22114', present:12, absent:0, overtimeHours:5, attendance:[]},
      ],
      status:'monitoring', urgent:false, urgentNote:'', extended:true, expectedEnd:'2026-08-20', onHold:false, progress:88,
      payment:{ total:16400, paid:0, dueDate:null, reimbursement:0, overtime:0 } },

    // -- Payments: audit complete, bill pending --
    {id:'L-07', projectId:'P-2201', name:'Vashi Cash Office', address:'Sector 17, Vashi, Navi Mumbai',
      lat:19.0771, lng:73.0016,
      contacts:[{name:'Karan Malhotra', title:'Cashier-in-Charge', phone:'+91 98330 88774'}],
      auditType:'Cash Audit', description:'Petty cash and till reconciliation.',
      startDate:'2026-08-01', endDate:'2026-08-08', timing:'10:00 AM – 04:00 PM', auditGuide:null,
      requirement:{ auditorsNeeded:2, allowance:4200, paymentAfterDays:5, note:'' },
      caAuditors:[], applicants:[], assignedAuditors:[
        {id:'AU-01', name:'Rohan Kulkarni', phone:'+91 90220 11234', present:6, absent:0, overtimeHours:1, attendance:[]},
        {id:'AU-02', name:'Divya Shah', phone:'+91 90220 55678', present:6, absent:0, overtimeHours:2, attendance:[]},
      ],
      status:'payment', urgent:false, urgentNote:'', extended:false, expectedEnd:null, onHold:false, progress:100,
      payment:{ total:8400, paid:3000, dueDate:'2026-08-20', reimbursement:600, overtime:900 } },

    // -- History: fully paid and archived --
    {id:'L-08', projectId:'P-2199', name:'Surat Plant 3', address:'Pandesara, Surat',
      lat:21.1443, lng:72.7757,
      contacts:[{name:'Devendra Rathi', title:'Plant Supervisor', phone:'+91 98790 33221'}],
      auditType:'Statutory Audit', description:'FY25 closing statutory audit.',
      startDate:'2026-04-02', endDate:'2026-04-14', timing:'09:00 AM – 06:00 PM', auditGuide:null,
      requirement:{ auditorsNeeded:2, allowance:8000, paymentAfterDays:7, note:'' },
      caAuditors:[], applicants:[], assignedAuditors:[
        {id:'AU-04', name:'Neha Kapoor', phone:'+91 90220 33445', present:11, absent:0, overtimeHours:2, attendance:[]},
      ],
      status:'history', urgent:false, urgentNote:'', extended:false, expectedEnd:null, onHold:false, progress:100,
      payment:{ total:16000, paid:16000, dueDate:'2026-04-20', reimbursement:400, overtime:600 } },

    // -- belongs to a project still awaiting Admin approval (not yet on Marketplace) --
    {id:'L-09', projectId:'P-2204', name:'Andheri East Warehouse', address:'Andheri East, Mumbai',
      lat:19.1197, lng:72.8468,
      contacts:[{name:'Aisha Verma', title:'Warehouse Manager', phone:'+91 98200 11223'}],
      auditType:'Inventory Audit', description:'Year-end inventory sweep, full SKU recount.',
      startDate:'2026-09-05', endDate:'2026-09-20', timing:'09:00 AM – 06:00 PM', auditGuide:'Standard Inventory Audit Checklist.pdf',
      requirement:{ auditorsNeeded:6, allowance:7200, paymentAfterDays:7, note:'' },
      caAuditors:[], applicants:[], assignedAuditors:[],
      status:'fulfillment_pending', urgent:false, urgentNote:'', extended:false, expectedEnd:null, onHold:false, progress:0,
      payment:{ total:43200, paid:0, dueDate:null, reimbursement:0, overtime:0 } },
  ],

  invoices: [
    {id:'INV-9001', auditor:'Divya Shah', project:'FY26 Statutory Audit', amount:8500, submitted:'09 Aug 2026', status:'pending'},
    {id:'INV-9002', auditor:'Neha Kapoor', project:'FY26 Statutory Audit', amount:8500, submitted:'09 Aug 2026', status:'pending'},
    {id:'INV-9003', auditor:'Rohan Kulkarni', project:'Stock Reconciliation — Q2', amount:6000, submitted:'05 Aug 2026', status:'paid'},
    {id:'INV-9004', auditor:'Kabir Sheikh', project:'Stock Reconciliation — Q2', amount:6000, submitted:'07 Aug 2026', status:'pending'},
  ],

  marketplace: [
    {id:'L-01', name:'Stock Reconciliation — Q2 — Pune Distribution Hub', company:'Zenith Retail Pvt. Ltd.', location:'Pune Distribution Hub', payout:6000, spots:3, filled:1, type:'Inventory Audit', applied:false},
    {id:'L-02', name:'Stock Reconciliation — Q2 — Nagpur Retail Cluster', company:'Zenith Retail Pvt. Ltd.', location:'Nagpur Retail Cluster', payout:5000, spots:2, filled:0, type:'Inventory Audit', applied:false},
    {id:'P-2101', name:'Cash Counter Verification', company:'Bloom Pharmacy Chain', location:'Kothrud, Pune', payout:4200, spots:2, filled:0, type:'Cash Audit', applied:false},
    {id:'P-2098', name:'Fixed Asset Tagging Drive', company:'Orbit Textiles Ltd.', location:'Surat Plant 3', payout:9000, spots:5, filled:2, type:'Asset Audit', applied:true},
  ],

  attendance: [
    {id:'ATT-01', auditorId:'AU-01', locationId:'L-04', date:'11 Aug 2026', branch:'Andheri East Warehouse', status:'Verified', time:'09:14 AM', distance:38},
    {id:'ATT-02', auditorId:'AU-01', locationId:'L-04', date:'10 Aug 2026', branch:'Andheri East Warehouse', status:'Verified', time:'09:02 AM', distance:22},
    {id:'ATT-03', auditorId:'AU-01', locationId:'L-04', date:'07 Aug 2026', branch:'Andheri East Warehouse', status:'Verified', time:'08:57 AM', distance:41},
    {id:'ATT-04', auditorId:'AU-01', locationId:'L-04', date:'05 Aug 2026', branch:'Andheri East Warehouse', status:'Flagged · Out of Range', time:'09:41 AM', distance:640},
    {id:'ATT-05', auditorId:'AU-01', locationId:'L-04', date:'04 Aug 2026', branch:'Andheri East Warehouse', status:'Late', time:'10:20 AM', distance:55},
  ],

  companyProgress: {
    projectName: 'FY26 Statutory Audit',
    pct: 68,
    branchesAudited: 7, branchesTotal: 10,
    itemsVerified: 312, itemsTotal: 460,
    auditorsOnSite: 4,
    branchRatios: [
      {label:'Andheri East Warehouse', pct:100, tone:'emerald'},
      {label:'Pune Distribution Hub', pct:72, tone:'brand'},
      {label:'Nagpur Retail Cluster', pct:45, tone:'amber'},
      {label:'Kolkata Cold Storage', pct:0, tone:'slate'},
    ],
    uploadedFiles: ['stock_ledger_july2026.xlsx', 'branch_balance_sheet.pdf'],
  },

  // Notifications: recipientRole scopes who sees it — 'auditor' (needs
  // recipientId = auditorId), 'company' (needs recipientId = company name,
  // matching how companyRequests already scope by name), or 'ca'/'admin'
  // (recipientId left null — this platform is single-tenant for both, no
  // caId/adminId anywhere in the data model, so every CA/Admin session sees
  // the same feed). Legacy auditorId-only records are normalized on load —
  // see vouchNormalizeSeed().
  notifications: [
    {id:'N-01', recipientRole:'auditor', recipientId:'AU-01', auditorId:'AU-01', type:'reminder', title:'Audit tomorrow', body:'Andheri East Warehouse audit continues tomorrow — remember to check in on-site with Geo-Selfie.', locationId:'L-04', createdAt:'17 Aug 2026', read:false, requiresAction:false},
    {id:'N-02', recipientRole:'auditor', recipientId:'AU-01', auditorId:'AU-01', type:'extension', title:'Audit extended — action needed', body:'Andheri East Warehouse has been extended to 05 Sep 2026. Let us know if you can continue.', locationId:'L-04', createdAt:'12 Aug 2026', read:false, requiresAction:true},
    {id:'N-03', recipientRole:'auditor', recipientId:'AU-04', auditorId:'AU-04', type:'reminder', title:'Audit in progress', body:'Andheri East Warehouse — remember to submit your daily status update.', locationId:'L-04', createdAt:'11 Aug 2026', read:true, requiresAction:false},
  ],

  // ---- lightweight platform activity feed for the Admin dashboard — appended to by
  // approveProject/rejectProject/setUserStatus/approveInvoice/createUser/
  // applyRatingChange/registerCompanyAccount/resolveUrgentRequest/flagInvoice, so
  // "Recent Activity" reflects what actually happened rather than being static copy.
  activityLog: [
    {id:'AL-01', icon:'check-circle-2', tone:'emerald', text:'FY26 Statutory Audit approved & published', ts:'12 Aug 2026'},
    {id:'AL-02', icon:'building-2', tone:'ink', text:'Orbit Textiles Ltd. onboarded', ts:'02 Aug 2026'},
  ],

  // ---- Audit Scanning module data (merged from the standalone scanning PWA) —
  // one auditor per location is the "Lead" (loc.leadAuditorId, set by the CA);
  // everyone else assigned there is an "Executive" by default. Every scan
  // record below carries auditLocationId so multiple audits' scan data never
  // mixes even though they share these arrays. See CLAUDE.md §22.
  scanInventory: [],   // {id, auditLocationId, location(bin code), description, barcode, qty, expiry, mfg, brand, unit, sheetId, uploadedAt}
  scanMappings: [],    // {auditLocationId, sheetId, mapping, updatedAt}
  scanAudits: [],      // {id, auditLocationId, sessionId, location(bin), barcode, qty, goodQty, badQty, type, productId, createdAt}
  scanReco: [],        // {id, auditLocationId, location(bin), barcode, description, systemQty, auditQty, type, status, sessionId, remarks, createdAt, resolvedAt, resolution}
  scanBins: [],        // {auditLocationId, code, name, status, assignedTo, completedAt, itemCount, progress, remarks, updatedAt}
  scanSettings: [],    // {key, value, updatedAt} — global (not per-audit) prefs like theme, mirrors the standalone app's own SETTINGS store
  scanMeta: { nextId: 1 }, // autoincrement counter, mimics the standalone app's real IndexedDB autoIncrement keys

  // ---- company-initiated requests (new audit / postponement / finding dispute /
  // billing dispute) — a lightweight inbox the CA can review, kept separate from
  // the auditorId-scoped `notifications` array on purpose (see CLAUDE.md §17).
  companyRequests: [
    {id:'CR-01', companyName:'Zenith Retail Pvt. Ltd.', type:'new_audit', branchId:'B-02', branchName:'Pune Distribution Hub',
      message:'Requesting a fresh inventory audit for this branch ahead of the festive season.', status:'open', createdAt:'19 Aug 2026'},
    {id:'CR-02', companyName:'Zenith Retail Pvt. Ltd.', type:'postponement', locationId:'L-04', locationName:'Andheri East Warehouse',
      message:'A fire-safety drill is scheduled on-site next week — could the audit shift by a few days?', status:'resolved', createdAt:'10 Aug 2026'},
  ],

  settings: {
    theme: 'light', // 'light' | 'dark' | 'indigo'
    rbac: [
      {role:'Admin', users:'Full', projects:'Full', invoices:'Full', settings:'Full'},
      {role:'CA', users:'View', projects:'Create/Edit own', invoices:'View', settings:'None'},
      {role:'Auditor', users:'View self', projects:'Apply/View', invoices:'Submit own', settings:'None'},
      {role:'Company', users:'None', projects:'View own', invoices:'View own', settings:'None'},
    ],
  },
};

let _vouchCache = null;   // in-memory mirror — synchronous access via VouchDB.get()
let _vouchDBConn = null;  // open IndexedDB connection, reused across calls

function vouchOpenIDB(){
  if(_vouchDBConn) return Promise.resolve(_vouchDBConn);
  if(!window.indexedDB) return Promise.reject(new Error('IndexedDB unavailable'));
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(VOUCH_IDB_NAME, VOUCH_IDB_VERSION);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains(VOUCH_IDB_STORE)) db.createObjectStore(VOUCH_IDB_STORE);
    };
    req.onsuccess = ()=>{ _vouchDBConn = req.result; resolve(_vouchDBConn); };
    req.onerror = ()=>reject(req.error);
  });
}

function vouchIDBRead(){
  return vouchOpenIDB().then(db => new Promise((resolve, reject)=>{
    const tx = db.transaction(VOUCH_IDB_STORE, 'readonly');
    const req = tx.objectStore(VOUCH_IDB_STORE).get(VOUCH_IDB_KEY);
    req.onsuccess = ()=>resolve(req.result || null);
    req.onerror = ()=>reject(req.error);
  }));
}

function vouchIDBWrite(value){
  return vouchOpenIDB().then(db => new Promise((resolve, reject)=>{
    const tx = db.transaction(VOUCH_IDB_STORE, 'readwrite');
    tx.objectStore(VOUCH_IDB_STORE).put(value, VOUCH_IDB_KEY);
    tx.oncomplete = ()=>resolve(value);
    tx.onerror = ()=>reject(tx.error);
  }));
}

/* ---- date/format helpers shared by api.js + every CA page (defined here,
   ahead of api.js in load order, so vouchInit() below can use them too) ---- */
export function vouchToday(){
  return new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
export function vouchFormatDate(iso){
  if(!iso) return '';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso; // already display-formatted
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
export function vouchDaysUntil(iso){
  if(!iso) return null;
  const target = new Date(iso + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((target - today) / 86400000);
}

/* Recomputes a project's rollup fields from its locations, so Admin's approval
   queue/table, the Auditor home summary card, and anywhere else that reads
   project-level (rather than location-level) fields keep working unchanged.
   Called by api.js after any location/project mutation, and once over every
   project right after seeding/resetting below. */
export function vouchRecomputeProject(db, p){
  const locs = (p.locations||[]).map(id=>db.locations.find(l=>l.id===id)).filter(Boolean);
  if(!locs.length){
    p.branch = ''; p.auditType = ''; p.auditorCount = 0; p.payoutPerAuditor = 0; p.budget = 0;
    p.start = ''; p.end = ''; p.completion = 0; p.assigned = 0; p.present = 0; p.absent = 0;
    return;
  }
  p.branch = locs.length === 1 ? locs[0].name : `${locs.length} Locations`;
  p.auditType = locs.every(l=>l.auditType===locs[0].auditType) ? locs[0].auditType : 'Multiple';
  p.auditorCount = locs.reduce((s,l)=>s + (l.requirement.auditorsNeeded||0), 0);
  p.budget = locs.reduce((s,l)=>s + (l.requirement.allowance||0)*(l.requirement.auditorsNeeded||0), 0);
  p.payoutPerAuditor = p.auditorCount ? Math.round(p.budget / p.auditorCount) : 0;
  const starts = locs.map(l=>l.startDate).filter(Boolean).sort();
  const ends = locs.map(l=>l.endDate).filter(Boolean).sort();
  p.start = starts.length ? vouchFormatDate(starts[0]) : '';
  p.end = ends.length ? vouchFormatDate(ends[ends.length-1]) : '';
  const active = locs.filter(l=>['monitoring','payment','history'].includes(l.status));
  p.completion = active.length ? Math.round(active.reduce((s,l)=>s+(l.progress||0),0) / active.length) : 0;
  p.assigned = locs.reduce((s,l)=>s + (l.assignedAuditors||[]).length, 0);
  p.present = locs.reduce((s,l)=>s + (l.assignedAuditors||[]).filter(a=>(a.present||0) > (a.absent||0)).length, 0);
  p.absent = Math.max(0, p.assigned - p.present);
}
export function vouchRecomputeAllProjects(db){
  (db.projects||[]).forEach(p=>vouchRecomputeProject(db, p));
  return db;
}

export function vouchNormalizeSeed(db){
  (db.projects||[]).forEach(p=>{
    if(p.status === 'approved'){
      (p.locations||[]).forEach(id=>{
        const loc = db.locations.find(l=>l.id===id);
        if(loc && loc.published === undefined) loc.published = true;
      });
    }
  });
  (db.locations||[]).forEach(loc=>{
    if(!loc.chat) loc.chat = [];
    if(!loc.documentRequests) loc.documentRequests = [];
    if(!loc.photos) loc.photos = [];
    if(!loc.statusLog) loc.statusLog = [];
    if(!loc.sharedFiles) loc.sharedFiles = [];
    if(loc.postponed === undefined) loc.postponed = false;
    if(loc.cancelled === undefined) loc.cancelled = false;
    if(loc.cancelReason === undefined) loc.cancelReason = '';
    (loc.assignedAuditors||[]).forEach(a=>{
      if(a.leaveRequested === undefined) a.leaveRequested = false;
      if(a.leaveReason === undefined) a.leaveReason = '';
      if(a.extensionResponse === undefined) a.extensionResponse = null;
    });
  });
  if(!db.notifications) db.notifications = [];
  db.notifications.forEach(n=>{
    if(!n.recipientRole){ n.recipientRole = 'auditor'; n.recipientId = n.auditorId; }
  });
  if(!db.companyRequests) db.companyRequests = [];
  if(!db.activityLog) db.activityLog = [];
  if(!db.scanInventory) db.scanInventory = [];
  if(!db.scanMappings) db.scanMappings = [];
  if(!db.scanAudits) db.scanAudits = [];
  if(!db.scanReco) db.scanReco = [];
  if(!db.scanBins) db.scanBins = [];
  if(!db.scanSettings) db.scanSettings = [];
  if(!db.scanMeta) db.scanMeta = { nextId: 1 };
  db.companyRequests.forEach(r=>{ if(r.status===undefined) r.status = 'open'; });
  (db.locations||[]).forEach(loc=>{ if(loc.leadAuditorId === undefined) loc.leadAuditorId = null; });
  (db.locations||[]).forEach(loc=>{
    (loc.photos||[]).forEach(p=>{
      if(p.disputed === undefined) p.disputed = false;
      if(p.disputeNote === undefined) p.disputeNote = '';
      if(p.disputeStatus === undefined) p.disputeStatus = null; // null | 'pending_review' | 'reviewed'
    });
  });
  return db;
}

export function vouchInit(){
  return vouchIDBRead().then(existing => {
    if(existing){ _vouchCache = existing; return _vouchCache; }
    const seed = vouchRecomputeAllProjects(vouchNormalizeSeed(JSON.parse(JSON.stringify(VOUCH_SEED))));
    return vouchIDBWrite(seed).then(()=>{ _vouchCache = seed; return _vouchCache; });
  }).catch(err => {
    // IndexedDB unavailable (e.g. private browsing) — fall back to an
    // in-memory-only seed so the app still runs, just without persistence.
    console.warn('Vouch: IndexedDB unavailable, running with in-memory-only state.', err);
    _vouchCache = vouchRecomputeAllProjects(vouchNormalizeSeed(JSON.parse(JSON.stringify(VOUCH_SEED))));
    return _vouchCache;
  });
}

export function vouchGetDB(){
  if(!_vouchCache) console.warn('Vouch: VouchDB.get() was called before VouchDB.ready resolved.');
  return _vouchCache;
}

export function vouchSaveDB(db){
  _vouchCache = db;
  return vouchIDBWrite(db).catch(err => console.warn('Vouch: IndexedDB write failed, change kept in memory only.', err));
}

export function vouchResetDB(){
  const seed = vouchRecomputeAllProjects(vouchNormalizeSeed(JSON.parse(JSON.stringify(VOUCH_SEED))));
  return vouchIDBWrite(seed).then(()=>{ _vouchCache = seed; return _vouchCache; })
    .catch(err => { console.warn('Vouch: IndexedDB reset failed.', err); _vouchCache = seed; return _vouchCache; });
}

export const VouchDB = {
  get: vouchGetDB,
  save: vouchSaveDB,
  reset: vouchResetDB,
  ready: vouchInit(), // Promise — resolves once the in-memory mirror is loaded/seeded from IndexedDB
};
