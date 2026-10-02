/**
 * Formative life-event templates. Each one explains something on the sheet: its `effects`
 * are resolved into real option ids when the ledger is built, so the UI can say
 * "Trauma → Former captivity" and the backstory/chat prompts get causal canon.
 *
 * Slots in `summary`: {name} {origin} {occupation} {species} {age}. Written they/them.
 */

import { selectDisplay } from '../utils/selectDisplay'

export const LEDGER_TONES = ['wound', 'loss', 'crime', 'turning', 'gift', 'bond', 'triumph']
export const NON_WOUND_TONES = new Set(['turning', 'gift', 'bond', 'triumph'])

const COMPETENCIES = [
  'Combat / weapons', 'Medicine / first aid', 'Engineering / repair', 'Navigation / wilderness', 'Languages / translation',
  'Persuasion / negotiation', 'Stealth / infiltration', 'Cooking / hospitality', 'Music / performance', 'Hacking / systems',
  'Law / bureaucracy', 'Occult / ritual', 'Athletics / endurance', 'Craft / artisan', 'Leadership / command',
  'Investigation / research', 'Animals / husbandry', 'Finance / trade',
]
const SPEC = ['Fantasy', 'Sci-Fi', 'Mixed']
const LOW_CLASS = ['Underclass / Destitute', 'Working poor', 'Working class']
const HIGH_CLASS = ['Upper middle', 'Wealthy', 'Aristocratic / Elite']

function t(id, tone, ageBand, title, summary, effects = {}, extra = {}) {
  return { id, tone, ageBand, title, summary, effects, weight: 1, tags: [], ...extra }
}

export const LIFE_EVENT_TEMPLATES = [
  // --- trauma-explaining (one per trauma option, lo ≤ 17) ---
  t('taken_and_held', 'wound', [8, 45], 'Taken and held',
    'At {age}, {name} was taken off a road outside {origin} and kept for a season by people who never said why. They learned where every door was. They still do.',
    { trauma: 'Former captivity', fear: ['Enclosed spaces', 'Helplessness'], coping: ['Withdrawal / shutdown', 'Dissociation / numbness'] }),
  t('home_razed', 'wound', [5, 30], 'The home that burned',
    '{origin} burned when {name} was {age} — fire, war, or a decision made far away. They carry one object from it and will not say which.',
    { trauma: 'Hometown destroyed', lie: ['Everyone leaves eventually', 'The other shoe will always drop'], desire: 'Rebuild something broken' }),
  t('left_at_the_gate', 'wound', [2, 10], 'Left at the gate',
    'At {age} someone set {name} down at a gate in {origin} and did not come back. They learned to pack before being asked.',
    { trauma: 'Abandoned in childhood', attachment: ['Anxious-preoccupied', 'Dismissive-avoidant'], lie: 'I am unlovable' }),
  t('the_sickness_year', 'loss', [6, 45], 'The sickness year',
    'A fever went through {origin} when {name} was {age}. They were one of the ones who woke up. They still count who did not.',
    { trauma: 'Plague survivor', coping: 'Problem-solving hyperfocus', fear: 'Eternal loneliness' }),
  t('mentor_sold_them', 'wound', [14, 35], 'The teacher who sold them',
    'The {occupation} who taught {name} everything traded them away at {age} — for money, safety, or a better student. Advice has tasted wrong since.',
    { trauma: 'Betrayed by mentor', lie: 'Trust no one', moral_code: 'Trust is earned' }),
  t('the_hand_that_slipped', 'wound', [12, 50], 'The hand that slipped',
    'At {age} {name} hurt themselves badly doing something they had sworn they could do. The scar is the argument they lost with their own body.',
    { trauma: 'Self-caused maiming', lie: 'I must be perfect', scars: ['Missing finger (clean)', 'Burn patch on shoulder'] }),
  t('one_wrong_second', 'crime', [14, 50], 'One wrong second',
    'A tool, a shove, a second — someone died who was not supposed to, and {name} was holding it. No one charged them. They charged themselves.',
    { trauma: 'Accidental killing', lie: 'I dont deserve happiness', moral_code: ['No killing unarmed', 'Never harm the defenseless'] }),
  t('the_questions_never_came', 'wound', [16, 50], 'The questions that never came',
    'At {age} {name} was held and hurt by people who never asked them anything. There was no information to give. That was the lesson.',
    { trauma: 'Tortured without answers', lie: ['The world is just', 'Vulnerability is death'], scars: 'Pattern of old whip lines' }),
  t('the_minute_after', 'loss', [17, 60], 'The minute after',
    'Someone {name} had built a life with died in front of them at {age}. They replay the minute they could not fix.',
    { trauma: 'Witnessed partner death', fear: 'Vulnerability in intimacy', desire: 'Forgiveness from the past' }),
  t('subject_eleven', 'wound', [4, 40], 'Subject eleven',
    'Someone wrote their curiosity into {name} when they were {age}. There are notes about them somewhere they have never read.',
    { trauma: 'Experiment subject', fear: ['Losing control of powers', 'True nature exposed'], scars: ['Surgical mesh implants', 'Energy-weapon cautery'] },
    { requires: { genre: SPEC } }),
  t('the_sealed_gate', 'loss', [12, 50], 'The sealed gate',
    'At {age} {name} was put out of {origin} for something they did not do. The place still exists. They still cannot have it.',
    { trauma: 'Wrongful exile', goal: ['Prove innocence', 'Clear the family name'] }),
  t('only_one_came_ashore', 'loss', [6, 50], 'Only one came ashore',
    'The water took the rest. {name} was {age} and remembers the cold more than the faces.',
    { trauma: 'Sole shipwreck survivor', fear: 'Drowning', lie: 'I dont deserve happiness' }),
  t('the_dying_curse', 'wound', [14, 60], 'The dying curse',
    'Someone {name} had beaten spent their last breath on a promise about their future. They were {age}. The deadline feels literal.',
    { trauma: 'Enemy death-curse', fear: 'The dark unknown', goal: 'Cure a family curse' },
    { requires: { genre: ['Fantasy', 'Mixed'] } }),
  t('the_last_transmission', 'wound', [14, 60], 'The last transmission',
    'Someone {name} had ruined used their last minutes to leave a message with their name in it — a threat, a timer, a promise. They were {age}. It still plays in their head.',
    { trauma: 'Enemy death-curse', fear: 'Ominous silence', lie: 'The other shoe will always drop' }),
  t('the_trial_group', 'wound', [6, 40], 'The trial group',
    'At {age} {name} was signed into something with a consent form they did not write. The dosage changed. Nobody explained the after.',
    { trauma: 'Experiment subject', fear: ['Losing control of powers', 'Reality being a lie'], prejudice: 'Assumes leaders are corrupt' }),
  t('the_blank_years', 'wound', [0, 8], 'The blank years',
    '{name} has nothing before about age {age}. The stories other people tell about those years do not fit the person wearing them.',
    { trauma: 'Missing early memories', goal: 'Recover lost memories', fear: 'Identity fracture' }),
  t('the_pit_years', 'wound', [12, 40], 'The pit years',
    'From {age}, {name} fought for a crowd that paid to watch. They learned bodies as geometry and applause as a warning.',
    { trauma: 'Forced gladiator past', coping: 'Rage / confrontation', competency_2: 'Combat / weapons', scars: ['Slash across torso', 'Duelling face scar'] }),

  // --- bonds / gifts / turnings / triumphs ---
  t('the_teacher_who_stayed', 'bond', [8, 20], 'The teacher who stayed',
    'A {occupation} in {origin} taught {name} a craft and, more rarely, kept showing up. It is why they believe anyone does.',
    { competency_2: COMPETENCIES, attachment: 'Secure' }),
  t('the_first_love_that_left', 'loss', [15, 35], 'The first one who left',
    'At {age} {name} was loved on purpose for the first time, and then was not. They dated the ending before it came.',
    { lie: 'Everyone leaves eventually', attachment: 'Anxious-preoccupied', desire: 'Unconditional love' }),
  t('the_winning_season', 'triumph', [15, 32], 'The winning season',
    'For one year {name} was the best anyone in {origin} had seen. They have been trying to feel that watched since.',
    { lie: 'I only matter when I perform', goal: ['Create a lasting legacy', 'Become a legendary artist'], desire: 'Meaningful legacy' }),
  t('the_sibling_they_raised', 'bond', [8, 20], 'The one they raised',
    'From {age}, {name} raised someone smaller because no one else was going to. Food first, feelings never.',
    { coping: 'Care-taking others', lie: 'I am responsible for everything', moral_code: 'Family first' }),
  t('the_fall_from_grace', 'loss', [18, 60], 'The fall',
    'The money, the title, or the name went in a single season when {name} was {age}. They still set the table the old way.',
    { socioeconomic_class: 'Dispossessed former elite', prejudice: ['Assumes leaders are corrupt', 'Resents the wealthy'], fear: 'Irrelevance' },
    { requires: { class: HIGH_CLASS } }),
  t('a_strangers_kindness', 'gift', [5, 40], "A stranger's kindness",
    'Someone with nothing to gain fed, hid, or vouched for {name} at {age}. They have been paying it forward and resenting the bill.',
    { moral_code: ['Protect the weak', 'Never harm the defenseless'], desire: 'True belonging' }),
  t('first_paid_work', 'turning', [9, 18], 'First paid work',
    'At {age} {name} was handed coin for a job done and understood, for the first time, exactly what they were worth to someone.',
    { moral_code: 'Repay every debt', competency_3: ['Craft / artisan', 'Cooking / hospitality', 'Animals / husbandry', 'Finance / trade'] }),
  t('found_the_craft', 'gift', [7, 25], 'Found the craft',
    'A tool, an instrument, a book — at {age} {name} picked up the thing their hands already knew how to hold.',
    { competency_3: COMPETENCIES }),
  t('the_oath_sworn', 'bond', [15, 40], 'The oath',
    'At {age} {name} swore something out loud in front of people who would remember. Breaking it would unmake them.',
    { moral_code: 'Oaths are sacred', desire: 'Equal fear and respect' }),
  t('the_thing_they_stole', 'crime', [10, 30], 'The thing they stole',
    'At {age} {name} took something that was not theirs because the alternative was worse. They have never given it back.',
    { moral_code: 'Survival justifies means', lie: 'Power is the only safety' }),
  t('the_border_crossing', 'turning', [6, 40], 'The crossing',
    'At {age} {name} crossed into somewhere that did not want them and learned to pass. The accent is the last thing to go.',
    { desire: 'True belonging', competency_3: 'Languages / translation' }),
  t('a_name_they_chose', 'turning', [12, 35], 'The name they chose',
    'The name on the sheet is one {name} picked at {age}. The old one is still a weapon in the wrong mouth.',
    { desire: 'Hear their name spoken kindly', fear: 'True nature exposed' }),
  t('the_debt_inherited', 'loss', [14, 40], 'The inherited debt',
    "At {age} a relative died and left {name} their numbers. The ledger has their handwriting in it.",
    { goal: 'Pay off inherited debt', fear: 'Becoming my parents' }),
  t('the_inheritance', 'gift', [16, 50], 'The inheritance',
    'Someone left {name} more than they expected at {age} — property, a workshop, a title with teeth. It came with their enemies.',
    { socioeconomic_class: ['Middle class', 'Upper middle', 'Wealthy'], prejudice: 'Judges by appearance' }),
  t('the_night_watch_friend', 'bond', [14, 40], 'The night-watch friend',
    'On a long watch at {age}, {name} told someone the whole truth once. They are still the only one who knows it.',
    { desire: 'Be deeply understood', attachment: 'Secure' }),
  t('the_quiet_year', 'gift', [16, 50], 'The quiet year',
    'One year at {age} nothing went wrong. {name} spent it building systems so it could never go wrong again.',
    { coping: 'Overcontrol / planning', desire: 'Peace after chaos' }),
  t('the_order_took_them_in', 'turning', [5, 16], 'The order took them in',
    'The order raised {name} from {age}: bells, rules, a bed that was theirs as long as they obeyed. They can still recite the hours.',
    { moral_code: 'Oaths are sacred', prejudice: 'Suspicious of constant smilers' },
    { requires: { origin: ['Monastery / Order Raised'] } }),
  t('the_long_haul', 'turning', [8, 35], 'The long haul',
    '{name} grew up on the move; at {age} they watched the only sky they knew drop away behind a hull. Open black has been personal since.',
    { fear: 'The void of space', competency_3: ['Navigation / wilderness', 'Engineering / repair'] },
    { requires: { origin: ['Nomadic Fleet', 'Orbital Habitat', 'Martian Settlement'] } }),
  t('the_public_failure', 'loss', [12, 40], 'The public failure',
    'At {age}, in front of everyone who mattered in {origin}, {name} failed at the thing they were known for. Laughter has a shape now.',
    { fear: 'Public humiliation', coping: 'Humor deflection' }),
  t('the_lab_years', 'gift', [14, 30], 'The lab years',
    'For a stretch starting at {age}, {name} had a bench, a mentor, and more questions than sleep.',
    { competency_3: ['Hacking / systems', 'Engineering / repair', 'Investigation / research'], lie: 'I know best' },
    { requires: { genre: ['Sci-Fi', 'Mixed'] } }),
  t('the_hunt_that_went_wrong', 'loss', [14, 45], 'The hunt that went wrong',
    'At {age} something that was not human took someone from {name} on a job that should have been routine. They have a story about that kind. It may not be fair.',
    { prejudice: 'Grudge against one species', coping: 'Rage / confrontation' },
    { requires: { genre: SPEC } }),
  t('the_duel_won', 'triumph', [16, 40], 'The duel',
    'At {age} {name} stood for themselves against someone better and walked away with the mark to prove the price.',
    { scars: 'Duelling face scar', competency_3: 'Combat / weapons', desire: 'Equal fear and respect' }),
  t('the_hunger_winter', 'loss', [4, 16], 'The hunger winter',
    'The winter {name} was {age}, {origin} ran out. They learned what people become, and what they themselves would do for a plate.',
    { lie: 'If I am not useful I will be discarded', coping: 'People-pleasing' },
    { requires: { class: LOW_CLASS } }),
  t('the_cult_they_left', 'turning', [14, 35], 'The ones they left',
    'At {age} {name} walked out of a group that had promised them everything and called it love. They can still hear the songs.',
    { prejudice: 'Suspicious of constant smilers', lie: 'Trust no one' }),
  t('the_promotion', 'triumph', [25, 60], 'The promotion',
    'At {age} {name} was finally given the room, the rank, or the crew. It turned out to be the loneliest thing they had wanted.',
    { goal: ['Become untouchably strong', 'Create a lasting legacy'], competency_3: 'Leadership / command' },
    { requires: { minAge: 26 } }),
  t('the_child_they_carried_out', 'bond', [15, 50], 'The one they carried out',
    'In a fire, a flood, or a riot at {age}, {name} carried someone out who was not theirs. That person still writes.',
    { moral_code: 'Protect the weak', fear: 'Fire', scars: 'Burn patch on shoulder' }),
  t('the_mirror_year', 'turning', [13, 30], 'The mirror year',
    'At {age} {name} stopped recognizing the face they were given and started building one they could stand.',
    { fear: 'Mirrors', desire: 'Agency over fate' }),
  t('the_road_crew', 'bond', [16, 40], 'The road crew',
    'For a few years from {age}, {name} ran with a crew that was family in every way that counted. Most of them are gone. They toast too often.',
    { goal: 'Avenge fallen allies', attachment: 'Fearful-avoidant', competency_3: ['Stealth / infiltration', 'Navigation / wilderness'] }),
  t('the_healers_apprentice', 'gift', [10, 22], "The healer's apprentice",
    'At {age} {name} held pressure on a wound until help came, and a healer in {origin} decided that was worth teaching.',
    { competency_2: 'Medicine / first aid', moral_code: 'Never harm the defenseless' }),
  t('the_stage_night', 'triumph', [12, 30], 'The stage night',
    'One night at {age}, a room in {origin} went silent for {name} and then did not. They have been chasing that silence since.',
    { competency_2: 'Music / performance', desire: 'Meaningful legacy' }),
  t('the_bad_contract', 'crime', [17, 45], 'The bad contract',
    'At {age} {name} signed something to get out of something worse. They are still paying, and they still read every line twice.',
    { goal: 'Buy freedom', competency_3: 'Law / bureaucracy', prejudice: 'Resents the wealthy' }),
  t('the_vigil', 'loss', [8, 50], 'The vigil',
    'At {age} {name} sat with someone through their last night. Nobody else came. They decided what that meant about people.',
    { coping: 'Intellectualizing', desire: 'Peace after chaos' }),
]

function tplId(e) {
  return e.id
}

export const LIFE_EVENT_BY_ID = Object.fromEntries(LIFE_EVENT_TEMPLATES.map((e) => [e.id, e]))

/** traumaOptionId → template ids that set it. */
export const TRAUMA_TEMPLATE_IDS = LIFE_EVENT_TEMPLATES.reduce((acc, tpl) => {
  const v = tpl.effects?.trauma
  if (!v) return acc
  for (const id of Array.isArray(v) ? v : [v]) (acc[id] ||= []).push(tplId(tpl))
  return acc
}, {})

function matches(list, value) {
  if (!list || !list.length) return true
  return list.includes(value)
}

/** Structural eligibility (requires + unused). Age is checked by the caller. */
export function templateEligible(tpl, character, usedIds = new Set()) {
  if (usedIds.has(tpl.id)) return false
  const r = tpl.requires
  if (!r) return true
  const genre = character?.genre
  if (r.genre && genre && genre !== 'Mixed' && !r.genre.includes(genre)) return false
  if (r.species && !matches(r.species, character?.species)) return false
  if (r.notSpecies && r.notSpecies.includes(character?.species)) return false
  if (r.origin && !matches(r.origin, character?.origin)) return false
  if (r.class && !matches(r.class, character?.socioeconomic_class)) return false
  if (r.minAge && Number(character?.age) < r.minAge) return false
  return true
}

export function renderTemplate(tpl, character, age) {
  const c = character || {}
  const slots = {
    name: String(c.name || '').trim() || 'They',
    origin: selectDisplay(c, 'origin') || 'home',
    occupation: (selectDisplay(c, 'occupation') || 'worker').toLowerCase(),
    species: (selectDisplay(c, 'species') || 'person').toLowerCase(),
    age: String(age),
  }
  const fill = (s) => String(s).replace(/\{(name|origin|occupation|species|age)\}/g, (_, k) => slots[k])
  return { title: fill(tpl.title), summary: fill(tpl.summary) }
}
