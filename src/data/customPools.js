/**
 * Small local phrase pools for a few high-value `*_custom` companions, so a seeded roll can
 * land on "Custom" without calling an LLM. Everything not listed stays blank for Enrich with AI.
 */

import { mathRng } from '../utils/rng'

const ALL = ['Modern', 'Fantasy', 'Sci-Fi']
const F = ['Fantasy']
const S = ['Sci-Fi']
const M = ['Modern']

function p(text, genres = ALL) {
  return { text, genres }
}

export const CUSTOM_PHRASES = {
  species_custom: [
    p('Glass-boned moth-folk', F), p('Peat-born bog revenant', F), p('Tidewater selkie line', F), p('Hollow-horned ibex kin', F),
    p('Vat-grown void-adapted lineage', S), p('Uplifted octopus in a walker frame', S), p('Lattice-skinned synth clade', S), p('Low-gravity longbone colonist', S),
    p('Something that passes for human in bad light', ALL), p('Chimeric splice, three donors', [...S, 'Fantasy']),
  ],
  occupation_custom: [
    p('Debt collector for a temple', F), p('Siege-engine greaser', F), p('Court food-taster', F), p('Reliquary forger', F),
    p('Hull-breach welder', S), p('Cryo-sleep steward', S), p('Orbital salvage auctioneer', S), p('Licensed memory notary', S),
    p('Night-shift morgue clerk', M), p('Repo driver', M), p('Pawnshop appraiser', M), p('Union steward who lost the vote', M),
  ],
  origin_custom: [
    p('A ferry town that floods every spring', ALL), p('The last floor of a tower nobody finishes', F), p('A border fort nobody garrisons anymore', F),
    p('A mining platform under a red sun', S), p('A generation-ship creche deck', S), p('Company housing behind the refinery', M), p('A cult compound that went quiet', ALL),
  ],
  quirk_custom: [
    p('Counts exits twice'), p('Apologizes to furniture'), p('Sleeps with boots on'), p('Hums to machines before using them'),
    p('Never says a name they were given'), p('Eats the ugliest thing on the plate first'), p('Keeps a coin from every place they have slept'),
    p('Turns cups handle-left'), p('Tests chairs before sitting'), p('Writes down every promise, including their own'),
  ],
  scars_custom: [
    p('A bite-shaped ridge on the forearm'), p('Rope burn around both wrists, old'), p('A clean line across the palm from a blade they held wrong'),
    p('Shrapnel freckles down one flank', [...S, 'Modern']), p('A brand that was meant to be a word', F), p('Frostbite-pale fingertips', ALL),
  ],
}

export function localCustomText(fieldId, character, rng = mathRng) {
  const pool = CUSTOM_PHRASES[fieldId]
  if (!pool?.length) return ''
  const genre = character?.genre
  const filtered = genre && genre !== 'Mixed' ? pool.filter((e) => e.genres.includes(genre)) : pool
  const chosen = rng.pick(filtered.length ? filtered : pool)
  return chosen?.text || ''
}
