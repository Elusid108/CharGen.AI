/**
 * Definitions, tooltips, and context info for character attributes
 * Shown in the context panel when hovering/selecting fields
 */

export const definitions = {
  // Species
  'Human': 'Standard Homo sapiens. The most common and versatile species in most settings.',
  'Humanoid Alien': 'An extraterrestrial being with a roughly human-like body plan. Two arms, two legs, upright posture—but with alien features.',
  'Non-Humanoid Alien': 'A truly alien form. Could be anything from a sentient cloud to a multi-limbed horror.',
  'Elf': 'Long-lived, graceful beings often associated with magic and nature.',
  'Dwarf': 'Stout, hardy folk known for craftsmanship and resilience.',
  'Android/Cyborg': 'Partially or fully mechanical. The line between human and machine blurs.',
  'Vampire': 'Undead predator sustained by blood. Ancient, alluring, and dangerous.',
  'Hybrid': 'A blend of two or more species. Often an outsider in both worlds.',
  'Orc': 'Brutish strength and tribal honor—or a racist stereotype subverted. Tusks, green or grey skin, warrior culture.',
  'Demon': 'Infernal heritage: hunger, bargains, horns, fire motifs. Often feared, sometimes just tired of propaganda.',
  'Angel': 'Celestial or bio-engineered perfection. Radiance, duty, wings optional—always the weight of higher expectations.',
  'Undead': 'Revenant, lich, or cursed corpse-walker. Decay, memory, and unnatural persistence.',
  'Werewolf/Lycanthrope': 'Moon-tied transformation or always-on beast traits. Pack bonds, rage, heightened senses.',
  'Dragon/Draconic': 'Scaled, hoard-minded, ancient heat. Pride and long memory in a humanoid frame.',
  'Fae/Fairy': 'Trickery, glamour, alien morality. Deals, oaths, and rules that mortals misunderstand.',
  'Elemental': 'Fire, water, air, or earth given intent. Body as conduit for raw natural force.',

  // Physique
  'Otter': 'Slim, hairy, and athletic. A swimmer\'s build with natural definition.',
  'Bear': 'Heavyset and hairy. Imposing size, often with a mix of muscle and softness.',
  'Bodybuilder': 'Hyper-trophied musculature, vascularity, and extremely low body fat.',
  'Dad Bod': 'Soft around the middle but with underlying strength. Comforting and sturdy.',
  'Twunk': 'Muscular but slim. A balance between a twink and a hunk.',
  'Mass Monster': 'Beyond bodybuilder. Freakish size that\'s almost inhuman.',
  'Powerlifter': 'Built for raw strength, not aesthetics. Thick, dense, functional.',
  'Lithe': 'Graceful and slender. Every movement is efficient and elegant.',
  'Amazonian': 'Tall, powerful, and commanding. Built like a warrior goddess.',

  // Body Hair
  'Smooth/Hairless': 'Completely shaven or naturally hairless. Highlights muscle definition.',
  'Treasure Trail': 'A distinct line of hair from navel downward. Minimal but provocative.',
  'Hairy Chest': 'A thick mat of hair covering the pectorals. Classic masculine look.',
  'Full Body Hair': 'Significant coverage on chest, arms, legs, and stomach.',

  // Facial Structure
  'Chiseled': 'Sharp jawline, high cheekbones. The classic model look.',
  'Rugged': 'Weathered skin, perhaps a broken nose or scar. Suggests experience.',
  'Square-Jawed': 'Broad, heavy lower face indicating raw strength.',
  'Pretty': 'Softer features, long lashes, symmetrical. A deceptive beauty.',
  'Aristocratic': 'Refined bone structure. High forehead, aquiline nose. Suggests breeding.',
  'Gaunt': 'Hollowed cheeks, sharp shadows. Something has consumed them—magic, hunger, or obsession.',
  'Soft/Boyish': 'Rounded, youthful planes. Innocent first impression that may be misleading.',
  'Round': 'Softer jaw, friendly openness. Reads approachable; may struggle to command intimidation.',
  'Angular': 'Sharp planes and edges; striking, severe, or elegantly harsh.',
  'Weathered': 'Sun, wind, and time carved in. Trustworthy grit or hard-lived exhaustion.',
  'Alien/Non-Human': 'Proportions or features that break human averages—beautifully wrong.',

  // Gait
  'Staccato': 'Sharp, precise movements. Military background or high anxiety. Takes up exactly the space they need.',
  'Lumbering': 'Heavy, deliberate steps. Raw power or fatigue. A force of nature—slow to start, hard to stop.',
  'Gliding': 'Upper body remains still while moving. Grace, stealth, or arrogance. Dancers or thieves.',
  'Shuffling': 'Feet rarely leave the ground. Age, timidity, or exhaustion. Trying not to be noticed.',
  'Strutting': 'Chest out, chin up. Takes up space. High confidence or overcompensation. Wants to be seen.',
  'Prowling': 'Low center of gravity, predatory awareness. Always scanning for threats or prey.',
  'Bouncing': 'Spring in the step—youth, caffeine, nerves, or irrepressible optimism.',
  'Mechanical': 'Precise, repeated motion. Augmented, trained, or emotionally guarded to the point of rigidity.',
  'Slithering': 'Fluid, low, uncanny grace. Predatory, serpentine, or non-human joint logic.',
  'Floating': 'Barely seems to touch the ground—magic, zero-G, aristocratic detachment, or dissociation.',

  // Scent
  'Ozone & Copper': 'Smells like a storm or old pennies. Magical or industrial origin.',
  'Old Paper & Vanilla': 'The smell of libraries and degradation. Scholarship or introversion.',
  'Woodsmoke & Pine': 'The outdoors. A ranger, traveler, or someone who sleeps under the stars.',
  'Cheap Perfume & Gin': 'Masking something underneath. Urban, perhaps desperate or hiding poverty.',
  'Motor Oil & Citrus': 'Mechanic or artificer. Clean but stained. The smell of work.',
  'Blood & Iron': 'A warrior who has seen too much combat. The scent never fully washes off.',
  'Lavender & Dust': 'Calm and abandonment—old linens, dried herbs, a room no one opens anymore.',
  'Saltwater & Rot': 'Harbor brine, storm decks, or something drowned that followed them home.',
  'Fresh Rain': 'Petrichor and ozone; clean slate energy that still carries a chill.',
  'Sulfur': 'Brimstone, labs, gunpowder, or infernal bargains. Dangerously chemical.',
  'Nothing/Sterile': 'Antiseptic void—hospital, spaceship, or emotional dissociation made olfactory.',
  'Alien/Indescribable': 'Wrong notes for human noses—sweet metal, static, or geometry-as-smell.',

  // Aura & voice (movement / presence)
  'Warm & Inviting': 'People lean in without knowing why. Open posture in an invisible sense.',
  'Cold & Distant': 'Respect or unease at arm\'s length. Warmth withheld or frozen out.',
  'Electrifying': 'High charge—charisma, danger, or mania. Hair stands up metaphorically.',
  'Calming': 'Lowers heart rates. Therapeutic or eerie depending on intent.',
  'Menacing': 'Subtle threat in stillness. Violence suggested, not performed.',
  'Mysterious': 'Hard to read on purpose. Silence used as costume.',
  'Chaotic': 'Unpredictable energy—compelling or exhausting, rarely neutral.',
  'Regal': 'Assumes deference. Bearing, voice, and pause all say "throne."',
  'Magnetic': 'Pulls attention and desire. Often unaware of the wake they leave.',
  'Unsettling': 'Something off—too still, too friendly, too knowing.',
  'None/Mundane': 'Blends into crowds. Power or pain hides in plain sight.',

  'Gravelly': 'Smoker, fighter, or sea captain timbre. Words sound like they cost something.',
  'Nasal': 'Sharp, carrying, sometimes comic. Can read as whiny or cutting.',
  'Breathy': 'Intimate by default; every sentence feels like a secret or a come-on.',
  'Booming': 'Fills space without a mic. Command, theater, or barely controlled volume.',
  'Melodic': 'Naturally musical speech—lilts, rhythm, almost sings when emotional.',
  'Monotone': 'Flat affect: exhaustion, neurodivergence, or iron control.',
  'Strained': 'Held-back emotion or damaged cords. Listening feels like witnessing effort.',
  'Silky': 'Smooth persuasion. Dangerous in negotiations and bedrooms.',
  'Raspy': 'Texture that suggests cigarettes, screaming, or old wounds.',
  'Squeaky': 'Youth, anxiety, or cartoon contrast with a brutal body.',
  'Echoing': 'Supernatural, cavernous, or mic-reverb wrongness in a normal room.',
  'Telepathic': 'Voice bypasses ears—pressure behind the eyes, borrowed words.',

  // MBTI
  'INTJ': 'The Architect. Imaginative and strategic thinkers, with a plan for everything. Values logic over emotion.',
  'ENFP': 'The Campaigner. Enthusiastic, creative, sociable free spirit. Finds meaning in emotional connections.',
  'ISTP': 'The Virtuoso. Bold and practical experimenter. Learns by doing, often acts before thinking.',
  'ESFJ': 'The Consul. Extraordinarily caring, social, and popular. Always eager to help.',
  'INFJ': 'The Advocate. Quiet, mystical, yet very inspiring and tireless idealist.',
  'ENTP': 'The Debater. Smart and curious thinker who cannot resist an intellectual challenge.',
  'INTP': 'The Logician. Innovative inventor with an unquenchable thirst for knowledge. Loves systems and abstractions.',
  'ENTJ': 'The Commander. Bold, decisive, born leader. Pushes people toward a vision—sometimes over their objections.',
  'ISTJ': 'The Logistician. Practical, fact-minded, reliable. Honor and tradition anchor their choices.',
  'ISFJ': 'The Defender. Warm, dedicated protector. Remembers details others forget; resents being taken for granted.',
  'ESTJ': 'The Executive. Organized, force of tradition and order. Gets things done; can steamroll nuance.',
  'INFP': 'The Mediator. Poetic, kind, guided by values. Idealistic inner world; struggles with harsh realities.',
  'ENFJ': 'The Protagonist. Charismatic motivator. Sees people\'s potential—may overfunction to "fix" them.',
  'ISFP': 'The Adventurer. Flexible, artistic, lives in the moment. Quiet passion; fierce loyalty when crossed.',
  'ESTP': 'The Entrepreneur. Smart, energetic, reads the room. Action first; bored by long theory.',
  'ESFP': 'The Entertainer. Spontaneous, enthusiastic, life of the party. Avoids heaviness until it crashes in.',

  // Alignment
  'Lawful Good': 'Acts as a good person is expected or required to act. Believes in the system.',
  'Chaotic Neutral': 'Follows their own whims. An individualist whose only loyalty is to freedom.',
  'Lawful Evil': 'Methodically takes what they want within limits. The tyrant or corrupt official.',
  'True Neutral': 'Undecided or balanced. Believes balance is more important than good or evil.',
  'Chaotic Good': 'A rebel with a heart of gold. Does the right thing, even if it means breaking every rule.',
  'Neutral Good': 'Does the best they can according to kindness without zeal for rules or chaos.',
  'Lawful Neutral': 'Order, tradition, or duty first—neither cruel nor kind by default. The judge and the clockwork.',
  'Neutral Evil': 'Pure self-interest with no loyalty. Does whatever they can get away with.',
  'Chaotic Evil': 'Destructive, unpredictable, and cruel. Revels in suffering and chaos.',

  // Enneagram
  'Type 1 (Reformer)': 'Rational, idealistic. Fear: Being corrupt/evil. Desire: To be good and balanced.',
  'Type 4 (Individualist)': 'Sensitive, withdrawn. Fear: Having no identity. Desire: To be unique.',
  'Type 8 (Challenger)': 'Powerful, dominating. Fear: Being controlled. Desire: To protect themselves.',
  'Type 9 (Peacemaker)': 'Easygoing, self-effacing. Fear: Loss/Separation. Desire: Inner stability.',
  'Type 2 (Helper)': 'Warm, people-pleasing. Fear: Being unwanted. Desire: To feel loved and needed—sometimes at their own expense.',
  'Type 3 (Achiever)': 'Adaptive, image-conscious, driven. Fear: Worthlessness without success. Desire: To be valuable and admired.',
  'Type 5 (Investigator)': 'Intense, cerebral, private. Fear: Helplessness and depletion. Desire: To be capable and self-sufficient.',
  'Type 6 (Loyalist)': 'Committed, anxious, vigilant. Fear: Lack of support. Desire: To have security and faithful allies.',
  'Type 7 (Enthusiast)': 'Spontaneous, scattered, pleasure-seeking. Fear: Being trapped in pain. Desire: To be satisfied and free.',

  // Archetypes (narrative + modern flavor)
  'The Hero': 'Moral spine, reluctant or eager. Steps into danger when others step back. Beware savior complexes.',
  'The Outlaw': 'Lives outside the law or the norm. Freedom, grudges, and a code that is not society\'s.',
  'The Sage': 'Truth-seeker, mentor, or cynic. Knowledge as weapon, shield, or prison.',
  'The Explorer': 'Restless curiosity—geographic, emotional, or existential. Runs toward the horizon.',
  'The Creator': 'Builds worlds, art, or schemes. Obsessed with originality; fragile when misunderstood.',
  'The Ruler': 'Control, legacy, order. Commands rooms—or micromanages them into resentment.',
  'The Magician': 'Transforms reality: science, magic, charisma, or gaslighting. Nothing is as it seems.',
  'The Caregiver': 'Nurtures, heals, enables. The line between support and self-erasure is thin.',
  'The Jester': 'Deflects with humor, reveals truth in jokes. Pain hidden behind the laugh track.',
  'The Everyman': 'Relatable anchor in extraordinary worlds. Decency, fatigue, and quiet courage.',
  'The Lover': 'Driven by passion, devotion, or hunger for intimacy. Jealousy and transcendence in equal measure.',
  'The Innocent': 'Trust, wonder, or wilful naivety. The world will test whether it breaks or hardens them.',
  'The Alpha': 'Dominance hierarchy incarnate—protective leader or aggressive peacock, setting tone by presence.',
  'The Golden Retriever': 'Loyal, earnest, emotionally open. Will forgive once too often; fights dirty when you hurt their pack.',
  'The Silver Fox': 'Charisma with mileage—experience, polish, and the quiet confidence of having survived trends.',
  'The Bad Boy': 'Rule-breaker allure; wounds dressed as swagger. Chemistry and collateral damage.',
  'The Stoic Protector': 'Few words, heavy actions. Love shown through duty, not poetry—until it boils over.',
  'The Lone Wolf': 'Self-reliance as armor. Chooses solitude—or was pushed into it; bad at asking for help.',
  'The Himbo': 'Big heart, big muscles, small pretense. Sincerity disarms manipulators—until it doesn\'t.',
  'The Femme Fatale': 'Magnetism with an agenda—seduction, survival, or revenge worn like couture.',
  'The Trickster': 'Chaos agent with a grin. Tests hypocrisy, breaks rules, teaches painful lessons.',
  'The Monster': 'Othered by body or deed. Sympathy for the beast—or the cost of becoming one.',

  // Vices & virtues (narrative)
  'Wrath': 'Hair-trigger justice or cruelty. Violence as language when words fail.',
  'Greed': 'More—status, touch, power, stuff. Never full; always calculating the next gain.',
  'Sloth': 'Avoidance: numbness, procrastination, or refusal to engage when action costs too much.',
  'Pride': 'Cannot admit fault without feeling annihilated. Image and ego before truth.',
  'Lust': 'Hunger for flesh, control, or intoxication. Desire that overrides caution.',
  'Envy': 'Resentment of what others have; corrodes friendships and distorts ambition.',
  'Gluttony': 'Overconsumption—food, pleasure, stimulation—to fill an inner void.',
  'Cruelty': 'Inflicts pain because they can, to teach, to cope, or because it feels like power.',
  'Cowardice': 'Self-preservation wins every time—sometimes wisely, sometimes shamefully.',
  'Obsession': 'Single-track fixation: person, goal, or grudge. Beautiful focus or self-destruction.',
  'Chastity': 'Discipline of desire—not necessarily abstinence, but integrity around intimacy and impulse.',
  'Temperance': 'Balance and moderation; knows when to stop drinking, spending, or escalating.',
  'Charity': 'Gives without keeping score—time, resources, or forgiveness.',
  'Diligence': 'Shows up reliably; crafts mastery through repetition when inspiration fails.',
  'Patience': 'Waits without snapping; reads rooms and timing. Can be weaponized as cold silence.',
  'Kindness': 'Softness chosen on purpose. Not weakness—intentional gentleness in a hard world.',
  'Humility': 'Accurate self-view; admits limits. Rarely performative, often underestimated.',
  'Courage': 'Acts despite fear; moral backbone when retreat would be easier.',
  'Loyalty': 'Stays when leaving is sane. Defines who counts as "us"—for good or ill.',
  'Wisdom': 'Sees patterns, names tradeoffs, advises without controlling. Earned scars behind the calm.',

  // Granular body descriptors (shared across limbs / torso)
  'Slender': 'Narrow bones and lean mass. Elegant lines; reads younger or more agile than bulky builds.',
  'Toned': 'Visible work without bulk. Functional, athletic, everyday-hero fit.',
  'Muscular': 'Clear hypertrophy and strength signals. Reads as trained, not accidental.',
  'Thick': 'Dense limbs or torso—powerlifter or natural endomorph. Heavy hooks, strong levers.',
  'Massive': 'Scale-breaking size. Cartoonish or heroic mass that changes how doors and beds feel.',
  'Soft': 'Gentle curves, less definition; comfort, warmth, or recovery from hard years.',
  'Defined': 'Separation and lines without freak size. Crisp silhouette, deliberate conditioning.',
  'Custom': 'A bespoke build that breaks the usual categories—your table, your anatomy rules.',

  // The Lie
  'I am unlovable': 'Believes they must earn affection through deeds. Overworks to \'buy\' love.',
  'Vulnerability is death': 'Believes showing emotion will get them killed. Stoic to a fault.',
  'I know best': 'Arrogance preventing trust of others. Micro-manages and alienates allies.',
  'The world is just': 'Naivety that will be shattered by the plot. Unprepared for unfair tragedy.',
  'Power is the only safety': 'Only trusts force. Sees every relationship as a power dynamic.',
  'Everyone leaves eventually': 'Self-sabotages relationships to prove themselves right.',
  'I dont deserve happiness': 'Punishes joy as if suffering were proof of virtue. Sabotages good days.',
  'I must be perfect': 'Paralysis and burnout; one flaw feels like total failure.',
  'Trust no one': 'Hypervigilance as religion. Intimacy becomes interrogation or performance.',
  'I am broken beyond repair': 'Healing feels like a lie sold to other people. Resists help to stay "honest."',

  // Social Battery
  'Deep Introvert': 'Drains rapidly around people. Needs extended solitude to function.',
  'Introvert': 'Prefers solitude, recharges alone. Deep focused interactions preferred.',
  'Extrovert': 'Gains energy from interaction, drains when alone. Craves stimulation.',
  'Omnivert': 'Fluctuates between extremes depending on context.',
  'Ambivert': 'Balanced. Can handle both but prefers neither extreme.',

  // Eye shape
  'Almond': 'Classic balanced lid; versatile reads across cultures and genres.',
  'Hooded': 'Heavier lid line; sleepy, sultry, or guarded depending on brow tension.',
  'Monolid': 'Continuous lid line; distinct East Asian and global presentations—avoid stereotype, keep specificity.',
  'Deep-set': 'Eyes sit back under bone; shadowed, intense, tired, or predatory.',
  'Wide-set': 'More space between eyes; youthful, innocent, or alien depending on context.',
  'Narrow': 'Focused, assessing gaze. Can read as cruel or hyper-focused.',
  'Multiple Eyes': 'Insectile, divine, or horror—track which eye "leads" socially.',
  'No Eyes': 'Blindfolds, sockets, smooth skin—how do they still know where you are?',
  'Glowing': 'Supernatural emission; color shifts with mood or power level.',

  // Mustache & beard (sample of common picks)
  'None / Clean Shaven': 'Bare skin emphasis; jaw and lips carry the whole performance.',
  'None / Clean Upper Lip': 'Smooth philtrum-to-nose zone; draws attention to mouth and scruff elsewhere.',
  'Five O\'Clock Shadow': 'End-of-day grit without full beard commitment.',
  'Short Stubble': 'Deliberately maintained sandpaper; casual but styled.',
  'Corporate Beard': 'Neat lines, boardroom safe; still hides half the lower face\'s tells.',
  'Handlebar': 'Twisted ends, vintage swagger; villain or carnival hero energy.',
  'Goatee (Pure)': 'Chin anchor without mustache connection; sharp, pointed focus on the mouth.',
  'Chevron': 'Thick, wide mustache covering the upper lip; classic masculine silhouette.',

  // Core personality picks (psychology section)
  'Brooding': 'Internal weather is always overcast. Silence mistaken for depth—or danger.',
  'Cheerful': 'Default setting is bright; can mask pain or be genuinely solar-powered.',
  'Arrogant': 'Assumes competence or worth without receipts; cracks when humbled.',
  'Protective': 'Circle-drawer; hurts anyone who threatens "theirs," sometimes smothering.',
  'Shy': 'Slow to warm; observation-heavy. Misread as cold or stuck-up.',
  'Aggressive': 'Forward energy—fight-first or speak-loud. Intimidation as habit.',
  'Flirtatious': 'Play as language; may deflect sincerity or chase validation.',
  'Stoic': 'Economy of expression; feelings run deep and narrow.',
  'Manic': 'High amplitude moods or ideas; exhausting and exhilarating.',
  'Curious': 'Asks one more question than polite; drives plots and breaches boundaries.',
  'Paranoid': 'Sees threats real and imagined; sometimes right, always tense.',
  'Compassionate': 'Feels others\' pain quickly; must learn boundaries or burn out.',

  // Attire (from TitanEngine)
  'Grey Sweatpants (Shirtless)': 'Loose fitting, low hanging. The classic attire leaving little to the imagination.',
  'Speedo/Swim Briefs': 'Tight, form-fitting swimwear. Maximal exposure for athletic builds.',
  'Speedo / Swim Briefs': 'Tight swim briefs; athletic exposure with poolside confidence.',
  'Leather Harness': 'Fetish-inspired gear accentuating the chest and shoulders.',
  'Jockstrap': 'Athletic support gear. Utilitarian yet provocative.',
  'Nothing / Nude': 'No textile armor—vulnerability, confidence, or ritual bareness.',
  'Latex Suit / Catsuit': 'Second-skin shine; restriction, kink, or superspy aesthetic.',
}

// Range field contextual descriptions
export function getRangeDescription(fieldId, value) {
  const num = parseInt(value)

  switch (fieldId) {
    case 'muscle_def':
      if (num < 20) return 'Very soft, no visible definition. Doughy or emaciated.'
      if (num < 40) return 'Some tone visible. Looks fit in good lighting.'
      if (num < 60) return 'Athletic. Visible abs, firm. Clearly works out.'
      if (num < 80) return 'Ripped. Clear muscle separation, deep cuts, low body fat.'
      return 'Shredded. Anatomy chart visibility. Cross-striations visible.'

    case 'vascularity':
      if (num < 20) return 'No visible veins. Smooth skin surface.'
      if (num < 50) return 'Subtle veining on forearms when flexed.'
      if (num < 75) return 'Prominent veins on arms and hands. Some chest veining.'
      return 'Extreme vascularity. Road-map veins across arms, chest, and abs.'

    case 'sweat_glisten':
      if (num < 20) return 'Dry, matte skin. No visible moisture.'
      if (num < 50) return 'Slight sheen. Post-warm-up look.'
      if (num < 75) return 'Visible sweat. Post-workout glow.'
      return 'Drenched. Heavy exertion or intentional oil. Skin reflects light intensely.'

    case 'aging':
      if (num < 25) return 'Youthful features, smooth skin, no signs of aging.'
      if (num < 35) return 'Young adult. Peak physical condition with mature features.'
      if (num < 50) return 'Mature. Some character lines, distinguished look.'
      if (num < 65) return 'Middle-aged. Visible aging, silver threads, experienced eyes.'
      return 'Elder. Deep lines, weathered features, a face that tells a thousand stories.'

    case 'body_confidence':
      if (num < 25) return 'Very self-conscious. Hides body, avoids exposure.'
      if (num < 50) return 'Somewhat insecure. Comfortable only in private.'
      if (num < 75) return 'Confident. Comfortable in their skin.'
      return 'Exhibitionist levels. Loves being seen, zero shame.'

    case 'ocean_o':
      if (num < 30) return 'Low Openness: Conventional, practical, prefers routine.'
      if (num < 70) return 'Moderate Openness: Balanced between tradition and curiosity.'
      return 'High Openness: Creative, abstract thinker, loves new ideas. Likely magic-inclined.'

    case 'ocean_c':
      if (num < 30) return 'Low Conscientiousness: Spontaneous, disorganized, impulsive.'
      if (num < 70) return 'Moderate Conscientiousness: Reasonably organized and responsible.'
      return 'High Conscientiousness: Disciplined, methodical, achievement-oriented.'

    case 'ocean_e':
      if (num < 30) return 'Low Extraversion: Reserved, introspective, prefers solitude.'
      if (num < 70) return 'Moderate Extraversion: Socially comfortable but not dependent.'
      return 'High Extraversion: Action-oriented, enthusiastic. Needs social fuel.'

    case 'ocean_a':
      if (num < 30) return 'Low Agreeableness: Competitive, skeptical, challenging.'
      if (num < 70) return 'Moderate Agreeableness: Generally cooperative with healthy boundaries.'
      return 'High Agreeableness: Trusting, altruistic, cooperative to a fault.'

    case 'ocean_n':
      if (num < 30) return 'Low Neuroticism: Emotionally stable, calm, resilient. A rock in the storm.'
      if (num < 70) return 'Moderate Neuroticism: Normal emotional range with occasional stress.'
      return 'High Neuroticism: Prone to stress, anxiety, mood swings. Highly reactive.'

    default:
      return `Value: ${num}%`
  }
}

/** Fallback when a select value has no dedicated lore entry (never throws). */
export function getGenericAttributeDescription() {
  return 'A defining characteristic that shapes how this character exists in the world.'
}

// Roleplay tip generator
export function getRoleplayTip(fieldId, value) {
  if (!value) return null

  const tips = {
    gait: `How does their ${value} gait change when they're nervous vs confident? Consider how they enter a room full of strangers.`,
    scent: `"${value}" - Who notices this scent first? A love interest? An enemy tracking them? What memories does it trigger?`,
    alignment: `As ${value}, how do they react when a child steals bread to survive? What about when an ally suggests torture for information?`,
    mbti: `${value} — under pressure, do they over-plan, improvise, or shut down? Who do they delegate to, and who do they never trust?`,
    enneagram: `Enneagram ${value}: what habit do they reach for in stress vs security? Who in the cast pushes their core fear button?`,
    archetype: `As "${value}," what do they believe their story is about—and who would they become if the genre shifted from romance to horror?`,
    lie: `"${value}" - What moment in their past cemented this belief? How does it sabotage their closest relationship right now?`,
    voice: `Their ${value} voice - how does it change when they're lying? When they're afraid? When they're trying to seduce someone?`,
    personality: `Consider how "${value}" affects how they order a drink at a tavern, handle an insult, or comfort a crying child.`,
    dynamic: `${value} dynamic - how does this manifest in combat? In romance? In a heated argument with a friend?`,
    vice: `When ${value} takes the wheel, what is the smallest thing that triggers it—and what is the one line they refuse to cross (if any)?`,
    virtue: `${value} is their north star: show one scene where it saves someone and one where it costs them personally.`,
    species: `Being ${value} in this setting: what law, taboo, or bodily need forces a choice every week?`,
    orientation: `How did "${value}" shape their first heartbreak or first healthy relationship? Who invalidates them, and how do they respond?`,
    battery: `With a ${value} social battery, what is their recovery ritual—and who mistakes it for rejection?`,
    aura: `Others feel "${value}" before words: how does a stranger describe them after thirty seconds in an elevator?`,
    eye_shape: `Eyes read as ${value}: what micro-expression do allies learn to watch for before they snap or melt?`,
    eye_color: `"${value}" eyes—what lie do those eyes tell when the mouth is honest?`,
    mustache: `Style: ${value}. Grooming routine, cultural meaning, and what a partner teases them about.`,
    beard: `Style: ${value}. How does facial hair change first impressions vs who they are alone?`,
    facial_structure: `A ${value} face—how do they use (or fight) the assumptions strangers make at a glance?`,
    forearms: `${value} forearms: show don't tell—what task makes veins or sleeves tell a story?`,
    upper_arms: `${value} upper arms: how do they carry groceries, lovers, or weapons differently?`,
    shoulders: `${value} shoulders—how do they fill a doorway or shrink in a crowd?`,
    neck: `${value} neck—where tension lives; how collars, jewelry, or kisses land.`,
    chest_size: `${value} chest—posture, breath, armor fit; what insecurity or pride hooks onto it?`,
    abs: `${value} core—how they sit, sleep, or brace before a hit (literal or verbal).`,
    back: `${value} back—who has seen their scars, tattoos, or wings, and at what cost?`,
    glutes: `${value}—how movement reads from behind: swagger, exhaustion, dancer's lift.`,
    upper_legs: `${value} thighs—sprinting, kneeling, or chair-sprawl; what sport or wound shaped them?`,
    lower_legs: `${value} calves/shins—footsteps, stance, old injuries that ache before rain.`,
    body_hair: `${value}—cultural baggage, partner preferences, and their own relationship with grooming.`,
    skin_tone: `Skin reads as ${value} in-world: how does lighting, bigotry, or fashion change their day?`,
    skin_texture: `${value} skin—touch, temperature, stigma; one intimate detail only a healer or lover knows.`,
    height: `They scan as ${value}: what object do they bump into, what comment do they hear weekly?`,
    speech_style: `${value} speech—write three lines of dialogue in a crisis without changing their rhythm.`,
    humor: `${value} humor—who laughs, who flinches, and what joke they regret forever.`,
    tic: `Tic: ${value}—when is it worst, and who is kind enough not to mention it?`,
    quirk: `${value}—origin story in one sentence; how an enemy could exploit it in a social scene.`,
    goal: `Conscious goal "${value}": what mundane habit proves they're serious? What would make them abandon it?`,
    fear: `Fear "${value}": design a scene where it almost comes true—then subvert or fulfill it cruelly.`,
    desire: `Secret desire "${value}": who would be destroyed if it became public?`,
    trauma: `Trauma "${value}": what innocent trigger sets them off, and what healthy coping are they learning?`,
    moral_code: `Moral code "${value}": the one person they'd break it for—and whether they'd admit that.`,
    prejudice: `Bias "${value}": where did it come from, and what character challenges it without a speech?`,
    sexual_role: `${value}—negotiation, aftercare, and the myth they hate people assuming.`,
    relationship_style: `${value}—calendar conflicts, jealousy triggers, and the love language they suck at.`,
    kinks: `Interests "${value}": boundaries, safewords, and the emotional need underneath the heat.`,
    turn_ons: `Turn-ons "${value}": a PG-rated version strangers notice vs what actually melts them.`,
    turn_offs: `Turn-offs "${value}": show a near-miss romance that dies on this hill.`,
    attraction_type: `Attracted to "${value}": how does flirtation look in public vs private?`,
    intimidated_by: `Intimidated by "${value}": body language when it walks in the room; growth arc to face it.`,
    attire: `In "${value}," how do they stand, fidget, or perform—who chose this look, them or the plot?`,
  }

  return (
    tips[fieldId] ||
    `Consider how "${value}" affects their daily life, their relationships, and their reaction to danger.`
  )
}
