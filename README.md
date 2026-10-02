# CharGen.AI - Universal Character Engine

**v1.10.0** — a client-side character workshop for humans, aliens, monsters, and everything in between. Fill a detailed sheet, generate a consistent identity lock and derived views, write a backstory that is not a résumé, then text the character. Optional **Tripo 3D** turns the T-pose lock, mannequin, or a wardrobe look into a mesh when you press Generate 3D. **Motion Studio** compiles the same sheet into a timed, hardware-agnostic expression and gesture script for an animatronic rig.

## Features

### Character Creation
- **8 attribute sections**: Identity, Physical Anatomy, Face & Grooming, Movement & Presence, Psychology, Narrative & History, Social & Speech, and Mature/Adult
- **100+ customizable attributes**, including **Default Outfit** on Identity (used for clothed images)
- **Conditional fields** that adapt by species and custom values
- **One-click randomization** per section or for the whole character
- **Context panel** with definitions, psychological implications, and roleplay tips

### Image Generation (Stats → Images)
Identity is a **front T-pose lock** (3:4, underwear). Side, back, profile, and mannequin are generated from that lock when a Gemini native image model is selected.

- **Generate All** order: front T-pose lock → side → back → profile → mannequin
- **Slots**: front lock, side, back, profile (1:1), mannequin (relaxed dress-up pose)
- **Canonical + Thirst profiles**: generating Profile creates both looks at once. Switch them on the Profile card. Canonical uses Default Outfit; Thirst uses Intimate Attire. Body locks stay underwear shots
- **Art style, lighting, mood, exclude, and seed** save with the character (schemaVersion 10). Seed is `0`–`2147483647` with a slider, number field, and randomize
- **Wardrobe outfits** use the **mannequin** pose when one exists (T-pose lock only as fallback)
- Native Gemini image models can take a reference; Imagen `predict` remains text-only (platform limit)

Old library saves: a former 16:9 T-pose sheet is still treated as a leftover turnaround (not shown). Generate a new front lock, then side and back. A single stored profile is copied into both Canonical and Thirst slots.

### 3D Studio (Images → Mesh)
Tripo jobs **never** run from Generate All Images or from adding a wardrobe look. Each mesh starts only after you confirm a Generate 3D button.

- **Generation Studio**: turnaround lock (front T-pose plus side/back) and mannequin
- **Wardrobe**: a separate 3D button on each look that already has a 2D image
- **Confirm dialog** with engine (H3 or P1), texture on/off, H3 texture/geometry quality, P1 face limit, and a live credit estimate
- After each job a **viewer popup** opens with mouse orbit and touch rotate/pinch. Meshes stay in IndexedDB until you press Download
- **History** per slot: the latest mesh is current; regenerating archives the previous one so you can restore or delete it
- **Optional** Mixamo rig, idle/walk/run retarget (10 credits per clip), STL preview in the viewer, and FBX — billed only if you confirm
- Failed jobs return frozen credits. Regenerating a mesh you dislike costs full price

Local `npm run dev` / `npm run preview` proxy Tripo’s API (`/tripo-api`) and file CDN (`/tripo-artifact`) because Tripo does not allow browser CORS. The GitHub Pages build has no proxy, so 3D will not reach Tripo from the hosted site.

### Motion Studio (Stats → Motion)
- **Personality → motion style**: OCEAN, archetype, social battery, speech style, gait, aura, tic, humor, dynamic, attachment, coping and more compile into numeric knobs (pacing, amplitude, gesture frequency, jitter, expressiveness, stillness) plus per-expression / per-gesture preferences (`src/data/options/motionBehavior.js`)
- **Rig profiles** describe what a physical build can do — channels, supported expressions and gestures, timing limits — and are orthogonal to the character: the same character generates different motion on a 3-servo head than on a 12-servo body. Three built-in presets (head-only, bust, full body) plus a permissive reference rig; author your own as plain JSON in the editor (paste or upload, field-level validation, saved in the browser)
- **Canonical vocabulary**: 22 expressions and 22 gestures in `src/data/motionVocabulary.js`. Every generated event uses one of these ids; a rig only says which subset it supports, so scripts stay portable across hardware
- **Scenes**: idle, greeting, listening, speaking, alarmed, farewell — optional extra direction and a source line that adds speech-sync markers
- **Two generators**: a local procedural generator that always works without a key, and a Gemini-directed one (`generateMotionScript`) that returns strict JSON. Both pass through `validateAndClampMotionScript`, which drops unknown or unsupported ids, clamps timing and intensity, and enforces the rig's minimum gaps and events-per-minute. AI failure falls back to local
- **Timeline preview** with a scrubber, up to 12 scripts saved per character, and **Export JSON** (`*.motion.json`, `MOTION_SCRIPT_SCHEMA_VERSION` 1) ready to map onto servos, DMX, or a serial protocol later
- No voice synthesis yet; `speechSync` events are a forward-compatible stub for it

### Image Analysis (Images → Stats)
- **Upload any character image** via drag-and-drop or file picker
- **AI analysis** extracts physical attributes, personality, and more
- **Auto-populates** the sheet; review and edit before applying
- Applied photos are JPEG-compressed before they hit the store

### Chat
- Thread (portrait + bubbles) once the character has a name — **Online** or **In person**
- System prompt compiled from the sheet, **chat canon**, scene, heat, wardrobe, clock, and who they think you are
- **Timestamps** on messages so they know how long it has been between chats
- **Scenes**: strangers, dating match, wrong number, tavern, briefing, interrogation, camp
- **Heat**: slow-burn, flirty, filthy (Mature fields only when filthy)
- Replies can use `[SPLIT]` / `[DELAY]` for multiple bubbles and a typing indicator
- Photos only if you **ask**. Shots stay in the character's **art style** (same prefs as Generation Studio), using profile or T-pose for **face identity**
- **Photo album** of sent shots with thumbnails. They can resend, edit a recent photo plus their identity lock, or set one as their profile
- They can wear a **wardrobe look** (`[WEAR]`) and stay in it; they will not change clothes or location in seconds
- **In person:** `*asterisks*` and bare narration are remembered in their point of view; put spoken words in `"quotes"` so I/you are not flipped. **Online:** texts only — stars are emphasis, not stage directions, and they do not reply with `*actions*`
- **Enter** sends; **Ctrl+Enter** or **Shift+Enter** inserts a newline
- **Randomize All** starts a new character: empty thread, new save id, cleared art and backstory
- Thread, settings, album, and image prefs save with that character

### Narrative Engine
- **Story bible**, not a full-sheet dump: one wound, one want, a scene instead of a CV
- **Lenses** (wanted poster, confession, personnel file, eulogy, dating bio, interrogation notes, campfire lie — or random)
- Optional **hooks first**, then Generate Backstory
- Returns a long backstory plus a three-sentence **chat canon**
- Genre defaults from species/origin until you change it

### Wardrobe System
- Multiple **named outfits** per character
- Each look is a **stackable line-item list** (style, type, garment, material, condition, color, wear location)
- Outfit images generated on the **mannequin** pose (relaxed stance), not the T-pose lock
- Same saved **seed** and style prefs as Generation Studio
- Respects Canonical / Thirst from the Profile card
- 3D from a look is a separate confirm — adding or generating 2D never spends Tripo credits

### Character Library
- **IndexedDB** — everything stays in the browser
- **Stable character id** so Save updates the same library row
- **schemaVersion 10** saves: dual profile slots, image prefs, line-item wardrobe, chat album, presence, timestamps, **3D current + archive history** (`generatedModels`), and **motion** (chosen rig id + saved motion scripts). Older saves load with an empty motion state
- **Models** object store holds GLB / preview / animation / STL / FBX blobs in the browser; Download is optional
- **rigProfiles** object store holds your custom rig JSON (`RIG_PROFILE_SCHEMA_VERSION` 1), separate from character saves
- **JPEG compression** on generated, wardrobe, analysis, and chat images
- Grid and list views with search, sort, and filter
- Bulk download (ZIP) and JSON import/export

## Getting Started

### Prerequisites
- **Node.js** (for local runs)
- A **Google AI API key** (free tier available) from [Google AI Studio](https://aistudio.google.com/apikey)
  - Used for Gemini text, vision, native image, and Imagen
  - Settings lets you refresh the model list for your account
- Optional **Tripo API key** from [Tripo](https://platform.tripo3d.ai) for 3D Studio
  - Separate from Google. Stored locally. Used only when you confirm a Generate 3D (or rig/export) button

### Run locally (Windows)

Double-click `launch.bat` in the repo root. It closes leftover CharGen.AI Vite servers, frees port 5173 if another local Vite is sitting on it, installs dependencies if needed, and opens `http://localhost:5173/CharGen.AI/`.

### Run locally (any platform)

```bash
git clone https://github.com/Elusid108/CharGen.AI.git
cd CharGen.AI
npm install
npm run dev
```

The app is at `http://localhost:5173/CharGen.AI/`.

On first launch, enter your Google AI API key. It is stored in IndexedDB and only sent to Google’s API. Add a Tripo key in Settings if you want 3D.

### Build for production

```bash
npm run build
```

Output goes to `dist/`. `npm run preview` still uses the local Tripo proxy; a static GitHub Pages host does not.

## Deployment (GitHub Pages)

A GitHub Actions workflow deploys to GitHub Pages on every push to `main`.

1. Repo **Settings** → **Pages**
2. **Source**: GitHub Actions
3. Push to `main`

Live URL: `https://Elusid108.github.io/CharGen.AI/`

Image, chat, and library features work on the hosted site. **Tripo 3D needs the local Vite proxy** (`npm run dev` or `npm run preview`).

## Tech Stack

- **React 18** + **Vite 6**
- **TailwindCSS**
- **Zustand**
- **IndexedDB** (local characters, images, chat, 3D blobs, rig profiles, Google + Tripo keys)
- **Google Gemini** for text, image analysis, chat, and native image (`generateContent`)
- **Google Imagen** when selected (`predict`, no reference image)
- **Tripo OpenAPI v3** for deliberate 3D generation (local Vite `/tripo-api` and `/tripo-artifact` proxies)
- **Three.js** for in-app STL orbit preview
- **model-viewer** for GLB orbit / touch / animation playback
- **Vitest** for the motion layer (`npm test`): vocabulary, rig validation, style compiler, script generator / clamp, and the Gemini path with `fetch` stubbed
- **JSZip** for bulk downloads
- **Lucide React** for icons

## Privacy

- **100% client-side** — no CharGen backend, no tracking
- API keys and library live in your browser
- Google key is sent only to Google. Tripo key is sent only to Tripo, and only when you confirm a 3D action
- No telemetry

## License

See [LICENSE](LICENSE).
