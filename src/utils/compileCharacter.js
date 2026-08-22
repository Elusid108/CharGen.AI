import { CUSTOM_ID } from '../data/options/shared'
import { findOption } from '../data/options'
import { selectDisplay } from './selectDisplay'

const CODED_TRAIT_FIELDS = new Set([
  'mbti',
  'alignment',
  'enneagram',
  'ocean_o',
  'ocean_c',
  'ocean_e',
  'ocean_a',
  'ocean_n',
])

const IMAGE_SKIP_VALUES = new Set([
  'N/A',
  'N/A (Non-Human)',
  'None',
  'None notable',
  'None standout',
  'None noted',
  'Fully humanoid baseline',
  'Minimal / none visible',
  'Bald/N/A',
  'Nothing easily rattles them',
  'No universal dealbreakers',
  'No fixed physical type',
  'Prefer not to say',
])

export const RANGE_BINS = {
  muscle_def: [
    {
      max: 19,
      label: 'Soft',
      lore: 'Very soft, no visible definition. Doughy or emaciated depending on the rest of the sheet.',
      image: 'very soft body with no visible muscle definition',
      imageSilhouette: 'soft, unathletic silhouette under closed clothing',
      behavior: 'Clothes drape without structure. They do not look like they train — and they may not care.',
    },
    {
      max: 39,
      label: 'Light tone',
      lore: 'Some tone visible. Looks fit in good lighting, ordinary in bad.',
      image: 'lightly toned body with subtle muscle shape',
      imageSilhouette: 'lightly athletic silhouette filling closed clothing; no muscle visible through fabric',
      behavior: 'Reads as someone who moves, not someone who poses. Strength is plausible, not advertised.',
    },
    {
      max: 59,
      label: 'Athletic',
      lore: 'Athletic. Visible abs in the right light, firm. Clearly works out or works hard.',
      image: 'athletic body with visible muscle tone and some ab definition',
      imageSilhouette: 'athletic silhouette with a filled-out chest and shoulders under closed clothing',
      behavior: 'People assume they can keep up. They sit, stand, and reach like the body is a tool they maintain.',
    },
    {
      max: 79,
      label: 'Ripped',
      lore: 'Ripped. Clear muscle separation, deep cuts, low body fat.',
      image: 'muscular body with clearly defined muscles, visible abs and arm veins',
      imageSilhouette: 'broad muscular silhouette filling closed clothing; bulk suggested by garment drape only, not exposed skin',
      behavior: 'The body announces itself even in clothes. Strangers comment; they have a script for that.',
    },
    {
      max: 100,
      label: 'Shredded',
      lore: 'Shredded. Anatomy-chart visibility. Cross-striations if lighting is cruel.',
      image: 'extremely muscular and ripped body with deep muscle striations and prominent vascularity',
      imageSilhouette: 'powerfully built silhouette with wide shoulders and a thick torso under fully covering clothing; do not show abs, veins, or skin through fabric',
      behavior: 'Looks like a costume of muscle. People treat them as spectacle, threat, or fantasy — rarely as ordinary.',
    },
  ],
  vascularity: [
    {
      max: 19,
      label: 'Smooth',
      lore: 'No visible veins. Smooth skin surface.',
      image: '',
      behavior: 'Hands and arms look unremarkable until they grip something.',
    },
    {
      max: 49,
      label: 'Subtle',
      lore: 'Subtle veining on forearms when flexed.',
      image: 'subtle veining visible on forearms',
      behavior: 'Veins show when they work or get hot. A tell for effort, not a roadmap.',
    },
    {
      max: 74,
      label: 'Prominent',
      lore: 'Prominent veins on arms and hands. Some chest veining.',
      image: 'prominent veins on arms and hands',
      behavior: 'People notice their hands. Heat, strain, or vanity lighting turns anatomy into a map.',
    },
    {
      max: 100,
      label: 'Road-map',
      lore: 'Extreme vascularity. Road-map veins across arms, chest, and abs.',
      image: 'extreme road-map vascularity across arms, chest and abs',
      behavior: 'Looks almost medical. Some find it magnetic; others flinch. They know which.',
    },
  ],
  sweat_glisten: [
    {
      max: 19,
      label: 'Matte',
      lore: 'Dry, matte skin. No visible moisture.',
      image: '',
      behavior: 'They look composed. Heat does not write itself on them easily.',
    },
    {
      max: 49,
      label: 'Sheen',
      lore: 'Slight sheen. Post-warm-up look.',
      image: 'slight sheen on skin',
      behavior: 'A hint they have been moving. Makeup, oil, or climate — do not assume gym.',
    },
    {
      max: 74,
      label: 'Glow',
      lore: 'Visible sweat. Post-workout glow.',
      image: 'noticeable sweat glistening on skin',
      behavior: 'Effort is public. They wipe their brow, or they do not, on purpose.',
    },
    {
      max: 100,
      label: 'Drenched',
      lore: 'Drenched. Heavy exertion or intentional oil. Skin reflects light intensely.',
      image: 'skin drenched in sweat, heavily glistening and reflecting light',
      behavior: 'Impossible to look composed. Heat, labor, nerves, or performance — pick one and play it.',
    },
  ],
  body_confidence: [
    {
      max: 24,
      label: 'Hidden',
      lore: 'Very self-conscious. Hides body, avoids exposure.',
      image: '',
      behavior: 'Layers, angles, and jokes keep eyes off them. Compliments land like traps.',
    },
    {
      max: 49,
      label: 'Private',
      lore: 'Somewhat insecure. Comfortable only in private.',
      image: '',
      behavior: 'Fine until someone looks too long. They undress in the dark or behind humor.',
    },
    {
      max: 74,
      label: 'Comfortable',
      lore: 'Confident. Comfortable in their skin.',
      image: '',
      behavior: 'Takes up space without performing. Neither flaunts nor hides unless the scene asks.',
    },
    {
      max: 100,
      label: 'Unashamed',
      lore: 'Exhibitionist levels. Loves being seen, zero shame.',
      image: '',
      behavior: 'Uses the body as punctuation. Being looked at is fuel, not a threat.',
    },
  ],
  body_softness: [
    {
      max: 19,
      label: 'Lean',
      lore: 'Very little subcutaneous fat. Edges stay sharp; cold and chairs are less kind.',
      image: 'a lean body with little soft tissue padding over muscle and bone',
      imageSilhouette: 'a lean, tight silhouette under closed clothing with little softness in the drape',
      behavior: 'Looks angular in clothes. They may run cold, bruise easy, or treat thinness as a project.',
    },
    {
      max: 39,
      label: 'Athletic fat',
      lore: 'Some padding over the work. Healthy athletic softness without a heavy midsection.',
      image: 'light athletic padding over muscle, not a sharp cut and not a heavy belly',
      imageSilhouette: 'an athletic silhouette with slight softness in how clothing hangs',
      behavior: 'Looks human and capable. Neither diet-culture sharp nor heavy.',
    },
    {
      max: 59,
      label: 'Average',
      lore: 'Ordinary soft tissue. Clothes fit like they were made for people, not statues.',
      image: 'average body fat with natural softness at the middle and limbs',
      imageSilhouette: 'an average, untheatrical silhouette under closed clothing',
      behavior: 'Does not read as a gym advertisement. Comfortable in most chairs and most genres.',
    },
    {
      max: 79,
      label: 'Padded',
      lore: 'Clear softness — belly, hips, or arms carry extra. Warmth and weight in motion.',
      image: 'noticeable soft padding through the torso and limbs, a fuller midsection',
      imageSilhouette: 'a softly padded, fuller silhouette filling closed clothing',
      behavior: 'Movement has give. They know which seats are kind. Shame or pride is a character choice.',
    },
    {
      max: 100,
      label: 'Heavy',
      lore: 'Substantial fat mass. The body is a landscape; furniture and armor must negotiate.',
      image: 'a heavy, very softly padded body with substantial fat mass through the torso',
      imageSilhouette: 'a heavy, thick silhouette that fills and strains closed clothing',
      behavior: 'Takes up space that other people comment on. Breath, heat, and chairs are plot, not flavor text.',
    },
  ],
  ocean_o: [
    {
      max: 29,
      label: 'Concrete',
      lore: 'Low Openness: conventional, practical, prefers known routines and plain language.',
      image: '',
      behavior: 'Prefers the known recipe. Metaphors, magic systems, and "what if" talk make them impatient unless it is useful.',
    },
    {
      max: 69,
      label: 'Balanced',
      lore: 'Moderate Openness: will try a new idea if it earns its keep.',
      image: '',
      behavior: 'Curious in doses. Will entertain a strange theory, then ask what it costs.',
    },
    {
      max: 100,
      label: 'Expansive',
      lore: 'High Openness: hungry for novelty, abstraction, and new frames.',
      image: '',
      behavior: 'Chases new ideas, art, and weird angles. Small talk about logistics bores them unless it hides a puzzle.',
    },
  ],
  ocean_c: [
    {
      max: 29,
      label: 'Loose',
      lore: 'Low Conscientiousness: spontaneous, messy, allergic to unused checklists.',
      image: '',
      behavior: 'Improvises. Deadlines are suggestions until they are fires. Charm or chaos covers the gaps.',
    },
    {
      max: 69,
      label: 'Steady',
      lore: 'Moderate Conscientiousness: generally shows up, not a machine.',
      image: '',
      behavior: 'Mostly reliable. Makes plans they sometimes keep. Guilt shows when they drop a ball.',
    },
    {
      max: 100,
      label: 'Exacting',
      lore: 'High Conscientiousness: methodical, duty-heavy, achievement as oxygen.',
      image: '',
      behavior: 'Makes lists, keeps them, and judges people who do not. Relaxing feels like a moral failure.',
    },
  ],
  ocean_e: [
    {
      max: 29,
      label: 'Reserved',
      lore: 'Low Extraversion: energy goes out in company; solitude restores it.',
      image: '',
      behavior: 'Watches first. Talk is spent like money. Crowds cost them; one good conversation might not.',
    },
    {
      max: 69,
      label: 'Flexible',
      lore: 'Moderate Extraversion: can work a room, then needs the walk home.',
      image: '',
      behavior: 'Socially competent without being a generator. Will go out, then disappear without drama.',
    },
    {
      max: 100,
      label: 'Outward',
      lore: 'High Extraversion: thinks by talking; silence feels like a power cut.',
      image: '',
      behavior: 'Thinks out loud. Seeks people like caffeine. Being left on read feels like weather turning.',
    },
  ],
  ocean_a: [
    {
      max: 29,
      label: 'Guarded',
      lore: 'Low Agreeableness: skeptical, competitive, allergic to being managed.',
      image: '',
      behavior: 'Assumes motives. Softens last. Kindness is a choice they do not advertise, if they make it at all.',
    },
    {
      max: 69,
      label: 'Fair',
      lore: 'Moderate Agreeableness: cooperative with a spine.',
      image: '',
      behavior: 'Will meet you halfway, then stop. Polite until a line is crossed.',
    },
    {
      max: 100,
      label: 'Yielding',
      lore: 'High Agreeableness: trusts easily, smooths conflict, risks self-erasure.',
      image: '',
      behavior: 'Agrees faster than they should. Hates being the reason a room goes cold. Must be pushed to take.',
    },
  ],
  ocean_n: [
    {
      max: 29,
      label: 'Even',
      lore: 'Low Neuroticism: slow to spike; feelings exist but do not run the dashboard.',
      image: '',
      behavior: 'Stays readable under pressure. Others lean on them — sometimes until they quietly break somewhere private.',
    },
    {
      max: 69,
      label: 'Reactive',
      lore: 'Moderate Neuroticism: a normal weather system with occasional storms.',
      image: '',
      behavior: 'Stress shows in the body and the typing speed. Recovers, then replays the scene later.',
    },
    {
      max: 100,
      label: 'Stormy',
      lore: 'High Neuroticism: fast threat-detection, rumination, mood as a loud instrument.',
      image: '',
      behavior: 'Reads danger in tone. Spirals, then overcorrects. Needs reassurance they will hate needing.',
    },
  ],
  aging: [
    {
      max: 24,
      label: 'Youthful',
      lore: 'Youthful features, smooth skin, few signs of mileage.',
      image: 'a youthful face and skin with little weathering',
      behavior: 'Gets carded, underestimated, or fetishized for newness. Has to work to be taken seriously.',
    },
    {
      max: 34,
      label: 'Young adult',
      lore: 'Young adult. Peak physical advertising with some adult gravity in the eyes.',
      image: 'a young adult face, mature enough not to read as adolescent',
      behavior: 'Reads as in their prime. People assume stamina and unfinished business.',
    },
    {
      max: 49,
      label: 'Adult',
      lore: 'Adult mileage. Character lines, a face that has had to decide things.',
      image: 'an adult face with early character lines and settled features',
      behavior: 'People grant them competence they may or may not have. Youth-obsessed rooms start to skip them.',
    },
    {
      max: 64,
      label: 'Middle years',
      lore: 'Middle years. Visible aging, possible silver, eyes that have survived a plot already.',
      image: 'a middle-aged face with visible lines, possible silver in the hair, experienced eyes',
      behavior: 'Gets "sir/ma\'am" energy. Attracts people who want a parent, a mentor, or a warning.',
    },
    {
      max: 200,
      label: 'Elder',
      lore: 'Elder. Deep lines, weathered features, a face that has outlasted several versions of the world.',
      image: 'an elderly face with deep lines and weathered features',
      behavior: 'People shout, defer, or erase them. They have heard every speech about time.',
    },
  ],
}

export function getRangeBin(fieldId, value) {
  const bins = RANGE_BINS[fieldId]
  if (!bins) {
    const num = value === '' || value == null ? '' : value
    return {
      label: num === '' ? '—' : `${num}%`,
      lore: num === '' ? '' : `Value: ${num}%`,
      image: '',
      imageSilhouette: '',
      behavior: '',
    }
  }
  const num = Number(value)
  if (!Number.isFinite(num)) return bins[0]
  return bins.find((b) => num <= b.max) || bins[bins.length - 1]
}

export function getGenericAttributeDescription() {
  return 'A defining characteristic that shapes how this character exists in the world.'
}

function customCompanion(fieldId, character) {
  return String(character?.[`${fieldId}_custom`] || '').trim()
}

/**
 * Analysis / context-panel copy for a field.
 */
export function compileLore(fieldId, character) {
  if (!character) return getGenericAttributeDescription()
  if (RANGE_BINS[fieldId]) {
    return getRangeBin(fieldId, character[fieldId]).lore
  }
  const raw = character[fieldId]
  if (raw === '' || raw == null) return ''
  const option = findOption(fieldId, raw)
  if (raw === CUSTOM_ID) {
    const custom = customCompanion(fieldId, character)
    const base = option?.lore || 'A custom specification.'
    return custom ? `${base} Specifics: ${custom}` : base
  }
  return option?.lore || getGenericAttributeDescription()
}

function shouldSkipImageValue(raw, display) {
  if (!display) return true
  if (IMAGE_SKIP_VALUES.has(raw) || IMAGE_SKIP_VALUES.has(display)) return true
  if (/^None \//i.test(String(raw))) return true
  if (/^n\/a/i.test(display)) return true
  return false
}

/**
 * Visual sentence for image models. Empty string if this field should not paint.
 * @param {{ bodyDetail?: 'full' | 'silhouette' }} [extra]
 */
export function compileImageLine(fieldId, character, extra = {}) {
  if (!character) return ''
  const { bodyDetail } = extra

  if (RANGE_BINS[fieldId]) {
    const bin = getRangeBin(fieldId, character[fieldId])
    if (fieldId === 'vascularity' && bodyDetail === 'silhouette') return ''
    if (fieldId === 'sweat_glisten' && bodyDetail !== 'full') return ''
    if (fieldId === 'body_confidence') return ''
    if (fieldId.startsWith('ocean_')) return ''
    const img = bodyDetail === 'silhouette' ? (bin.imageSilhouette || bin.image) : bin.image
    if (!img) return ''
    return img.endsWith('.') ? img : `${img}.`
  }

  const raw = character[fieldId]
  if (raw === '' || raw == null) return ''
  if (raw === CUSTOM_ID) {
    const custom = customCompanion(fieldId, character)
    return custom ? (custom.endsWith('.') ? custom : `${custom}.`) : ''
  }

  const display = selectDisplay(character, fieldId)
  if (shouldSkipImageValue(raw, display)) return ''

  if (fieldId === 'skin_tone') {
    const origin = selectDisplay(character, 'origin').toLowerCase()
    if (raw === 'Pale' && origin.includes('deep sea')) {
      return 'vitreous, waxy, sun-deprived pale skin, lacking melanin.'
    }
  }

  const option = findOption(fieldId, raw)
  const image = option?.image
  if (!image) return ''
  return image.endsWith('.') ? image : `${image}.`
}

/**
 * How this trait plays in chat / story. Empty if nothing to say.
 */
export function compileBehavior(fieldId, character) {
  if (!character) return ''
  if (RANGE_BINS[fieldId]) {
    return getRangeBin(fieldId, character[fieldId]).behavior || ''
  }
  const raw = character[fieldId]
  if (raw === '' || raw == null) return ''
  if (raw === CUSTOM_ID) {
    return customCompanion(fieldId, character)
  }
  const option = findOption(fieldId, raw)
  return option?.behavior || ''
}

/**
 * Chat/story line: coded traits (MBTI/alignment/OCEAN/Enneagram) emit behavior only.
 * Other selects may include the display label plus behavior.
 */
export function compileChatTrait(fieldId, character) {
  const behavior = compileBehavior(fieldId, character)
  if (CODED_TRAIT_FIELDS.has(fieldId)) return behavior
  const display = selectDisplay(character, fieldId)
  if (!display && !behavior) return ''
  if (!behavior) return display
  if (!display || behavior.includes(display)) return behavior
  return `${display} — ${behavior}`
}

export function compileOceanBehavior(character) {
  return ['ocean_o', 'ocean_c', 'ocean_e', 'ocean_a', 'ocean_n']
    .map((id) => compileBehavior(id, character))
    .filter(Boolean)
    .join(' ')
}

export function isCodedTraitField(fieldId) {
  return CODED_TRAIT_FIELDS.has(fieldId)
}
