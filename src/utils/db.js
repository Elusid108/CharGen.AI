/**
 * IndexedDB wrapper for CharGen.AI
 * Handles character storage, wardrobe, generated content, and 3D model blobs
 */

import { modelBlobId, legacyModelBlobId, MODEL_FILE_KINDS } from './tripoModels'

const DB_NAME = 'CharGenAI_DB'
const DB_VERSION = 3

const STORES = {
  CHARACTERS: 'characters',
  SETTINGS: 'settings',
  MODELS: 'models',
  RIG_PROFILES: 'rigProfiles',
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

      if (!db.objectStoreNames.contains(STORES.MODELS)) {
        const modelStore = db.createObjectStore(STORES.MODELS, { keyPath: 'id' })
        modelStore.createIndex('characterId', 'characterId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.RIG_PROFILES)) {
        const rigStore = db.createObjectStore(STORES.RIG_PROFILES, { keyPath: 'id' })
        rigStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }
  })
}

function idbReq(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
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
  await deleteCharacterModels(id)
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
  for (const id of ids) {
    await deleteCharacterModels(id)
  }
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.CHARACTERS], 'readwrite')
    const store = tx.objectStore(STORES.CHARACTERS)
    let remaining = ids.length
    if (remaining === 0) return resolve()

    ids.forEach((id) => {
      const request = store.delete(id)
      request.onsuccess = () => {
        remaining--
        if (remaining === 0) resolve()
      }
      request.onerror = () => reject(request.error)
    })
  })
}

// --- 3D model blobs ---

export async function putModelBlob({ characterId, slot, outfitId, kind, blob, mime, filename, assetId }) {
  const db = await openDB()
  const record = {
    id: modelBlobId(characterId, slot, outfitId, kind, assetId),
    characterId,
    slot,
    outfitId: outfitId || null,
    kind,
    assetId: assetId || null,
    blob,
    mime: mime || blob?.type || 'application/octet-stream',
    filename: filename || kind,
    updatedAt: Date.now(),
  }
  const tx = db.transaction([STORES.MODELS], 'readwrite')
  await idbReq(tx.objectStore(STORES.MODELS).put(record))
  return record.id
}

export async function getModelBlob(characterId, slot, outfitId, kind, assetId) {
  const db = await openDB()
  const tx = db.transaction([STORES.MODELS], 'readonly')
  const store = tx.objectStore(STORES.MODELS)
  const row = await idbReq(store.get(modelBlobId(characterId, slot, outfitId, kind, assetId)))
  if (row) return row
  return idbReq(store.get(legacyModelBlobId(characterId, slot, outfitId, kind)))
}

export async function getModelBlobsForCharacter(characterId) {
  const db = await openDB()
  const tx = db.transaction([STORES.MODELS], 'readonly')
  const index = tx.objectStore(STORES.MODELS).index('characterId')
  const rows = await idbReq(index.getAll(characterId))
  return Array.isArray(rows) ? rows : []
}

export async function deleteModelBlob(characterId, slot, outfitId, kind, assetId) {
  const db = await openDB()
  const tx = db.transaction([STORES.MODELS], 'readwrite')
  const store = tx.objectStore(STORES.MODELS)
  await idbReq(store.delete(modelBlobId(characterId, slot, outfitId, kind, assetId)))
  await idbReq(store.delete(legacyModelBlobId(characterId, slot, outfitId, kind)))
}

export async function deleteAssetModels(characterId, slot, outfitId, assetId) {
  if (!characterId || !assetId) return
  await Promise.all(MODEL_FILE_KINDS.map((kind) => deleteModelBlob(characterId, slot, outfitId, kind, assetId)))
}

export async function deleteSlotModels(characterId, slot, outfitId) {
  if (!characterId) return
  const rows = await getModelBlobsForCharacter(characterId)
  const prefix = `${characterId}::${slot === 'outfit' ? `outfit_${outfitId}` : slot}::`
  const matches = rows.filter((row) => String(row.id || '').startsWith(prefix))
  if (!matches.length) return
  const db = await openDB()
  const tx = db.transaction([STORES.MODELS], 'readwrite')
  const store = tx.objectStore(STORES.MODELS)
  await Promise.all(matches.map((row) => idbReq(store.delete(row.id))))
}

export async function deleteCharacterModels(characterId) {
  if (!characterId) return
  const rows = await getModelBlobsForCharacter(characterId)
  if (!rows.length) return
  const db = await openDB()
  const tx = db.transaction([STORES.MODELS], 'readwrite')
  const store = tx.objectStore(STORES.MODELS)
  await Promise.all(rows.map((row) => idbReq(store.delete(row.id))))
}

// --- Rig profiles (user-authored animatronic builds) ---

export async function saveRigProfile(profile) {
  const db = await openDB()
  const record = { ...profile, updatedAt: Date.now() }
  const tx = db.transaction([STORES.RIG_PROFILES], 'readwrite')
  await idbReq(tx.objectStore(STORES.RIG_PROFILES).put(record))
  return record.id
}

export async function getRigProfile(id) {
  if (!id) return null
  const db = await openDB()
  const tx = db.transaction([STORES.RIG_PROFILES], 'readonly')
  const row = await idbReq(tx.objectStore(STORES.RIG_PROFILES).get(id))
  return row || null
}

export async function getAllRigProfiles() {
  const db = await openDB()
  const tx = db.transaction([STORES.RIG_PROFILES], 'readonly')
  const rows = await idbReq(tx.objectStore(STORES.RIG_PROFILES).index('updatedAt').getAll())
  return Array.isArray(rows) ? rows.reverse() : []
}

export async function deleteRigProfile(id) {
  const db = await openDB()
  const tx = db.transaction([STORES.RIG_PROFILES], 'readwrite')
  await idbReq(tx.objectStore(STORES.RIG_PROFILES).delete(id))
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
