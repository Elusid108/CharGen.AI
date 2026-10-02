/**
 * Canonical, hardware-agnostic motion vocabulary.
 *
 * Every generated motion event (local or LLM) must use one of these ids. A rig profile
 * declares which subset its physical build can perform; the id set itself never grows
 * at runtime, which is what lets personality (which ids a character prefers) and rig
 * capability (which ids exist on the hardware) compose cleanly.
 */

function vocab(id, label, description, tags = []) {
  return { id, label, description, tags }
}

export const CANONICAL_EXPRESSIONS = [
  vocab('neutral', 'Neutral', 'Rest face. Soft, unfocused attention.', ['rest']),
  vocab('smile_soft', 'Soft smile', 'Small closed-mouth smile; warmth without performance.', ['affiliative', 'positive']),
  vocab('smile_broad', 'Broad smile', 'Open, teeth-showing smile. High energy.', ['affiliative', 'positive', 'big']),
  vocab('laugh', 'Laugh', 'Head back, open mouth, eyes crinkled.', ['positive', 'big']),
  vocab('curious_tilt', 'Curious tilt', 'Head tilts, brows lift slightly. Interest.', ['attentive']),
  vocab('alert', 'Alert', 'Eyes wide, head up, stillness. Something noticed.', ['attentive', 'arousal']),
  vocab('concerned', 'Concerned', 'Brows pull in and up. Worry for someone else.', ['affiliative', 'negative']),
  vocab('skeptical_squint', 'Skeptical squint', 'One brow down, eyes narrowed. Not buying it.', ['guarded']),
  vocab('surprised', 'Surprised', 'Brows up, mouth open, quick inhale.', ['arousal', 'big']),
  vocab('recoil', 'Recoil', 'Head pulls back, face closes. Disgust or alarm.', ['negative', 'guarded', 'big']),
  vocab('sad', 'Sad', 'Brows up at the inner corners, mouth down, gaze drops.', ['negative']),
  vocab('angry_narrow', 'Angry', 'Brows down and together, jaw set, eyes narrowed.', ['negative', 'arousal']),
  vocab('sleepy_droop', 'Sleepy droop', 'Lids heavy, head sinks. Low energy.', ['rest', 'low']),
  vocab('wink', 'Wink', 'One eye closes briefly. Playful.', ['affiliative', 'playful']),
  vocab('blink_slow', 'Slow blink', 'Deliberate slow blink. Calm trust or boredom.', ['rest', 'low']),
  vocab('confused_tilt', 'Confused tilt', 'Head tilts the other way, brows uneven, mouth slack.', ['attentive']),
  vocab('smirk', 'Smirk', 'Asymmetric half-smile. Knowing, a little superior.', ['playful', 'guarded']),
  vocab('pout', 'Pout', 'Lower lip pushes out, brows soften. Sulking or flirting.', ['playful', 'negative']),
  vocab('thinking', 'Thinking', 'Gaze goes up and to one side, mouth tightens.', ['attentive', 'low']),
  vocab('fear', 'Fear', 'Eyes wide, brows up and in, mouth pulled back.', ['negative', 'arousal', 'big']),
  vocab('disgust', 'Disgust', 'Nose wrinkles, upper lip lifts.', ['negative', 'guarded']),
  vocab('contempt', 'Contempt', 'One corner of the mouth lifts, chin up.', ['guarded', 'negative']),
]

export const CANONICAL_GESTURES = [
  vocab('nod', 'Nod', 'Single or double downward head nod. Agreement, acknowledgement.', ['affiliative', 'small']),
  vocab('shake_head', 'Shake head', 'Lateral head shake. Refusal, disbelief.', ['small']),
  vocab('lean_in', 'Lean in', 'Torso/head moves toward the listener. Engagement.', ['affiliative', 'approach']),
  vocab('lean_back', 'Lean back', 'Torso/head moves away. Distance, appraisal.', ['guarded', 'withdraw']),
  vocab('idle_sway', 'Idle sway', 'Slow ambient weight shift. Alive-at-rest.', ['ambient', 'loopable']),
  vocab('breathe', 'Breathe', 'Visible chest/shoulder breathing cycle.', ['ambient', 'loopable']),
  vocab('look_around', 'Look around', 'Gaze and head scan the room.', ['attentive', 'ambient']),
  vocab('look_at_listener', 'Look at listener', 'Head and eyes orient to the person present.', ['affiliative', 'attentive']),
  vocab('look_away', 'Look away', 'Gaze breaks contact, head turns slightly.', ['withdraw', 'small']),
  vocab('point_forward', 'Point', 'Arm/hand or head thrust toward a target.', ['big', 'arm']),
  vocab('shrug', 'Shrug', 'Shoulders rise and drop. Uncertainty, indifference.', ['small', 'arm']),
  vocab('wave_greeting', 'Wave', 'Open-hand wave. Greeting or farewell.', ['affiliative', 'arm', 'big']),
  vocab('startle_flinch', 'Startle flinch', 'Fast whole-body contraction then release.', ['arousal', 'big']),
  vocab('settle_still', 'Settle still', 'Motion damps to near-zero. Deliberate stillness.', ['rest', 'low']),
  vocab('fidget', 'Fidget', 'Small repetitive hand/finger motion.', ['ambient', 'arm', 'nervous']),
  vocab('tap', 'Tap', 'Rhythmic foot/finger tap.', ['ambient', 'nervous', 'loopable']),
  vocab('chin_up', 'Chin up', 'Head lifts, posture straightens. Pride, challenge.', ['guarded', 'small']),
  vocab('head_drop', 'Head drop', 'Head and shoulders sink. Defeat, fatigue, shame.', ['withdraw', 'low']),
  vocab('arms_open', 'Arms open', 'Arms spread wide. Welcome, big claim.', ['affiliative', 'arm', 'big']),
  vocab('arms_cross', 'Arms cross', 'Arms fold across the chest. Closed off.', ['guarded', 'arm']),
  vocab('hand_to_face', 'Hand to face', 'Hand touches chin/cheek/mouth. Thinking or self-soothing.', ['arm', 'nervous', 'small']),
  vocab('double_take', 'Double take', 'Head turns away then snaps back.', ['attentive', 'big']),
]

export const EXPRESSION_IDS = new Set(CANONICAL_EXPRESSIONS.map((e) => e.id))
export const GESTURE_IDS = new Set(CANONICAL_GESTURES.map((g) => g.id))

export const MOTION_TRACKS = ['expression', 'gesture', 'pose', 'speechSync']

export const SPEECH_SYNC_IDS = new Set(['word', 'emphasis', 'pause', 'breath', 'line_start', 'line_end'])

export function isCanonicalId(track, id) {
  if (track === 'expression') return EXPRESSION_IDS.has(id)
  if (track === 'gesture' || track === 'pose') return GESTURE_IDS.has(id)
  if (track === 'speechSync') return SPEECH_SYNC_IDS.has(id)
  return false
}

export function expressionById(id) {
  return CANONICAL_EXPRESSIONS.find((e) => e.id === id) || null
}

export function gestureById(id) {
  return CANONICAL_GESTURES.find((g) => g.id === id) || null
}
