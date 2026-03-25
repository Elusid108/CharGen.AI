/**
 * Randomization data pools for generating random character attributes
 */

export const randomNames = {
  first: [
    'Kael', 'Mara', 'Thorne', 'Elara', 'Jax', 'Vesper', 'Silas', 'Lyra', 'Orion', 'Nyx',
    'Rowan', 'Sage', 'Cade', 'Rian', 'Magnus', 'Gunner', 'Ryder', 'Axel', 'Vane', 'Zara',
    'Quinn', 'Soren', 'Dante', 'Ash', 'Kai', 'Nova', 'Pax', 'Rune', 'Talon', 'Wren',
    'Blaze', 'Hex', 'Onyx', 'Storm', 'Phoenix', 'Raven', 'Zephyr', 'Echo', 'Cipher', 'Atlas',
    'Brin', 'Caius', 'Delphine', 'Ember', 'Frost', 'Grim', 'Havoc', 'Iris', 'Jinx', 'Knox',
    'Aldric', 'Beatrix', 'Cassian', 'Dmitri', 'Elowen', 'Finnian', 'Giselle', 'Hadrian', 'Isolde', 'Joram',
    'Kestrel', 'Leocadia', 'Matteo', 'Niamh', 'Oberon', 'Priya', 'Quillon', 'Rosalind', 'Stellan', 'Tamsin',
    'Urien', 'Vesna', 'Winona', 'Xiomara', 'Yael', 'Zinnia', 'Aeron', 'Brielle', 'Corwin', 'Dorian',
    'Eira', 'Fabian', 'Gwendolyn', 'Hideo', 'Ingrid', 'Javier', 'Katja', 'Lazaro', 'Minseo', 'Nadia',
    'Octavia', 'Pavel', 'Rashid', 'Solveig', 'Theron', 'Uma', 'Viktor', 'Wei', 'Yuki', 'Zola',
    'Amara', 'Bjorn', 'Celeste', 'Darius', 'Esme', 'Felix', 'Greta', 'Hugo', 'Indira', 'Jamal',
    'Kenji', 'Lilith', 'Malik', 'Nico', 'Ophelia', 'Percy', 'Remy', 'Saskia', 'Torin', 'Valentina',
    'Willem', 'Xara', 'Yusef', 'Zed', 'Anouk', 'Basil', 'Clio', 'Drusilla', 'Eamon', 'Freyja',
    'Galen', 'Heloise', 'Ivar', 'Juno', 'Kaelen', 'Leif', 'Mireille', 'Nikolai', 'Oksana', 'Ptolemy',
    'Rhea', 'Sorenne', 'Tariq', 'Ulani', 'Vlad', 'Wynter', 'Xan', 'Yara', 'Zephyrine', 'Asha',
    'Bram', 'Cyra', 'Danteo', 'Eulalia', 'Fletcher', 'Ginevra', 'Henrik', 'Isabeau', 'Jovan', 'Kaida',
    'Lorcan', 'Maia', 'Nereus', 'Oisin', 'Petra', 'Roland', 'Seren', 'Tadhg', 'Una', 'Vespera',
  ],
  last: [
    'Vane', 'Blackwood', 'Frost', 'Ember', 'Storm', 'Vale', 'Thorn', 'Steel', 'Nightshade', 'Rivera',
    'Ashcroft', 'Drakken', 'Holloway', 'Ironheart', 'Kessler', 'Langston', 'Mercer', 'Northwind', 'Onyx', 'Pryde',
    'Ravencroft', 'Shadowmere', 'Titanforge', 'Umbra', 'Vex', 'Wolfsbane', 'Xenith', 'Yarrow', 'Zennith',
    'Abernathy', 'Beaumont', 'Castellanos', 'Dubois', 'Ellington', 'Fairchild', 'Goldstein', 'Hawthorne', 'Ishikawa', 'Johansson',
    'Kowalski', 'Lindqvist', 'Montague', 'Nakamura', 'Okonkwo', 'Petrov', 'Quintero', 'Romano', 'Sato', 'Thakur',
    'Underwood', 'Valente', 'Wainwright', 'Xanthos', 'Yilmaz', 'Zhang', 'Alvarez', 'Bennett', 'Carmichael', 'Donovan',
    'Esposito', 'Fitzgerald', 'Galloway', 'Harrington', 'Ingram', 'Jensen', 'Kensington', 'Lombardi', 'MacAllister', 'Nightingale',
    'Ortega', 'Pemberton', 'Quincy', 'Redmayne', 'Sterling', 'Townshend', 'Van der Berg', 'Whitaker', 'Yamamoto', 'Ziegler',
    'Archer', 'Blackwell', 'Crawford', 'Davenport', 'Eastwood', 'Fletcher', 'Grimsby', 'Hollister', 'Iverson', 'Kingsley',
    'Lockhart', 'Morrigan', 'Norcross', 'Oakley', 'Pendragon', 'Rutherford', 'Sinclair', 'Templeton', 'Vaughn', 'Winterbourne',
    'Ashford', 'Blackstone', 'Carmine', 'Draycott', 'Everhart', 'Fairweather', 'Grenville', 'Huxley', 'Ironwood', 'Kingsford',
    'Loxley', 'Marlowe', 'Northcliffe', 'Oxenfree', 'Prescott', 'Ravensdale', 'Stroud', 'Thackeray', 'Underhill', 'Varma',
    'Wexley', 'Yardley', 'Zabala', 'Armitage', 'Bellingham', 'Caldwell', 'Dryden', 'Ellsworth', 'Farnsworth', 'Gresham',
    'Hatherley', 'Inverness', 'Jarrett', 'Kilpatrick', 'Llewellyn', 'Merrick', 'Norwood', 'Pembroke', 'Radcliffe', 'Stirling',
    'Trelawney', 'Wentworth', 'Yates', 'Zaragoza', 'Ainsworth', 'Barrington', 'Cromwell', 'Dunstan', 'Fairfax', 'Garrick',
  ],
}

/** Short labels for schema selects (must match options in schemas.js) */
export const selectGoalOptions = [
  'Avenge a loved one',
  'Pay off inherited debt',
  'Become a legendary artist',
  'Cure a family curse',
  'Topple corrupt power',
  'Map uncharted territory',
  'Survive the season',
  'Recover lost memories',
  'Clear the family name',
  'Create a lasting legacy',
  'Return to home dimension',
  'Avenge fallen allies',
  'Master unexplained powers',
  'Buy freedom',
  'Protect the last of my kind',
  'Break a cycle of violence',
  'Beat rivals to an artifact',
  'Prove innocence',
  'Repay someone who believed in me',
  'Become untouchably strong',
]

export const selectFearOptions = [
  'Drowning',
  'Being forgotten',
  'Becoming my parents',
  'Enclosed spaces',
  'Betrayal by loved ones',
  'Losing control of powers',
  'Public humiliation',
  'The dark unknown',
  'Helplessness',
  'Vulnerability in intimacy',
  'Eternal loneliness',
  'Losing sanity',
  'Fire',
  'True nature exposed',
  'Ominous silence',
  'Mirrors',
  'Irrelevance',
  'The void of space',
  'Identity fracture',
  'Reality being a lie',
]

export const selectDesireOptions = [
  'Be deeply understood',
  'Feel safe to lower walls',
  'Unconditional love',
  'Meaningful legacy',
  'Agency over fate',
  'True belonging',
  'Equal fear and respect',
  'Peace after chaos',
  'One last great battle',
  'Reach for the stars',
  'Forgiveness from the past',
  'Rebuild something broken',
  'Hear their name spoken kindly',
]

export const selectTraumaOptions = [
  'Hometown destroyed',
  'Abandoned in childhood',
  'Plague survivor',
  'Betrayed by mentor',
  'Former captivity',
  'Self-caused maiming',
  'Accidental killing',
  'Tortured without answers',
  'Witnessed partner death',
  'Experiment subject',
  'Wrongful exile',
  'Sole shipwreck survivor',
  'Enemy death-curse',
  'Missing early memories',
  'Forced gladiator past',
]

export const selectQuirkOptions = [
  'Sits facing the door',
  'Counts steps',
  'Only eats self-prepared food',
  'Talks to gear',
  'Collects enemy tokens',
  'Needs noise to sleep',
  'Nested backup plans',
  'Whistles when nervous',
  'Avoids eye contact',
  'Pre-fight ritual',
  'Journals everyone met',
  'Smells food first',
  'Names every animal',
  'Pockets shiny objects',
  'Uses a new alias often',
]

export const selectMoralCodeOptions = [
  'Never harm the defenseless',
  'Repay every debt',
  'Mission over feelings',
  'Oaths are sacred',
  'Protect the weak',
  'Proportional justice',
  'Freedom above all',
  'Share knowledge',
  'Family first',
  'Survival justifies means',
  'No killing unarmed',
  'Trust is earned',
]

export const selectPrejudiceOptions = [
  'Distrusts magic users',
  'Resents the wealthy',
  'Grudge against one species',
  'Sees pacifists as cowards',
  'Views romance as weakness',
  'Rejects advanced tech',
  'Assumes leaders are corrupt',
  'Judges by appearance',
  'Suspicious of constant smilers',
  'Dismisses young and old alike',
]

export const selectScarsOptions = [
  'Slash across torso',
  'Burn patch on shoulder',
  'Tribal sleeve tattoos',
  'Ritual chest brands',
  'Claw marks on back',
  'Surgical mesh implants',
  'Duelling face scar',
  'Missing finger (clean)',
  'Stab wound keloid',
  'Energy-weapon cautery',
  'Minimal / none visible',
  'Pattern of old whip lines',
  'Arcane sigil scar',
]

export const selectBlemishesOptions = [
  'Broken nose (old break)',
  'Cauliflower ear',
  'Acne scarring',
  'Vitiligo patches',
  'Freckle-dense skin',
  'Chronic dark circles',
  'Split eyebrow notch',
  'Chapped / weathered lips',
  'Birthmark (prominent)',
  'Asymmetrical ears',
  'Stress-related rash',
  'Prosthetic patch skin',
  'None notable',
]

export const selectSpecialFeaturesOptions = [
  'Horns (curved)',
  'Prehensile tail',
  'Winged (feathered)',
  'Extra pair of arms',
  'Bioluminescent markings',
  'Third eye (latent)',
  'Antennae / sensory stalks',
  'Scaled patches',
  'Gills (retractable)',
  'Holographic skin shift',
  'Fully humanoid baseline',
  'Crystal growths',
  'Tentacle hair',
]

export const selectDistinguishingFacialOptions = [
  'Scar through eyebrow',
  'Gold canine tooth',
  'Heterochromia hint',
  'Dimple only one side',
  'Sharp canine smile',
  'Nose ring / septum',
  'Beauty mark cluster',
  'Asymmetric jaw',
  'Unusually long lashes',
  'Silver threading in brows',
  'Split tongue (hidden)',
  'Neural port at temple',
  'None standout',
]

export const selectKinksOptions = [
  'Light bondage',
  'Roleplay / personas',
  'Exhibitionism',
  'Sensory deprivation',
  'Power exchange',
  'Worship / praise',
  'Temperature play',
  'Costume / uniform',
  'Edging / denial',
  'Aftercare-focused',
  'Vanilla-preferred',
  'Still exploring',
  'Prefer not to say',
]

export const selectTurnOnsOptions = [
  'Competence under pressure',
  'Low voices',
  'Competent hands',
  'Confidence without arrogance',
  'Specific scent memory',
  'Eye contact held',
  'Wit and wordplay',
  'Physical strength displayed',
  'Gentleness after intensity',
  'Uniforms / tailoring',
  'Reading aloud',
  'Competitive tension',
  'Varies by mood',
]

export const selectTurnOffsOptions = [
  'Poor hygiene',
  'Cruelty disguised as jokes',
  'Neediness without honesty',
  'Being rushed',
  'Disrespect of boundaries',
  'Performative vulnerability',
  'Loud chewing',
  'Unsolicited possessiveness',
  'Bad faith arguments',
  'Cold silent treatment',
  'Over-explaining kink',
  'Being mocked mid-intimacy',
  'No universal dealbreakers',
]

export const selectAttractionTypeOptions = [
  'Tall and broad',
  'Compact and athletic',
  'Soft-bodied warmth',
  'Sharp features',
  'Round, kind face',
  'Androgynous presentation',
  'Older / experienced aura',
  'Youthful energy',
  'Brains over body',
  'Body over brains',
  'Mystery / unreadable',
  'Bold fashion sense',
  'No fixed physical type',
]

export const randomGoals = [
  'To find the six-fingered man who killed my father',
  'To pay off the massive debt I inherited',
  'To become the most famous bard in the continent',
  'To find a cure for my sibling\'s curse',
  'To overthrow the corrupt local magistrate',
  'To map the uncharted wilds beyond the mountains',
  'To simply survive the winter',
  'To regain my lost memories',
  'To prove my family name is not cursed',
  'To create a masterpiece that will outlast me',
  'To find a way back to my home dimension',
  'To avenge my fallen crew',
  'To discover the source of my powers',
  'To earn enough to buy my freedom',
  'To protect the last of my species',
  'To break the cycle of violence in my family',
  'To find the artifact before the enemy does',
  'To prove my innocence',
  'To save the one person who believed in me',
  'To become strong enough that no one can hurt me again',
]

export const randomFears = [
  'Drowning in deep water',
  'Being forgotten by history',
  'Becoming exactly like my parents',
  'Small, enclosed spaces',
  'Betrayal by those closest to me',
  'Losing control of my abilities',
  'Public humiliation',
  'The dark and what hides in it',
  'Being helpless/weak',
  'Intimacy and vulnerability',
  'Being alone forever',
  'Losing my mind/sanity',
  'Fire and burning',
  'My true nature being discovered',
  'Silence - because it means something terrible is about to happen',
  'Mirrors and reflections',
  'Becoming irrelevant',
  'The void between the stars',
  'My own reflection not matching who I think I am',
  'Waking up to discover everything was a lie',
]

export const randomDesires = [
  'To be truly understood by someone',
  'To feel safe enough to let my guard down',
  'To experience genuine love without conditions',
  'To leave a legacy that matters',
  'To feel power over my own destiny',
  'To belong somewhere, truly belong',
  'To be feared and respected in equal measure',
  'To find peace after years of chaos',
  'To feel the thrill of battle one last time',
  'To touch the stars',
]

export const randomTrauma = [
  'Witnessed the destruction of their hometown',
  'Abandoned by parents at a young age',
  'Survived a plague that killed everyone they knew',
  'Was betrayed by their mentor/teacher',
  'Enslaved for years before escaping',
  'Lost a limb in a battle they caused',
  'Accidentally killed someone innocent',
  'Tortured for information they didn\'t have',
  'Watched their partner die and couldn\'t stop it',
  'Was the subject of magical/scientific experiments',
  'Exiled from their homeland for a crime they didn\'t commit',
  'Survived a shipwreck alone',
  'Was cursed by a dying enemy',
  'Lost all memory of their first 20 years',
  'Was forced to fight in gladiatorial games',
]

export const randomQuirks = [
  'Always sits facing the door',
  'Counts their steps obsessively',
  'Refuses to eat food they didn\'t prepare themselves',
  'Talks to their weapon/equipment as if it\'s alive',
  'Collects teeth from defeated enemies',
  'Cannot sleep without background noise',
  'Always has a backup plan for their backup plan',
  'Whistles the same tune when nervous',
  'Never makes direct eye contact',
  'Has a superstitious ritual before every fight',
  'Keeps a detailed journal of everyone they meet',
  'Smells food before eating it',
  'Names every animal they encounter',
  'Picks up and pockets small shiny objects',
  'Always introduces themselves with a different name',
]

export const randomMoralCodes = [
  'Never harm children or the defenseless',
  'Always repay a debt, whether of gold or blood',
  'The mission comes before personal feelings',
  'Never break a sworn oath',
  'Protect the weak, even at personal cost',
  'An eye for an eye - justice must be proportional',
  'Freedom is the highest good - never enslave',
  'Knowledge should be shared, never hoarded',
  'Family comes first, always and without exception',
  'Survival justifies any action',
  'There is no honor in killing the unarmed',
  'Trust must be earned through action, not words',
]

export const randomPrejudices = [
  'Distrusts magic users - believes power corrupts absolutely',
  'Looks down on the wealthy as soft and undeserving',
  'Harbors resentment toward a specific race/species from past trauma',
  'Considers pacifists to be cowards',
  'Believes romantic love is a weakness exploited by enemies',
  'Thinks technology is an abomination against nature',
  'Assumes all authority figures are corrupt',
  'Judges people harshly by their appearance',
  'Distrusts anyone who smiles too much',
  'Believes the young are foolish and the old are out of touch',
]

// Random selection helper
export function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)]
}

export function randomRange(min = 0, max = 100) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomName() {
  return `${randomFrom(randomNames.first)} ${randomFrom(randomNames.last)}`
}
