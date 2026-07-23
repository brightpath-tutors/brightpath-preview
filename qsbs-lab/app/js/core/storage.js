// js/core/storage.js — IndexedDB abstraction
// Never call IndexedDB directly from UI modules — always use this.

const DB_NAME = 'qsbs-lab-db';
const DB_VERSION = 1;
const STORES = [
  'companies', 'scenarios', 'valuations', 'stock_issuances',
  'evidence_checklist', 'entity_events', 'scenario_versions',
  'decision_journal', 'offline_sync_queue', 'dashboard_cache'
];

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise(function(resolve, reject) {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      const db = e.target.result;
      STORES.forEach(function(name) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          if (name === 'scenarios') {
            store.createIndex('company_id', 'company_id', { unique: false });
            store.createIndex('updated_at', 'updated_at', { unique: false });
          }
          if (['valuations','stock_issuances','evidence_checklist',
               'entity_events','scenario_versions','decision_journal'].indexOf(name) >= 0) {
            store.createIndex('scenario_id', 'scenario_id', { unique: false });
          }
        }
      });
    };
    req.onsuccess = function(e) { _db = e.target.result; resolve(_db); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

function getStore(storeName, mode) {
  return openDB().then(function(db) {
    const t = db.transaction(storeName, mode || 'readonly');
    return t.objectStore(storeName);
  });
}

function promisify(req) {
  return new Promise(function(resolve, reject) {
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

export const storage = {
  save(table, record) {
    if (!record.id) record.id = crypto.randomUUID();
    if (!record.created_at) record.created_at = new Date().toISOString();
    record.updated_at = new Date().toISOString();
    return getStore(table, 'readwrite').then(function(store) {
      return promisify(store.put(record));
    }).then(function() { return record; });
  },

  load(table, id) {
    return getStore(table).then(function(store) {
      return promisify(store.get(id));
    });
  },

  list(table, filters) {
    filters = filters || {};
    return getStore(table).then(function(store) {
      return promisify(store.getAll());
    }).then(function(all) {
      return all.filter(function(item) {
        return Object.entries(filters).every(function(entry) {
          return item[entry[0]] === entry[1];
        });
      });
    });
  },

  delete(table, id) {
    return getStore(table, 'readwrite').then(function(store) {
      return promisify(store.delete(id));
    });
  },

  exportAll() {
    const result = {};
    const promises = STORES.map(function(name) {
      return getStore(name).then(function(store) {
        return promisify(store.getAll());
      }).then(function(rows) {
        result[name] = rows;
      });
    });
    return Promise.all(promises).then(function() { return result; });
  },

  importAll(json) {
    const promises = Object.entries(json).map(function(entry) {
      const name = entry[0], records = entry[1];
      if (STORES.indexOf(name) < 0) return Promise.resolve();
      return getStore(name, 'readwrite').then(function(store) {
        return Promise.all(records.map(function(rec) { return promisify(store.put(rec)); }));
      });
    });
    return Promise.all(promises);
  },

  clearAll() {
    const promises = STORES.map(function(name) {
      return getStore(name, 'readwrite').then(function(store) {
        return promisify(store.clear());
      });
    });
    return Promise.all(promises);
  },

  init() {
    return openDB();
  }
};

export default storage;
