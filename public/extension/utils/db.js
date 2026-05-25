// CleanNews Vault v2.0 - IndexedDB Wrapper
// Singleton database layer using native IndexedDB API

const CleanNewsDB = (() => {
  const DB_NAME = 'cleannews_vault_db';
  const DB_VERSION = 1;

  let _db = null;
  let _initPromise = null;

  // ── Private helpers ──────────────────────────────────────────────

  function _open() {
    return new Promise((resolve, reject) => {
      if (_db) {
        resolve(_db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Articles store
        if (!db.objectStoreNames.contains('articles')) {
          const articleStore = db.createObjectStore('articles', { keyPath: 'id' });
          articleStore.createIndex('sourceUrl', 'sourceUrl', { unique: false });
          articleStore.createIndex('createdAt', 'createdAt', { unique: false });
          articleStore.createIndex('favorite', 'favorite', { unique: false });
          articleStore.createIndex('readProgress', 'readProgress', { unique: false });
        }

        // Collections store
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', { keyPath: 'id' });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        _db = event.target.result;
        resolve(_db);
      };

      request.onerror = (event) => {
        reject(new Error(`Failed to open database: ${event.target.error}`));
      };
    });
  }

  function _getStore(storeName, mode = 'readonly') {
    return _open().then((db) => {
      const tx = db.transaction(storeName, mode);
      return tx.objectStore(storeName);
    });
  }

  function _requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    /**
     * Initialize the database. Returns the open DB instance.
     * Safe to call multiple times — subsequent calls return the same promise.
     */
    init() {
      if (!_initPromise) {
        _initPromise = _open();
      }
      return _initPromise;
    },

    /**
     * Add a new item to a store.
     * @param {string} store  - Object store name ('articles', 'collections', 'settings')
     * @param {object} item  - The item to add
     * @returns {Promise<object>} The added item (with generated key if auto)
     */
    add(store, item) {
      return _getStore(store, 'readwrite')
        .then((os) => _requestToPromise(os.add(item)));
    },

    /**
     * Get a single item by key.
     * @param {string} store  - Object store name
     * @param {string|number} id  - Primary key value
     * @returns {Promise<object|null>}
     */
    get(store, id) {
      return _getStore(store)
        .then((os) => _requestToPromise(os.get(id)));
    },

    /**
     * Get all items from a store.
     * @param {string} store  - Object store name
     * @returns {Promise<object[]>}
     */
    getAll(store) {
      return _getStore(store)
        .then((os) => _requestToPromise(os.getAll()));
    },

    /**
     * Put (insert or update) an item.
     * @param {string} store  - Object store name
     * @param {object} item  - The item to put
     * @returns {Promise<object>} The key of the stored item
     */
    put(store, item) {
      return _getStore(store, 'readwrite')
        .then((os) => _requestToPromise(os.put(item)));
    },

    /**
     * Delete an item by key.
     * @param {string} store  - Object store name
     * @param {string|number} id  - Primary key value
     * @returns {Promise<undefined>}
     */
    delete(store, id) {
      return _getStore(store, 'readwrite')
        .then((os) => _requestToPromise(os.delete(id)));
    },

    /**
     * Clear all items from a store.
     * @param {string} store  - Object store name
     * @returns {Promise<undefined>}
     */
    clear(store) {
      return _getStore(store, 'readwrite')
        .then((os) => _requestToPromise(os.clear()));
    },

    /**
     * Count items in a store.
     * @param {string} store  - Object store name
     * @returns {Promise<number>}
     */
    count(store) {
      return _getStore(store)
        .then((os) => _requestToPromise(os.count()));
    },

    /**
     * Get items by an index value.
     * @param {string} store       - Object store name
     * @param {string} indexName   - Name of the index
     * @param {*}      value       - Value to look up
     * @returns {Promise<object[]>}
     */
    getByIndex(store, indexName, value) {
      return _getStore(store)
        .then((os) => {
          const index = os.index(indexName);
          return _requestToPromise(index.getAll(value));
        });
    },

    /**
     * Clear all object stores.
     * @returns {Promise<undefined>}
     */
    clearAll() {
      return _open().then((db) => {
        const storeNames = Array.from(db.objectStoreNames);
        const tx = db.transaction(storeNames, 'readwrite');
        storeNames.forEach((name) => {
          tx.objectStore(name).clear();
        });
        return new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      });
    }
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.CleanNewsDB = CleanNewsDB;
}
