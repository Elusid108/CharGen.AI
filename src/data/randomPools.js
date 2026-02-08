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
  ],
  last: [
    'Vane', 'Blackwood', 'Frost', 'Ember', 'Storm', 'Vale', 'Thorn', 'Steel', 'Nightshade', 'Rivera',
    'Ashcroft', 'Drakken', 'Holloway', 'Ironheart', 'Kessler', 'Langston', 'Mercer', 'Northwind', 'Onyx', 'Pryde',
    'Ravencroft', 'Shadowmere', 'Titanforge', 'Umbra', 'Vex', 'Wolfsbane', 'Xenith', 'Yarrow', 'Zennith',
  ]
}

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
