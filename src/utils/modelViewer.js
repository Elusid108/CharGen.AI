let modelViewerLoader = null

export function ensureModelViewer() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (customElements.get('model-viewer')) return Promise.resolve()
  if (modelViewerLoader) return modelViewerLoader
  modelViewerLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load 3D viewer'))
    document.head.appendChild(script)
  })
  return modelViewerLoader
}
