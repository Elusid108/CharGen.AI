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

  // Gait
  'Staccato': 'Sharp, precise movements. Military background or high anxiety. Takes up exactly the space they need.',
  'Lumbering': 'Heavy, deliberate steps. Raw power or fatigue. A force of nature—slow to start, hard to stop.',
  'Gliding': 'Upper body remains still while moving. Grace, stealth, or arrogance. Dancers or thieves.',
  'Shuffling': 'Feet rarely leave the ground. Age, timidity, or exhaustion. Trying not to be noticed.',
  'Strutting': 'Chest out, chin up. Takes up space. High confidence or overcompensation. Wants to be seen.',
  'Prowling': 'Low center of gravity, predatory awareness. Always scanning for threats or prey.',

  // Scent
  'Ozone & Copper': 'Smells like a storm or old pennies. Magical or industrial origin.',
  'Old Paper & Vanilla': 'The smell of libraries and degradation. Scholarship or introversion.',
  'Woodsmoke & Pine': 'The outdoors. A ranger, traveler, or someone who sleeps under the stars.',
  'Cheap Perfume & Gin': 'Masking something underneath. Urban, perhaps desperate or hiding poverty.',
  'Motor Oil & Citrus': 'Mechanic or artificer. Clean but stained. The smell of work.',
  'Blood & Iron': 'A warrior who has seen too much combat. The scent never fully washes off.',

  // MBTI
  'INTJ': 'The Architect. Imaginative and strategic thinkers, with a plan for everything. Values logic over emotion.',
  'ENFP': 'The Campaigner. Enthusiastic, creative, sociable free spirit. Finds meaning in emotional connections.',
  'ISTP': 'The Virtuoso. Bold and practical experimenter. Learns by doing, often acts before thinking.',
  'ESFJ': 'The Consul. Extraordinarily caring, social, and popular. Always eager to help.',
  'INFJ': 'The Advocate. Quiet, mystical, yet very inspiring and tireless idealist.',
  'ENTP': 'The Debater. Smart and curious thinker who cannot resist an intellectual challenge.',

  // Alignment
  'Lawful Good': 'Acts as a good person is expected or required to act. Believes in the system.',
  'Chaotic Neutral': 'Follows their own whims. An individualist whose only loyalty is to freedom.',
  'Lawful Evil': 'Methodically takes what they want within limits. The tyrant or corrupt official.',
  'True Neutral': 'Undecided or balanced. Believes balance is more important than good or evil.',
  'Chaotic Good': 'A rebel with a heart of gold. Does the right thing, even if it means breaking every rule.',
  'Neutral Evil': 'Pure self-interest with no loyalty. Does whatever they can get away with.',
  'Chaotic Evil': 'Destructive, unpredictable, and cruel. Revels in suffering and chaos.',

  // Enneagram
  'Type 1 (Reformer)': 'Rational, idealistic. Fear: Being corrupt/evil. Desire: To be good and balanced.',
  'Type 4 (Individualist)': 'Sensitive, withdrawn. Fear: Having no identity. Desire: To be unique.',
  'Type 8 (Challenger)': 'Powerful, dominating. Fear: Being controlled. Desire: To protect themselves.',
  'Type 9 (Peacemaker)': 'Easygoing, self-effacing. Fear: Loss/Separation. Desire: Inner stability.',

  // The Lie
  'I am unlovable': 'Believes they must earn affection through deeds. Overworks to \'buy\' love.',
  'Vulnerability is death': 'Believes showing emotion will get them killed. Stoic to a fault.',
  'I know best': 'Arrogance preventing trust of others. Micro-manages and alienates allies.',
  'The world is just': 'Naivety that will be shattered by the plot. Unprepared for unfair tragedy.',
  'Power is the only safety': 'Only trusts force. Sees every relationship as a power dynamic.',
  'Everyone leaves eventually': 'Self-sabotages relationships to prove themselves right.',

  // Social Battery
  'Deep Introvert': 'Drains rapidly around people. Needs extended solitude to function.',
  'Introvert': 'Prefers solitude, recharges alone. Deep focused interactions preferred.',
  'Extrovert': 'Gains energy from interaction, drains when alone. Craves stimulation.',
  'Omnivert': 'Fluctuates between extremes depending on context.',
  'Ambivert': 'Balanced. Can handle both but prefers neither extreme.',

  // Attire (from TitanEngine)
  'Grey Sweatpants (Shirtless)': 'Loose fitting, low hanging. The classic attire leaving little to the imagination.',
  'Speedo/Swim Briefs': 'Tight, form-fitting swimwear. Maximal exposure for athletic builds.',
  'Leather Harness': 'Fetish-inspired gear accentuating the chest and shoulders.',
  'Jockstrap': 'Athletic support gear. Utilitarian yet provocative.',
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

// Roleplay tip generator
export function getRoleplayTip(fieldId, value) {
  if (!value) return null

  const tips = {
    gait: `How does their ${value} gait change when they're nervous vs confident? Consider how they enter a room full of strangers.`,
    scent: `"${value}" - Who notices this scent first? A love interest? An enemy tracking them? What memories does it trigger?`,
    alignment: `As ${value}, how do they react when a child steals bread to survive? What about when an ally suggests torture for information?`,
    mbti: `${value} personality type - how do they plan a heist? Do they obsess over details or wing it? Who do they trust with the plan?`,
    lie: `"${value}" - What moment in their past cemented this belief? How does it sabotage their closest relationship right now?`,
    voice: `Their ${value} voice - how does it change when they're lying? When they're afraid? When they're trying to seduce someone?`,
    personality: `Consider how "${value}" affects how they order a drink at a tavern, handle an insult, or comfort a crying child.`,
    dynamic: `${value} dynamic - how does this manifest in combat? In romance? In a heated argument with a friend?`,
  }

  return tips[fieldId] || `Consider how "${value}" affects their daily life, their relationships, and their reaction to danger.`
}
