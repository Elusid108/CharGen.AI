/**
 * Image utility functions for download, compression, and conversion
 */

export function downloadImage(base64Data, filename = 'character.png') {
  const link = document.createElement('a')
  link.href = base64Data.startsWith('data:') ? base64Data : `data:image/png;base64,${base64Data}`
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

export function base64ToDataUrl(base64, mimeType = 'image/png') {
  if (base64.startsWith('data:')) return base64
  return `data:${mimeType};base64,${base64}`
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
