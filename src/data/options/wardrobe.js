/**
 * Wardrobe catalogs. Garment `id`s keep legacy saved labels.
 * Extra fields: occupies, styles, coverage.
 */

import { CUSTOM_ID, opt, customOpt } from './shared'

export { CUSTOM_ID }

export const NONE_ID = 'None'

export const STYLE_TAG_IDS = [
  'Casual',
  'Formal',
  'Combat',
  'Fantasy',
  'Cyberpunk',
  'Fetish/Leather',
  'Athletic',
  'Punk/Goth',
  'Military',
  'Western',
  'Business',
  'Swimwear',
  'Sleepwear',
  'Ceremonial',
]

export const OCCUPANCY_IDS = ['separates', 'one-piece']

/** @type {Record<string, Record<string, number>>} */
export const STYLE_GENRE_WEIGHTS = {
  Modern: {
    Casual: 2.4,
    Athletic: 1.5,
    Business: 1.5,
    Formal: 1.3,
    'Punk/Goth': 1.2,
    Cyberpunk: 0.85,
    Western: 0.7,
    Swimwear: 0.9,
    Sleepwear: 0.8,
    Combat: 0.35,
    Military: 0.45,
    Fantasy: 0.18,
    Ceremonial: 0.4,
    'Fetish/Leather': 0.55,
  },
  Fantasy: {
    Fantasy: 2.6,
    Ceremonial: 1.7,
    Combat: 1.8,
    Formal: 1.2,
    Casual: 0.7,
    Sleepwear: 0.7,
    Western: 0.5,
    Military: 0.45,
    'Fetish/Leather': 0.5,
    Athletic: 0.25,
    Business: 0.2,
    Cyberpunk: 0.12,
    'Punk/Goth': 0.55,
    Swimwear: 0.35,
  },
  'Sci-Fi': {
    Cyberpunk: 2.5,
    Military: 1.8,
    Combat: 1.5,
    Casual: 1.2,
    Formal: 1.1,
    Athletic: 1.0,
    Business: 0.8,
    Sleepwear: 0.7,
    Swimwear: 0.55,
    'Punk/Goth': 0.9,
    'Fetish/Leather': 0.6,
    Ceremonial: 0.45,
    Fantasy: 0.2,
    Western: 0.25,
  },
}

const ALL_STYLES = [...STYLE_TAG_IDS]

/**
 * @param {string} id
 * @param {string} image
 * @param {'top' | 'bottom' | 'onePiece' | 'outerwear' | 'footwear' | 'accessory'} occupies
 * @param {string[]} styles
 * @param {'full' | 'revealing'} [coverage]
 * @param {number} [weight]
 */
function garment(id, image, occupies, styles, coverage = 'full', weight = 1) {
  return {
    ...opt(id, '', image, '', weight),
    occupies,
    styles,
    coverage,
  }
}

function customGarment(occupies) {
  return {
    ...customOpt('A custom garment you describe in the companion text field.'),
    occupies,
    styles: ALL_STYLES,
    coverage: 'full',
  }
}

function customModifier(imageHint) {
  return customOpt('A custom value you describe in the companion text field.', imageHint)
}

const CASUAL = ['Casual']
const FORMAL_BIZ = ['Formal', 'Business', 'Ceremonial']
const COMBAT_MIL = ['Combat', 'Military']
const FANTASY = ['Fantasy', 'Ceremonial']
const CYBER = ['Cyberpunk']
const LEATHER = ['Fetish/Leather', 'Punk/Goth']
const ATHLETIC = ['Athletic', 'Casual']
const PUNK = ['Punk/Goth']
const WESTERN = ['Western']
const SWIM = ['Swimwear']
const SLEEP = ['Sleepwear']
const STREET = ['Casual', 'Punk/Goth', 'Cyberpunk']

export const WARDROBE_TOPS = [
  garment('None/Shirtless', 'shirtless, bare torso, no top garment', 'top', [...SWIM, ...SLEEP, ...ATHLETIC, ...LEATHER], 'revealing', 0.45),
  garment('T-Shirt', 'a fitted opaque t-shirt', 'top', [...CASUAL, ...ATHLETIC, ...STREET, ...WESTERN], 'full'),
  garment('Button-Up Shirt', 'a closed opaque button-up shirt', 'top', [...CASUAL, ...FORMAL_BIZ, ...WESTERN], 'full'),
  garment('Hoodie', 'a closed hoodie sweatshirt', 'top', [...CASUAL, ...ATHLETIC, ...STREET, ...SLEEP], 'full'),
  garment('Tank Top', 'a sleeveless tank top', 'top', [...ATHLETIC, ...CASUAL, ...SWIM, ...PUNK], 'revealing'),
  garment('Leather Jacket', 'a closed leather jacket worn as the top layer', 'top', [...LEATHER, ...PUNK, ...WESTERN, ...CYBER, 'Casual'], 'full'),
  garment('Blazer', 'a tailored blazer worn closed', 'top', [...FORMAL_BIZ], 'full'),
  garment('Sweater', 'an opaque knit sweater', 'top', [...CASUAL, ...FORMAL_BIZ, ...SLEEP], 'full'),
  garment('Crop Top', 'a short crop top leaving the midriff bare', 'top', [...ATHLETIC, ...SWIM, ...PUNK, ...LEATHER, ...CYBER], 'revealing'),
  garment('Vest', 'a closed vest over a shirt', 'top', [...FORMAL_BIZ, ...WESTERN, ...CASUAL], 'full'),
  garment('Tactical Vest', 'a closed tactical vest over a shirt', 'top', [...COMBAT_MIL, ...CYBER], 'full'),
  garment('Armor Plate', 'a solid chest plate over a padded undershirt', 'top', [...COMBAT_MIL, ...FANTASY], 'full'),
  garment('Robe', 'an opaque robe closed at the front', 'top', [...FANTASY, ...SLEEP, ...CEREMONIAL_SAFE()], 'full'),
  garment('Flannel (Unbuttoned)', 'an unbuttoned flannel shirt worn open', 'top', [...CASUAL, ...WESTERN, ...SLEEP], 'revealing'),
  garment('Corset', 'a structured corset as the top', 'top', [...LEATHER, ...FANTASY, ...CEREMONIAL_SAFE(), ...PUNK], 'revealing'),
  garment('Cape/Cloak', 'a heavy cape or cloak as the visible top', 'top', [...FANTASY, ...CEREMONIAL_SAFE(), ...PUNK], 'full'),
  customGarment('top'),
]

function CEREMONIAL_SAFE() {
  return ['Ceremonial']
}

export const WARDROBE_BOTTOMS = [
  garment('Jeans', 'opaque jeans', 'bottom', [...CASUAL, ...WESTERN, ...STREET, ...ATHLETIC], 'full'),
  garment('Cargo Pants', 'opaque cargo pants', 'bottom', [...CASUAL, ...COMBAT_MIL, ...CYBER], 'full'),
  garment('Sweatpants', 'opaque sweatpants', 'bottom', [...CASUAL, ...ATHLETIC, ...SLEEP], 'full'),
  garment('Shorts', 'opaque shorts to mid-thigh', 'bottom', [...CASUAL, ...ATHLETIC, ...SWIM], 'full'),
  garment('Leather Pants', 'opaque leather pants', 'bottom', [...LEATHER, ...PUNK, ...CYBER, ...WESTERN], 'full'),
  garment('Dress Pants', 'tailored opaque dress pants', 'bottom', [...FORMAL_BIZ], 'full'),
  garment('Skirt', 'an opaque skirt', 'bottom', [...CASUAL, ...FORMAL_BIZ, ...FANTASY, ...CEREMONIAL_SAFE()], 'full'),
  garment('Kilt', 'a kilt', 'bottom', [...CASUAL, ...CEREMONIAL_SAFE(), ...FANTASY, ...WESTERN], 'full'),
  garment('Armor Greaves', 'armored greaves over hose or padding', 'bottom', [...COMBAT_MIL, ...FANTASY], 'full'),
  garment('Daisy Dukes', 'very short denim daisy dukes', 'bottom', [...CASUAL, ...WESTERN, ...SWIM], 'revealing'),
  garment('Compression Shorts', 'tight compression shorts', 'bottom', [...ATHLETIC, ...SWIM], 'revealing'),
  garment('Loincloth', 'a loincloth', 'bottom', [...FANTASY, ...SWIM, ...LEATHER], 'revealing'),
  garment('Sarong', 'a wrapped sarong', 'bottom', [...SWIM, ...CASUAL, ...FANTASY, ...CEREMONIAL_SAFE()], 'full'),
  customGarment('bottom'),
]

export const WARDROBE_ONE_PIECES = [
  garment('Jumpsuit', 'a closed opaque jumpsuit', 'onePiece', [...CASUAL, ...CYBER, ...COMBAT_MIL, ...ATHLETIC], 'full'),
  garment('Flight Suit', 'a closed flight suit', 'onePiece', [...CYBER, ...COMBAT_MIL], 'full'),
  garment('Overalls', 'opaque overalls over a shirt', 'onePiece', [...CASUAL, ...WESTERN], 'full'),
  garment('Gi / Keikogi', 'a closed martial-arts gi', 'onePiece', [...ATHLETIC, ...CASUAL, ...CEREMONIAL_SAFE()], 'full'),
  garment('Full Plate Armor', 'closed full plate armor over padding', 'onePiece', [...COMBAT_MIL, ...FANTASY, ...CEREMONIAL_SAFE()], 'full'),
  garment('Long Robe', 'a floor-length opaque robe worn closed', 'onePiece', [...FANTASY, ...CEREMONIAL_SAFE(), ...SLEEP], 'full'),
  garment('Kimono', 'a closed kimono', 'onePiece', [...CEREMONIAL_SAFE(), ...CASUAL, ...FANTASY], 'full'),
  garment('Gown', 'a floor-length opaque gown', 'onePiece', [...FORMAL_BIZ, ...CEREMONIAL_SAFE(), ...FANTASY], 'full'),
  garment('Midi Dress', 'an opaque midi dress', 'onePiece', [...CASUAL, ...FORMAL_BIZ, ...CEREMONIAL_SAFE()], 'full'),
  garment('Catsuit', 'a form-fitting catsuit', 'onePiece', [...LEATHER, ...CYBER, ...PUNK], 'revealing'),
  garment('Wetsuit', 'a full wetsuit', 'onePiece', [...SWIM, ...ATHLETIC], 'full'),
  garment('One-Piece Swimsuit', 'a one-piece swimsuit', 'onePiece', [...SWIM], 'revealing'),
  garment('Pajama Set', 'a closed matching pajama set', 'onePiece', [...SLEEP, ...CASUAL], 'full'),
  customGarment('onePiece'),
]

export const WARDROBE_OUTERWEAR = [
  garment(NONE_ID, '', 'outerwear', ALL_STYLES, 'full', 1.4),
  garment('Coat', 'a closed overcoat', 'outerwear', [...CASUAL, ...FORMAL_BIZ, ...WESTERN], 'full'),
  garment('Trench Coat', 'a closed trench coat', 'outerwear', [...FORMAL_BIZ, ...CYBER, ...PUNK], 'full'),
  garment('Cloak', 'a heavy cloak worn over the outfit', 'outerwear', [...FANTASY, ...CEREMONIAL_SAFE(), ...PUNK], 'full'),
  garment('Parka', 'a closed parka', 'outerwear', [...CASUAL, ...ATHLETIC, ...COMBAT_MIL], 'full'),
  garment('Bomber Jacket', 'a closed bomber jacket', 'outerwear', [...CASUAL, ...ATHLETIC, ...CYBER, ...MILITARY_ONLY()], 'full'),
  garment('Raincoat', 'a closed raincoat', 'outerwear', [...CASUAL, ...BUSINESS_ONLY()], 'full'),
  garment('Cape', 'a cape fastened at the shoulders', 'outerwear', [...FANTASY, ...CEREMONIAL_SAFE(), ...PUNK, ...COMBAT_MIL], 'full'),
  garment('Poncho', 'a poncho worn over the outfit', 'outerwear', [...WESTERN, ...CASUAL, ...FANTASY], 'full'),
  customGarment('outerwear'),
]

function MILITARY_ONLY() {
  return ['Military']
}

function BUSINESS_ONLY() {
  return ['Business']
}

export const WARDROBE_FOOTWEAR = [
  garment('Barefoot', 'barefoot, no shoes', 'footwear', [...SWIM, ...SLEEP, ...FANTASY, ...CASUAL], 'full', 0.55),
  garment('Boots (Combat)', 'combat boots', 'footwear', [...COMBAT_MIL, ...CYBER, ...PUNK, ...CASUAL], 'full'),
  garment('Boots (Cowboy)', 'cowboy boots', 'footwear', [...WESTERN, ...CASUAL], 'full'),
  garment('Sneakers', 'sneakers', 'footwear', [...CASUAL, ...ATHLETIC, ...STREET], 'full'),
  garment('Dress Shoes', 'polished dress shoes', 'footwear', [...FORMAL_BIZ], 'full'),
  garment('Sandals', 'sandals', 'footwear', [...CASUAL, ...SWIM, ...FANTASY], 'full'),
  garment('Armored Boots', 'armored boots', 'footwear', [...COMBAT_MIL, ...FANTASY, ...CYBER], 'full'),
  garment('High Heels', 'high-heeled shoes', 'footwear', [...FORMAL_BIZ, ...LEATHER, ...CEREMONIAL_SAFE()], 'full'),
  garment('Platform Boots', 'platform boots', 'footwear', [...PUNK, ...LEATHER, ...CYBER], 'full'),
  customGarment('footwear'),
]

export const WARDROBE_ACCESSORIES = [
  garment('Dog Tags', 'dog tags on a chain', 'accessory', [...COMBAT_MIL, ...CASUAL, ...ATHLETIC], 'full'),
  garment('Sword/Weapon', 'a visible sheathed sword or worn weapon', 'accessory', [...FANTASY, ...COMBAT_MIL, ...CEREMONIAL_SAFE()], 'full'),
  garment('Backpack', 'a worn backpack', 'accessory', [...CASUAL, ...ATHLETIC, ...COMBAT_MIL, ...CYBER], 'full'),
  garment('Glasses/Goggles', 'glasses or goggles', 'accessory', [...CASUAL, ...CYBER, ...FORMAL_BIZ, ...ATHLETIC], 'full'),
  garment('Hat/Helmet', 'a hat or helmet', 'accessory', [...WESTERN, ...COMBAT_MIL, ...CASUAL, ...FANTASY, ...CEREMONIAL_SAFE()], 'full'),
  garment('Belt & Holster', 'a belt with holster', 'accessory', [...WESTERN, ...COMBAT_MIL, ...CYBER], 'full'),
  garment('Jewelry/Rings', 'visible jewelry and rings', 'accessory', [...FORMAL_BIZ, ...CASUAL, ...CEREMONIAL_SAFE(), ...LEATHER, ...FANTASY], 'full'),
  garment('Scarf/Bandana', 'a scarf or bandana', 'accessory', [...CASUAL, ...WESTERN, ...PUNK, ...FANTASY], 'full'),
  garment('Watch', 'a wristwatch', 'accessory', [...CASUAL, ...FORMAL_BIZ, ...CYBER], 'full'),
  garment('Piercings', 'visible piercings', 'accessory', [...PUNK, ...LEATHER, ...CASUAL], 'full'),
  garment('Crown/Tiara', 'a crown or tiara', 'accessory', [...CEREMONIAL_SAFE(), ...FANTASY, ...FORMAL_BIZ], 'full'),
  garment('Wrist Guards', 'wrist guards or bracers', 'accessory', [...COMBAT_MIL, ...FANTASY, ...ATHLETIC, ...CYBER], 'full'),
  customGarment('accessory'),
]

export const WARDROBE_PALETTES = [
  opt('Monochrome', '', 'monochrome black, white, and grey palette', '', 1),
  opt('Earth tones', '', 'earth-tone palette: brown, olive, rust, cream', '', 1),
  opt('Jewel tones', '', 'jewel-tone palette: emerald, sapphire, ruby, amethyst', '', 1),
  opt('Pastel', '', 'soft pastel palette', '', 0.7),
  opt('Neon', '', 'neon and saturated night-city colors', '', 0.65),
  opt('Military drab', '', 'olive drab, coyote, and muted military colors', '', 0.85),
  opt('Oxblood & black', '', 'oxblood and black palette', '', 0.8),
  opt('White & gold', '', 'white and gold ceremonial palette', '', 0.7),
  opt('Navy & silver', '', 'navy and silver palette', '', 0.85),
  opt('Sunset', '', 'sunset palette: terracotta, gold, deep purple', '', 0.6),
  customModifier('a custom color palette you describe'),
]

export const WARDROBE_FABRICS = [
  opt('Cotton', '', 'matte cotton fabric', '', 1),
  opt('Wool', '', 'wool fabric with visible weave', '', 0.9),
  opt('Leather', '', 'leather material, softly worn', '', 0.95),
  opt('Silk', '', 'silk with a soft sheen', '', 0.7),
  opt('Linen', '', 'breathable rumpled linen', '', 0.75),
  opt('Denim', '', 'denim fabric', '', 0.9),
  opt('Canvas', '', 'waxed canvas', '', 0.8),
  opt('Technical nylon', '', 'technical nylon and ripstop', '', 0.85),
  opt('Chainmail/plate', '', 'metal armor plates and mail', '', 0.55),
  opt('Velvet', '', 'velvet pile fabric', '', 0.55),
  opt('Latex/vinyl', '', 'glossy latex or vinyl', '', 0.45),
  customModifier('a custom fabric or material you describe'),
]

export const WARDROBE_CONDITIONS = [
  opt('Pristine', '', 'pristine, freshly tailored, no wear', '', 1),
  opt('Lived-in', '', 'lived-in clothing with natural wrinkles and light wear', '', 1.2),
  opt('Travel-worn', '', 'travel-worn, dusted, creased from the road', '', 0.9),
  opt('Battle-damaged', '', 'scuffed, torn edges, battle-damaged but still wearable', '', 0.55),
  opt('Ceremonial-new', '', 'immaculate ceremonial finish, pressed and gleaming', '', 0.7),
  customModifier('a custom wear state you describe'),
]

export const WARDROBE_GARMENTS = [
  ...WARDROBE_TOPS,
  ...WARDROBE_BOTTOMS,
  ...WARDROBE_ONE_PIECES,
  ...WARDROBE_OUTERWEAR,
  ...WARDROBE_FOOTWEAR,
  ...WARDROBE_ACCESSORIES,
]

/** @type {Record<string, typeof WARDROBE_TOPS>} */
export const WARDROBE_SLOT_CATALOGS = {
  top: WARDROBE_TOPS,
  bottom: WARDROBE_BOTTOMS,
  onePiece: WARDROBE_ONE_PIECES,
  outerwear: WARDROBE_OUTERWEAR,
  footwear: WARDROBE_FOOTWEAR,
  accessories: WARDROBE_ACCESSORIES,
  palette: WARDROBE_PALETTES,
  fabric: WARDROBE_FABRICS,
  condition: WARDROBE_CONDITIONS,
}

/**
 * @param {string} occupies
 * @param {string} id
 */
export function findWardrobeOption(occupies, id) {
  const list = WARDROBE_SLOT_CATALOGS[occupies] || []
  return list.find((o) => o.id === id) ?? null
}
