/**
 * Unified character attribute schema
 * Combines CharGen, TitanEngine, and PixelForge approaches
 * Each section has fields that render as form inputs
 */

export const CHARACTER_SECTIONS = {
  identity: {
    icon: 'Fingerprint',
    label: 'Identity & Species',
    description: 'Core identity, species, and role.',
    fields: [
      { id: 'name', label: 'Full Name', type: 'text', placeholder: 'E.g., Caelus Vane, Zyx-7, etc.' },
      { id: 'species', label: 'Species', type: 'select', options: ['Human', 'Humanoid Alien', 'Non-Humanoid Alien', 'Elf', 'Dwarf', 'Orc', 'Demon', 'Angel', 'Undead', 'Android/Cyborg', 'Werewolf/Lycanthrope', 'Vampire', 'Dragon/Draconic', 'Fae/Fairy', 'Elemental', 'Hybrid', 'Custom'] },
      { id: 'species_custom', label: 'Custom Species', type: 'text', placeholder: 'Describe species...', conditional: { field: 'species', value: 'Custom' } },
      { id: 'sex', label: 'Biological Sex', type: 'select', options: ['Male', 'Female', 'Intersex', 'None/Construct', 'Non-Applicable'] },
      { id: 'gender', label: 'Gender Identity', type: 'select', options: ['Man', 'Woman', 'Non-binary', 'Genderfluid', 'Agender', 'Transgender Man', 'Transgender Woman', 'Two-Spirit', 'Other'] },
      { id: 'orientation', label: 'Sexual Orientation', type: 'select', options: ['Heterosexual', 'Homosexual', 'Bisexual', 'Pansexual', 'Asexual', 'Demisexual', 'Queer', 'Fluid'] },
      { id: 'age', label: 'Age', type: 'number', placeholder: '25' },
      { id: 'race_ethnicity', label: 'Race / Ethnicity / Origin', type: 'text', placeholder: 'E.g., East Asian, Nordic, Martian Colony, etc.' },
      { id: 'archetype', label: 'Archetype', type: 'select', options: ['The Hero', 'The Outlaw', 'The Sage', 'The Explorer', 'The Creator', 'The Ruler', 'The Magician', 'The Caregiver', 'The Jester', 'The Everyman', 'The Lover', 'The Innocent', 'The Alpha', 'The Golden Retriever', 'The Silver Fox', 'The Bad Boy', 'The Stoic Protector', 'The Lone Wolf', 'The Himbo', 'The Femme Fatale', 'The Trickster', 'The Monster'] },
    ]
  },

  physical: {
    icon: 'Dumbbell',
    label: 'Physical Anatomy',
    description: 'Body type, build, and physical features.',
    fields: [
      { id: 'physique', label: 'Body Type', type: 'select', options: ['Athletic', 'Bodybuilder', 'Otter', 'Bear', 'Dad Bod', 'Twunk', 'Lean/Wiry', 'Mass Monster', 'Powerlifter', 'Soft/Round', 'Imposing', 'Gaunt', 'Statuesque', 'Stocky', 'Lithe', 'Curvy', 'Petite', 'Amazonian'] },
      { id: 'muscle_def', label: 'Muscle Definition', type: 'range', min: 0, max: 100, default: 30 },
      { id: 'height', label: 'Height', type: 'select', options: ['Very Short', 'Short', 'Average', 'Tall', 'Very Tall', 'Towering', 'Looming'] },
      { id: 'body_hair', label: 'Body Hair', type: 'select', options: ['Smooth/Hairless', 'Light Fuzz', 'Treasure Trail', 'Hairy Chest', 'Full Body Hair', 'Trimmed & Styled', 'N/A (Non-Human)'] },
      { id: 'chest_size', label: 'Chest/Pectoral', type: 'select', options: ['Flat', 'Defined', 'Broad', 'Massive', 'Soft', 'N/A'] },
      { id: 'vascularity', label: 'Vascularity (Veins)', type: 'range', min: 0, max: 100, default: 15 },
      { id: 'skin_tone', label: 'Skin Tone', type: 'select', options: ['Pale', 'Fair', 'Light', 'Olive', 'Tan', 'Bronze', 'Brown', 'Dark Brown', 'Deep Ebony', 'Slate/Grey', 'Blue', 'Green', 'Red', 'Purple', 'Gold', 'Scaled', 'Furred', 'Translucent', 'Metallic'] },
      { id: 'skin_texture', label: 'Skin Texture', type: 'select', options: ['Smooth', 'Weathered', 'Scarred', 'Freckled', 'Tattooed', 'Scaled', 'Furred', 'Chitin', 'Crystalline', 'Bark-like'] },
      { id: 'scars', label: 'Scars & Markings', type: 'text', placeholder: 'E.g., Slash across left pec, tribal tattoos on arms...' },
      { id: 'blemishes', label: 'Blemishes & Imperfections', type: 'text', placeholder: 'E.g., Broken nose, cauliflower ear, burn marks...' },
      { id: 'special_features', label: 'Non-Human Features', type: 'text', placeholder: 'E.g., Horns, tail, wings, extra limbs, antenna...' },
    ]
  },

  face: {
    icon: 'ScanFace',
    label: 'Face & Grooming',
    description: 'Facial structure, hair, eyes, and grooming.',
    fields: [
      { id: 'facial_structure', label: 'Facial Structure', type: 'select', options: ['Square-Jawed', 'Chiseled', 'Rugged', 'Soft/Boyish', 'Gaunt', 'Aristocratic', 'Round', 'Angular', 'Pretty', 'Weathered', 'Alien/Non-Human'] },
      { id: 'facial_hair', label: 'Facial Hair', type: 'select', options: ['Clean Shaven', 'Light Stubble', 'Heavy Stubble', 'Goatee', 'Full Beard (Trimmed)', 'Full Beard (Wild)', 'Mutton Chops', 'Handlebar Mustache', 'Soul Patch', 'N/A'] },
      { id: 'eye_color', label: 'Eye Color', type: 'text', placeholder: 'E.g., Piercing Blue, Heterochromia, Glowing Red...' },
      { id: 'eye_shape', label: 'Eye Shape', type: 'select', options: ['Almond', 'Round', 'Hooded', 'Monolid', 'Deep-set', 'Wide-set', 'Narrow', 'Multiple Eyes', 'No Eyes', 'Glowing'] },
      { id: 'hair_style', label: 'Hair Style', type: 'select', options: ['Buzz Cut', 'Fade', 'Undercut', 'Man Bun', 'Long & Flowing', 'Messy/Bedhead', 'Slicked Back', 'Bald', 'Mohawk', 'Braided', 'Dreadlocks', 'Pixie Cut', 'Bob', 'Ponytail', 'Shaved Sides', 'Afro', 'Tentacles/Non-Human'] },
      { id: 'hair_color', label: 'Hair Color', type: 'select', options: ['Jet Black', 'Dark Brown', 'Light Brown', 'Dirty Blonde', 'Platinum Blonde', 'Silver/Grey', 'Salt & Pepper', 'Red/Auburn', 'Ginger', 'White', 'Blue', 'Pink', 'Purple', 'Green', 'Multicolored', 'Bald/N/A'] },
      { id: 'aging', label: 'Apparent Age', type: 'range', min: 0, max: 100, default: 30 },
      { id: 'distinguishing_facial', label: 'Distinguishing Features', type: 'text', placeholder: 'E.g., Scar through eyebrow, nose ring, beauty mark...' },
    ]
  },

  movement: {
    icon: 'Footprints',
    label: 'Movement & Presence',
    description: 'How the character moves, sounds, and is perceived.',
    fields: [
      { id: 'gait', label: 'Gait / Movement Style', type: 'select', options: ['Staccato', 'Lumbering', 'Gliding', 'Shuffling', 'Strutting', 'Prowling', 'Bouncing', 'Mechanical', 'Slithering', 'Floating'] },
      { id: 'voice', label: 'Voice Timbre', type: 'select', options: ['Gravelly', 'Nasal', 'Breathy', 'Booming', 'Melodic', 'Monotone', 'Strained', 'Silky', 'Raspy', 'Squeaky', 'Echoing', 'Telepathic'] },
      { id: 'scent', label: 'Signature Scent', type: 'select', options: ['Ozone & Copper', 'Old Paper & Vanilla', 'Woodsmoke & Pine', 'Cheap Perfume & Gin', 'Motor Oil & Citrus', 'Lavender & Dust', 'Saltwater & Rot', 'Blood & Iron', 'Fresh Rain', 'Sulfur', 'Nothing/Sterile', 'Alien/Indescribable'] },
      { id: 'aura', label: 'Aura / Energy', type: 'select', options: ['Warm & Inviting', 'Cold & Distant', 'Electrifying', 'Calming', 'Menacing', 'Mysterious', 'Chaotic', 'Regal', 'Magnetic', 'Unsettling', 'None/Mundane'] },
      { id: 'sweat_glisten', label: 'Skin Glisten / Sweat', type: 'range', min: 0, max: 100, default: 10 },
    ]
  },

  psychology: {
    icon: 'Brain',
    label: 'Psychology & Mind',
    description: 'Personality frameworks and mental landscape.',
    fields: [
      { id: 'alignment', label: 'Moral Alignment', type: 'select', options: ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'] },
      { id: 'mbti', label: 'MBTI Type', type: 'select', options: ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'] },
      { id: 'enneagram', label: 'Enneagram', type: 'select', options: ['Type 1 (Reformer)', 'Type 2 (Helper)', 'Type 3 (Achiever)', 'Type 4 (Individualist)', 'Type 5 (Investigator)', 'Type 6 (Loyalist)', 'Type 7 (Enthusiast)', 'Type 8 (Challenger)', 'Type 9 (Peacemaker)'] },
      { id: 'personality', label: 'Core Personality Trait', type: 'select', options: ['Brooding', 'Cheerful', 'Arrogant', 'Protective', 'Shy', 'Aggressive', 'Flirtatious', 'Stoic', 'Manic', 'Curious', 'Paranoid', 'Compassionate'] },
      { id: 'ocean_o', label: 'Openness', type: 'range', min: 0, max: 100, default: 50 },
      { id: 'ocean_c', label: 'Conscientiousness', type: 'range', min: 0, max: 100, default: 50 },
      { id: 'ocean_e', label: 'Extraversion', type: 'range', min: 0, max: 100, default: 50 },
      { id: 'ocean_a', label: 'Agreeableness', type: 'range', min: 0, max: 100, default: 50 },
      { id: 'ocean_n', label: 'Neuroticism', type: 'range', min: 0, max: 100, default: 50 },
    ]
  },

  narrative: {
    icon: 'BookOpen',
    label: 'Narrative & History',
    description: 'Backstory, goals, fears, and the forces that drive them.',
    fields: [
      { id: 'goal', label: 'Conscious Goal', type: 'text', placeholder: 'What they are actively pursuing...' },
      { id: 'fear', label: 'Deepest Fear', type: 'text', placeholder: 'What terrifies them at a fundamental level...' },
      { id: 'desire', label: 'Secret Desire', type: 'text', placeholder: 'What they truly want but may not admit...' },
      { id: 'lie', label: 'The Lie They Believe', type: 'select', options: ['I am unlovable', 'Vulnerability is death', 'I know best', 'The world is just', 'Power is the only safety', 'I dont deserve happiness', 'Everyone leaves eventually', 'I must be perfect', 'Trust no one', 'I am broken beyond repair'] },
      { id: 'vice', label: 'Primary Vice', type: 'select', options: ['Wrath', 'Greed', 'Sloth', 'Pride', 'Lust', 'Envy', 'Gluttony', 'Cruelty', 'Cowardice', 'Obsession'] },
      { id: 'virtue', label: 'Primary Virtue', type: 'select', options: ['Chastity', 'Temperance', 'Charity', 'Diligence', 'Patience', 'Kindness', 'Humility', 'Courage', 'Loyalty', 'Wisdom'] },
      { id: 'trauma', label: 'Trauma History', type: 'text', placeholder: 'Defining traumatic event or ongoing trauma...' },
      { id: 'moral_code', label: 'Moral Code', type: 'text', placeholder: 'E.g., Never harm children, Always repay debts...' },
      { id: 'prejudice', label: 'Prejudices & Biases', type: 'text', placeholder: 'What groups/things do they irrationally dislike...' },
    ]
  },

  social: {
    icon: 'MessagesSquare',
    label: 'Social & Speech',
    description: 'How they interact, communicate, and connect.',
    fields: [
      { id: 'battery', label: 'Social Battery', type: 'select', options: ['Deep Introvert', 'Introvert', 'Ambivert', 'Extrovert', 'Omnivert'] },
      { id: 'speech_style', label: 'Speech Style', type: 'select', options: ['Telegraphic (Short)', 'Labyrinthine (Complex)', 'Academic', 'Street/Slang', 'Poetic', 'Military/Clipped', 'Formal', 'Sarcastic', 'Mumbling'] },
      { id: 'tic', label: 'Verbal/Physical Tic', type: 'select', options: ['Clears throat often', 'Uses filler words', 'Long pauses', 'Ends sentences as questions', 'Whispers', 'Cracks knuckles', 'Clicks tongue', 'Eye twitch', 'Fidgets with hands', 'Taps foot', 'None'] },
      { id: 'humor', label: 'Sense of Humor', type: 'select', options: ['Dry/Deadpan', 'Slapstick', 'Self-Deprecating', 'Dark/Morbid', 'None/Literal', 'Witty/Puns', 'Crude', 'Absurdist'] },
      { id: 'dynamic', label: 'Social Dynamic', type: 'select', options: ['Dominant', 'Submissive', 'Switch', 'Service-Oriented', 'Primal', 'Gentleman', 'Wallflower', 'Center of Attention', 'Mediator'] },
      { id: 'quirk', label: 'Behavioral Quirk', type: 'text', placeholder: 'E.g., Always sits facing the door, counts steps...' },
    ]
  },

  adult: {
    icon: 'Flame',
    label: 'Mature / Adult',
    description: 'Sexual preferences, kinks, and intimate details.',
    fields: [
      { id: 'sexual_role', label: 'Sexual Role', type: 'select', options: ['Top', 'Bottom', 'Versatile', 'Power Bottom', 'Service Top', 'Switch', 'N/A'] },
      { id: 'relationship_style', label: 'Relationship Style', type: 'select', options: ['Monogamous', 'Polyamorous', 'Open', 'Casual Only', 'Aromantic', 'Demisexual Bonding', 'Its Complicated'] },
      { id: 'kinks', label: 'Kinks & Interests', type: 'text', placeholder: 'E.g., Bondage, roleplay, exhibitionism...' },
      { id: 'turn_ons', label: 'Turn Ons', type: 'text', placeholder: 'What attracts or excites them...' },
      { id: 'turn_offs', label: 'Turn Offs / Disgusts', type: 'text', placeholder: 'What repels them...' },
      { id: 'attraction_type', label: 'Attracted To', type: 'text', placeholder: 'Physical types, personality traits they find attractive...' },
      { id: 'experience_level', label: 'Experience Level', type: 'select', options: ['Virgin/Inexperienced', 'Novice', 'Experienced', 'Very Experienced', 'Expert/Legendary'] },
      { id: 'body_confidence', label: 'Body Confidence', type: 'range', min: 0, max: 100, default: 50 },
      { id: 'intimacy_style', label: 'Intimacy Style', type: 'select', options: ['Gentle & Tender', 'Passionate & Intense', 'Rough & Dominant', 'Playful & Teasing', 'Clinical & Detached', 'Animalistic', 'Romantic'] },
      { id: 'attire', label: 'Intimate Attire', type: 'select', options: ['Grey Sweatpants (Shirtless)', 'Speedo/Swim Briefs', 'White Towel', 'Jockstrap', 'Leather Harness', 'Compression Shorts', 'Unbuttoned Flannel', 'Nothing/Nude', 'Lingerie', 'Silk Robe', 'Tactical Gear (Sleeveless)'] },
    ]
  },
}

// Flattened list of all field IDs for easy access
export function getAllFieldIds() {
  const ids = []
  Object.values(CHARACTER_SECTIONS).forEach(section => {
    section.fields.forEach(field => {
      ids.push(field.id)
    })
  })
  return ids
}

// Get default character state
export function getDefaultCharacter() {
  const char = {}
  Object.values(CHARACTER_SECTIONS).forEach(section => {
    section.fields.forEach(field => {
      if (field.type === 'range') {
        char[field.id] = field.default ?? 50
      } else {
        char[field.id] = ''
      }
    })
  })
  return char
}

// Image generation style options (from PixelForge)
export const ART_STYLES = [
  { label: 'Default (Concept Art)', value: '' },
  { label: 'Photorealistic', value: ', photorealistic, 8k, cinematic' },
  { label: 'Anime', value: ', anime style, studio ghibli' },
  { label: 'Cyberpunk', value: ', cyberpunk style, neon lights' },
  { label: 'Watercolor', value: ', watercolor painting, artistic' },
  { label: 'Oil Painting', value: ', oil painting, textured' },
  { label: '3D Render', value: ', 3d render, pixar style' },
  { label: 'Comic Book', value: ', comic book style, bold lines' },
  { label: 'Film Noir', value: ', film noir, b&w' },
  { label: 'Surrealism', value: ', surrealism, dreamlike' },
  { label: 'Steampunk', value: ', steampunk style, brass, gears' },
  { label: 'Low Poly', value: ', low poly, geometric, polygon art' },
  { label: 'Horror', value: ', lovecraftian, eldritch horror, dark' },
  { label: 'Impressionist', value: ', impressionist painting, soft brushwork' },
  { label: 'Pixel Art', value: ', pixel art, 16-bit' },
  { label: 'Synthwave', value: ', synthwave, retrowave, neon' },
]

export const LIGHTING_OPTIONS = [
  { label: 'Default', value: '' },
  { label: 'Cinematic', value: ', cinematic lighting, dramatic shadows' },
  { label: 'Natural', value: ', soft natural lighting, sunlight' },
  { label: 'Golden Hour', value: ', golden hour, warm sunset lighting' },
  { label: 'Studio', value: ', studio lighting, perfect exposure' },
  { label: 'Neon', value: ', neon lighting, glowing, vibrant' },
  { label: 'Dark/Moody', value: ', dark atmosphere, dim lighting, mystery' },
  { label: 'Rembrandt', value: ', rembrandt lighting, chiaroscuro' },
]

export const MOOD_OPTIONS = [
  { label: 'Default', value: '' },
  { label: 'Vibrant', value: ', vibrant colors, high saturation' },
  { label: 'Muted', value: ', muted colors, desaturated, matte' },
  { label: 'Pastel', value: ', pastel color palette, soft colors' },
  { label: 'Dark Fantasy', value: ', dark fantasy, grim, ethereal' },
  { label: 'Ethereal', value: ', ethereal, dreamy, magical' },
  { label: 'Retro', value: ', retro aesthetic, vintage filter' },
  { label: 'B&W', value: ', black and white, monochrome' },
]
