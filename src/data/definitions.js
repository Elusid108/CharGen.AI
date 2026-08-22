/**
 * Field-scoped roleplay tips for the context panel.
 * Lore lives on per-field option records (src/data/options) and compileCharacter.
 */

export function getRoleplayTip(fieldId, value) {
  if (value === '' || value == null) return null

  const tips = {
    gait: `How does their ${value} gait change when they're nervous vs confident? Consider how they enter a room full of strangers.`,
    scent: `"${value}" — who notices this scent first? A love interest? An enemy tracking them? What memories does it trigger?`,
    alignment: `How do they react when a child steals bread to survive? When an ally suggests torture? Show the ethic; do not name a grid.`,
    mbti: `Under pressure, do they over-plan, improvise, or shut down? Who do they delegate to, and who do they never trust? Do not say the type letters in play.`,
    enneagram: `What habit do they reach for in stress vs security? Who in the cast pushes their core fear? Do not name the type number.`,
    archetype: `As "${value}," what do they believe their story is about—and who would they become if the genre shifted from romance to horror?`,
    lie: `"${value}" — what moment cemented this belief? How does it sabotage their closest relationship right now?`,
    voice: `Their ${value} voice — how does it change when they're lying? When they're afraid? When they're trying to seduce someone?`,
    personality: `Consider how "${value}" affects how they order a drink, handle an insult, or comfort a crying child.`,
    dynamic: `${value} in a room — how does this show in combat, in a party, in a heated argument with a friend? (This is party/status, not a bedroom role.)`,
    vice: `When ${value} takes the wheel, what is the smallest trigger—and what is the one line they refuse to cross (if any)?`,
    virtue: `${value} is their north star: one scene where it saves someone and one where it costs them personally.`,
    species: `Being ${value} in this setting: what law, taboo, or bodily need forces a choice every week?`,
    orientation: `How did "${value}" shape their first heartbreak or first healthy relationship? Who invalidates them, and how do they respond?`,
    romantic_orientation: `Romance vs sex: how does "${value}" change who they pine for versus who they want in bed?`,
    gender_expression: `Presentation "${value}" vs identity — who misreads them, and when do they correct vs let it go?`,
    transition_note: `What is actually shareable about "${value}"? Who has earned the story, and who gets a closed door?`,
    battery: `With a ${value} social battery, what is their recovery ritual—and who mistakes it for rejection?`,
    aura: `Others feel "${value}" before words: how does a stranger describe them after thirty seconds in an elevator?`,
    eye_shape: `Eyes read as ${value}: what micro-expression do allies watch for before they snap or melt?`,
    eye_color: `"${value}" eyes — what lie do those eyes tell when the mouth is honest?`,
    mustache: `Style: ${value}. Grooming routine, cultural meaning, and what a partner teases them about.`,
    beard: `Style: ${value}. How does facial hair change first impressions vs who they are alone?`,
    facial_structure: `A ${value} face — how do they use (or fight) the assumptions strangers make at a glance?`,
    silhouette: `Overall "${value}" — which regional field is the override, and which is just the default story?`,
    chest_anatomy: `"${value}" — what assumptions do clothes, clinics, and lovers get wrong?`,
    forearms: `${value} forearms: show don't tell — what task makes veins or sleeves tell a story?`,
    upper_arms: `${value} upper arms: how do they carry groceries, lovers, or weapons differently?`,
    shoulders: `${value} shoulders — how do they fill a doorway or shrink in a crowd?`,
    neck: `${value} neck — where tension lives; how collars, jewelry, or kisses land.`,
    chest_size: `${value} chest — posture, breath, armor fit; what insecurity or pride hooks onto it?`,
    abs: `${value} core — how they sit, sleep, or brace before a hit (literal or verbal).`,
    back: `${value} back — who has seen their scars, tattoos, or wings, and at what cost?`,
    glutes: `${value} — how movement reads from behind: swagger, exhaustion, dancer's lift.`,
    upper_legs: `${value} thighs — sprinting, kneeling, or chair-sprawl; what sport or wound shaped them?`,
    lower_legs: `${value} calves/shins — footsteps, stance, old injuries that ache before rain.`,
    body_hair: `${value} — cultural baggage, partner preferences, and their own relationship with grooming.`,
    skin_tone: `Skin reads as ${value} in-world: how does lighting, bigotry, or fashion change their day?`,
    skin_texture: `${value} skin — touch, temperature, stigma; one intimate detail only a healer or lover knows.`,
    height: `They scan as ${value}: what object do they bump into, what comment do they hear weekly?`,
    speech_style: `${value} speech — write three lines of dialogue in a crisis without changing their rhythm.`,
    humor: `${value} humor — who laughs, who flinches, and what joke they regret forever?`,
    tic: `Tic: ${value} — when is it worst, and who is kind enough not to mention it?`,
    quirk: `${value} — origin story in one sentence; how an enemy could exploit it in a social scene.`,
    goal: `Conscious goal "${value}": what mundane habit proves they're serious? What would make them abandon it?`,
    fear: `Fear "${value}": a scene where it almost comes true — then subvert or fulfill it.`,
    desire: `Secret desire "${value}": who would be destroyed if it became public?`,
    trauma: `Trauma "${value}": what innocent trigger sets them off, and what healthy coping are they learning?`,
    moral_code: `Moral code "${value}": the one person they'd break it for — and whether they'd admit that.`,
    prejudice: `Bias "${value}": where did it come from, and what character challenges it without a speech?`,
    sexual_role: `${value} — negotiation, aftercare, and the myth they hate people assuming. This is sex, not party status.`,
    relationship_style: `${value} — calendar conflicts, jealousy triggers, and the love language they suck at.`,
    kinks: `Interests "${value}": boundaries, safewords, and the emotional need underneath the heat.`,
    turn_ons: `Turn-ons "${value}": a PG-rated version strangers notice vs what actually melts them.`,
    turn_offs: `Turn-offs "${value}": a near-miss romance that dies on this hill.`,
    attraction_type: `Attracted to "${value}": how does flirtation look in public vs private?`,
    intimidated_by: `Intimidated by "${value}": body language when it walks in; growth arc to face it.`,
    attire: `In "${value}," how do they stand, fidget, or perform — who chose this look, them or the plot?`,
    default_outfit: `Default look "${value}" — what does it say before they speak? What do they change into when the plot turns?`,
    occupation: `As a ${value}, what jargon leaks into ordinary talk? What can they not fake?`,
    socioeconomic_class: `Class "${value}": what do they assume is normal (food, time, doctors) that others do not?`,
    competency_1: `Skill "${value}": a scene where it saves them and a scene where it makes them arrogant.`,
    competency_2: `Second skill "${value}": who taught them, and who they will not teach?`,
    competency_3: `Third skill "${value}": the rusty one, the secret one, or the one they lie about.`,
    attachment: `Attachment "${value}": what does a delayed text do to them? How do they repair after a fight?`,
    coping: `Under stress they go to "${value}": what does a friend see, and what actually helps?`,
    values: `When it costs them, "${value}" still wins — unless fear is louder. Show the trade.`,
    genre: `Genre prior "${value}": which details feel native, and which would be tourist cosplay?`,
  }

  return (
    tips[fieldId] ||
    `Consider how "${value}" affects their daily life, their relationships, and their reaction to danger.`
  )
}
