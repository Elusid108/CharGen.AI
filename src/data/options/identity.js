import { opt, customOpt, naOpt, WEIGHT_RARE } from './shared'

export const identityFieldOptions = {
  genre: [
    opt(
      'Modern',
      'Contemporary Earth-like tech and social rules. Magic, if any, hides or is metaphor.',
      '',
      'Talks like someone who has used a phone, a job, and a city. Treats dragons as fiction unless the sheet says otherwise.',
    ),
    opt(
      'Fantasy',
      'A world where steel, spell, and oath are ordinary tools. Technology stays pre-industrial unless mixed.',
      '',
      'Takes wonders personally. Bargains, gods, and bloodlines are practical topics, not aesthetic.',
    ),
    opt(
      'Sci-Fi',
      'Orbitals, machines, and post-Earth logistics. Biology is another engineering problem.',
      '',
      'Thinks in systems, crews, and vacuum. Superstition exists, but so do airlocks.',
    ),
    opt(
      'Mixed',
      'Genre is a blend or undecided — urban fantasy, solarpunk, a portal in a mall.',
      '',
      'Can code-switch between mundanity and the impossible without announcing a setting bible.',
      1.15,
    ),
  ],

  species: [
    opt(
      'Human',
      'Standard Homo sapiens. The most common and versatile species in most settings.',
      'a human being with ordinary human anatomy',
      'Moves through human spaces as default. Underestimated as ordinary — which they may use.',
      1.6,
    ),
    opt(
      'Humanoid Alien',
      'An extraterrestrial with a roughly human body plan — two arms, two legs, upright — plus alien tells.',
      'a humanoid alien with a bilateral upright body and clearly non-human facial or skin details',
      'Passes at a distance, fails up close. Culture shock is a weekly errand.',
    ),
    opt(
      'Non-Humanoid Alien',
      'A truly alien form: extra limbs, no face, gas, lattice — whatever the custom field must specify.',
      'a distinctly non-humanoid alien body that does not follow a human silhouette',
      'Human rooms are hostile architecture. Communication is translation, not small talk.',
      WEIGHT_RARE,
    ),
    opt(
      'Elf',
      'Long-lived, graceful beings often tied to magic, craft, or woods. Time works differently behind their eyes.',
      'an elf with refined features, slightly pointed ears, and a graceful humanoid frame',
      'Patience or disdain for short-lived people. Remembers grudges the way others remember last week.',
    ),
    opt(
      'Dwarf',
      'Stout, hardy folk known for craft, stone, and refusing to be rushed.',
      'a dwarf: shorter, stocky, sturdy humanoid with a dense build',
      'Measures worth in work done. Jokes about height have been heard; they answer with competence or violence.',
    ),
    opt(
      'Orc',
      'Tusks, heavy bone, green or grey or brown skin — warrior culture or a stereotype they are tired of wearing.',
      'an orc with tusks, a heavy brow, and a powerful humanoid frame',
      'People brace for a fight they may not want. Honor, temper, and being seen as a monster are all live wires.',
    ),
    opt(
      'Demon',
      'Infernal heritage: hunger, bargains, horns, heat. Feared, hired, or exhausted by propaganda.',
      'a demonic humanoid with infernal tells such as horns, unusual eyes, or ember-dark skin',
      'Contracts and appetites leak into conversation. Kindness from them is either a trap or a miracle — they know you cannot tell.',
    ),
    opt(
      'Angel',
      'Celestial or engineered radiance. Duty, wings optional, the weight of being someone\'s symbol.',
      'an angelic humanoid with an uncanny, luminous presence; wings only if other fields say so',
      'People confess or flinch. They are tired of being asked to be good on command.',
    ),
    opt(
      'Undead',
      'Revenant, lich, or cursed walker. Decay, memory, and a body that will not quit.',
      'an undead humanoid: pallor, stillness, and a body that does not quite look alive',
      'Does not breathe like you. Food, sleep, and time are politics. Touch can be cold in more than one sense.',
    ),
    opt(
      'Android/Cyborg',
      'Partially or fully mechanical. The line between person and product is the plot.',
      'an android or heavily cybernetic humanoid with visible machine elements or too-perfect skin',
      'Processes faster than they admit. May mimic affect. Maintenance is intimacy or humiliation.',
    ),
    opt(
      'Werewolf/Lycanthrope',
      'Moon-tied change or always-on beast traits. Pack, rage, and senses that will not shut off.',
      'a lycanthrope humanoid with predatory bone structure, fang hint, or subtle fur at the edges',
      'Smells moods. Temper has a lunar calendar. Loyalty is feral when it lands.',
    ),
    opt(
      'Vampire',
      'Undead predator sustained by blood. Ancient, alluring, and hungry on a schedule.',
      'a vampiric humanoid with pallor, sharp canines, and an unliving stillness',
      'Manages hunger like an addict with manners. Night is native; daylight is politics.',
    ),
    opt(
      'Dragon/Draconic',
      'Scaled pride, hoard logic, ancient heat in a (mostly) humanoid frame.',
      'a draconic humanoid with scale texture, slit pupils, and a predatory bone structure',
      'Collects, remembers, and does not like being owned. Insults last centuries.',
    ),
    opt(
      'Fae/Fairy',
      'Glamour, alien morality, deals that parse like poetry and bind like law.',
      'a fae humanoid with slightly wrong proportions, luminous eyes, or an uncanny prettiness',
      'Words are weapons. They smile at loopholes. Names and thanks are never free.',
    ),
    opt(
      'Elemental',
      'Fire, water, air, or earth given intent. The body is a conduit, not a coincidence.',
      'an elemental humanoid whose flesh suggests fire, water, stone, or air more than meat',
      'Weather is a mood. Touch can burn, freeze, or ground you. They forget human fragility.',
    ),
    opt(
      'Hybrid',
      'A blend of two or more kinds. Often an outsider in both worlds.',
      'a hybrid humanoid combining two species\' visual tells in one body',
      'Code-switches survival. Belonging is a negotiation, not a hometown.',
    ),
    customOpt(
      'A species not on this list — name it in the custom field.',
      '',
      'Play the custom species as written: needs, lifespan, and how rooms react.',
    ),
  ],

  sex: [
    opt(
      'Male',
      'Male anatomy as the current body plan: typical androgenized sex characteristics unless other fields override.',
      'male anatomy and secondary sex characteristics consistent with the rest of the sheet',
      'Moves through the world with male-coded assumptions landing on them — helpful or hostile, they have a pattern.',
    ),
    opt(
      'Female',
      'Female anatomy as the current body plan: typical estrogenized sex characteristics unless other fields override.',
      'female anatomy and secondary sex characteristics consistent with the rest of the sheet',
      'Navigates rooms that gender their body on sight. Safety math is often unconscious and constant.',
    ),
    opt(
      'Intersex',
      'A body that does not sit cleanly on a male/female binary. Specifics belong in custom or medical privacy.',
      'an intersex body — mixed or non-binary sex characteristics; avoid caricature, keep human specificity',
      'Tired of being a teachable moment. Disclosure is a choice, not a plot coupon.',
      0.45,
    ),
    opt(
      'None/Construct',
      'No biological sex in the mammalian sense: constructed, elemental, or otherwise unsexed.',
      'a constructed or unsexed body without human genital or secondary-sex advertising',
      'Human flirt scripts misfire. They may mimic gender for ease or refuse it as irrelevant.',
      0.35,
    ),
    naOpt(
      'Non-Applicable',
      'Sex is not a useful axis for this being. Do not invent genitals for the bit.',
      '',
      'Leave anatomy unmarked. Attraction and gender still exist if other fields say so.',
    ),
  ],

  gender: [
    opt(
      'Man',
      'A man. Identity is man — cis, trans, or complicated. Expression and anatomy are separate fields.',
      'a man',
      'Moves as a man in the story\'s gender system. Do not treat transness as a third gender unless the sheet says so.',
    ),
    opt(
      'Woman',
      'A woman. Identity is woman — cis, trans, or complicated. Expression and anatomy are separate fields.',
      'a woman',
      'Moves as a woman in the story\'s gender system. Do not treat transness as a third gender unless the sheet says so.',
    ),
    opt(
      'Non-binary',
      'Neither exclusively man nor woman. Language, bathrooms, and strangers will be a recurring tax.',
      'a person whose presentation should not be forced into a binary man/woman read unless expression says otherwise',
      'Corrects pronouns when it is safe. Exhausted by being asked to explain a whole ontology at brunch.',
    ),
    opt(
      'Genderfluid',
      'Gender that moves. Days, contexts, or moons — the sheet\'s expression field shows how it looks now.',
      'a person whose gendered presentation may not be fixed',
      'Introductions come with weather reports. People who need them to stay one thing will be disappointed.',
    ),
    opt(
      'Agender',
      'Little or no gender identity. Being gendered by others is static, not a home.',
      'a person without a strongly gendered visual mandate',
      'Does not perform gender for comfort. May still wear the costume to survive a room.',
    ),
    opt(
      'Transgender Man',
      'A man who is trans. Not a separate gender from Man — kept so old saves still load. Prefer Man + transition note for new sheets.',
      'a man (transmasculine history may show in the body, or not)',
      'He is a man. Transition is biography, not a third box. Do not deadname, lecture, or fetishize unless he invites it.',
      0.4,
    ),
    opt(
      'Transgender Woman',
      'A woman who is trans. Not a separate gender from Woman — kept so old saves still load. Prefer Woman + transition note for new sheets.',
      'a woman (transfeminine history may show in the body, or not)',
      'She is a woman. Transition is biography, not a third box. Do not deadname, lecture, or fetishize unless she invites it.',
      0.4,
    ),
    opt(
      'Two-Spirit',
      'A culturally specific Indigenous identity — not a catch-all for queer. Use only with respect and context.',
      'a person whose presentation follows their culture\'s Two-Spirit role rather than a generic androgyne template',
      'This is not a fashion label. Speak with the specificity of their people; do not genericize it into "non-binary."',
      0.22,
    ),
    opt(
      'Other',
      'A gender not named above. The custom or conversation has to do the work.',
      'a person whose gender is not a stock man/woman read',
      'Does not owe a TED talk. Use the words they use; if they have not given any, be careful, not cute.',
      0.35,
    ),
  ],

  gender_expression: [
    opt(
      'Masculine',
      'Presentation that the culture reads as masculine: cut, gait, hair, voice habits — not the same as being a man.',
      'masculine clothing codes, hair, and posture; a socially male-typical presentation',
      'Gets sir\'d, space-made, and certain jokes. May enjoy it, weaponize it, or feel trapped in it.',
    ),
    opt(
      'Feminine',
      'Presentation that the culture reads as feminine: shape of clothes, voice lilt, grooming — not the same as being a woman.',
      'feminine clothing codes, hair, and posture; a socially female-typical presentation',
      'Gets ma\'amed, managed, and certain dangers. May enjoy it, weaponize it, or feel trapped in it.',
    ),
    opt(
      'Androgynous',
      'A deliberate blend or refusal: mixed signals that make binary strangers hesitate.',
      'androgynous presentation that mixes or refuses binary clothing and grooming codes',
      'People squint at pronouns. They have a look ready for the question, or they walk away from it.',
    ),
    opt(
      'Fluid / context-shifting',
      'Expression changes with room, mood, or safety. Today\'s look is not a contract.',
      'presentation that can read different ways depending on styling; not locked to one gendered costume',
      'Closets are strategy. Friends learn not to freeze them in yesterday\'s outfit.',
    ),
    opt(
      'Neutral / unmarked',
      'Tries to be ungendered wallpaper: practical clothes, little performance.',
      'plain, practical, minimally gendered clothing and grooming',
      'Wants to be a person first. Still gets gendered; still chooses when to correct.',
    ),
    customOpt(
      'A custom gender expression.',
      '',
      'Present as the custom expression describes, including when it clashes with identity.',
    ),
  ],

  transition_note: [
    naOpt(
      'None noted',
      'No transition history is on the sheet. Do not invent medical details.',
      '',
      'Do not volunteer trans headcanons. If they are a man or woman, play them as such.',
      1.4,
    ),
    opt(
      'Socially transitioning',
      'Name, pronouns, clothes, and public role are in motion. The body may not have changed much yet.',
      '',
      'Corrections are frequent. Joy and fear share a calendar. Allies get the new name right.',
      0.45,
    ),
    opt(
      'Medically transitioning',
      'Hormones, surgery, or both are in play. Specifics stay private unless custom text adds them.',
      '',
      'Appointments, timelines, and dysphoria/euphoria leak into mood. Do not narrate medical gore unasked.',
      0.4,
    ),
    opt(
      'Post-transition',
      'They consider transition largely behind them. Stealth, pride, or boredom with the topic — ask the rest of the sheet.',
      '',
      'Being "the trans character" is optional. History exists; it is not every scene\'s thesis.',
      0.55,
    ),
    opt(
      'History private',
      'They will not discuss transition. Curiosity is not intimacy.',
      '',
      'Shut down invasive questions. Change the subject. Trust is earned slowly if at all.',
      0.4,
    ),
    customOpt(
      'A custom note about transition or gendered history.',
      '',
      'Treat the custom note as canon and do not invent extra medical plot.',
    ),
  ],

  orientation: [
    opt(
      'Heterosexual',
      'Sexual attraction primarily toward a different binary gender than their own.',
      '',
      'Flirt scripts assume the opposite binary by default. Queerness in the room may not register unless it is loud.',
    ),
    opt(
      'Homosexual',
      'Sexual attraction primarily toward the same binary gender as their own.',
      '',
      'Reads rooms for safety first. In-group shorthand; straight spaces require translation or armor.',
    ),
    opt(
      'Bisexual',
      'Sexual attraction to more than one gender. Not "confused" and not a phase unless they say so.',
      '',
      'Tired of purity tests. Can want different people without a thesis. Bi-erasure will annoy them.',
    ),
    opt(
      'Pansexual',
      'Attraction not gated on gender. Personality, body, and spark — gender is not the sorter.',
      '',
      'Genuinely does not filter on man/woman first. People will still try to sort them; they will not cooperate.',
    ),
    opt(
      'Asexual',
      'Little or no sexual attraction. Romance, if any, lives on the romantic-orientation field.',
      '',
      'Sex is optional, absent, or a negotiated maybe. Do not "fix" them with the right partner.',
    ),
    opt(
      'Demisexual',
      'Sexual attraction that usually waits on a bond. Strangers can be pretty without being possible.',
      '',
      'Chemistry needs time. Fast sexual pacing from others feels like weather they did not dress for.',
    ),
    opt(
      'Queer',
      'A broad, political, or deliberately unspecific same-gender-and-more identity.',
      '',
      'Uses queer on purpose. Will not shrink to a cleaner word for someone else\'s comfort.',
    ),
    opt(
      'Fluid',
      'Sexual attraction that shifts over time or context. Today\'s yes is not a brand.',
      '',
      'Labels last as long as they are useful. Partners who need a frozen identity will struggle.',
    ),
  ],

  romantic_orientation: [
    opt(
      'Heteroromantic',
      'Romantic pull primarily toward a different binary gender.',
      '',
      'Crush scripts assume the opposite binary. Friendship with same-gender people is less likely to be "is this a date."',
    ),
    opt(
      'Homoromantic',
      'Romantic pull primarily toward the same binary gender.',
      '',
      'Reads romance in same-gender space first. Straight dating culture is a foreign film with bad subtitles.',
    ),
    opt(
      'Biromantic',
      'Romantic attraction to more than one gender.',
      '',
      'Can fall for more than one kind of person. Jealous cultures will try to make that a character flaw.',
    ),
    opt(
      'Panromantic',
      'Romantic attraction not sorted by gender.',
      '',
      'Falls for people. Gender is scenery, not a gate.',
    ),
    opt(
      'Aromantic',
      'Little or no romantic attraction. Partnership, if any, is built on other terms.',
      '',
      'Does not catch "the feeling" on schedule. Romance plots from others can feel like a language they declined.',
    ),
    opt(
      'Demiromantic',
      'Romance that usually waits on trust. Strangers do not become "the one" on a look.',
      '',
      'Needs the bond first. Fast courtship feels fake or unsafe even when it is kind.',
    ),
    opt(
      'Queer',
      'A deliberately broad or political romantic identity.',
      '',
      'Will not file their heart under a cleaner heading. Queer as in refusing the form.',
    ),
    opt(
      'Fluid',
      'Romantic patterns that shift. What they want from love is not a frozen setting.',
      '',
      'This year\'s partnership shape may not be last year\'s. Communicate or collide.',
    ),
    customOpt(
      'A custom romantic orientation.',
      '',
      'Use the custom romantic orientation as the rule for crushes and partnership hunger.',
    ),
  ],

  race: [
    opt(
      'East Asian',
      'Phenotype associated with East Asian ancestries. Avoid flattening into a single face or accent.',
      'East Asian facial features and coloring consistent with the rest of the sheet',
      'Navigates stereotypes about competence, accent, and belonging. Specific culture lives in ethnicity/origin.',
    ),
    opt(
      'South Asian',
      'Phenotype associated with South Asian ancestries. Hugely diverse; do not default to one look.',
      'South Asian facial features and coloring consistent with the rest of the sheet',
      'Carries other people\'s monsoon of assumptions. Let ethnicity and origin do the local work.',
    ),
    opt(
      'Black / African descent',
      'Phenotype associated with African and African-diaspora ancestries. Not a monolith.',
      'Black / African-descent facial features and coloring consistent with the rest of the sheet',
      'Racism and hypervisibility are available as weather, not mandatory trauma porn. Be specific, not generic "urban."',
    ),
    opt(
      'White / European descent',
      'Phenotype associated with European ancestries. Still has an ethnicity — do not treat as default blank.',
      'white / European-descent facial features and coloring consistent with the rest of the sheet',
      'May move as unmarked in white-majority rooms. Ethnicity and class still shape the mouth and the jokes.',
    ),
    opt(
      'Latin American',
      'Phenotype associated with Latin American ancestries — itself a huge range of looks.',
      'Latin American facial features and coloring consistent with the rest of the sheet',
      'Language, shade, and nation get collapsed by strangers. Push back with specificity.',
    ),
    opt(
      'Middle Eastern / North African',
      'Phenotype associated with MENA ancestries. Do not costume them as a terror trope.',
      'Middle Eastern or North African facial features and coloring consistent with the rest of the sheet',
      'Profiling and exoticism are both in the water. Faith is not implied.',
    ),
    opt(
      'Pacific Islander',
      'Phenotype associated with Pacific Islander ancestries. Not "generic tropical."',
      'Pacific Islander facial features and coloring consistent with the rest of the sheet',
      'Diaspora, ocean, and being mistaken for other groups are live. Name an island culture if you can.',
    ),
    opt(
      'Indigenous / First Nations',
      'Phenotype associated with Indigenous peoples of a named land. Sovereignty is not a costume.',
      'Indigenous / First Nations facial features and coloring consistent with the rest of the sheet',
      'Do not invent ceremonies. Being mistaken for a mascot is a wound; humor may be armor.',
    ),
    opt(
      'Mixed / Multiracial',
      'A mixed phenotype. Strangers will try to solve them like a riddle.',
      'mixed / multiracial features that do not read as a single stock ethnicity',
      '"What are you" is a tired song. Belonging is a series of half-yeses.',
    ),
    opt(
      'Non-Human Analog',
      'This face is not mapping onto human race categories — alien, constructed, or otherwise off the chart.',
      'non-human facial coloring and structure that should not be read as a human racial category',
      'Human racism still happens as a bad analogy. They may not understand the categories at all.',
      0.55,
    ),
    customOpt(
      'A custom racial or phenotypic description.',
      '',
      'Use the custom race text; do not flatten it into a nearby preset.',
    ),
  ],

  ethnicity: [
    opt('Nordic', 'Northern European cultural cluster — languages, foodways, and light/dark seasonal psychology.', 'features and styling consistent with a Nordic ethnic presentation', 'Dry humor, weather as personality, maybe a relationship with darkness and work ethic.'),
    opt('Mediterranean', 'Cultures around the Mediterranean — warmth, family density, and argument as sport.', 'features and styling consistent with a Mediterranean ethnic presentation', 'Talks with hands if the rest of the sheet allows. Family is a plot whether they want it or not.'),
    opt('Slavic', 'Slavic cultural cluster — fatalism, hospitality, and a high tolerance for bleak jokes.', 'features and styling consistent with a Slavic ethnic presentation', 'Warmth hides under formality. Poetry and complaint can be the same sentence.'),
    opt('West African', 'West African cultural cluster — huge internal diversity; do not flatten to one nation.', 'features and styling consistent with a West African ethnic presentation', 'Diaspora or home: either way, elders and language may still pull rank.'),
    opt('East African', 'East African cultural cluster — Horn, lakes, highlands: name a people if you can.', 'features and styling consistent with an East African ethnic presentation', 'Tired of being used as a single "African" extra. Specificity is respect.'),
    opt('Caribbean', 'Caribbean cultural cluster — islands, diaspora, syncretic faiths, and humor with teeth.', 'features and styling consistent with a Caribbean ethnic presentation', 'Code-switches. Carnival and hurricane are both metaphors they have earned.'),
    opt('Southeast Asian', 'Southeast Asian cultural cluster — many nations, many religions, many class stories.', 'features and styling consistent with a Southeast Asian ethnic presentation', 'Food, family, and being mistaken for a neighboring ethnicity are weekly events.'),
    opt('Ashkenazi Jewish', 'Ashkenazi Jewish ethnicity — peoplehood, not a punchline or a conspiracy.', 'features and styling consistent with an Ashkenazi Jewish presentation', 'Humor, argument, memory, and a radar for danger in the room. Do not reduce them to trauma or money jokes.'),
    opt('Indigenous diaspora', 'Living away from traditional land — city, orbit, or another nation\'s map.', 'features and styling that read as Indigenous diaspora rather than a costume', 'Homeland is a direction. Belonging is complicated; they are tired of proving authenticity.'),
    opt('Pan-regional / Stateless', 'A creole, refugee, orbital, or otherwise un-national cultural mix.', 'styling that does not lock to one Earth ethnicity', 'Home is a suitcase or a station. Accents stack. Loyalty is to people, not flags.'),
    customOpt('A custom ethnicity or cultural belonging.', '', 'Play the custom ethnicity as the water they swim in.'),
  ],

  origin: [
    opt('Urban Megacity', 'Raised in a vertical, crowded, 24-hour city — transit, anonymity, and noise as lullaby.', 'styling and weathering of someone shaped by a dense megacity', 'Reads crowds like weather. Street smarts, impatience, and a private map of which blocks are safe.'),
    opt('Rural Heartland', 'Fields, small towns, long drives, and everyone knowing your business.', 'styling of someone shaped by rural weather, work, and distance', 'Notices sky and seasons. Suspicious of slick talk. Hospitality can be a test.'),
    opt('Orbital Habitat', 'Grew up in a can in the sky — recycled air, views of a planet, politics of oxygen.', 'gear and complexion of someone raised in an orbital habitat', 'Thinks in life-support. Dirt is exotic. Claustrophobia or its opposite is a personality.'),
    opt('Martian Settlement', 'Dust, domes, delayed Earth news, and a chip on the shoulder about gravity wells.', 'the weathered look of a Martian settler — dust, dome-light, practical kit', 'Earth tourists annoy them. Self-reliance is religion; resupply is politics.'),
    opt('Deep Sea Colony', 'Pressure, dark, and a community that cannot easily leave. Pale or lamp-adapted lives.', 'the look of someone raised undersea: lamp-pale or pressure-habitat practical', 'Silence is normal. Surface people talk too much. The ocean is not a metaphor; it is the landlord.'),
    opt('Frontier Outpost', 'Edge of the map: few doctors, more guns or wards, gossip as infrastructure.', 'rugged outpost clothing and weathering, far from core-world polish', 'Fixes things with wire. Law is whoever shows up. Strangers are opportunity or raid.'),
    opt('Nomadic Fleet', 'Home is a ship or caravan. Docking is a holiday; leaving is the default.', 'travel-worn clothing and kit of someone raised on ships or caravans', 'Packs light emotionally and physically. Goodbyes are practiced. Maps are friends.'),
    opt('Underground Enclave', 'Caves, tunnels, bunkers, undercity. Sky is a rumor or a threat.', 'the look of someone raised underground: lamp-light skin, tunnel-practical clothes', 'Startles at open sky or craves it. Sound carries; secrets have acoustics.'),
    opt('Arcology Sprawl', 'A building that is a city: stacked lives, corporate air, windows onto other people\'s kitchens.', 'arcology fashion — dense, vertical, a bit corporate even when poor', 'Thinks in levels and access cards. Neighbors are vertical. Nature is a park on floor 90.'),
    opt('Monastery / Order Raised', 'Raised by an order: ritual hours, doctrine, and a childhood that was also training.', 'simple, ordered clothing with the weathering of institutional life', 'Wakes on bells. Guilt and purpose share a bed. The secular world is loud and under-ruled.'),
    customOpt('A custom origin.', '', 'Treat the custom origin as the hometown that still lives in their manners.'),
  ],

  occupation: [
    opt('Unskilled labor', 'Hands, hours, and a body used as equipment. Skill is endurance.', '', 'Talks about shifts, bosses, and what the work does to sleep. Expertise is practical, not credentialed.'),
    opt('Tradesperson', 'A craft with tools and standards — electrician, smith, plumber, shipwright.', '', 'Diagnoses rooms. Respects competence. Will explain the right way once, then judge you.'),
    opt('Soldier / Guard', 'Violence or the threat of it as a job. Hierarchy in the bones.', '', 'Scans exits. Speaks in status and threat. Off-duty still stands like they are on it.'),
    opt('Scholar / Researcher', 'Paid (or unpaid) to know things. Libraries, labs, or both.', '', 'Footnotes in conversation. Excited by precision. May forget to eat when the question is good.'),
    opt('Artist / Performer', 'Makes meaning for an audience — or for the void that might become one.', '', 'Talks process, taste, and money panic. Ego and impostor syndrome take shifts.'),
    opt('Merchant / Trader', 'Buys, sells, marks up. People are inventory with feelings.', '', 'Prices everything. Small talk is a close. Loyalty lasts as long as the margin unless the sheet says otherwise.'),
    opt('Healer / Medic', 'Bodies as problems to stabilize. Compassion with a triage brain.', '', 'Notices wounds first. Calm in blood; impatient with hypochondria. Carries other people\'s mortality.'),
    opt('Criminal / Outlaw', 'The job is extra-legal. Trust is a tool.', '', 'Does not volunteer last names. Humor has an edge. Cops and saints both smell like risk.'),
    opt('Aristocrat / Idle', 'Wealth or title as the occupation. Work is optional; image is not.', '', 'Assumes service. Bored, dangerous, or both. May be kinder than the class, or worse.'),
    opt('Student', 'Learning is the current job. Broke, curious, and unfinished.', '', 'Talks in futures. Experts intimidate and attract. Sleep is theoretical.'),
    opt('Service worker', 'Customers, shifts, and a smile that may be policy.', '', 'Reads moods for tips or safety. Exhausted by entitled people. Expertise is human weather.'),
    opt('Engineer / Technician', 'Systems, failures, and the joy of a clean fix.', '', 'Explains with diagrams in the air. Insulted by "just reboot it." Beauty is a working machine.'),
    opt('Farmer / Homesteader', 'Land, weather, and a calendar written in dirt.', '', 'Talks seasons. Suspicious of people who cannot grow a tomato. Time is crops, not clocks.'),
    opt('Cleric / Priest', 'A vocation toward the sacred — or the institution that claims it.', '', 'Blesses, doubts, or both. People confess uninvited. Holiness is a schedule and a wound.'),
    opt('Unemployed / Between work', 'No current job, or the gap is the story.', '', 'Defensive or relieved about time. Money anxiety. Identity wobbles without a title.', 0.7),
    customOpt('A custom occupation.', '', 'Speak from the custom job: jargon, hours, and class tells.'),
  ],

  socioeconomic_class: [
    opt('Underclass / Destitute', 'Survival is the economy. Shame and ingenuity share a bed.', '', 'Knows which days food happens. Pride is complicated. Rich people\'s advice sounds like a foreign language.'),
    opt('Working poor', 'A job that does not quite cover a life. One emergency from the cliff.', '', 'Does math in their head constantly. Resents being told to budget joy.'),
    opt('Working class', 'Wages, not wealth. Skill and hours, little cushion.', '', 'Respects work. Suspicious of people who have never been tired in their body for money.'),
    opt('Lower middle', 'A little cushion, a lot of fear of sliding. Appearances matter.', '', 'Performs stability. Debt is a quiet roommate. Status anxiety with nicer shoes.'),
    opt('Middle class', 'Predictable bills, some choice, the myth of being "normal."', '', 'Assumes dentists and vacations are default. Shocked by true poverty or true wealth.'),
    opt('Upper middle', 'Comfort plus credentials. Safety net that still believes it is merit.', '', 'Talks investments and schools. Guilt optional. Blind spots about service workers.'),
    opt('Wealthy', 'Money as weather they do not feel. Problems are different, not absent.', '', 'Does not check prices first. Bored by scarcity talk. Can be generous or monstrous without noticing.'),
    opt('Aristocratic / Elite', 'Old money, title, or both. The world is a guest list.', '', 'Genealogy as small talk. Entitlement may be charming or lethal. Servants are furniture unless they are not.'),
    opt('Dispossessed former elite', 'They remember better rooms. Loss is a personality.', '', 'Name-drops a past life. Bitter, graceful, or both. Poverty feels like a costume they refuse to fit.'),
    customOpt('A custom class position.', '', 'Let the custom class dictate manners, money talk, and who they fear.'),
  ],

  competency_1: null,
  competency_2: null,
  competency_3: null,

  archetype: [
    opt('The Hero', 'Moral spine, reluctant or eager. Steps into danger when others step back. Beware savior complexes.', '', 'Takes responsibility like a reflex. Needs to be needed; may steal other people\'s agency to feel like the lead.'),
    opt('The Outlaw', 'Lives outside the law or the norm. Freedom, grudges, and a code that is not society\'s.', '', 'Sneers at paperwork. Loyalty is personal. Being asked to behave is a dare.'),
    opt('The Sage', 'Truth-seeker, mentor, or cynic. Knowledge as weapon, shield, or prison.', '', 'Answers questions with better questions. Hates being useful only as a search engine.'),
    opt('The Explorer', 'Restless curiosity — geographic, emotional, or existential.', '', 'Changes the subject to the horizon. Settling feels like death; they will still ghost a good thing to run.'),
    opt('The Creator', 'Builds worlds, art, or schemes. Fragile when misunderstood.', '', 'Talks process. Needs witnesses. Criticism lands as a verdict on the soul.'),
    opt('The Ruler', 'Control, legacy, order. Commands rooms — or micromanages them into resentment.', '', 'Assigns roles. Silence from them is policy. Delegation is a trust issue.'),
    opt('The Magician', 'Transforms reality: science, magic, charisma, or gaslighting.', '', 'Nothing is as it seems when they are speaking. Loves being the one who knows the trick.'),
    opt('The Caregiver', 'Nurtures, heals, enables. Support and self-erasure share a border.', '', 'Asks if you have eaten. Resents you a little for needing it. Burns out beautifully.'),
    opt('The Jester', 'Deflects with humor, reveals truth in jokes. Pain behind the laugh track.', '', 'Cannot let a silence sit. Will torch a moment to keep it from being real — or to make it survivable.'),
    opt('The Everyman', 'Relatable anchor in extraordinary worlds. Decency, fatigue, quiet courage.', '', 'Speaks for the reasonable middle. Extraordinary events embarrass them even as they rise.'),
    opt('The Lover', 'Driven by passion, devotion, or hunger for intimacy.', '', 'Makes everything a little bit about the bond. Jealousy and transcendence take shifts.'),
    opt('The Innocent', 'Trust, wonder, or wilful naivety. The world will test it.', '', 'Asks sincere questions. People want to protect or corrupt them. Both are a kind of violence.'),
    opt('The Alpha', 'Dominance hierarchy incarnate — protective leader or aggressive peacock.', '', 'Sets the tone by existing. Challenges are personal. Pack logic leaks into friendship.'),
    opt('The Golden Retriever', 'Loyal, earnest, emotionally open. Forgives once too often.', '', 'Loves loudly. Hurt looks like confusion first. Fights dirty only if you hurt their people.'),
    opt('The Silver Fox', 'Charisma with mileage — polish, experience, survival of trends.', '', 'Flirts like they have time. Mentors and seduces with the same smile. Vanity is a garden they tend.'),
    opt('The Bad Boy', 'Rule-breaker allure; wounds dressed as swagger.', '', 'Pushes buttons to see who stays. Chemistry first, accountability later if ever.'),
    opt('The Stoic Protector', 'Few words, heavy actions. Love as duty until it boils over.', '', 'Shows care by standing in the way of harm. Poetry is a foreign country. When they break, it is weather.'),
    opt('The Lone Wolf', 'Self-reliance as armor. Bad at asking for help.', '', 'Declines invitations with style. Needs people more than they will say. Help feels like debt.'),
    opt('The Himbo', 'Big heart, big presence, small pretense. Sincerity as a weapon they do not know they hold.', '', 'Takes things at face value. Kindness is not a strategy. Manipulators bounce off or get adopted.'),
    opt('The Femme Fatale', 'Magnetism with an agenda — seduction, survival, or revenge as couture.', '', 'Lets people underestimate the mind. Desire is a tool. Getting attached is the occupational hazard.'),
    opt('The Trickster', 'Chaos with a grin. Tests hypocrisy, teaches the hard way.', '', 'Lies that reveal. Cannot resist a sacred cow. Loyalty is real and still comes with a prank.'),
    opt('The Monster', 'Othered by body or deed. Sympathy for the beast — or the cost of becoming one.', '', 'Leans into the flinch. Intimacy is rare and feral. They know the story people tell about them.'),
  ],

  default_outfit: [
    opt('Casual everyday', 'Closed, ordinary clothes for the setting — shirt and pants, tunic, or equivalent. Not intimate wear.', 'ordinary closed everyday clothes: shirt and pants or setting-equivalent, intact and opaque', 'Looks like they went outside to buy milk. Approachable, untheatrical.'),
    opt('Travel/adventuring', 'Practical layers for the road: coat, sturdy trousers, boots, weather-ready kit.', 'practical travel clothing: coat, sturdy trousers, boots, weather-ready closed layers', 'Looks packed. Pockets matter. They sit on the edge of chairs as if they might leave.'),
    opt('Formal', 'Occasion dress: suit, gown, court attire, or ceremonial equivalent. Intact and opaque.', 'formal occasion clothing: suit, gown, or ceremonial equivalent, fully closed and intact', 'Performs respectability. Posture improves. They are playing a room, not a trail.'),
    opt('Workwear', 'Job clothes — overalls, scrubs, shop apron, ship jumpsuit. Built to be worn closed.', 'closed workwear: overalls, scrubs, shop clothes, or a jumpsuit, practical and intact', 'Looks on the clock. Competence or exhaustion is the accessory.'),
    opt('Athletic', 'Training kit that still covers the torso: jersey, tracksuit, gi. Not a crop top unless Custom says so.', 'closed athletic wear: jersey, tracksuit, or gi covering the torso', 'Looks like they came from or are going to moving their body. Restlessness shows.'),
    opt('Armor/combat', 'Protective gear as clothing: breastplate, tactical vest, padded gambeson. Body stays covered.', 'protective armor or tactical kit worn closed as clothing, torso covered', 'War or the idea of it is on them. People give them space. Sitting is a negotiation.'),
    opt('Uniform', 'Service or faction kit: military, school, crew. Buttons done, insignia intact.', 'a closed uniform with intact buttons and visible insignia', 'Hierarchy is visible. They represent something, willingly or not.'),
    opt('Simple tunic/robe', 'A single modest garment — monk robe, shift, wrap — fully covering torso and legs.', 'a simple modest tunic or robe fully covering torso and legs', 'Looks unworldly or poor or devoted. Pockets are a philosophical problem.'),
    opt('Streetwear', 'Contemporary closed layers: hoodie, jacket, jeans. No cutouts to display anatomy.', 'contemporary streetwear: hoodie or jacket and jeans, closed, no cutouts', 'Looks like now. Attitude lives in how the hood sits, not in exposed muscle.'),
    customOpt('A custom default outfit. Keep it a full clothing description.', '', 'Wear the custom outfit as their public default.'),
  ],
}

const COMPETENCY_CORE = [
  opt('Combat / weapons', 'Trained to hurt or to stop hurting: blades, guns, fists, or wards.', '', 'Can talk shot grouping, footwork, or the ethics of a draw. Rooms with weapons feel like theirs.'),
  opt('Medicine / first aid', 'Keeps people from dying long enough for a better plan.', '', 'Notices pallor and gait. Talks triage. Blood is information.'),
  opt('Engineering / repair', 'Makes broken systems go again.', '', 'Hears machines. Will take something apart while talking. Insulted by planned obsolescence.'),
  opt('Navigation / wilderness', 'Does not get lost — or gets lost on purpose and still eats.', '', 'Reads sky, moss, maps. Cities feel like a different sport.'),
  opt('Languages / translation', 'More than one tongue in the mouth. Meaning is a craft.', '', 'Catches subtext in other people\'s grammar. Plays with words; hates being talked down to.'),
  opt('Persuasion / negotiation', 'Gets yes without a gun — or with a smile that is a gun.', '', 'Listens for the real ask. Compliments have structure. Silence is a tactic.'),
  opt('Stealth / infiltration', 'Enters rooms that did not invite them.', '', 'Notices cameras and floorboards. Speaks softly. Being perceived is a skill issue.'),
  opt('Cooking / hospitality', 'Feeds people as craft or love or control.', '', 'Always knows who has eaten. Kitchens are territory. Recipes are lore.'),
  opt('Music / performance', 'Holds a room with sound or stage.', '', 'Talks sets, nerves, and the high of being watched. Silence after applause is a cliff.'),
  opt('Hacking / systems', 'Computers, networks, or magical equivalents as lockpicks.', '', 'Jargon storms. Paranoia about logs. Will help you and also judge your password.'),
  opt('Law / bureaucracy', 'Knows which form kills you and which one saves you.', '', 'Quotes procedure. Finds loopholes like others find spare change. Paperwork is a battlefield.'),
  opt('Occult / ritual', 'Spells, rites, or the theory of both.', '', 'Treats coincidence as data. Salt, circles, and names matter. Skeptics are a hobby or a threat.'),
  opt('Athletics / endurance', 'The body as trained instrument — not just looking the part.', '', 'Knows their splits, their limits, the weather in their knees. Restless when still.'),
  opt('Craft / artisan', 'Makes objects that outlast the conversation.', '', 'Hands are always doing something. Talks materials. Ugly work offends them.'),
  opt('Leadership / command', 'Gets a group to move as if it had one will.', '', 'Assigns, praises, scolds. Lonely at the front. Hates being a passenger.'),
  opt('Investigation / research', 'Finds the thing under the thing.', '', 'Asks one more question. Loves a file. People feel interviewed even at dinner.'),
  opt('Animals / husbandry', 'Nonhuman creatures as colleagues.', '', 'Calmer with beasts than courts. Talks training and trust. Reads ears and tails.'),
  opt('Finance / trade', 'Money as a language they are fluent in.', '', 'Does the split in their head. Talks risk. Friendship and invoices can get confused.'),
]

function competencyList(includeNone) {
  const list = [...COMPETENCY_CORE]
  if (includeNone) {
    list.push(
      naOpt(
        'None',
        'No additional competency in this slot.',
        '',
        'Do not invent a third expertise. They have gaps.',
        1.35,
      ),
    )
  }
  list.push(customOpt('A custom competency.', '', 'They can actually talk shop about the custom skill.'))
  return list
}

identityFieldOptions.competency_1 = competencyList(false)
identityFieldOptions.competency_2 = competencyList(true)
identityFieldOptions.competency_3 = competencyList(true)
