/**
 * Unified character attribute schema
 * Select `options` are per-field records from src/data/options (id = saved label).
 */

import { getFieldOptions } from './options'

function select(id, label, extra = {}) {
  return { id, label, type: 'select', options: getFieldOptions(id), ...extra }
}

function customText(id, label, parentId, placeholder) {
  return {
    id,
    label,
    type: 'text',
    placeholder,
    conditional: { field: parentId, value: 'Custom' },
  }
}

export const CHARACTER_SECTIONS = {
  identity: {
    icon: 'Fingerprint',
    label: 'Identity & Species',
    description: 'Core identity, species, role, and how they make a living.',
    fields: [
      { id: 'name', label: 'Full Name', type: 'text', placeholder: 'E.g., Caelus Vane, Zyx-7, etc.' },
      select('genre', 'Genre Prior'),
      select('species', 'Species'),
      customText('species_custom', 'Custom Species', 'species', 'Describe species...'),
      select('sex', 'Biological Sex'),
      select('gender', 'Gender Identity'),
      select('gender_expression', 'Gender Expression'),
      customText('gender_expression_custom', 'Custom Gender Expression', 'gender_expression', 'How they present...'),
      select('transition_note', 'Transition / History Note'),
      customText('transition_note_custom', 'Custom Transition Note', 'transition_note', 'Optional history they would actually share...'),
      select('orientation', 'Sexual Orientation'),
      select('romantic_orientation', 'Romantic Orientation'),
      customText('romantic_orientation_custom', 'Custom Romantic Orientation', 'romantic_orientation', 'How they fall (or do not)...'),
      { id: 'age', label: 'Age', type: 'number', placeholder: '25' },
      select('race', 'Race'),
      customText('race_custom', 'Custom Race', 'race', 'E.g., Martian colonist phenotype, engineered lineage...'),
      select('ethnicity', 'Ethnicity'),
      customText('ethnicity_custom', 'Custom Ethnicity', 'ethnicity', 'E.g., Orbital creole culture, undercity clan heritage...'),
      select('origin', 'Origin'),
      customText('origin_custom', 'Custom Origin', 'origin', 'E.g., Generation ship creche, fey border town, penal asteroid...'),
      select('occupation', 'Occupation'),
      customText('occupation_custom', 'Custom Occupation', 'occupation', 'Job, hustle, or vocation...'),
      select('socioeconomic_class', 'Socioeconomic Class'),
      customText('socioeconomic_class_custom', 'Custom Class', 'socioeconomic_class', 'Class position in their world...'),
      select('competency_1', 'Competency 1'),
      customText('competency_1_custom', 'Custom Competency 1', 'competency_1', 'What they can actually do...'),
      select('competency_2', 'Competency 2'),
      customText('competency_2_custom', 'Custom Competency 2', 'competency_2', 'A second skill, or leave None...'),
      select('competency_3', 'Competency 3'),
      customText('competency_3_custom', 'Custom Competency 3', 'competency_3', 'A third skill, or leave None...'),
      select('archetype', 'Archetype'),
      select('default_outfit', 'Default Outfit'),
      customText('default_outfit_custom', 'Custom Default Outfit', 'default_outfit', 'E.g., waxed canvas duster, linen shirt, scuffed boots...'),
    ],
  },

  physical: {
    icon: 'Dumbbell',
    label: 'Physical Anatomy',
    description: 'Overall silhouette, fat vs muscle, and regional overrides.',
    fields: [
      select('silhouette', 'Overall Silhouette'),
      customText('silhouette_custom', 'Custom Silhouette', 'silhouette', 'Overall body architecture...'),
      select('height', 'Height'),
      customText('height_custom', 'Custom Height', 'height', 'E.g., 6\'4", impossibly tall, variable...'),
      { id: 'body_softness', label: 'Softness / Body Fat', type: 'range', min: 0, max: 100, default: 40 },
      { id: 'muscle_def', label: 'Muscle Definition', type: 'range', min: 0, max: 100, default: 30 },
      { id: 'vascularity', label: 'Vascularity (Veins)', type: 'range', min: 0, max: 100, default: 15 },
      select('chest_anatomy', 'Chest Anatomy'),
      customText('chest_anatomy_custom', 'Custom Chest Anatomy', 'chest_anatomy', 'Pecs, breasts, neither...'),
      select('chest_size', 'Chest Size / Shape'),
      customText('chest_size_custom', 'Custom Chest Size', 'chest_size', 'Describe chest shape and mass...'),
      select('body_hair', 'Body Hair'),
      customText('body_hair_custom', 'Custom Body Hair', 'body_hair', 'Describe body hair distribution or pattern...'),
      select('skin_tone', 'Skin Tone'),
      customText('skin_tone_custom', 'Custom Skin Tone', 'skin_tone', 'E.g., Bioluminescent teal, rust-red patina...'),
      select('skin_texture', 'Skin Texture'),
      customText('skin_texture_custom', 'Custom Skin Texture', 'skin_texture', 'Describe skin surface quality...'),
      select('forearms', 'Forearms'),
      customText('forearms_custom', 'Custom Forearms', 'forearms', 'Describe forearm build...'),
      select('upper_arms', 'Upper Arms'),
      customText('upper_arms_custom', 'Custom Upper Arms', 'upper_arms', 'Describe biceps/triceps...'),
      select('shoulders', 'Shoulders'),
      customText('shoulders_custom', 'Custom Shoulders', 'shoulders', 'Describe shoulder breadth and shape...'),
      select('neck', 'Neck'),
      customText('neck_custom', 'Custom Neck', 'neck', 'Describe neck thickness, length...'),
      select('abs', 'Abs / Core'),
      customText('abs_custom', 'Custom Abs / Core', 'abs', 'Describe midsection...'),
      select('back', 'Back'),
      customText('back_custom', 'Custom Back', 'back', 'Describe back width, lats, definition...'),
      select('glutes', 'Glutes'),
      customText('glutes_custom', 'Custom Glutes', 'glutes', 'Describe hip and glute shape...'),
      select('upper_legs', 'Upper Legs / Thighs'),
      customText('upper_legs_custom', 'Custom Upper Legs', 'upper_legs', 'Describe thighs and quads...'),
      select('lower_legs', 'Lower Legs / Calves'),
      customText('lower_legs_custom', 'Custom Lower Legs', 'lower_legs', 'Describe calves and shins...'),
      select('scars', 'Scars & Markings'),
      customText('scars_custom', 'Custom Scars & Markings', 'scars', 'E.g., Slash across left pec, tribal tattoos on arms...'),
      select('blemishes', 'Blemishes & Imperfections'),
      customText('blemishes_custom', 'Custom Blemishes', 'blemishes', 'E.g., Broken nose, cauliflower ear, burn marks...'),
      select('special_features', 'Non-Human Features'),
      customText('special_features_custom', 'Custom Non-Human Features', 'special_features', 'E.g., Horns, tail, wings, extra limbs, antenna...'),
    ],
  },

  face: {
    icon: 'ScanFace',
    label: 'Face & Grooming',
    description: 'Facial structure, hair, eyes, and grooming.',
    fields: [
      select('facial_structure', 'Facial Structure'),
      select('mustache', 'Mustache'),
      customText('mustache_custom', 'Custom Mustache', 'mustache', 'Describe mustache shape, length, grooming...'),
      select('beard', 'Beard'),
      customText('beard_custom', 'Custom Beard', 'beard', 'Describe beard length, shape, line, density...'),
      select('eye_color', 'Eye Color'),
      customText('eye_color_custom', 'Custom Eye Color', 'eye_color', 'Describe eye color...'),
      select('eye_shape', 'Eye Shape'),
      select('hair_style', 'Hair Style'),
      select('hair_color', 'Hair Color'),
      { id: 'aging', label: 'Apparent Age', type: 'number', placeholder: 'e.g. 35', min: 1, max: 120 },
      select('distinguishing_facial', 'Distinguishing Features'),
      customText('distinguishing_facial_custom', 'Custom Distinguishing Features', 'distinguishing_facial', 'E.g., Scar through eyebrow, nose ring, beauty mark...'),
    ],
  },

  movement: {
    icon: 'Footprints',
    label: 'Movement & Presence',
    description: 'How the character moves, sounds, and is perceived.',
    fields: [
      select('gait', 'Gait / Movement Style'),
      select('voice', 'Voice Timbre'),
      select('scent', 'Signature Scent'),
      select('aura', 'Aura / Energy'),
      { id: 'sweat_glisten', label: 'Skin Glisten / Sweat', type: 'range', min: 0, max: 100, default: 10 },
    ],
  },

  psychology: {
    icon: 'Brain',
    label: 'Psychology & Mind',
    description: 'Personality frameworks, attachment, coping, and values.',
    fields: [
      select('alignment', 'Moral Alignment'),
      select('mbti', 'MBTI Type'),
      select('enneagram', 'Enneagram'),
      select('personality', 'Core Personality Trait'),
      select('attachment', 'Adult Attachment'),
      select('coping', 'Coping / Emotion Regulation'),
      customText('coping_custom', 'Custom Coping', 'coping', 'What they do under stress...'),
      select('values', 'Core Value'),
      customText('values_custom', 'Custom Value', 'values', 'What they will not trade away...'),
      { id: 'ocean_o', label: 'Openness', type: 'range', min: 0, max: 100, default: 50 },
      { id: 'ocean_c', label: 'Conscientiousness', type: 'range', min: 0, max: 100, default: 50 },
      { id: 'ocean_e', label: 'Extraversion', type: 'range', min: 0, max: 100, default: 50 },
      { id: 'ocean_a', label: 'Agreeableness', type: 'range', min: 0, max: 100, default: 50 },
      { id: 'ocean_n', label: 'Neuroticism', type: 'range', min: 0, max: 100, default: 50 },
    ],
  },

  narrative: {
    icon: 'BookOpen',
    label: 'Narrative & History',
    description: 'Backstory, goals, fears, and the forces that drive them.',
    fields: [
      select('goal', 'Conscious Goal'),
      customText('goal_custom', 'Custom Goal', 'goal', 'Describe custom goal...'),
      select('fear', 'Deepest Fear'),
      customText('fear_custom', 'Custom Fear', 'fear', 'Describe custom fear...'),
      select('desire', 'Secret Desire'),
      customText('desire_custom', 'Custom Desire', 'desire', 'Describe custom desire...'),
      select('lie', 'The Lie They Believe'),
      customText('lie_custom', 'Custom Lie', 'lie', 'A core belief they treat as fact...'),
      select('vice', 'Primary Vice'),
      select('virtue', 'Primary Virtue'),
      select('trauma', 'Trauma History'),
      customText('trauma_custom', 'Custom Trauma History', 'trauma', 'Defining traumatic event or ongoing trauma...'),
      select('moral_code', 'Moral Code'),
      customText('moral_code_custom', 'Custom Moral Code', 'moral_code', 'E.g., Never harm children, Always repay debts...'),
      select('prejudice', 'Prejudices & Biases'),
      customText('prejudice_custom', 'Custom Prejudices', 'prejudice', 'What groups/things do they irrationally dislike...'),
    ],
  },

  social: {
    icon: 'MessagesSquare',
    label: 'Social & Speech',
    description: 'How they interact, communicate, and take up space in a room.',
    fields: [
      select('battery', 'Social Battery'),
      select('speech_style', 'Speech Style'),
      select('tic', 'Verbal/Physical Tic'),
      select('humor', 'Sense of Humor'),
      select('dynamic', 'Party / Status Dynamic'),
      select('quirk', 'Behavioral Quirk'),
      customText('quirk_custom', 'Custom Behavioral Quirk', 'quirk', 'E.g., Always sits facing the door, counts steps...'),
    ],
  },

  adult: {
    icon: 'Flame',
    label: 'Mature / Adult',
    description: 'Sexual preferences, kinks, and intimate details.',
    fields: [
      select('sexual_role', 'Sexual Role'),
      select('relationship_style', 'Relationship Style'),
      select('kinks', 'Kinks & Interests'),
      customText('kinks_custom', 'Custom Kinks & Interests', 'kinks', 'E.g., Bondage, roleplay, exhibitionism...'),
      select('turn_ons', 'Turn Ons'),
      customText('turn_ons_custom', 'Custom Turn Ons', 'turn_ons', 'What attracts or excites them...'),
      select('turn_offs', 'Turn Offs / Disgusts'),
      customText('turn_offs_custom', 'Custom Turn Offs', 'turn_offs', 'What repels them...'),
      select('attraction_type', 'Attracted To'),
      customText('attraction_type_custom', 'Custom Attraction', 'attraction_type', 'Physical types, personality traits they find attractive...'),
      select('intimidated_by', 'Intimidated By'),
      customText('intimidated_by_custom', 'Custom Intimidation', 'intimidated_by', 'Situations, people, or dynamics that unnerve them...'),
      select('experience_level', 'Experience Level'),
      select('intimacy_style', 'Intimacy Style'),
      select('attire', 'Intimate Attire'),
      customText('attire_custom', 'Custom Intimate Attire', 'attire', 'Describe outfit, fabrics, cut, accessories...'),
      { id: 'body_confidence', label: 'Body Confidence', type: 'range', min: 0, max: 100, default: 50 },
    ],
  },
}

/** Persist this on every library save. Bump when generatedImages, generatedModels, motion, or attribute shape changes. */
export const CHARACTER_SCHEMA_VERSION = 10

export function emptyGeneratedImages() {
  return {
    profile: null,
    profileCanonical: null,
    profileThirst: null,
    tpose: null,
    side: null,
    back: null,
    mannequin: null,
  }
}

export function getAllFieldIds() {
  const ids = []
  Object.values(CHARACTER_SECTIONS).forEach((section) => {
    section.fields.forEach((field) => {
      ids.push(field.id)
    })
  })
  return ids
}

/** Field ids that should be coerced to integers when applying image analysis JSON. */
export function getNumericFieldIds() {
  const ids = []
  Object.values(CHARACTER_SECTIONS).forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === 'range' || field.type === 'number') ids.push(field.id)
    })
  })
  return ids
}

export function getDefaultCharacter() {
  const char = {}
  Object.values(CHARACTER_SECTIONS).forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === 'range') {
        char[field.id] = field.default ?? 50
      } else {
        char[field.id] = ''
      }
    })
  })
  return char
}

export const DEFAULT_ART_STYLE = ', 3d render, pixar style'
export const DEFAULT_LIGHTING = ', cinematic lighting, dramatic shadows'
export const DEFAULT_MOOD = ', relaxed mood, calm, at ease'

/** Gemini / Imagen integer seed range. */
export const IMAGE_SEED_MIN = 0
export const IMAGE_SEED_MAX = 2147483647

export function randomImageSeed() {
  return Math.floor(Math.random() * (IMAGE_SEED_MAX + 1))
}

export function clampImageSeed(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return IMAGE_SEED_MIN
  return Math.max(IMAGE_SEED_MIN, Math.min(IMAGE_SEED_MAX, Math.round(n)))
}

/**
 * @param {{ randomizeSeed?: boolean }} [opts]
 */
export function emptyImagePrefs(opts = {}) {
  const { randomizeSeed = true } = opts
  return {
    artStyle: DEFAULT_ART_STYLE,
    lighting: DEFAULT_LIGHTING,
    mood: DEFAULT_MOOD,
    exclude: '',
    seed: randomizeSeed ? randomImageSeed() : 0,
  }
}

export function normalizeImagePrefs(raw) {
  const fallback = emptyImagePrefs({ randomizeSeed: false })
  if (!raw || typeof raw !== 'object') return fallback
  return {
    artStyle: typeof raw.artStyle === 'string' ? raw.artStyle : fallback.artStyle,
    lighting: typeof raw.lighting === 'string' ? raw.lighting : fallback.lighting,
    mood: typeof raw.mood === 'string' ? raw.mood : fallback.mood,
    exclude: typeof raw.exclude === 'string' ? raw.exclude : '',
    seed: raw.seed == null ? fallback.seed : clampImageSeed(raw.seed),
  }
}

export const ART_STYLES = [
  { label: 'Default (Concept Art)', value: '' },
  { label: 'Photorealistic', value: ', photorealistic, 8k, cinematic' },
  { label: 'Anime', value: ', anime style, studio ghibli' },
  { label: 'Cyberpunk', value: ', cyberpunk style, neon lights' },
  { label: 'Watercolor', value: ', watercolor painting, artistic' },
  { label: 'Oil Painting', value: ', oil painting, textured' },
  { label: '3D Render', value: DEFAULT_ART_STYLE },
  { label: 'Comic Book', value: ', comic book style, bold lines' },
  { label: 'Film Noir', value: ', film noir, b&w' },
  { label: 'Surrealism', value: ', surrealism, dreamlike' },
  { label: 'Steampunk', value: ', steampunk style, brass, gears' },
  { label: 'Low Poly', value: ', low poly, geometric, polygon art' },
  { label: 'Horror', value: ', lovecraftian, eldritch horror, dark' },
  { label: 'Impressionist', value: ', impressionist painting, soft brushwork' },
  { label: 'Pixel Art', value: ', pixel art, 16-bit' },
  { label: 'Synthwave', value: ', synthwave, retrowave, neon' },
]

export const LIGHTING_OPTIONS = [
  { label: 'Default', value: '' },
  { label: 'Cinematic', value: DEFAULT_LIGHTING },
  { label: 'Natural', value: ', soft natural lighting, sunlight' },
  { label: 'Golden Hour', value: ', golden hour, warm sunset lighting' },
  { label: 'Studio', value: ', studio lighting, perfect exposure' },
  { label: 'Neon', value: ', neon lighting, glowing, vibrant' },
  { label: 'Dark/Moody', value: ', dark atmosphere, dim lighting, mystery' },
  { label: 'Rembrandt', value: ', rembrandt lighting, chiaroscuro' },
]

export const MOOD_OPTIONS = [
  { label: 'Default', value: '' },
  { label: 'Relaxed', value: DEFAULT_MOOD },
  { label: 'Vibrant', value: ', vibrant colors, high saturation' },
  { label: 'Muted', value: ', muted colors, desaturated, matte' },
  { label: 'Pastel', value: ', pastel color palette, soft colors' },
  { label: 'Dark Fantasy', value: ', dark fantasy, grim, ethereal' },
  { label: 'Ethereal', value: ', ethereal, dreamy, magical' },
  { label: 'Retro', value: ', retro aesthetic, vintage filter' },
  { label: 'B&W', value: ', black and white, monochrome' },
]
