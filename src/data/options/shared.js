/**
 * Option record helpers. Saved select values are option `id` strings (legacy labels).
 */

export const CUSTOM_ID = 'Custom'

export const WEIGHT_CUSTOM = 0.08
export const WEIGHT_NA = 0.12
export const WEIGHT_NONE = 0.15
export const WEIGHT_RARE = 0.28

export function opt(id, lore, image, behavior, weight = 1) {
  return {
    id,
    label: id,
    lore: lore || '',
    image: image || '',
    behavior: behavior || '',
    weight: weight ?? 1,
  }
}

export function customOpt(lore, image = '', behavior = '') {
  return opt(
    CUSTOM_ID,
    lore || 'A custom value you specify in the companion text field.',
    image || '',
    behavior || '',
    WEIGHT_CUSTOM,
  )
}

export function naOpt(id, lore, image = '', behavior = '', weight = WEIGHT_NA) {
  return opt(id, lore, image, behavior, weight)
}

const BODY_PART_IDS = ['Slender', 'Toned', 'Muscular', 'Thick', 'Massive', 'Soft', 'Defined']

const REGION_META = {
  forearms: {
    part: 'forearms',
    visual: 'forearms from wrist to elbow',
    social: 'rolled sleeves, handshake grip, and how they lean on a table',
  },
  upper_arms: {
    part: 'upper arms',
    visual: 'biceps and triceps',
    social: 'how they carry bags, lovers, or weapons, and how shirts stretch at the sleeve',
  },
  shoulders: {
    part: 'shoulders',
    visual: 'shoulder girdle and deltoids',
    social: 'doorways, crowds, and whether they fill a room or fold inward',
  },
  neck: {
    part: 'neck',
    visual: 'neck length and thickness',
    social: 'collars, jewelry, kisses, and where tension lives',
  },
  chest_size: {
    part: 'chest',
    visual: 'chest mass (pectorals or breasts per anatomy)',
    social: 'posture, breath, armor fit, and what they hide or display',
  },
  abs: {
    part: 'midsection',
    visual: 'abdomen and core',
    social: 'how they sit, brace for a hit, and whether shirts cling or drape',
  },
  back: {
    part: 'back',
    visual: 'upper back, lats, and spine line',
    social: 'who has seen their scars and how they turn away in a fight or a bedroom',
  },
  glutes: {
    part: 'glutes and hips',
    visual: 'hips and glute mass',
    social: 'walk, chair sprawl, and the silhouette from behind',
  },
  upper_legs: {
    part: 'thighs',
    visual: 'thighs and quads',
    social: 'sprinting, kneeling, and how trousers or armor sit',
  },
  lower_legs: {
    part: 'calves',
    visual: 'calves and shins',
    social: 'footsteps, stance, and old injuries that ache before weather',
  },
}

const REGION_FLAVOR = {
  forearms: {
    Slender: {
      lore: 'Narrow, lean forearms with long tendons. Reads agile and precise rather than powerful.',
      image: 'lean slender forearms with visible tendons and a narrow wrist-to-elbow line',
      behavior: 'Gestures look exact. Sleeves hang; people notice hands before bulk.',
    },
    Toned: {
      lore: 'Working-forearm fit without bulk. Everyday strength you only clock when they grip something.',
      image: 'lightly athletic forearms with modest muscle shape and clean wrists',
      behavior: 'They look like they actually use their hands — climbing, tools, or too much typing.',
    },
    Muscular: {
      lore: 'Clear hypertrophy along the forearm. Trained grip, not accident.',
      image: 'muscular forearms with visible flexor mass and a thicker wrist',
      behavior: 'A handshake or a bottle-open becomes a small performance of strength.',
    },
    Thick: {
      lore: 'Dense, heavy forearms — powerlifter or laborer levers. Hard to put a watch on.',
      image: 'thick dense forearms with heavy muscle and little taper at the wrist',
      behavior: 'Tables feel smaller when they rest their arms. People give them the heavy bag.',
    },
    Massive: {
      lore: 'Scale-breaking forearm mass that makes cuffs a negotiation. Cartoonish or heroic.',
      image: 'exceptionally massive, heavily muscled forearms that look almost too large for the wrist',
      behavior: 'Strangers stare at their arms first. Door handles and mugs look like toys.',
    },
    Soft: {
      lore: 'Gentle forearm volume without cuts. Comfort, recovery, or a life not spent gripping iron.',
      image: 'soft, lightly padded forearms without sharp muscle separation',
      behavior: 'Looks approachable. Strength, if any, hides until they actually lift.',
    },
    Defined: {
      lore: 'Crisp tendon and muscle lines without freak size. Deliberate conditioning.',
      image: 'defined forearms with clear muscle and tendon separation, not bulky',
      behavior: 'Reads as someone who trains for looks and function, not just mass.',
    },
  },
  upper_arms: {
    Slender: {
      lore: 'Narrow biceps and triceps. Sleeves look borrowed; lines stay elegant.',
      image: 'slender upper arms with little biceps mass and a long, lean line',
      behavior: 'They disappear in a crowd of gym bodies. Carrying looks effortful or graceful, not easy.',
    },
    Toned: {
      lore: 'Visible work without bulk. Athletic sleeves, not costume muscles.',
      image: 'toned biceps and triceps with light shape under the skin',
      behavior: 'Looks fit in a t-shirt. Nobody asks if they compete; they just look capable.',
    },
    Muscular: {
      lore: 'Clear biceps peak and triceps horseshoe. Trained, not accidental.',
      image: 'muscular upper arms with a clear biceps peak and full triceps',
      behavior: 'Crossed arms become a statement. People assume they can move furniture.',
    },
    Thick: {
      lore: 'Dense arm mass — strongman more than swimsuit. Hard to find sleeves that fit.',
      image: 'thick, densely muscled upper arms with little taper',
      behavior: 'Hugs are a lot of person. They take the outside of sidewalks without thinking.',
    },
    Massive: {
      lore: 'Upper arms that change how doors and jackets feel. Heroic or intimidating scale.',
      image: 'massive hypertrophied biceps and triceps that stretch any short sleeve',
      behavior: 'People step aside. Flexing is almost involuntary when they reach overhead.',
    },
    Soft: {
      lore: 'Soft upper-arm volume. Warmth, age, or a pause from training.',
      image: 'soft upper arms with gentle volume and little muscle cut',
      behavior: 'Looks huggable. Strength is a surprise if it shows up.',
    },
    Defined: {
      lore: 'Separation without cartoon size. Crisp silhouette in a tank, still human-scale.',
      image: 'defined upper arms with visible biceps and triceps lines, moderate size',
      behavior: 'Reads as disciplined. They notice when clothes hide the work.',
    },
  },
  shoulders: {
    Slender: {
      lore: 'Narrow shoulder girdle. Frames look tailored even when they are not.',
      image: 'narrow, slender shoulders with a delicate clavicle line',
      behavior: 'They can vanish in a crowd or look swallowed by coats. Doorways never feel tight.',
    },
    Toned: {
      lore: 'Athletic shoulders without a powerlifter shelf. Capable, not theatrical.',
      image: 'toned, athletic shoulders with modest deltoid shape',
      behavior: 'Looks like they swim or climb. Backpacks sit well.',
    },
    Muscular: {
      lore: 'Rounded delts and a wider yoke. Trained for pressing or posing.',
      image: 'muscular rounded shoulders with clear deltoid caps',
      behavior: 'They fill a doorway. People clock them as strong before they speak.',
    },
    Thick: {
      lore: 'Heavy, blocky shoulders built for yokes and labor, not just mirrors.',
      image: 'thick blocky shoulders with dense deltoid and trap mass',
      behavior: 'Coats sit high. They look like they could take a hit and keep walking.',
    },
    Massive: {
      lore: 'A shelf of shoulder that changes architecture around them. Heroic width.',
      image: 'massively broad, heavily muscled shoulders that dominate the silhouette',
      behavior: 'Rooms rearrange around them. Side-hugs are logistics.',
    },
    Soft: {
      lore: 'Soft shoulder line, less cap. Comforting rather than armored.',
      image: 'soft, rounded shoulders without sharp deltoid definition',
      behavior: 'Looks like a good place to cry. Armor and structured jackets sit oddly.',
    },
    Defined: {
      lore: 'Clean clavicle-to-delt lines without freak width. Intentional shape.',
      image: 'defined shoulders with clear deltoid shape and a clean collarbone',
      behavior: 'Reads sculpted, not bulky. Tailoring loves them.',
    },
  },
  neck: {
    Slender: {
      lore: 'A long or narrow neck. Jewelry and collars become part of the face.',
      image: 'a slender neck with a long, elegant line and little trapezius bulk',
      behavior: 'Looks vulnerable or aristocratic. People notice swallowing, tension, and perfume.',
    },
    Toned: {
      lore: 'A fit neck without a powerlifter flare. Athletic, not threatening.',
      image: 'a toned neck with light muscle and a clean jaw-to-shoulder line',
      behavior: 'Collars sit normally. Stress still lives here, but it does not bulk the silhouette.',
    },
    Muscular: {
      lore: 'Thickened neck from training or genetics. Reads as power or stubbornness.',
      image: 'a muscular, thickened neck with visible sternomastoid and trap tie-in',
      behavior: 'Ties and chokers are a project. They look hard to knock out.',
    },
    Thick: {
      lore: 'A short, dense neck. Bullish, grounded, easy to read as tough.',
      image: 'a thick, short neck with dense muscle and little length',
      behavior: 'Looks like a battering ram in a crowd. Pillows and headrests never quite fit.',
    },
    Massive: {
      lore: 'Neck mass that erases the jaw-to-shoulder gap. Almost armor.',
      image: 'an exceptionally thick, massive neck that nearly meets the jaw and traps',
      behavior: 'People underestimate how much space they take at a table. Collars do not close.',
    },
    Soft: {
      lore: 'Soft neck without cords. Youth, ease, or a life not spent bracing.',
      image: 'a soft neck with smooth skin and little visible muscle cord',
      behavior: 'Looks kissable and unguarded. Tension shows as color, not bulk.',
    },
    Defined: {
      lore: 'Visible cords and a clean sternomastoid without bulk. Conditioned.',
      image: 'a defined neck with visible muscle lines, not overly thick',
      behavior: 'Reads as trained or high-strung. Jewelry sits against anatomy, not padding.',
    },
  },
  chest_size: {
    Slender: {
      lore: 'A narrow, low-mass chest. Ribcage shows more than muscle or breast tissue.',
      image: 'a slender, narrow chest with little pectoral or breast mass',
      behavior: 'Clothes hang. They may bind, layer, or slouch to change the read.',
    },
    Toned: {
      lore: 'Light athletic chest — pecs or modest tissue with shape, not bulk.',
      image: 'a toned chest with light pectoral or breast shape, athletic not heavy',
      behavior: 'Looks fit in a closed shirt. Neither imposing nor fragile.',
    },
    Muscular: {
      lore: 'Trained pec mass (or a firm, lifted chest). Clear gym or labor story.',
      image: 'a muscular chest with full pectoral mass and a firm, lifted shape',
      behavior: 'Hugs are a lot of torso. Armor and buttons strain at the sternum.',
    },
    Thick: {
      lore: 'Dense chest volume — power, padding, or both. Heavy on the breath.',
      image: 'a thick, densely built chest with heavy mass across the pecs or breasts',
      behavior: 'People bounce off them in crowds. Bras, binders, and plates all need extra room.',
    },
    Massive: {
      lore: 'Chest mass that precedes them into a room. Heroic pecs or very full breasts.',
      image: 'a massive, heavy chest with extreme pectoral or breast volume',
      behavior: 'Strangers stare, then pretend they did not. Sleeping on their stomach is a joke.',
    },
    Soft: {
      lore: 'A soft chest — comfort, fat pad, or untrained tissue. Warmth over cuts.',
      image: 'a soft chest with gentle volume and little muscle separation',
      behavior: 'Looks like a place to rest a head. They may be shy or fiercely unapologetic about it.',
    },
    Defined: {
      lore: 'Separation and line without freak size. Crisp pecs or a shapely, firm chest.',
      image: 'a defined chest with clear pectoral or breast shape and visible lines, moderate size',
      behavior: 'Reads intentional. They know how fabric will sit before they dress.',
    },
    Flat: {
      lore: 'A flat chest plane — little breast tissue and little pec swell. Binder, genetics, or both.',
      image: 'a flat chest with almost no pectoral swell or breast tissue',
      behavior: 'Shirts hang straight. They may be relieved, dysphoric, or indifferent — do not assume.',
    },
    Broad: {
      lore: 'Wide chest shield. Powerlifter or swimmer breadth more than isolated pec peaks.',
      image: 'a broad chest with wide pectoral span and a shield-like front',
      behavior: 'They take up sidewalk. People assume protection or threat from the width alone.',
    },
  },
  abs: {
    Slender: {
      lore: 'A narrow waist and shallow core. Elegant, maybe fragile if untrained.',
      image: 'a slender midsection with a narrow waist and little abdominal mass',
      behavior: 'Belts cinch extra. They look easy to wrap an arm around — or to worry about.',
    },
    Toned: {
      lore: 'Some ab shape in good light. Everyday athletic core.',
      image: 'a lightly toned abdomen with subtle muscle shape',
      behavior: 'Looks fit when the shirt rides up. They sit like someone who still moves.',
    },
    Muscular: {
      lore: 'Visible trained abs and obliques. Bracing is a habit.',
      image: 'a muscular abdomen with visible abs and oblique shape',
      behavior: 'They stand like they are ready to take a punch. Shirts cling whether they want them to or not.',
    },
    Thick: {
      lore: 'A thick, powerful core — brick more than six-pack. Force transfer, not fashion.',
      image: 'a thick, densely muscled midsection with a blocky core rather than skinny abs',
      behavior: 'Looks immovable. Chairs and harnesses feel small.',
    },
    Massive: {
      lore: 'An armored midsection of muscle and/or mass. Doors and desks notice.',
      image: 'a massive, heavily built midsection with thick abdominal mass',
      behavior: 'Hugs are a collision. They eat like the furnace needs feeding.',
    },
    Soft: {
      lore: 'A soft middle. Comfort, dad-bod ease, or a body that refused the cut.',
      image: 'a soft abdomen with a gentle belly and little muscle cut',
      behavior: 'Looks lived-in. They may hide it, rest a hand on it, or refuse shame.',
    },
    Defined: {
      lore: 'Clear abdominal lines without superhero size. Conditioning you can count.',
      image: 'a defined abdomen with visible ab separation, moderate thickness',
      behavior: 'They know lighting. Confidence or vanity lives in how they stand.',
    },
  },
  back: {
    Slender: {
      lore: 'A narrow back. Spine and shoulder blades tell more of the story than lats.',
      image: 'a slender back with a visible spine line and little lat width',
      behavior: 'Looks easy to shield — or easy to overlook. Wings, if any, would dwarf them.',
    },
    Toned: {
      lore: 'Athletic back without a cape of lats. Functional pull strength.',
      image: 'a toned back with light lat shape and a clean spine line',
      behavior: 'Looks good in a tank from behind. They can climb or row without announcing it.',
    },
    Muscular: {
      lore: 'A trained V-taper or thick yoke. Pull-ups, labor, or vanity — all leave a map.',
      image: 'a muscular back with developed lats and a clear V-taper',
      behavior: 'People watch them walk away. Shirts wrinkle across the scapulae.',
    },
    Thick: {
      lore: 'A dense, blocky back. Strongman more than swimsuit taper.',
      image: 'a thick, densely muscled back with heavy traps and lats',
      behavior: 'Looks like a wall. Massages are a professional challenge.',
    },
    Massive: {
      lore: 'Back mass that swallows a doorway in silhouette. Wings optional, width not.',
      image: 'a massive, extremely wide and thick back that dominates the rear silhouette',
      behavior: 'They eclipse people standing behind them. Coats need a tailor.',
    },
    Soft: {
      lore: 'A soft back without lat flare. Comfortable to rest against.',
      image: 'a soft back with gentle volume and little muscle separation',
      behavior: 'Looks like a sofa with a pulse. They may be shy about being seen from behind.',
    },
    Defined: {
      lore: 'Visible traps, lats, and spinal erectors without freak width.',
      image: 'a defined back with visible muscle lines and moderate lat width',
      behavior: 'Reads as trained. Someone has traced those lines, or they wish someone would.',
    },
  },
  glutes: {
    Slender: {
      lore: 'A flat-to-narrow hip and glute line. Clothes fall straight.',
      image: 'slender hips and glutes with little roundness or mass',
      behavior: 'Sits small in a chair. May envy or enjoy how little they have to manage.',
    },
    Toned: {
      lore: 'Athletic glutes — runner or lifter without extreme roundness.',
      image: 'toned, athletic glutes with modest roundness',
      behavior: 'Walks with a little spring. Jeans fit like they were meant to.',
    },
    Muscular: {
      lore: 'Trained glute mass. Power, lift, and a silhouette people clock from behind.',
      image: 'muscular, lifted glutes with clear shape and firm mass',
      behavior: 'They know when someone is looking. Stairs are a small stage.',
    },
    Thick: {
      lore: 'Heavy hips and glutes — power, padding, or both. Chairs notice.',
      image: 'thick, densely built glutes and hips with substantial mass',
      behavior: 'Takes up the seat. Movement has weight; dancing or walking both announce them.',
    },
    Massive: {
      lore: 'Glute and hip mass that changes tailoring. Heroic, erotic, or simply a lot of person.',
      image: 'massive, extremely full glutes and hips that dominate the lower silhouette',
      behavior: 'Crowds part or stare. They have opinions about benches.',
    },
    Soft: {
      lore: 'Soft hip and glute volume. Comfort, curves, or untrained ease.',
      image: 'soft, rounded glutes and hips with gentle volume',
      behavior: 'Looks inviting. They may dress to hide or to frame it on purpose.',
    },
    Defined: {
      lore: 'A shapely, separated glute line without extreme size. Conditioned.',
      image: 'defined glutes with a clear lifted shape and visible muscle line, moderate size',
      behavior: 'Reads intentional. They notice how fabric splits or clings.',
    },
  },
  upper_legs: {
    Slender: {
      lore: 'Narrow thighs. Gaps, long lines, and trousers that never fight.',
      image: 'slender thighs with a long lean line and little quad mass',
      behavior: 'Looks fast or fragile. Kneeling on stone is personal.',
    },
    Toned: {
      lore: 'Athletic thighs without tree-trunk mass. Runner, dancer, or casual lifter.',
      image: 'toned thighs with light quad shape',
      behavior: 'Walks like they could still sprint. Seats on transit are not a crisis.',
    },
    Muscular: {
      lore: 'Developed quads and hamstrings. Squats, hills, or a life on foot.',
      image: 'muscular thighs with visible quadriceps shape',
      behavior: 'Trousers pull at the thigh. People assume sport or labor.',
    },
    Thick: {
      lore: 'Dense thigh mass — power, work, or genetics. Knees have done miles.',
      image: 'thick, densely muscled or heavy thighs with little gap',
      behavior: 'Chairs are a squeeze. They sit with authority or discomfort, not daintiness.',
    },
    Massive: {
      lore: 'Thighs that change saddles, seats, and armor. Heroic or overwhelming mass.',
      image: 'massive, heavily built thighs that look extremely thick in any trousers',
      behavior: 'Crossing legs is optional. People notice them sitting down before they notice the face.',
    },
    Soft: {
      lore: 'Soft thighs. Warmth, ease, or a body that declined the cut.',
      image: 'soft thighs with gentle volume and little muscle cut',
      behavior: 'Looks comfortable to fall asleep against. They may tug at hems out of habit.',
    },
    Defined: {
      lore: 'Quad sweep and separation without freak size.',
      image: 'defined thighs with visible quad lines, athletic not enormous',
      behavior: 'Reads as trained. Shorts are a choice with consequences.',
    },
  },
  lower_legs: {
    Slender: {
      lore: 'Narrow calves and shins. Ankles look breakable; boots look borrowed.',
      image: 'slender calves and shins with a narrow ankle',
      behavior: 'Footsteps are light. They can look elegant or underfed depending on the room.',
    },
    Toned: {
      lore: 'Walking-fit calves. Hills, commutes, or light training.',
      image: 'toned calves with modest muscle shape',
      behavior: 'Looks like they actually walk places. Boots fit like they should.',
    },
    Muscular: {
      lore: 'Diamond calves from training or genetics. Hard to hide in slim trousers.',
      image: 'muscular calves with a clear diamond shape',
      behavior: 'People notice them in shorts. Standing still still looks athletic.',
    },
    Thick: {
      lore: 'Dense lower legs — labor, lifting, or edema of history. Sturdy columns.',
      image: 'thick, dense calves and shins with heavy mass',
      behavior: 'Looks planted. Hard to knock over; socks and boots need extra.',
    },
    Massive: {
      lore: 'Calf mass that stretches boots. Bodybuilder or simply huge architecture.',
      image: 'massive, extremely developed calves that dominate the lower leg',
      behavior: 'They sound heavier on stairs. Skinny jeans are a myth.',
    },
    Soft: {
      lore: 'Soft calves without a diamond. Untrained or simply padded.',
      image: 'soft calves with gentle volume and little muscle definition',
      behavior: 'Looks ordinary and human. They may hate shorts or not think about them at all.',
    },
    Defined: {
      lore: 'Clear calf and shin lines without freak size. Conditioned.',
      image: 'defined calves with visible muscle shape, moderate size',
      behavior: 'Reads as someone who trains legs, not just mirrors.',
    },
  },
}

/**
 * Per-region body-part options so "Massive" forearms ≠ "Massive" abs.
 * @param {keyof typeof REGION_META} region
 */
export function bodyPartOptions(region) {
  const meta = REGION_META[region]
  const flavor = REGION_FLAVOR[region] || {}
  if (!meta) return BODY_PART_IDS.map((id) => opt(id, `${id} ${region}.`, `${id} ${region}`, `${id} ${region}`))

  const options = BODY_PART_IDS.map((id) => {
    const f = flavor[id]
    if (f) return opt(id, f.lore, f.image, f.behavior)
    return opt(
      id,
      `${id} ${meta.part}.`,
      `${id} ${meta.visual}`,
      `Their ${meta.part} read as ${id.toLowerCase()} in ${meta.social}.`,
    )
  })

  if (region === 'chest_size') {
    const chestIds = ['Flat', 'Defined', 'Broad', 'Massive', 'Soft', 'Slender', 'Toned']
    const ordered = chestIds.map((id) => {
      const f = flavor[id]
      return f
        ? opt(id, f.lore, f.image, f.behavior)
        : opt(id, `${id} chest.`, `${id} chest`, `Chest reads as ${id.toLowerCase()}.`)
    })
    ordered.push(
      naOpt(
        'N/A (Non-Human)',
        'Chest anatomy is not a human pec/breast story — plates, hollows, or a body plan that ignores this field.',
        '',
        'Do not narrate human cleavage or pec bounce; the torso works on different rules.',
      ),
    )
    ordered.push(
      customOpt(
        'A custom chest / pectoral specification.',
        '',
        'Use the custom chest description in scenes and images.',
      ),
    )
    return ordered
  }

  options.push(
    customOpt(
      `A custom ${meta.part} specification that breaks the usual categories.`,
      '',
      `Use the custom ${meta.part} text in how they move and are seen.`,
    ),
  )
  return options
}

export function normalizeSelectOptions(options) {
  if (!Array.isArray(options)) return []
  return options.map((o) => {
    if (typeof o === 'string') {
      return { id: o, label: o, lore: '', image: '', behavior: '', weight: 1 }
    }
    return {
      id: o.id,
      label: o.label ?? o.id,
      lore: o.lore ?? '',
      image: o.image ?? '',
      behavior: o.behavior ?? '',
      weight: o.weight ?? 1,
    }
  })
}

export function pickWeightedFrom(options, weightOf) {
  const list = normalizeSelectOptions(options)
  if (!list.length) return ''
  const weights = list.map((o) => {
    const w = weightOf ? weightOf(o) : o.weight
    return Number.isFinite(w) && w > 0 ? w : 0
  })
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return list[Math.floor(Math.random() * list.length)].id
  let r = Math.random() * total
  for (let i = 0; i < list.length; i++) {
    r -= weights[i]
    if (r <= 0) return list[i].id
  }
  return list[list.length - 1].id
}
