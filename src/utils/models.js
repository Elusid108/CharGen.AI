const EXCLUDE_PATTERNS = ['embedding', 'aqa', 'answer', 'vision', 'image']

/** @param {string} name */
export function modelIdFromApiName(name) {
  return (name || '').replace(/^models\//, '')
}

/**
 * @param {{ name: string, imageEndpoint?: 'predict' | 'generateContent' }[]} availableImageModels
 * @param {string} selectedImageModel model id without `models/` prefix
 * @returns {'predict' | 'generateContent'}
 */
export function getImageEndpointForModel(availableImageModels, selectedImageModel) {
  const m = availableImageModels.find((opt) => modelIdFromApiName(opt.name) === selectedImageModel)
  return m?.imageEndpoint ?? 'predict'
}

/**
 * @param {{ name: string, displayName: string, imageEndpoint?: 'predict' | 'generateContent' }[]} models
 */
function sortModels(models) {
  return [...models].sort((a, b) => {
    const aName = a.name.toLowerCase()
    const bName = b.name.toLowerCase()
    const aHasGemini = aName.includes('gemini')
    const bHasGemini = bName.includes('gemini')
    const aHasGemma = aName.includes('gemma')
    const bHasGemma = bName.includes('gemma')

    if (aHasGemini && !bHasGemini) return -1
    if (!aHasGemini && bHasGemini) return 1
    if (aHasGemma && !bHasGemma) return -1
    if (!aHasGemma && bHasGemma) return 1
    return bName.localeCompare(aName)
  })
}

/**
 * @param {string} apiKey
 * @param {{ selectedTextModel: string, selectedImageModel: string }} current
 * @returns {Promise<{
 *   availableTextModels: { name: string, displayName: string }[],
 *   availableImageModels: { name: string, displayName: string, imageEndpoint: 'predict' | 'generateContent' }[],
 *   selectedTextModel: string,
 *   selectedImageModel: string
 * } | null>}
 */
export async function fetchGeminiModels(apiKey, current) {
  const key = apiKey?.trim()
  if (!key) return null

  const empty = {
    availableTextModels: [],
    availableImageModels: [],
    selectedTextModel: current.selectedTextModel,
    selectedImageModel: current.selectedImageModel,
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
    )
    const data = await response.json()

    if (data.error) {
      return {
        availableTextModels: [],
        availableImageModels: [],
        selectedTextModel: current.selectedTextModel,
        selectedImageModel: current.selectedImageModel,
      }
    }

    const rawModels = data.models ?? []

    /** @type {{ name: string, displayName: string }[]} */
    const textModels = []
    /** @type {{ name: string, displayName: string, imageEndpoint: 'predict' | 'generateContent' }[]} */
    const imageModels = []

    for (const model of rawModels) {
      const name = model.name ?? ''
      const nameLower = name.toLowerCase()
      const displayName = model.displayName ?? modelIdFromApiName(name)
      const displayNameLower = displayName.toLowerCase()
      const methods = model.supportedGenerationMethods ?? model.supported_generation_methods ?? []

      const hasGenerateContent = methods.some((m) => String(m).toLowerCase() === 'generatecontent')

      const excluded = EXCLUDE_PATTERNS.some((p) => nameLower.includes(p))

      if (hasGenerateContent && !excluded) {
        textModels.push({ name, displayName })
      }

      const isImagenByName = nameLower.includes('imagen') || nameLower.includes('image')
      const isImageByDisplayName = displayNameLower.includes('nano banana')
      const isImageModel = isImagenByName || isImageByDisplayName

      if (isImageModel) {
        const isGeminiImage =
          hasGenerateContent &&
          (displayNameLower.includes('nano banana') ||
            (nameLower.includes('gemini') &&
              (displayNameLower.includes('image') || displayNameLower.includes('vision'))))
        const imageEndpoint = isGeminiImage ? 'generateContent' : 'predict'
        imageModels.push({ name, displayName, imageEndpoint })
      }
    }

    const sortedText = sortModels(textModels)
    const sortedImage = sortModels(imageModels)

    const textIds = sortedText.map((m) => modelIdFromApiName(m.name))
    let selectedTextModel = current.selectedTextModel
    if (sortedText.length > 0 && !textIds.includes(selectedTextModel)) {
      selectedTextModel = modelIdFromApiName(sortedText[0].name)
    }

    const imageIds = sortedImage.map((m) => modelIdFromApiName(m.name))
    let selectedImageModel = current.selectedImageModel
    if (sortedImage.length > 0 && !imageIds.includes(selectedImageModel)) {
      const nanoBanana = sortedImage.find((m) => m.displayName.toLowerCase().includes('nano banana'))
      const safeDefault =
        nanoBanana ||
        sortedImage.find((m) => m.imageEndpoint === 'predict') ||
        sortedImage[0]
      selectedImageModel = modelIdFromApiName(safeDefault.name)
    }

    return {
      availableTextModels: sortedText,
      availableImageModels: sortedImage,
      selectedTextModel,
      selectedImageModel,
    }
  } catch {
    return {
      availableTextModels: [],
      availableImageModels: [],
      selectedTextModel: current.selectedTextModel,
      selectedImageModel: current.selectedImageModel,
    }
  }
}
