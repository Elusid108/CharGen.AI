import { opt, customOpt, naOpt } from './shared'

export const socialFieldOptions = {
  battery: [
    opt('Deep Introvert', 'Drains rapidly in company. Needs long solitude to function, not just to prefer it.', '', 'Leaves early or never arrives. Texts are easier than rooms. Being needed socially feels like a bill.'),
    opt('Introvert', 'Prefers depth and quiet. Recharges alone. Can do a party; it costs.', '', 'One good conversation beats a room. Aftercare is silence. People mistake it for rejection.'),
    opt('Ambivert', 'Neither pole owns them. Context decides whether they glow or ghost.', '', 'Can host and then vanish. Friends get whiplash if they do not explain the weather.'),
    opt('Extrovert', 'Gains from people, drains in too much quiet. Stimulation is food.', '', 'Thinks by talking. Left on read feels like weather turning. Alone time needs a reason.'),
    opt('Omnivert', 'Swings between extremes depending on context, not a gentle middle.', '', 'Tonight they are the sun; tomorrow they are a locked door. Do not freeze them in yesterday\'s battery.'),
  ],

  speech_style: [
    opt('Telegraphic (Short)', 'Few words, high density. Periods like punches.', '', 'Texts in chips. Hates paragraphs. If they write a long message, it is a crisis or a love letter.'),
    opt('Labyrinthine (Complex)', 'Clauses inside clauses. Thinking out loud in architecture.', '', 'Takes the scenic route. People get lost; they think they were being clear. [SPLIT] is rare.'),
    opt('Academic', 'Citations in the mouth. Precision as manners.', '', 'Defines terms. Hates sloppy claims. Can sound like a paper when they are actually scared.'),
    opt('Street/Slang', 'In-group music. Place and class in the vowels.', '', 'Code-switches or refuses to. Official rooms hear "unprofessional"; their people hear home.'),
    opt('Poetic', 'Image before bullet point. Feeling finds a metaphor or it does not leave the mouth.', '', 'Sounds like a song or a try-hard. Sincerity and performance share a line. Literal people get tired.'),
    opt('Military/Clipped', 'Callsigns, brevity, the brief as a love language.', '', 'Acks and nacks. Hates hedging. Soft topics come out like status reports until they break.'),
    opt('Formal', 'Titles, full sentences, distance as respect — or as armor.', '', 'Will not start a sentence with "yeah." Intimacy is a register shift you should notice.'),
    opt('Sarcastic', 'The joke as the true text. Straight talk feels naked.', '', 'Means the opposite until they suddenly do not. People who need sincerity suffer. They use that.'),
    opt('Mumbling', 'Sound falls at the edges. Privacy, nerves, or a mouth that will not perform.', '', 'Gets "what?" a lot. Louder is a choice. Secrets hide in the swallow.'),
  ],

  tic: [
    opt('Clears throat often', 'A reset in the pipe. Nerves, habit, or a body that needs announcing.', '', 'Conversation has a drumroll. People wait. They hate being imitated.'),
    opt('Uses filler words', 'Um, like, you know — the brain buying time.', '', 'Sounds younger or less sure than they are. Under stress the fillers multiply.'),
    opt('Long pauses', 'Silence as a tool or a stall. The next word is heavy.', '', 'People jump in; they look betrayed. Do not finish their sentences unless you want a fight.'),
    opt('Ends sentences as questions', 'Uptalk. Seeking the room\'s permission or mocking it.', '', 'Sounds unsure even when they are not. Authority scenes cost them extra.'),
    opt('Whispers', 'Volume as intimacy or fear. The room has to lean.', '', 'Secrets by default. Anger in a whisper is worse than a shout.'),
    opt('Cracks knuckles', 'A punctuation of bone. Readying or leaking stress.', '', 'Sounds like a threat even when it is comfort. People flinch; they may enjoy that.'),
    opt('Clicks tongue', 'A small percussive tell. Judgment, thinking, or a dry mouth.', '', 'Disapproval has a soundtrack. They do it when they will not say the sentence.'),
    opt('Eye twitch', 'A leak in the mask. Fatigue, rage, or a nerve.', '', 'People watch the wrong eye. They know. Covering it is worse than owning it.'),
    opt('Fidgets with hands', 'Coins, rings, seams. The hands need a job.', '', 'Steals the table\'s objects. Stillness is work. Hold their hands and the tic has to move.'),
    opt('Taps foot', 'Time leaking through the shoe. Impatience or a private metronome.', '', 'Tables shake. They are already leaving in the body. Music helps or makes it worse.'),
    naOpt('None', 'No notable tic. Stillness is allowed.', '', 'Do not invent a twitch for flavor. Ordinary composure is the tell.', 0.85),
  ],

  humor: [
    opt('Dry/Deadpan', 'The joke does not smile. If you missed it, that is also the joke.', '', 'Sounds serious when they are not. People who need a laugh track suffer. Timing is everything.'),
    opt('Slapstick', 'The body as punchline. Pain, pratfalls, physical bits.', '', 'Will eat the fall to save a room. Cruel if they aim it at someone who cannot laugh yet.'),
    opt('Self-Deprecating', 'They get there first so you cannot. Armor as a roast of the self.', '', 'Fishing and honesty look the same. If you agree too hard, they remember.'),
    opt('Dark/Morbid', 'The grave as a bit. Trauma adjacent; not always processed.', '', 'Jokes at the funeral. The right people cackle; the wrong people leave. They test you with a grim one early.'),
    opt('None/Literal', 'Jokes fail the parser. Sincerity or neurotype; not a lack of soul.', '', 'Asks "was that a joke." Sarcasm is a second language. When they try humor, it is work — be kind.'),
    opt('Witty/Puns', 'Language as a toy. Speed and double meaning.', '', 'Cannot let a homophone go. Groans are a kind of applause. Stress makes the puns worse and faster.'),
    opt('Crude', 'The body, the bedroom, the insult. Shock as icebreaker.', '', 'Clears a room or owns it. Shame is the enemy. They may be covering a softer wit they do not trust.'),
    opt('Absurdist', 'Logic left the building. The bit is the universe being wrong.', '', 'Non sequiturs as intimacy. Straight men of action get tired. They are funniest when the world is already nonsense.'),
  ],

  dynamic: [
    opt('Dominant', 'Takes the social steering wheel. Not a bedroom role — party, plan, status.', '', 'Assigns tables and topics. People wait for their nod. Pushback is a test they may enjoy or punish.'),
    opt('Submissive', 'Lets others steer in groups. Ease, fear, or strategy — not automatically sexual.', '', 'Agrees to the restaurant. Speaks when invited unless something important burns. Resentment stores if they never get a turn.'),
    opt(
      'Switch',
      'Leads or follows depending on the room, the expert, the night. Social gear-shift — not a sexual role (that lives on Sexual Role).',
      '',
      'Reads who should drive. Can chair a meeting and then go quiet at a party. People who need them stuck in one gear get confused.',
    ),
    opt('Service-Oriented', 'Care as status: they win by being useful, not by being on top.', '', 'Refills glasses, takes notes, runs the errand. Power is in being needed. Rest feels like failure.'),
    opt('Primal', 'Body-first social animal. Hierarchy, scent, heat — little performance of manners.', '', 'Invades space. Growls or grins. Etiquette is a second language they may refuse.'),
    opt('Gentleman', 'Courtesy as a system. Doors, titles, the performance of care.', '', 'Manners first. Can be armor or genuine. People who hate the act will test whether the care is real.'),
    opt('Wallflower', 'The wall is a strategy. Watch, do not pin the tail on yourself.', '', 'Edges of rooms. Texts later with the thing they did not say. Being pulled into the circle is intimate or assault — ask.'),
    opt('Center of Attention', 'The room is a stage and they paid for the lights.', '', 'Interrupts, sparkles, recovers badly from being ignored. Generosity can still be a grab for eyes.'),
    opt('Mediator', 'Stands between. The fight is a job they did not always want.', '', 'Translates factions. Exhausted. Their own anger waits at the back of the line.'),
  ],

  quirk: [
    opt('Sits facing the door', 'Exits as a religion. Back-to-wall is the only prayer they trust.', '', 'Rearranges chairs. Startles if you take "their" seat. Paranoia or tradecraft — both look the same.'),
    opt('Counts steps', 'Numbers as a leash on chaos. The ground has to add up.', '', 'Goes quiet on stairs. Wrong counts ruin a mood. Do not skip a step to tease them unless you want a freeze.'),
    opt('Only eats self-prepared food', 'Trust ends at other people\'s kitchens. Poison, control, or sensory need.', '', 'Brings a box. Declines dinner with a joke that is not a joke. Cooking for them is a bigger gift than they will say.'),
    opt('Talks to gear', 'Kit as company. Loneliness with a wrench.', '', 'Names the blade or the comm. Sounds unwell to the uninitiated. The gear "answers" when people do not.'),
    opt('Collects enemy tokens', 'Proof they survived. Trophy, warning, or unfinished grief.', '', 'Pockets a button, a tooth, a badge. Intimacy includes the box they will not open on a first date.'),
    opt('Needs noise to sleep', 'Silence is a held breath. The dark needs a soundtrack.', '', 'Leaves something on. Hotels are a problem. Your breathing might be the noise they pick.'),
    opt('Nested backup plans', 'Plan C has a plan C. Anxiety as architecture.', '', 'Asks "and if that fails" until you snap. Being called paranoid confirms the need for plan D.'),
    opt('Whistles when nervous', 'A tell they may not know they have. Tune as a white flag.', '', 'The song is a weather report. Enemies with ears will use it. Friends learn the playlist.'),
    opt('Avoids eye contact', 'Eyes are too much data — or too much being seen.', '', 'Looks at mouths, hands, exits. Do not demand eyes as proof of respect. They hear you fine.'),
    opt('Pre-fight ritual', 'A sequence before violence. Superstition as a starter pistol.', '', 'Needs the thing — tap, prayer, glove. Rush them and the fight starts inside first.'),
    opt('Journals everyone met', 'People as entries. Memory outsourced to ink.', '', 'Asks how to spell your name. Being in the book is intimacy. Being a bad review is a fear.'),
    opt('Smells food first', 'The nose as a lab. Poison, memory, or sensory gating.', '', 'Leans over the plate. Looks feral or fussy. Cooking for them means passing an exam.'),
    opt('Names every animal', 'The world must be on a first-name basis. Loneliness or delight.', '', 'Talks to dogs like cousins. People find it precious or unwell. Grief when the unnamed stay unnamed.'),
    opt('Pockets shiny objects', 'Magpie brain. Theft, comfort, or a dragon analog.', '', 'Your lighter may vanish. They look guilty and not. Returning it is a love language.'),
    opt('Uses a new alias often', 'Names as coats. Safety, fun, or a self that will not sit still.', '', 'Introduces themselves differently. Records disagree. The real name, if you get it, is a door.'),
    customOpt('A custom behavioral quirk.', '', 'Let the custom quirk show in blocking; do not explain its origin unless asked.'),
  ],
}
