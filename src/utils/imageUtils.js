/**
 * Image utility functions for download, compression, and conversion
 */

export function downloadImage(base64Data, filename = 'character.png') {
  const link = document.createElement('a')
  link.href = base64Data.startsWith('data:') ? base64Data : base64ToDataUrl(base64Data)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // Strip the data URL prefix to get raw base64
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Strip a data-URL prefix if present; return raw base64. */
export function stripBase64Prefix(base64) {
  const s = String(base64 ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:')) {
    const comma = s.indexOf(',')
    return comma === -1 ? '' : s.slice(comma + 1).replace(/\s/g, '')
  }
  return s.replace(/\s/g, '')
}

/**
 * Infer mime from a data URL or raw base64 magic bytes.
 * @param {string} base64
 * @returns {string}
 */
export function inferImageMime(base64) {
  const s = String(base64 ?? '').trim()
  if (!s) return 'image/png'
  if (s.startsWith('data:')) {
    const comma = s.indexOf(',')
    const meta = comma === -1 ? s.slice(5) : s.slice(5, comma)
    const mime = meta.split(';')[0]?.trim()
    if (mime) return mime
  }
  const raw = stripBase64Prefix(s)
  if (raw.startsWith('/9j/')) return 'image/jpeg'
  if (raw.startsWith('iVBOR')) return 'image/png'
  if (raw.startsWith('R0lGOD')) return 'image/gif'
  if (raw.startsWith('UklGR')) return 'image/webp'
  return 'image/png'
}

export function extensionForImageMime(mime) {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'png'
}

export function base64ToDataUrl(base64, mimeType) {
  if (!base64) return ''
  if (base64.startsWith('data:')) return base64
  return `data:${mimeType || inferImageMime(base64)};base64,${base64}`
}

/** Tailwind aspect class matching Gemini/Imagen `imageConfig.aspectRatio`. */
export function aspectClassForRatio(ratio) {
  switch (String(ratio || '')) {
    case '16:9':
      return 'aspect-video'
    case '1:1':
      return 'aspect-square'
    case '4:3':
      return 'aspect-[4/3]'
    case '3:4':
    default:
      return 'aspect-[3/4]'
  }
}

/**
 * Downscale and JPEG-encode for IndexedDB. Skips re-encode when already JPEG under maxEdge.
 * @param {string} base64 raw base64 or data URL
 * @param {{ maxEdge?: number, quality?: number }} [options]
 * @returns {Promise<string>} raw JPEG (or original) base64 without data-URL prefix
 */
export async function compressImageBase64(base64, options = {}) {
  const { maxEdge = 1536, quality = 0.85 } = options
  const input = String(base64 ?? '').trim()
  if (!input) return input

  const mime = inferImageMime(input)
  const rawIn = stripBase64Prefix(input)
  const dataUrl = base64ToDataUrl(input, mime)

  try {
    const img = await loadHtmlImage(dataUrl)
    const srcW = img.naturalWidth || img.width
    const srcH = img.naturalHeight || img.height
    if (!srcW || !srcH) return rawIn

    const edge = Math.max(srcW, srcH)
    const needsResize = edge > maxEdge
    if (mime === 'image/jpeg' && !needsResize) {
      return rawIn
    }

    let width = srcW
    let height = srcH
    if (needsResize) {
      const scale = maxEdge / edge
      width = Math.max(1, Math.round(srcW * scale))
      height = Math.max(1, Math.round(srcH * scale))
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return rawIn
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    const out = canvas.toDataURL('image/jpeg', quality)
    return stripBase64Prefix(out) || rawIn
  } catch {
    return rawIn
  }
}

/**
 * Compress generatedImages + wardrobe.image on a save payload.
 * @param {Record<string, unknown>} data
 */
export async function compressSaveAssets(data) {
  if (!data || typeof data !== 'object') return data
  const images = { ...(data.generatedImages || {}) }
  for (const [key, value] of Object.entries(images)) {
    if (value) images[key] = await compressImageBase64(value)
  }
  const wardrobe = await Promise.all(
    (Array.isArray(data.wardrobe) ? data.wardrobe : []).map(async (outfit) => {
      if (!outfit?.image) return outfit
      return { ...outfit, image: await compressImageBase64(outfit.image) }
    })
  )
  let chat = data.chat
  if (chat && typeof chat === 'object') {
    const ui = Array.isArray(chat.ui)
      ? await Promise.all(
          chat.ui.map(async (msg) => {
            if (!msg?.image) return msg
            return { ...msg, image: await compressImageBase64(msg.image) }
          }),
        )
      : chat.ui
    const photos = Array.isArray(chat.photos)
      ? await Promise.all(
          chat.photos.map(async (photo) => {
            if (!photo || typeof photo !== 'object') return photo
            const image = photo.image ? await compressImageBase64(photo.image) : photo.image
            const thumb = photo.thumb
              ? await compressImageBase64(photo.thumb, { maxEdge: 256, quality: 0.7 })
              : photo.thumb
            return { ...photo, image, thumb }
          }),
        )
      : chat.photos
    chat = { ...chat, ui, photos }
  }
  return { ...data, generatedImages: images, wardrobe, ...(chat ? { chat } : {}) }
}

function loadHtmlImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to decode image for compression'))
    img.src = src
  })
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)
}
