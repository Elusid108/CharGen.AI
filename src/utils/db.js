/**
 * IndexedDB wrapper for CharGen.AI
 * Handles character storage, wardrobe, and generated content
 */

const DB_NAME = 'CharGenAI_DB'
const DB_VERSION = 1

const STORES = {
  CHARACTERS: 'characters',
  SETTINGS: 'settings',
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains(STORES.CHARACTERS)) {
        const charStore = db.createObjectStore(STORES.CHARACTERS, { keyPath: 'id' })
        charStore.createIndex('timestamp', 'timestamp', { unique: false })
        charStore.createIndex('name', 'name', { unique: false })
        charStore.createIndex('species', 'attributes.identity.species', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' })
      }
    }
  })
}

// --- Characters ---

export async function saveCharacter(character) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.CHARACTERS], 'readwrite')
    const store = tx.objectStore(STORES.CHARACTERS)
    const request = store.put(character)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getCharacter(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.CHARACTERS], 'readonly')
    const store = tx.objectStore(STORES.CHARACTERS)
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAllCharacters() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.CHARACTERS], 'readonly')
    const store = tx.objectStore(STORES.CHARACTERS)
    const index = store.index('timestamp')
    const request = index.getAll()
    request.onsuccess = () => resolve(request.result.reverse())
    request.onerror = () => reject(request.error)
  })
}

export async function deleteCharacter(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.CHARACTERS], 'readwrite')
    const store = tx.objectStore(STORES.CHARACTERS)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function deleteMultipleCharacters(ids) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.CHARACTERS], 'readwrite')
    const store = tx.objectStore(STORES.CHARACTERS)
    let remaining = ids.length
    if (remaining === 0) return resolve()

    ids.forEach(id => {
      const request = store.delete(id)
      request.onsuccess = () => {
        remaining--
        if (remaining === 0) resolve()
      }
      request.onerror = () => reject(request.error)
    })
  })
}

// --- Settings ---

export async function saveSetting(key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SETTINGS], 'readwrite')
    const store = tx.objectStore(STORES.SETTINGS)
    const request = store.put({ key, value })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getSetting(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SETTINGS], 'readonly')
    const store = tx.objectStore(STORES.SETTINGS)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result?.value ?? null)
    request.onerror = () => reject(request.error)
  })
}

// --- Utilities ---

export async function getStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentUsed: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(1) : 0,
    }
  }
  return { usage: 0, quota: 0, percentUsed: 0 }
}
