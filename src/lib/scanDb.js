/* ============================================================
   VOUCH — Audit Scanning DB shim (src/lib/scanDb.js)
   ------------------------------------------------------------
   Ported from pages/auditor/scan/js/data/db.js. Backed by the
   same VouchDB blob as the rest of the app (arrays scanInventory,
   scanMappings, scanAudits, scanReco, scanBins, scanSettings,
   scanMeta), scoped to ONE audit assignment (ScanContext.locationId)
   at a time. Call setScanContext(locationId) before any other
   method runs — every scan page does this on mount.
============================================================ */
import { VouchDB } from './db.js';

export const STORES = {
  INVENTORY: 'inventory',
  MAPPINGS: 'mappings',
  AUDITS: 'audits',
  RECO: 'reco',
  LOCATIONS: 'locations', // bins/shelves within this one audit — not a Vouch "location" (audit engagement)
  SETTINGS: 'settings',
};

export const ScanContext = { locationId: null };

export function setScanContext(locationId) {
  ScanContext.locationId = locationId;
}

const SCAN_ARRAY_KEY = {
  inventory: 'scanInventory',
  mappings: 'scanMappings',
  audits: 'scanAudits',
  reco: 'scanReco',
  locations: 'scanBins',
  settings: 'scanSettings',
};
const SCOPED_STORES = new Set(['inventory', 'mappings', 'audits', 'reco', 'locations']); // everything except settings

function scanArray(storeName) {
  const db = VouchDB.get();
  const key = SCAN_ARRAY_KEY[storeName];
  if (!db[key]) db[key] = [];
  return db[key];
}

function scoped(storeName) {
  const arr = scanArray(storeName);
  return SCOPED_STORES.has(storeName) ? arr.filter((r) => r.auditLocationId === ScanContext.locationId) : arr;
}

function nextId() {
  const db = VouchDB.get();
  if (!db.scanMeta) db.scanMeta = { nextId: 1 };
  return db.scanMeta.nextId++;
}

class VouchScanDB {
  constructor() {
    this.db = true;
  }

  async init() {
    return VouchDB.ready;
  }

  async get(storeName, key) {
    const arr = scanArray(storeName);
    if (storeName === STORES.LOCATIONS) return arr.find((r) => r.auditLocationId === ScanContext.locationId && r.code === key) || undefined;
    if (storeName === STORES.MAPPINGS) return arr.find((r) => r.auditLocationId === ScanContext.locationId && r.sheetId === key) || undefined;
    if (storeName === STORES.SETTINGS) return arr.find((r) => r.key === key) || undefined;
    return arr.find((r) => r.id === key);
  }

  async getAll(storeName) {
    return scoped(storeName);
  }

  async put(storeName, data) {
    const arr = scanArray(storeName);
    if (SCOPED_STORES.has(storeName) && data.auditLocationId === undefined) data.auditLocationId = ScanContext.locationId;
    if (storeName === STORES.LOCATIONS) {
      const idx = arr.findIndex((r) => r.auditLocationId === data.auditLocationId && r.code === data.code);
      if (idx >= 0) arr[idx] = data;
      else arr.push(data);
      return VouchDB.save(VouchDB.get()).then(() => data.code);
    }
    if (storeName === STORES.MAPPINGS) {
      const idx = arr.findIndex((r) => r.auditLocationId === data.auditLocationId && r.sheetId === data.sheetId);
      if (idx >= 0) arr[idx] = data;
      else arr.push(data);
      return VouchDB.save(VouchDB.get()).then(() => data.sheetId);
    }
    if (storeName === STORES.SETTINGS) {
      const idx = arr.findIndex((r) => r.key === data.key);
      if (idx >= 0) arr[idx] = data;
      else arr.push(data);
      return VouchDB.save(VouchDB.get()).then(() => data.key);
    }
    if (data.id === undefined || data.id === null) {
      data.id = nextId();
      arr.push(data);
    } else {
      const idx = arr.findIndex((r) => r.id === data.id);
      if (idx >= 0) arr[idx] = data;
      else arr.push(data);
    }
    return VouchDB.save(VouchDB.get()).then(() => data.id);
  }

  async delete(storeName, key) {
    const arr = scanArray(storeName);
    const keyField = storeName === STORES.LOCATIONS ? 'code' : storeName === STORES.MAPPINGS ? 'sheetId' : storeName === STORES.SETTINGS ? 'key' : 'id';
    const idx = arr.findIndex((r) => r[keyField] === key && (!SCOPED_STORES.has(storeName) || r.auditLocationId === ScanContext.locationId));
    if (idx >= 0) arr.splice(idx, 1);
    return VouchDB.save(VouchDB.get()).then(() => undefined);
  }

  async clear(storeName) {
    const db = VouchDB.get();
    const key = SCAN_ARRAY_KEY[storeName];
    if (SCOPED_STORES.has(storeName)) db[key] = (db[key] || []).filter((r) => r.auditLocationId !== ScanContext.locationId);
    else db[key] = [];
    return VouchDB.save(db).then(() => undefined);
  }

  async getByIndex(storeName, indexName, value) {
    return scoped(storeName).filter((r) => r[indexName] === value);
  }

  async getSetting(key, defaultValue = null) {
    const result = await this.get(STORES.SETTINGS, key);
    return result ? result.value : defaultValue;
  }
  async setSetting(key, value) {
    return this.put(STORES.SETTINGS, { key, value, updatedAt: Date.now() });
  }

  async saveInventoryBatch(rows, sheetId, mapping) {
    const arr = scanArray(STORES.INVENTORY);
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].auditLocationId === ScanContext.locationId && arr[i].sheetId === sheetId) arr.splice(i, 1);
    }
    rows.forEach((row) => arr.push({ ...row, id: nextId(), auditLocationId: ScanContext.locationId, sheetId, uploadedAt: Date.now() }));
    await this.put(STORES.MAPPINGS, { sheetId, mapping, updatedAt: Date.now() });
    return VouchDB.save(VouchDB.get()).then(() => ({ count: rows.length }));
  }

  async getInventoryByLocation(location) {
    return this.getByIndex(STORES.INVENTORY, 'location', location);
  }
  async getInventoryByBarcode(barcode) {
    return this.getByIndex(STORES.INVENTORY, 'barcode', barcode);
  }

  async upsertLocation(code, data) {
    const existing = await this.get(STORES.LOCATIONS, code);
    const record = { code, auditLocationId: ScanContext.locationId, status: 'WAIT', assignedTo: null, completedAt: null, ...existing, ...data, updatedAt: Date.now() };
    return this.put(STORES.LOCATIONS, record);
  }

  async getLocationsByStatus(status) {
    return this.getByIndex(STORES.LOCATIONS, 'status', status);
  }

  async saveAuditEntry(entry) {
    return this.put(STORES.AUDITS, { ...entry, createdAt: Date.now() });
  }
  async getAuditBySession(sessionId) {
    return this.getByIndex(STORES.AUDITS, 'sessionId', sessionId);
  }

  async addRecoEntry(entry) {
    return this.put(STORES.RECO, { ...entry, createdAt: Date.now(), resolvedAt: null });
  }
  async getRecoByLocation(location) {
    return this.getByIndex(STORES.RECO, 'location', location);
  }

  async resolveReco(id, resolution) {
    const entry = await this.get(STORES.RECO, id);
    if (!entry) return null;
    entry.status = 'RESOLVED';
    entry.resolution = resolution;
    entry.resolvedAt = Date.now();
    return this.put(STORES.RECO, entry);
  }

  async exportAll() {
    const [inventory, mappings, audits, reco, locations, settings] = await Promise.all([
      this.getAll(STORES.INVENTORY),
      this.getAll(STORES.MAPPINGS),
      this.getAll(STORES.AUDITS),
      this.getAll(STORES.RECO),
      this.getAll(STORES.LOCATIONS),
      this.getAll(STORES.SETTINGS),
    ]);
    return { inventory, mappings, audits, reco, locations, settings, exportedAt: Date.now() };
  }

  async resetAll() {
    for (const s of [STORES.INVENTORY, STORES.MAPPINGS, STORES.AUDITS, STORES.RECO, STORES.LOCATIONS]) await this.clear(s);
  }
}

export const scanDb = new VouchScanDB();
