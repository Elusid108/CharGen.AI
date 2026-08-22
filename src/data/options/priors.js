/**
 * Genre priors and randomize correlations. Multipliers stack on option.weight.
 */

export const HAIRLESS_SPECIES = new Set([
  'Android/Cyborg',
  'Elemental',
  'Non-Humanoid Alien',
])

export const OFTEN_HAIRLESS_SPECIES = new Set([
  'Dragon/Draconic',
  'Undead',
])

export const HUMANLIKE_SPECIES = new Set([
  'Human',
  'Elf',
  'Dwarf',
  'Orc',
  'Vampire',
  'Hybrid',
])

const SPECIES_MODERN = {
  Human: 6,
  'Humanoid Alien': 0.45,
  'Non-Humanoid Alien': 0.12,
  Elf: 0.1,
  Dwarf: 0.1,
  Orc: 0.08,
  Demon: 0.12,
  Angel: 0.12,
  Undead: 0.08,
  'Android/Cyborg': 0.55,
  'Werewolf/Lycanthrope': 0.18,
  Vampire: 0.22,
  'Dragon/Draconic': 0.06,
  'Fae/Fairy': 0.1,
  Elemental: 0.06,
  Hybrid: 0.35,
}

const SPECIES_FANTASY = {
  Human: 1.4,
  Elf: 2.2,
  Dwarf: 2,
  Orc: 1.8,
  Demon: 1.5,
  Angel: 1.4,
  Undead: 1.5,
  'Werewolf/Lycanthrope': 1.6,
  Vampire: 1.7,
  'Dragon/Draconic': 1.5,
  'Fae/Fairy': 1.8,
  Elemental: 1.4,
  Hybrid: 1.3,
  'Android/Cyborg': 0.15,
  'Humanoid Alien': 0.2,
  'Non-Humanoid Alien': 0.12,
}

const SPECIES_SCIFI = {
  Human: 2.2,
  'Humanoid Alien': 2.4,
  'Non-Humanoid Alien': 1.6,
  'Android/Cyborg': 2.6,
  Hybrid: 1.4,
  Elf: 0.12,
  Dwarf: 0.1,
  Orc: 0.15,
  Demon: 0.2,
  Angel: 0.2,
  Undead: 0.25,
  'Werewolf/Lycanthrope': 0.2,
  Vampire: 0.25,
  'Dragon/Draconic': 0.15,
  'Fae/Fairy': 0.12,
  Elemental: 0.2,
}

const ORIGIN_MODERN = {
  'Urban Megacity': 3.2,
  'Rural Heartland': 2.4,
  'Arcology Sprawl': 1.3,
  'Frontier Outpost': 0.9,
  'Underground Enclave': 0.7,
  'Monastery / Order Raised': 0.45,
  'Orbital Habitat': 0.25,
  'Martian Settlement': 0.15,
  'Deep Sea Colony': 0.2,
  'Nomadic Fleet': 0.3,
}

const ORIGIN_FANTASY = {
  'Rural Heartland': 2.2,
  'Frontier Outpost': 2.1,
  'Monastery / Order Raised': 2,
  'Underground Enclave': 1.6,
  'Urban Megacity': 0.9,
  'Nomadic Fleet': 1.1,
  'Arcology Sprawl': 0.2,
  'Orbital Habitat': 0.08,
  'Martian Settlement': 0.06,
  'Deep Sea Colony': 0.7,
}

const ORIGIN_SCIFI = {
  'Orbital Habitat': 2.6,
  'Martian Settlement': 2.4,
  'Arcology Sprawl': 2.2,
  'Urban Megacity': 1.8,
  'Nomadic Fleet': 2,
  'Deep Sea Colony': 1.4,
  'Frontier Outpost': 1.3,
  'Underground Enclave': 1.1,
  'Rural Heartland': 0.45,
  'Monastery / Order Raised': 0.35,
}

const OUTFIT_MODERN = {
  'Casual everyday': 3,
  Streetwear: 2.6,
  Workwear: 1.6,
  Athletic: 1.5,
  Formal: 1.2,
  Uniform: 1.1,
  'Travel/adventuring': 0.5,
  'Armor/combat': 0.2,
  'Simple tunic/robe': 0.18,
}

const OUTFIT_FANTASY = {
  'Travel/adventuring': 2.4,
  'Simple tunic/robe': 2.2,
  'Armor/combat': 2,
  Formal: 1.3,
  Workwear: 1.1,
  Uniform: 0.9,
  'Casual everyday': 0.7,
  Streetwear: 0.2,
  Athletic: 0.35,
}

const OUTFIT_SCIFI = {
  Workwear: 2.2,
  Uniform: 2.1,
  Streetwear: 1.5,
  'Casual everyday': 1.4,
  Athletic: 1.2,
  'Armor/combat': 1.3,
  Formal: 1,
  'Travel/adventuring': 1.1,
  'Simple tunic/robe': 0.25,
}

const SCENT_MODERN = {
  'Fresh Rain': 1.5,
  'Motor Oil & Citrus': 1.5,
  'Cheap Perfume & Gin': 1.4,
  'Old Paper & Vanilla': 1.2,
  'Woodsmoke & Pine': 0.9,
  Sulfur: 0.35,
  'Alien/Indescribable': 0.2,
  'Blood & Iron': 0.55,
  'Saltwater & Rot': 0.5,
  'Ozone & Copper': 0.7,
}

const SCENT_FANTASY = {
  'Woodsmoke & Pine': 2,
  'Old Paper & Vanilla': 1.6,
  'Blood & Iron': 1.5,
  Sulfur: 1.4,
  'Lavender & Dust': 1.5,
  'Ozone & Copper': 1.3,
  'Cheap Perfume & Gin': 0.7,
  'Motor Oil & Citrus': 0.25,
  'Alien/Indescribable': 0.45,
}

const SCENT_SCIFI = {
  'Ozone & Copper': 2,
  'Motor Oil & Citrus': 1.8,
  'Nothing/Sterile': 1.8,
  'Alien/Indescribable': 1.6,
  'Fresh Rain': 0.8,
  'Woodsmoke & Pine': 0.35,
  Sulfur: 0.9,
  'Cheap Perfume & Gin': 0.7,
}

const SPECIAL_MODERN = {
  'Fully humanoid baseline': 4.5,
  'Holographic skin shift': 0.35,
  'Neural port at temple': 0.4,
  'Horns (curved)': 0.15,
  'Prehensile tail': 0.12,
  'Winged (feathered)': 0.1,
  'Tentacle hair': 0.08,
}

const SPECIAL_FANTASY = {
  'Fully humanoid baseline': 1.2,
  'Horns (curved)': 1.6,
  'Prehensile tail': 1.3,
  'Winged (feathered)': 1.4,
  'Third eye (latent)': 1.2,
  'Arcane sigil scar': 1,
  'Holographic skin shift': 0.15,
}

const SPECIAL_SCIFI = {
  'Fully humanoid baseline': 1.6,
  'Holographic skin shift': 2,
  'Gills (retractable)': 1.1,
  'Extra pair of arms': 1.2,
  'Bioluminescent markings': 1.4,
  'Crystal growths': 0.9,
  'Horns (curved)': 0.35,
  'Winged (feathered)': 0.4,
  'Tentacle hair': 1.1,
}

export const GENRE_MULTIPLIERS = {
  Modern: {
    species: SPECIES_MODERN,
    origin: ORIGIN_MODERN,
    default_outfit: OUTFIT_MODERN,
    scent: SCENT_MODERN,
    special_features: SPECIAL_MODERN,
  },
  Fantasy: {
    species: SPECIES_FANTASY,
    origin: ORIGIN_FANTASY,
    default_outfit: OUTFIT_FANTASY,
    scent: SCENT_FANTASY,
    special_features: SPECIAL_FANTASY,
  },
  'Sci-Fi': {
    species: SPECIES_SCIFI,
    origin: ORIGIN_SCIFI,
    default_outfit: OUTFIT_SCIFI,
    scent: SCENT_SCIFI,
    special_features: SPECIAL_SCIFI,
  },
  Mixed: {},
}

export function genreWeightMultiplier(genre, fieldId, optionId) {
  const table = GENRE_MULTIPLIERS[genre]?.[fieldId]
  if (!table) return 1
  const m = table[optionId]
  return Number.isFinite(m) ? m : 1
}

export const SILHOUETTE_TEMPLATES = {
  Lithe: {
    forearms: 'Slender',
    upper_arms: 'Slender',
    shoulders: 'Slender',
    neck: 'Slender',
    chest_size: 'Slender',
    abs: 'Slender',
    back: 'Slender',
    glutes: 'Toned',
    upper_legs: 'Slender',
    lower_legs: 'Slender',
    muscle_def: [35, 55],
    body_softness: [10, 30],
  },
  Athletic: {
    forearms: 'Toned',
    upper_arms: 'Toned',
    shoulders: 'Toned',
    neck: 'Toned',
    chest_size: 'Toned',
    abs: 'Toned',
    back: 'Toned',
    glutes: 'Toned',
    upper_legs: 'Toned',
    lower_legs: 'Toned',
    muscle_def: [45, 65],
    body_softness: [20, 40],
  },
  Slim: {
    forearms: 'Slender',
    upper_arms: 'Slender',
    shoulders: 'Slender',
    neck: 'Slender',
    chest_size: 'Flat',
    abs: 'Slender',
    back: 'Slender',
    glutes: 'Slender',
    upper_legs: 'Slender',
    lower_legs: 'Slender',
    muscle_def: [15, 40],
    body_softness: [8, 28],
  },
  Otter: {
    forearms: 'Toned',
    upper_arms: 'Toned',
    shoulders: 'Toned',
    neck: 'Slender',
    chest_size: 'Defined',
    abs: 'Toned',
    back: 'Toned',
    glutes: 'Toned',
    upper_legs: 'Toned',
    lower_legs: 'Toned',
    muscle_def: [40, 60],
    body_softness: [15, 35],
  },
  Twunk: {
    forearms: 'Toned',
    upper_arms: 'Muscular',
    shoulders: 'Muscular',
    neck: 'Toned',
    chest_size: 'Defined',
    abs: 'Defined',
    back: 'Toned',
    glutes: 'Muscular',
    upper_legs: 'Toned',
    lower_legs: 'Toned',
    muscle_def: [55, 75],
    body_softness: [10, 28],
  },
  Bodybuilder: {
    forearms: 'Muscular',
    upper_arms: 'Massive',
    shoulders: 'Massive',
    neck: 'Muscular',
    chest_size: 'Massive',
    abs: 'Defined',
    back: 'Massive',
    glutes: 'Muscular',
    upper_legs: 'Muscular',
    lower_legs: 'Muscular',
    muscle_def: [75, 95],
    body_softness: [5, 18],
  },
  Powerlifter: {
    forearms: 'Thick',
    upper_arms: 'Thick',
    shoulders: 'Thick',
    neck: 'Thick',
    chest_size: 'Broad',
    abs: 'Thick',
    back: 'Thick',
    glutes: 'Thick',
    upper_legs: 'Thick',
    lower_legs: 'Thick',
    muscle_def: [40, 65],
    body_softness: [30, 55],
  },
  Stocky: {
    forearms: 'Thick',
    upper_arms: 'Thick',
    shoulders: 'Thick',
    neck: 'Thick',
    chest_size: 'Broad',
    abs: 'Soft',
    back: 'Thick',
    glutes: 'Thick',
    upper_legs: 'Thick',
    lower_legs: 'Thick',
    muscle_def: [25, 50],
    body_softness: [40, 65],
  },
  'Dad Bod': {
    forearms: 'Toned',
    upper_arms: 'Soft',
    shoulders: 'Toned',
    neck: 'Soft',
    chest_size: 'Soft',
    abs: 'Soft',
    back: 'Soft',
    glutes: 'Soft',
    upper_legs: 'Soft',
    lower_legs: 'Toned',
    muscle_def: [15, 40],
    body_softness: [50, 75],
  },
  Bear: {
    forearms: 'Thick',
    upper_arms: 'Thick',
    shoulders: 'Massive',
    neck: 'Thick',
    chest_size: 'Broad',
    abs: 'Soft',
    back: 'Thick',
    glutes: 'Thick',
    upper_legs: 'Thick',
    lower_legs: 'Thick',
    muscle_def: [20, 45],
    body_softness: [55, 80],
  },
  Heavyset: {
    forearms: 'Soft',
    upper_arms: 'Soft',
    shoulders: 'Thick',
    neck: 'Soft',
    chest_size: 'Soft',
    abs: 'Soft',
    back: 'Soft',
    glutes: 'Massive',
    upper_legs: 'Thick',
    lower_legs: 'Soft',
    muscle_def: [10, 35],
    body_softness: [70, 95],
  },
  'Mass Monster': {
    forearms: 'Massive',
    upper_arms: 'Massive',
    shoulders: 'Massive',
    neck: 'Massive',
    chest_size: 'Massive',
    abs: 'Massive',
    back: 'Massive',
    glutes: 'Massive',
    upper_legs: 'Massive',
    lower_legs: 'Massive',
    muscle_def: [70, 95],
    body_softness: [15, 40],
  },
  Amazonian: {
    forearms: 'Toned',
    upper_arms: 'Muscular',
    shoulders: 'Muscular',
    neck: 'Toned',
    chest_size: 'Broad',
    abs: 'Defined',
    back: 'Muscular',
    glutes: 'Muscular',
    upper_legs: 'Muscular',
    lower_legs: 'Toned',
    muscle_def: [50, 75],
    body_softness: [15, 35],
  },
  Hourglass: {
    forearms: 'Toned',
    upper_arms: 'Toned',
    shoulders: 'Toned',
    neck: 'Slender',
    chest_size: 'Defined',
    abs: 'Slender',
    back: 'Toned',
    glutes: 'Muscular',
    upper_legs: 'Toned',
    lower_legs: 'Toned',
    muscle_def: [30, 55],
    body_softness: [25, 50],
  },
  Rectangular: {
    forearms: 'Toned',
    upper_arms: 'Toned',
    shoulders: 'Toned',
    neck: 'Toned',
    chest_size: 'Toned',
    abs: 'Toned',
    back: 'Toned',
    glutes: 'Toned',
    upper_legs: 'Toned',
    lower_legs: 'Toned',
    muscle_def: [30, 55],
    body_softness: [25, 45],
  },
}

export function extraversionToBattery(oceanE) {
  const v = Number(oceanE)
  if (!Number.isFinite(v)) return 'Ambivert'
  if (v < 20) return 'Deep Introvert'
  if (v < 40) return 'Introvert'
  if (v < 60) return 'Ambivert'
  if (v < 82) return 'Extrovert'
  return Math.random() < 0.45 ? 'Omnivert' : 'Extrovert'
}

export function correlateChestAnatomy(sex) {
  if (sex === 'Female') {
    const r = Math.random()
    if (r < 0.68) return 'Breasts'
    if (r < 0.86) return 'Soft mixed chest'
    return 'Pectorals'
  }
  if (sex === 'Male') {
    const r = Math.random()
    if (r < 0.72) return 'Pectorals'
    if (r < 0.9) return 'Soft mixed chest'
    return 'Breasts'
  }
  if (sex === 'Intersex') {
    return Math.random() < 0.55 ? 'Soft mixed chest' : (Math.random() < 0.5 ? 'Breasts' : 'Pectorals')
  }
  if (sex === 'None/Construct' || sex === 'Non-Applicable') return 'N/A (Non-Human)'
  return ''
}

export function correlateGenderExpression(gender) {
  if (gender === 'Man' || gender === 'Transgender Man') return 'Masculine'
  if (gender === 'Woman' || gender === 'Transgender Woman') return 'Feminine'
  if (gender === 'Genderfluid') return 'Fluid / context-shifting'
  if (gender === 'Agender') return 'Neutral / unmarked'
  if (gender === 'Non-binary' || gender === 'Two-Spirit' || gender === 'Other') {
    const r = Math.random()
    if (r < 0.4) return 'Androgynous'
    if (r < 0.7) return 'Neutral / unmarked'
    return 'Fluid / context-shifting'
  }
  return ''
}

export function correlateTransitionNote(gender) {
  if (gender === 'Transgender Man' || gender === 'Transgender Woman') {
    const r = Math.random()
    if (r < 0.45) return 'Post-transition'
    if (r < 0.7) return 'Medically transitioning'
    if (r < 0.88) return 'Socially transitioning'
    return 'History private'
  }
  return 'None noted'
}

export function correlateRomanticFromSexual(orientation) {
  const map = {
    Heterosexual: 'Heteroromantic',
    Homosexual: 'Homoromantic',
    Bisexual: 'Biromantic',
    Pansexual: 'Panromantic',
    Demisexual: 'Demiromantic',
    Queer: 'Queer',
    Fluid: 'Fluid',
  }
  if (orientation === 'Asexual') {
    return Math.random() < 0.35 ? 'Aromantic' : (Math.random() < 0.5 ? 'Demiromantic' : 'Heteroromantic')
  }
  return map[orientation] || ''
}

export function speciesSpecialFeatureWeight(species, optionId) {
  if (optionId === 'Fully humanoid baseline') {
    if (species === 'Human') return 5
    if (HUMANLIKE_SPECIES.has(species)) return 2.2
    if (species === 'Android/Cyborg') return 1.4
    return 0.45
  }
  if (species === 'Human' && optionId !== 'Fully humanoid baseline' && optionId !== 'Custom') return 0.12
  if (species === 'Dragon/Draconic' && (optionId === 'Scaled patches' || optionId === 'Horns (curved)')) return 2.4
  if (species === 'Angel' && optionId === 'Winged (feathered)') return 2.8
  if (species === 'Demon' && optionId === 'Horns (curved)') return 2.6
  if (species === 'Fae/Fairy' && optionId === 'Bioluminescent markings') return 1.8
  if (species === 'Android/Cyborg' && (optionId === 'Holographic skin shift' || optionId === 'Neural port at temple')) {
    return 2.5
  }
  if (species === 'Non-Humanoid Alien' && optionId === 'Fully humanoid baseline') return 0.08
  return 1
}

export function clampInt(n, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.round(n)))
}

export function apparentAgeFromChronological(age, species) {
  const a = Number(age)
  if (!Number.isFinite(a)) return ''
  let window = 8
  if (species === 'Vampire' || species === 'Undead' || species === 'Elf' || species === 'Android/Cyborg') {
    window = 18
  }
  const lo = species === 'Vampire' || species === 'Elf' ? Math.max(1, a - 40) : Math.max(1, a - 15)
  const hi = Math.min(120, a + (species === 'Vampire' || species === 'Undead' ? 40 : 18))
  const delta = Math.floor(Math.random() * (window * 2 + 1)) - window
  return clampInt(a + delta, lo, hi)
}
