import { VouchDB, vouchToday, vouchFormatDate, vouchRecomputeProject } from './db.js';

/* ============================================================
   VOUCH — API layer (assets/js/api.js)
   ------------------------------------------------------------
   Every page talks to data ONLY through the VouchAPI functions
   below, never through VouchDB directly. Today they read/write
   IndexedDB via db.js (each call first chains off VouchDB.ready
   so it never races the async IndexedDB load). Later, each
   function body becomes a fetch() call to the Spring Boot service
   (e.g. GET /api/projects with an Authorization: Bearer <JWT>
   header from auth.js) — the page-level JS under pages/<role>/js/
   will not need to change. All functions already return Promises
   to match that future shape.
============================================================ */

export const VouchAPI = {
  // Internal helper — not exposed as a VouchAPI method. Appends to db.activityLog,
  // capped at the most recent 50, for the Admin dashboard's "Recent Activity" feed.
  // Every call site passes its own icon/tone (same vocabulary as vouchToast) —
  // kept as a plain push rather than a VouchAPI method since it's always called
  // alongside another mutation, never on its own.
  _logActivity(db, { icon, tone, text }){
    db.activityLog = db.activityLog || [];
    db.activityLog.unshift({ id:'AL-'+Math.floor(1000+Math.random()*9000), icon: icon||'activity', tone: tone||'ink', text, ts: vouchToday() });
    if(db.activityLog.length > 50) db.activityLog.length = 50;
  },

  // ---------- users ----------
  getUsers(){
    return VouchDB.ready.then(()=> VouchDB.get().users);
  },
  createUser(user){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const id = 'U-' + Math.floor(100 + Math.random()*900);
      const record = Object.assign({ id, status:'Pending Verification', joined: vouchToday() }, user);
      db.users.unshift(record);
      this._logActivity(db, { icon:'user-plus', tone:'brand', text:`${record.name} registered as ${record.role}` });
      return VouchDB.save(db).then(()=>record);
    });
  },
  setUserStatus(id, status){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const u = db.users.find(u=>u.id===id);
      if(u){
        u.status = status;
        this._logActivity(db, { icon: status==='Active'?'check-circle-2':'ban', tone: status==='Active'?'emerald':'red', text:`${u.name} marked ${status}` });
      }
      return VouchDB.save(db).then(()=>u);
    });
  },

  // ---------- companies ----------
  getCompanies(){
    return VouchDB.ready.then(()=> VouchDB.get().companies);
  },
  // Portal accounts are a small enough set that a plain filtered read is fine —
  // used by Admin's Companies page to show which companies can actually log in.
  getCompanyAccounts(){
    return VouchDB.ready.then(()=> VouchDB.get().accounts.filter(a=>a.role==='company'));
  },
  getCompany(id){
    return VouchDB.ready.then(()=> VouchDB.get().companies.find(c=>c.id===id) || null);
  },
  addCompany(company){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const id = 'C-' + String(db.companies.length + 1).padStart(2,'0');
      const branchId = 'B-' + Math.floor(10 + Math.random()*90);
      const record = { id, name: company.name, industry: company.industry, branches: [{
        id: branchId, name: company.address, address: company.address,
        lat: parseFloat(company.lat), lng: parseFloat(company.lng), radius: parseInt(company.radius, 10),
        contacts: []
      }]};
      db.companies.push(record);
      return VouchDB.save(db).then(()=>record);
    });
  },
  // Admin-only onboarding: creates the company record (same shape as addCompany)
  // AND a matching login account in one step, closing the gap where addCompany
  // (used by a CA setting up a project) leaves a company with no way to log in.
  registerCompanyAccount(input){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      if(db.accounts.find(a=>a.username===input.username)) return Promise.reject(new Error('That username is already registered.'));
      const id = 'C-' + String(db.companies.length + 1).padStart(2,'0');
      const branchId = 'B-' + Math.floor(10 + Math.random()*90);
      const company = { id, name: input.name, industry: input.industry, branches: [{
        id: branchId, name: input.address, address: input.address,
        lat: parseFloat(input.lat), lng: parseFloat(input.lng), radius: parseInt(input.radius, 10) || 150,
        contacts: []
      }]};
      const initials = input.name.split(' ').map(s=>s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
      const account = { username: input.username, password: input.password, role:'company', name: input.name, initials, label:'Client — Company Portal' };
      db.companies.push(company);
      db.accounts.push(account);
      this._logActivity(db, { icon:'building-2', tone:'brand', text:`${input.name} onboarded as a new company client` });
      return VouchDB.save(db).then(()=>({ company, account }));
    });
  },
  addBranch(companyId, branch){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const c = db.companies.find(c=>c.id===companyId);
      if(!c) return null;
      const id = 'B-' + Math.floor(10 + Math.random()*90);
      const record = Object.assign({ id, contacts: [] }, branch);
      c.branches.push(record);
      return VouchDB.save(db).then(()=>record);
    });
  },
  addContact(companyId, branchId, contact){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const c = db.companies.find(c=>c.id===companyId);
      const b = c && c.branches.find(b=>b.id===branchId);
      if(!b) return null;
      const id = 'CT-' + Math.floor(10 + Math.random()*90);
      const record = Object.assign({ id, photo:null }, contact);
      b.contacts.push(record);
      return VouchDB.save(db).then(()=>record);
    });
  },

  // ---------- projects ----------
  // Projects are lightweight containers; every real unit of work lives on their
  // `locations` (see below). Aggregate fields on the project (branch, auditorCount,
  // payoutPerAuditor, budget, start, end, completion, assigned, present, absent) are
  // derived from its locations by vouchRecomputeProject() so Admin/Auditor/Company
  // pages — which only read those rollups — keep working unchanged.
  getProjects(){
    return VouchDB.ready.then(()=> VouchDB.get().projects);
  },
  getProject(id){
    return VouchDB.ready.then(()=> VouchDB.get().projects.find(p=>p.id===id) || null);
  },
  getApprovedProjects(){
    return VouchDB.ready.then(()=> VouchDB.get().projects.filter(p=>p.status==='approved'));
  },
  getPendingProjects(){
    return VouchDB.ready.then(()=> VouchDB.get().projects.filter(p=>p.status==='pending'));
  },
  // Step 1 of the CA journey: basic project details only. Created as a 'draft' —
  // invisible to Admin until at least one location is added and the CA submits it.
  createProjectDraft(project){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const id = 'P-' + (2200 + db.projects.length + 10) + '-' + Math.floor(10+Math.random()*90);
      const record = Object.assign({ id, status:'draft', locations:[] }, project);
      db.projects.push(record);
      return VouchDB.save(db).then(()=>record);
    });
  },
  submitProjectForApproval(id){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const p = db.projects.find(p=>p.id===id);
      if(p && p.locations.length){ p.status = 'pending'; vouchRecomputeProject(db, p); }
      return VouchDB.save(db).then(()=>p);
    });
  },
  approveProject(id){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const p = db.projects.find(p=>p.id===id);
      if(p){
        p.status = 'approved';
        (p.locations||[]).forEach(locId=>{
          const loc = db.locations.find(l=>l.id===locId);
          if(!loc) return;
          loc.published = true;
          if(!db.marketplace.find(m=>m.id===loc.id)){
            const filled = (loc.caAuditors||[]).length + (loc.assignedAuditors||[]).length;
            db.marketplace.push({ id:loc.id, name:`${p.name} — ${loc.name}`, company:p.company, location:loc.name, payout:loc.requirement.allowance, spots:loc.requirement.auditorsNeeded, filled, type:loc.auditType, applied:false });
          }
        });
        vouchRecomputeProject(db, p);
        this._logActivity(db, { icon:'check-circle-2', tone:'emerald', text:`${p.name} approved & published` });
        db.notifications.unshift({ id:'N-'+Math.floor(1000+Math.random()*9000), recipientRole:'ca', recipientId:null, type:'approval', title:'Project approved', body:`${p.name} was approved by Admin and is now live to auditors.`, read:false, requiresAction:false, createdAt: vouchToday() });
      }
      return VouchDB.save(db).then(()=>p);
    });
  },
  rejectProject(id){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const p = db.projects.find(p=>p.id===id);
      if(p){
        p.status = 'rejected';
        this._logActivity(db, { icon:'x-circle', tone:'red', text:`${p.name} rejected` });
        db.notifications.unshift({ id:'N-'+Math.floor(1000+Math.random()*9000), recipientRole:'ca', recipientId:null, type:'rejection', title:'Project rejected', body:`${p.name} was rejected by Admin — review and resubmit.`, read:false, requiresAction:false, createdAt: vouchToday() });
      }
      return VouchDB.save(db).then(()=>p);
    });
  },

  // ---------- locations (the real unit of CA work) ----------
  getLocations(){
    return VouchDB.ready.then(()=> VouchDB.get().locations);
  },
  getLocation(id){
    return VouchDB.ready.then(()=> VouchDB.get().locations.find(l=>l.id===id) || null);
  },
  getLocationsByProject(projectId){
    return VouchDB.ready.then(()=> VouchDB.get().locations.filter(l=>l.projectId===projectId));
  },
  // status: 'fulfillment_pending' | 'fulfillment_completed' | 'monitoring' | 'payment' | 'history'
  getLocationsByStatus(status){
    return VouchDB.ready.then(()=> VouchDB.get().locations.filter(l=>l.status===status));
  },
  getLocationsForCA(){
    return VouchDB.ready.then(()=> VouchDB.get().locations);
  },
  addLocation(projectId, loc){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const p = db.projects.find(p=>p.id===projectId);
      if(!p) return null;
      const id = 'L-' + Math.floor(10 + Math.random()*90) + Math.floor(Math.random()*10);
      const record = Object.assign({
        id, projectId,
        contacts: [], caAuditors: [], applicants: [], assignedAuditors: [],
        status: 'fulfillment_pending', urgent:false, urgentNote:'',
        extended:false, expectedEnd:null, onHold:false, progress:0,
        payment: { total:0, paid:0, dueDate:null, reimbursement:0, overtime:0 },
      }, loc);
      record.payment.total = (record.requirement.allowance||0) * (record.requirement.auditorsNeeded||0);
      db.locations.push(record);
      p.locations.push(id);
      vouchRecomputeProject(db, p);
      return VouchDB.save(db).then(()=>record);
    });
  },
  updateLocation(id, patch){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===id);
      if(!loc) return null;
      Object.assign(loc, patch);
      const p = db.projects.find(p=>p.id===loc.projectId);
      if(p) vouchRecomputeProject(db, p);
      return VouchDB.save(db).then(()=>loc);
    });
  },
  addCaAuditorToLocation(locationId, auditor){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      if(!loc.caAuditors.find(a=>a.id===auditor.id)) loc.caAuditors.push(auditor);
      return VouchDB.save(db).then(()=>loc);
    });
  },
  removeCaAuditorFromLocation(locationId, auditorId){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      loc.caAuditors = loc.caAuditors.filter(a=>a.id!==auditorId);
      return VouchDB.save(db).then(()=>loc);
    });
  },
  // Fulfillment: CA selects from the applicant pool (plus auto-includes any
  // caAuditors already pinned) — moves the location to 'fulfillment_completed'.
  fulfillLocation(locationId, selectedApplicantIds){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      const chosen = loc.applicants.filter(a=>selectedApplicantIds.includes(a.id));
      const already = new Set(loc.assignedAuditors.map(a=>a.id));
      const newlyAdded = [];
      loc.caAuditors.forEach(a=>{ if(!already.has(a.id)){ loc.assignedAuditors.push({ id:a.id, name:a.name, phone:a.phone||'', present:0, absent:0, overtimeHours:0, attendance:[] }); already.add(a.id); newlyAdded.push(a); } });
      chosen.forEach(a=>{ if(!already.has(a.id)){ loc.assignedAuditors.push({ id:a.id, name:a.name, phone:a.phone||'', present:0, absent:0, overtimeHours:0, attendance:[] }); already.add(a.id); newlyAdded.push(a); } });
      loc.applicants = loc.applicants.filter(a=>!selectedApplicantIds.includes(a.id));
      loc.status = 'fulfillment_completed';
      const p = db.projects.find(p=>p.id===loc.projectId);
      if(p) vouchRecomputeProject(db, p);
      // The "audit request and initialization" handoff to the auditor: this is
      // the first real signal an auditor gets that they're on this assignment.
      newlyAdded.forEach(a=>{
        db.notifications.unshift({ id:'N-'+Math.floor(1000+Math.random()*9000), recipientRole:'auditor', recipientId:a.id, auditorId:a.id, type:'assignment', title:'You\u2019re confirmed for a new audit', body:`${loc.name} (${loc.auditType}) — starts ${vouchFormatDate(loc.startDate)}. Check Audit Activity for details.`, locationId:loc.id, read:false, requiresAction:false, createdAt: vouchToday() });
      });
      return VouchDB.save(db).then(()=>loc);
    });
  },
  requestUrgentAuditors(locationId, note){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      loc.urgent = true; loc.urgentNote = note || '';
      this._logActivity(db, { icon:'siren', tone:'red', text:`${loc.name} flagged as needing urgent staffing` });
      return VouchDB.save(db).then(()=>loc);
    });
  },
  // Urgent requests previously had nowhere to go but a stat count on the CA
  // dashboard — these two close the loop for Admin's Escalations page (Admin ==
  // "Vouch Support" in this platform's framing).
  getUrgentLocations(){
    return VouchDB.ready.then(()=> VouchDB.get().locations.filter(l=>l.urgent));
  },
  resolveUrgentRequest(locationId){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      loc.urgent = false; loc.urgentNote = '';
      this._logActivity(db, { icon:'siren', tone:'amber', text:`Urgent staffing request for ${loc.name} marked handled` });
      db.notifications.unshift({ id:'N-'+Math.floor(1000+Math.random()*9000), recipientRole:'ca', recipientId:null, type:'request', title:'Urgent staffing request handled', body:`Vouch Support has followed up on ${loc.name}'s urgent staffing request.`, locationId, read:false, requiresAction:false, createdAt: vouchToday() });
      return VouchDB.save(db).then(()=>loc);
    });
  },
  markLocationExtended(locationId, expectedEnd){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      loc.extended = true; loc.expectedEnd = expectedEnd;
      // This is the real trigger for the 'extension' notification type — every
      // assigned auditor needs to say Continue/Leave (see respondToExtension).
      (loc.assignedAuditors||[]).forEach(a=>{
        db.notifications.unshift({ id:'N-'+Math.floor(1000+Math.random()*9000), recipientRole:'auditor', recipientId:a.id, auditorId:a.id, type:'extension', title:'Audit extended — action needed', body:`${loc.name} has been extended to ${vouchFormatDate(expectedEnd)}. Let us know if you can continue.`, locationId, read:false, requiresAction:true, createdAt: vouchToday() });
      });
      return VouchDB.save(db).then(()=>loc);
    });
  },
  clearLocationExtended(locationId){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      loc.extended = false; loc.expectedEnd = null;
      return VouchDB.save(db).then(()=>loc);
    });
  },
  toggleLocationHold(locationId){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      loc.onHold = !loc.onHold;
      return VouchDB.save(db).then(()=>loc);
    });
  },
  // Marks the audit itself complete and moves the location from Monitor → Payments.
  moveLocationToPayment(locationId, dueInDays){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      loc.status = 'payment'; loc.progress = 100;
      const due = new Date(); due.setDate(due.getDate() + (dueInDays || loc.requirement.paymentAfterDays || 7));
      loc.payment.dueDate = due.toISOString().slice(0,10);
      const p = db.projects.find(p=>p.id===loc.projectId);
      if(p) vouchRecomputeProject(db, p);
      return VouchDB.save(db).then(()=>loc);
    });
  },
  // Pay in pieces or all at once. Once payment.paid >= payment.total, the location
  // moves to 'history'.
  recordLocationPayment(locationId, amount){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      loc.payment.paid = Math.min(loc.payment.total, loc.payment.paid + amount);
      if(loc.payment.paid >= loc.payment.total) loc.status = 'history';
      const p = db.projects.find(p=>p.id===loc.projectId);
      if(p) vouchRecomputeProject(db, p);
      return VouchDB.save(db).then(()=>loc);
    });
  },

  getLocationsForCompany(companyName){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const myProjectIds = new Set(db.projects.filter(p=>p.company===companyName).map(p=>p.id));
      return db.locations.filter(l=>myProjectIds.has(l.projectId) && l.published);
    });
  },
  // Same as getLocationsForCompany but also includes billed locations regardless
  // of `published` state, for the Billing page — a location that reached
  // payment/history should always be visible to the company that was billed.
  getBillableLocationsForCompany(companyName){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const myProjectIds = new Set(db.projects.filter(p=>p.company===companyName).map(p=>p.id));
      return db.locations.filter(l=>myProjectIds.has(l.projectId) && ['payment','history'].includes(l.status));
    });
  },
  getCompanyByName(name){
    return VouchDB.ready.then(()=> VouchDB.get().companies.find(c=>c.name===name) || null);
  },

  // ---------- audit guides ----------
  getAuditGuides(){
    return VouchDB.ready.then(()=> VouchDB.get().auditGuides);
  },
  addAuditGuide(name){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const id = 'AG-' + Math.floor(10 + Math.random()*90);
      const record = { id, name };
      db.auditGuides.push(record);
      return VouchDB.save(db).then(()=>record);
    });
  },

  // ---------- CA's own field-auditor roster (for "add your auditors" during setup) ----------
  getAuditorRoster(){
    return VouchDB.ready.then(()=> VouchDB.get().auditors);
  },

  // ---------- invoices ----------
  getInvoices(){
    return VouchDB.ready.then(()=> VouchDB.get().invoices);
  },
  getInvoice(id){
    return VouchDB.ready.then(()=> VouchDB.get().invoices.find(i=>i.id===id) || null);
  },
  approveInvoice(id){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const inv = db.invoices.find(i=>i.id===id);
      if(inv){
        inv.status = 'paid';
        this._logActivity(db, { icon:'indian-rupee', tone:'emerald', text:`Payout approved for ${inv.auditor || 'auditor'} · ${vouchMoney(inv.amount)}` });
        // invoices only store the auditor's name (see CLAUDE.md §18d for the
        // same name-vs-id gap elsewhere) — resolve to an id so the right
        // person's notification feed gets it, not a name-keyed guess.
        const auditor = db.auditors.find(a=>a.name===inv.auditor);
        if(auditor) db.notifications.unshift({ id:'N-'+Math.floor(1000+Math.random()*9000), recipientRole:'auditor', recipientId:auditor.id, auditorId:auditor.id, type:'payment', title:'Payout approved', body:`Your invoice ${inv.id} for ${vouchMoney(inv.amount)} (${inv.project}) has been paid.`, read:false, requiresAction:false, createdAt: vouchToday() });
      }
      return VouchDB.save(db).then(()=>inv); // caller simulates the email dispatch toast
    });
  },
  // Alternative to approving — a suspicious or disputed amount gets flagged with
  // a note instead of silently sitting in 'pending'.
  flagInvoice(id, note){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const inv = db.invoices.find(i=>i.id===id);
      if(inv){
        inv.status = 'flagged'; inv.flagNote = note || '';
        this._logActivity(db, { icon:'flag', tone:'red', text:`Invoice for ${inv.auditor || 'auditor'} flagged for review` });
        const auditor = db.auditors.find(a=>a.name===inv.auditor);
        if(auditor) db.notifications.unshift({ id:'N-'+Math.floor(1000+Math.random()*9000), recipientRole:'auditor', recipientId:auditor.id, auditorId:auditor.id, type:'rejection', title:'Invoice flagged for review', body:`Your invoice ${inv.id} for ${vouchMoney(inv.amount)} was flagged: ${note||'no note given'}.`, read:false, requiresAction:false, createdAt: vouchToday() });
      }
      return VouchDB.save(db).then(()=>inv);
    });
  },

  // ---------- marketplace ----------
  getMarketplace(){
    return VouchDB.ready.then(()=> VouchDB.get().marketplace);
  },
  applyToProject(id){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const m = db.marketplace.find(m=>m.id===id);
      if(m && !m.applied){
        m.applied = true; m.filled += 1;
        // Marketplace listings created from a CA location share the same id —
        // feed the application back into that location's applicant pool.
        const loc = db.locations.find(l=>l.id===id);
        if(loc && !loc.applicants.find(a=>a.id==='AU-SELF') && !loc.assignedAuditors.find(a=>a.id==='AU-SELF')){
          loc.applicants.push({ id:'AU-SELF', name:'Rohan Kulkarni', rating:4.8, experience:'6 yrs · Inventory & Statutory', appliedOn:vouchToday() });
        }
      }
      return VouchDB.save(db).then(()=>m);
    });
  },

  // ---------- attendance ----------
  getAttendance(){
    return VouchDB.ready.then(()=> VouchDB.get().attendance);
  },
  getAttendanceForAuditor(auditorId){
    return VouchDB.ready.then(()=> VouchDB.get().attendance.filter(a=>a.auditorId===auditorId));
  },
  addAttendance(entry){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      db.attendance.unshift(entry);
      return VouchDB.save(db).then(()=>entry);
    });
  },

  // ---------- auditor profile ----------
  getAuditorProfile(auditorId){
    return VouchDB.ready.then(()=> VouchDB.get().auditors.find(a=>a.id===auditorId) || null);
  },
  // db.users (Admin's roster) and db.auditors (ratings/badges/flags) are linked
  // only by matching name, not a shared id — see CLAUDE.md §18d. Used by Admin's
  // Users page to resolve which auditors[] record a rating action should hit.
  getAuditorByName(name){
    return VouchDB.ready.then(()=> VouchDB.get().auditors.find(a=>a.name===name) || null);
  },

  // The canonical audit-type set — same list used in the Add Location form's
  // Audit Type dropdown — used as the fixed axis set for the affinity radar so
  // every auditor's chart has the same shape and is comparable at a glance.
  AUDIT_TYPES: ['Statutory Audit','Inventory Audit','Tax Audit','Cash Audit','Asset Audit'],

  // Real per-audit-type counts derived from location history (caAuditors +
  // assignedAuditors, matched by id — not name, unlike §18d's users/auditors
  // link, because these arrays already carry the auditor's real id). Powers the
  // Auditor Profile Card's radar chart and testimonial numbers — nothing here
  // is a separately-tracked/invented stat, it's all computed from actual audits.
  getAuditorStats(auditorId){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const completed = db.locations.filter(l=>{
        if(!['payment','history'].includes(l.status)) return false;
        return (l.caAuditors||[]).some(a=>a.id===auditorId) || (l.assignedAuditors||[]).some(a=>a.id===auditorId);
      });
      const byType = {};
      this.AUDIT_TYPES.forEach(t=>byType[t]=0);
      completed.forEach(l=>{ if(byType[l.auditType] !== undefined) byType[l.auditType]++; else byType[l.auditType] = (byType[l.auditType]||0) + 1; });
      const typesDone = Object.values(byType).filter(v=>v>0).length;
      return { auditsDone: completed.length, typesDone, byType, completedLocations: completed };
    });
  },

  // ---------- audit lead / executive assignment ----------
  // One auditor per location is the "Lead" (set by the CA, defaults to nobody
  // until chosen); every other confirmed auditor on that location is an
  // "Executive" by default. This is per-assignment, not a global account role
  // — the same person can be Lead on one audit and Executive on another.
  getLeadAuditor(locationId){
    return VouchDB.ready.then(()=>{
      const loc = VouchDB.get().locations.find(l=>l.id===locationId);
      return loc ? loc.leadAuditorId : null;
    });
  },
  isAuditLead(locationId, auditorId){
    return this.getLeadAuditor(locationId).then(leadId=> !!leadId && leadId===auditorId);
  },
  setLeadAuditor(locationId, auditorId){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      const person = [...(loc.caAuditors||[]), ...(loc.assignedAuditors||[])].find(a=>a.id===auditorId);
      if(!person) return null; // can only promote someone actually confirmed on this location
      loc.leadAuditorId = auditorId;
      this._logActivity(db, { icon:'crown', tone:'brand', text:`${person.name} set as Audit Lead for ${loc.name}` });
      db.notifications.unshift({ id:'N-'+Math.floor(1000+Math.random()*9000), recipientRole:'auditor', recipientId:auditorId, auditorId, type:'lead', title:'You\u2019re the Audit Lead', body:`You've been made Audit Lead for ${loc.name} — you now have access to upload, the full scanning workspace, and reconciliation.`, locationId, read:false, requiresAction:false, createdAt: vouchToday() });
      return VouchDB.save(db).then(()=>loc);
    });
  },
  // Lightweight read for the Audit Activity tab card — how far the Audit
  // Scanning module has gotten for this assignment. The scanning module owns
  // its own detailed data (scanBins/scanInventory/scanReco); this is just a
  // summary so the main assignment page doesn't need to know its internals.
  getScanSummary(locationId){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const bins = (db.scanBins||[]).filter(b=>b.auditLocationId===locationId);
      const items = (db.scanInventory||[]).filter(i=>i.auditLocationId===locationId);
      const reco = (db.scanReco||[]).filter(r=>r.auditLocationId===locationId);
      return {
        binsTotal: bins.length, binsDone: bins.filter(b=>b.status==='PASS'||b.status==='FAIL').length,
        items: items.length, pendingReco: reco.filter(r=>r.status==='WAIT').length,
        started: bins.length > 0 || items.length > 0,
      };
    });
  },

  // ---------- auditor assignments (locations where this auditor is confirmed / applied) ----------
  // "Confirmed" = added directly by the CA (caAuditors) or selected during fulfillment
  // (assignedAuditors) — both mean the auditor has a locked-in seat.
  getAssignmentsForAuditor(auditorId){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      return db.locations.filter(l=>
        (l.caAuditors||[]).some(a=>a.id===auditorId) || (l.assignedAuditors||[]).some(a=>a.id===auditorId)
      );
    });
  },
  getApplicationsForAuditor(auditorId){
    return VouchDB.ready.then(()=> VouchDB.get().locations.filter(l=>(l.applicants||[]).some(a=>a.id===auditorId)));
  },
  // Prevents applying to a listing whose location dates overlap an already-confirmed
  // assignment — mirrors "platform takes care not to show audits in the same date
  // range as those dates are reserved for another audit" from the journey doc.
  hasDateConflict(auditorId, startDate, endDate){
    return this.getAssignmentsForAuditor(auditorId).then(assignments=>{
      const s1 = new Date(startDate), e1 = new Date(endDate);
      return assignments.some(l=>{
        const s2 = new Date(l.startDate), e2 = new Date(l.endDate);
        return s1 <= e2 && s2 <= e1;
      });
    });
  },

  // ---------- notifications ----------
  // Generalized across all four roles. 'auditor' and 'company' are scoped by
  // recipientId (auditorId / company name); 'ca' and 'admin' are single-tenant
  // in this platform (no caId/adminId anywhere), so recipientId stays null and
  // every session of that role sees the same feed.
  getNotifications(role, recipientId){
    return VouchDB.ready.then(()=>{
      const all = VouchDB.get().notifications;
      const list = all.filter(n=>{
        if(n.recipientRole !== role) return false;
        if(role === 'ca' || role === 'admin') return true;
        return n.recipientId === recipientId;
      });
      return list.sort((a,b)=> (a.read===b.read?0:a.read?1:-1));
    });
  },
  markNotificationRead(id){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const n = db.notifications.find(n=>n.id===id);
      if(n) n.read = true;
      return VouchDB.save(db).then(()=>n);
    });
  },
  pushNotification(notif){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const id = 'N-' + Math.floor(1000 + Math.random()*9000);
      const record = Object.assign({ id, read:false, createdAt: vouchToday() }, notif);
      if(record.recipientRole === 'auditor' && !record.auditorId) record.auditorId = record.recipientId; // back-compat field some UI still reads
      db.notifications.unshift(record);
      return VouchDB.save(db).then(()=>record);
    });
  },

  // ---------- odds: extension response, leave/dropout, ratings ----------
  // Odd #1 — audit extended: auditor chooses to continue or leave.
  respondToExtension(locationId, auditorId, response){ // response: 'continue' | 'leaving'
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      const a = loc.assignedAuditors.find(a=>a.id===auditorId);
      if(a) a.extensionResponse = response;
      if(response === 'leaving' && a){
        loc.assignedAuditors = loc.assignedAuditors.filter(x=>x.id!==auditorId);
      }
      return VouchDB.save(db).then(()=>loc);
    });
  },
  // Odd #3 — auditor can't continue (sick leave etc). Flags for CA review rather
  // than removing immediately, since the CA needs to arrange a replacement first.
  requestLeave(locationId, auditorId, reason){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      const a = loc.assignedAuditors.find(a=>a.id===auditorId);
      if(a){ a.leaveRequested = true; a.leaveReason = reason; }
      return VouchDB.save(db).then(()=>loc);
    });
  },
  // Odd #2 — CA reduces the team for the remaining (extended) period.
  removeAuditorFromLocation(locationId, auditorId){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      loc.assignedAuditors = loc.assignedAuditors.filter(a=>a.id!==auditorId);
      return VouchDB.save(db).then(()=>loc);
    });
  },
  // Odd #4 — CA cancels or postpones the audit; auditors are notified.
  setLocationPostponed(locationId, postponed, reason){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      loc.postponed = postponed; loc.cancelReason = reason || '';
      return VouchDB.save(db).then(()=>loc);
    });
  },
  cancelLocation(locationId, reason){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      loc.cancelled = true; loc.cancelReason = reason || '';
      return VouchDB.save(db).then(()=>loc);
    });
  },
  // Odd #5 — negative rating on false activity (e.g. a flagged/fabricated status update).
  applyRatingChange(auditorId, delta, note){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const a = db.auditors.find(a=>a.id===auditorId);
      if(!a) return null;
      a.rating = Math.max(1, Math.min(5, Math.round((a.rating + delta) * 10) / 10));
      a.flags = a.flags || [];
      if(note) a.flags.unshift({ date: vouchToday(), note, delta });
      this._logActivity(db, { icon: delta<0?'flag':'star', tone: delta<0?'red':'emerald', text:`${a.name}'s rating ${delta<0?'lowered':'raised'} to ${a.rating}${note ? ' — ' + note : ''}` });
      db.notifications.unshift({ id:'N-'+Math.floor(1000+Math.random()*9000), recipientRole:'auditor', recipientId:a.id, auditorId:a.id, type:'rating', title: delta<0 ? 'Rating adjusted down' : 'Rating adjusted up', body:`Your rating is now ${a.rating}.${note ? ' Note: ' + note : ''}`, read:false, requiresAction:false, createdAt: vouchToday() });
      return VouchDB.save(db).then(()=>a);
    });
  },

  // ---------- geo-selfie check-in (primary flow) ----------
  // Auto-detects today's scheduled audit for this auditor, validates distance,
  // and logs a watermarked-selfie attendance record against both the global
  // attendance ledger and the location's own assignedAuditors attendance list.
  getTodaysAssignmentForAuditor(auditorId){
    return this.getAssignmentsForAuditor(auditorId).then(locs=>{
      const today = new Date(); today.setHours(0,0,0,0);
      return locs.find(l=>{
        if(l.status !== 'monitoring' && l.status !== 'fulfillment_completed') return false;
        const s = new Date(l.startDate), e = new Date(l.expectedEnd || l.endDate);
        return today >= s && today <= e;
      }) || null;
    });
  },
  performGeoCheckIn({ auditorId, auditorName, locationId, distance, selfieDataUrl, lat, lng }){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      const now = new Date();
      const hour = now.getHours() + now.getMinutes()/60;
      const status = distance > 300 ? 'Flagged · Out of Range' : hour > 10 ? 'Late' : 'Verified';
      const entry = {
        id: 'ATT-' + Math.floor(1000+Math.random()*9000), auditorId, locationId,
        date: vouchToday(), branch: loc ? loc.name : 'Unknown Location', status,
        time: now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}), distance,
        selfie: selfieDataUrl || null, lat, lng,
      };
      db.attendance.unshift(entry);
      if(loc){
        let a = loc.assignedAuditors.find(a=>a.id===auditorId);
        if(!a){ a = { id:auditorId, name:auditorName, phone:'', present:0, absent:0, overtimeHours:0, attendance:[], leaveRequested:false, leaveReason:'', extensionResponse:null }; loc.assignedAuditors.push(a); }
        a.attendance = a.attendance || [];
        a.attendance.unshift({ date: entry.date, status: entry.status, time: entry.time, checkIn: entry.time, checkOut:null });
        if(status !== 'Flagged · Out of Range') a.present = (a.present||0) + 1; else a.absent = (a.absent||0) + 1;
        const p = db.projects.find(p=>p.id===loc.projectId);
        if(p) vouchRecomputeProject(db, p);
      }
      return VouchDB.save(db).then(()=>entry);
    });
  },

  // ---------- audit activity: chat, document requests, photos, status log, file sharing ----------
  addChatMessage(locationId, message){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      const record = Object.assign({ id:'MSG-'+Math.floor(1000+Math.random()*9000), ts: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) }, message);
      loc.chat.push(record);
      return VouchDB.save(db).then(()=>record);
    });
  },
  addDocumentRequest(locationId, doc){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      const record = Object.assign({ id:'DOC-'+Math.floor(1000+Math.random()*9000), status:'pending' }, doc);
      loc.documentRequests.push(record);
      return VouchDB.save(db).then(()=>record);
    });
  },
  updateDocumentRequestStatus(locationId, docId, status){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      const doc = loc.documentRequests.find(d=>d.id===docId);
      if(doc) doc.status = status;
      return VouchDB.save(db).then(()=>doc);
    });
  },
  addPhoto(locationId, photo){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      const record = Object.assign({ id:'PH-'+Math.floor(1000+Math.random()*9000), ts: vouchToday() }, photo);
      loc.photos.unshift(record);
      return VouchDB.save(db).then(()=>record);
    });
  },
  // Company disputes a finding (photo proof) rather than being able to edit/delete
  // it outright — flags it and routes a review request to the CA. See odd #1.
  disputeFinding(locationId, photoId, note){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      const photo = loc && loc.photos.find(p=>p.id===photoId);
      if(!photo) return null;
      photo.disputed = true; photo.disputeNote = note || ''; photo.disputeStatus = 'pending_review';
      const project = db.projects.find(p=>p.id===loc.projectId);
      const record = { id:'CR-'+Math.floor(1000+Math.random()*9000), companyName: project ? project.company : '', type:'dispute',
        locationId, locationName: loc.name, photoId, message: note || 'Disputed a logged finding.', status:'open', createdAt: vouchToday() };
      db.companyRequests.unshift(record);
      return VouchDB.save(db).then(()=>photo);
    });
  },
  addStatusUpdate(locationId, update){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      const record = Object.assign({ id:'SU-'+Math.floor(1000+Math.random()*9000), date: vouchToday() }, update);
      loc.statusLog.unshift(record);
      return VouchDB.save(db).then(()=>record);
    });
  },
  addSharedFile(locationId, file){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      const record = Object.assign({ id:'FS-'+Math.floor(1000+Math.random()*9000), ts: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) }, file);
      loc.sharedFiles.unshift(record);
      return VouchDB.save(db).then(()=>record);
    });
  },

  submitSignOff(locationId, auditorId){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      const a = loc.assignedAuditors.find(a=>a.id===auditorId);
      if(a) a.signedOff = true;
      return VouchDB.save(db).then(()=>loc);
    });
  },
  // Locations where this auditor has a confirmed seat AND the location has moved
  // to payment/history — i.e. the audit itself is done and money is (or was) owed.
  getReceiptsForAuditor(auditorId){
    return this.getAssignmentsForAuditor(auditorId).then(locs=>{
      return locs.filter(l=>l.status==='payment' || l.status==='history').map(l=>{
        const a = l.assignedAuditors.find(a=>a.id===auditorId) || l.caAuditors.find(a=>a.id===auditorId) || {};
        const overtimeAmount = (a.overtimeHours||0) * 300;
        const amount = (l.requirement.allowance||0) + overtimeAmount;
        return {
          locationId: l.id, name: l.name, address: l.address, auditType: l.auditType,
          amount, overtimeAmount, dueDate: l.payment.dueDate, status: l.status,
          paidInFull: l.status === 'history',
        };
      });
    });
  },

  // Full, itemized invoice for one auditor's work on one location — same
  // philosophy as the Auditor Profile Card (§20): every figure is derived from
  // real records (this location's attendance log, requirement, and payment
  // fields), nothing invented for display purposes. Reimbursement is tracked at
  // the location level, not per-auditor, so it's split evenly across the
  // auditors assigned there and labeled as a shared amount rather than implying
  // it was individually itemized.
  getInvoiceDetail(locationId, auditorId){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const loc = db.locations.find(l=>l.id===locationId);
      if(!loc) return null;
      const team = [...(loc.assignedAuditors||[]), ...(loc.caAuditors||[])];
      const a = team.find(a=>a.id===auditorId);
      if(!a) return null;
      const project = db.projects.find(p=>p.id===loc.projectId);
      const OVERTIME_RATE = 300; // ₹/hour — same rate used throughout (getReceiptsForAuditor, payment-detail.js)
      const baseAllowance = loc.requirement.allowance || 0;
      const overtimeAmount = (a.overtimeHours||0) * OVERTIME_RATE;
      const teamSize = team.length || 1;
      const reimbursementShare = Math.round((loc.payment.reimbursement||0) / teamSize);
      const total = baseAllowance + overtimeAmount + reimbursementShare;
      return {
        invoiceNo: `INV-${loc.id}-${auditorId}`,
        issuedOn: vouchToday(),
        auditor: { id: a.id, name: a.name, phone: a.phone||'' },
        company: project ? project.company : '',
        location: { id: loc.id, name: loc.name, address: loc.address, auditType: loc.auditType, startDate: loc.startDate, endDate: loc.endDate, timing: loc.timing },
        attendance: { present: a.present||0, absent: a.absent||0, overtimeHours: a.overtimeHours||0, log: a.attendance||[] },
        payment: {
          baseAllowance, overtimeHours: a.overtimeHours||0, overtimeRate: OVERTIME_RATE, overtimeAmount,
          reimbursementShare, reimbursementTotal: loc.payment.reimbursement||0, teamSize,
          total, dueDate: loc.payment.dueDate, status: loc.status, paidInFull: loc.status==='history',
        },
      };
    });
  },

  // ---------- company progress ----------
  getCompanyProgress(){
    return VouchDB.ready.then(()=> VouchDB.get().companyProgress);
  },
  addUploadedFile(name){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      db.companyProgress.uploadedFiles.push(name);
      return VouchDB.save(db).then(()=>name);
    });
  },

  // ---------- company-initiated requests (new audit / postponement / dispute / billing) ----------
  // Kept as a lightweight, generic inbox rather than extending the auditorId-scoped
  // `notifications` array — see CLAUDE.md §17 for why. `type` is one of:
  // 'new_audit' | 'postponement' | 'dispute' | 'billing_dispute'.
  getCompanyRequests(companyName){
    return VouchDB.ready.then(()=> VouchDB.get().companyRequests.filter(r=>r.companyName===companyName));
  },
  getAllCompanyRequests(){
    return VouchDB.ready.then(()=> VouchDB.get().companyRequests);
  },
  // ---------- platform activity feed (Admin Control Center) ----------
  getActivityLog(){
    return VouchDB.ready.then(()=> VouchDB.get().activityLog);
  },
  createCompanyRequest(req){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const record = Object.assign({ id:'CR-'+Math.floor(1000+Math.random()*9000), status:'open', createdAt: vouchToday() }, req);
      db.companyRequests.unshift(record);
      return VouchDB.save(db).then(()=>record);
    });
  },
  resolveCompanyRequest(id){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      const r = db.companyRequests.find(r=>r.id===id);
      if(r){
        r.status = 'resolved';
        const REQUEST_LABEL = { new_audit:'audit request', postponement:'postponement request', dispute:'disputed finding', billing_dispute:'billing dispute' };
        db.notifications.unshift({ id:'N-'+Math.floor(1000+Math.random()*9000), recipientRole:'company', recipientId:r.companyName, type:'request', title:'Your request was reviewed', body:`Your ${REQUEST_LABEL[r.type]||'request'}${r.locationName ? ' for ' + r.locationName : ''}${r.branchName ? ' for ' + r.branchName : ''} has been reviewed.`, locationId:r.locationId||null, read:false, requiresAction:false, createdAt: vouchToday() });
      }
      return VouchDB.save(db).then(()=>r);
    });
  },

  // ---------- settings (theme, RBAC table) ----------
  getSettings(){
    return VouchDB.ready.then(()=> VouchDB.get().settings);
  },
  setTheme(theme){
    return VouchDB.ready.then(()=>{
      const db = VouchDB.get();
      db.settings.theme = theme;
      return VouchDB.save(db).then(()=>theme);
    });
  },
};
