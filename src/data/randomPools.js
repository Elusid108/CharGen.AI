/**
 * Randomization helpers (names and dice). Select catalogs live in src/data/options.
 */

import { mathRng } from '../utils/rng'

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

export function randomFrom(array, rng = mathRng) {
  return array[Math.floor(rng.next() * array.length)]
}

export function randomRange(min = 0, max = 100, rng = mathRng) {
  return Math.floor(rng.next() * (max - min + 1)) + min
}

export function randomName(rng = mathRng) {
  return `${randomFrom(randomNames.first, rng)} ${randomFrom(randomNames.last, rng)}`
}
