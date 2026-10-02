# CharGen.AI - Universal Character Engine

**v1.12.0** — a client-side character workshop for humans, aliens, monsters, and everything in between. Fill a detailed sheet, generate a consistent identity lock and derived views, write a backstory that is not a résumé, then text the character. The **3D Studio** turns the T-pose lock, mannequin, a wardrobe look, or a text prompt into a Tripo mesh, rigs and animates it, previews everything in a three.js viewport, and exports engine-ready bundles. **Motion Studio** compiles the same sheet into a timed, hardware-agnostic expression and gesture script for an animatronic rig.

## Features

### Character Creation
- **8 attribute sections** plus a **History** timeline: Identity, Physical Anatomy, Face & Grooming, Movement & Presence, Psychology, Narrative & History, History, Social & Speech, and Mature/Adult
- **100+ customizable attributes**, including **Default Outfit** on Identity (used for clothed images)
- **Conditional fields** that adapt by species and custom values
- **Seeded, fully local randomization**: Randomize All and per-section Randomize never call an LLM. Every roll comes from a **character seed** (shown in the sidebar; lock it to reroll the same recipe, edit it to replay someone else's). Same seed + same locks = the same sheet, life ledger, and image seed. Imported or hand-built characters show "No seed" until you roll
- **Enrich with AI** (sidebar for the whole sheet, section header for one section) fills blank name / Custom text fields with Gemini on demand — the only place the sheet touches an LLM
- **OCEAN-rooted psychology**: the five Big Five sliders roll bell-shaped, and **MBTI, Enneagram, and alignment are derived from them** (with seeded noise) instead of rolling independently. Personality, attachment, coping, and core value are weighted toward the OCEAN profile too. The derived fields stay editable and lockable; moving a slider never silently rewrites them — use **Re-derive from OCEAN** on the Psychology tab. The context panel shows the derivation
- **Context panel** with definitions, psychological implications, roleplay tips, and derivation stats

### History (Life Ledger)
- **3–7 formative events** generated locally with the character (more for older characters), age-ordered, each with a tone (wound, loss, crime, turning, gift, bond, triumph) and the sheet fields it explains, e.g. *Trauma History → Former captivity*, *The Lie They Believe → Trust no one*
- **Causal, not decorative**: the ledger runs after the sheet roll and writes its resolved values back into trauma, fear, lie, attachment, coping, goal, desire, moral code, prejudice, scars, competencies, and class. The sheet's trauma is always explained by exactly one event, and no two events claim the same field
- **~50 templates** in `src/data/lifeEvents.js` with slots for name / origin / occupation and `requires` (genre, origin, class, age), including at least one non-wound event per character
- **Editable timeline**: reroll one event (keeps its age), lock events so *Regenerate unlocked* keeps them, add or delete events, edit title / summary / age / tone inline. Hovering an event shows its effects in the context panel
- **Older characters**: *Generate history* fills a ledger for a saved character without overwriting any field that is already set
- **Feeds the writing**: the story bible gets `life_ledger`, backstory / hooks prompts are told it is canon (draw at most two events, never chronologically), and chat gets a `[HISTORY — SUBTEXT]` block

### Image Generation (Stats → Images)
Identity is a **front T-pose lock** (3:4, underwear). Side, back, profile, and mannequin are generated from that lock when a Gemini native image model is selected.

- **Generate All** order: front T-pose lock → side → back → profile → mannequin
- **Slots**: front lock, side, back, profile (1:1), mannequin (relaxed dress-up pose)
- **Canonical + Thirst profiles**: generating Profile creates both looks at once. Switch them on the Profile card. Canonical uses Default Outfit; Thirst uses Intimate Attire. Body locks stay underwear shots
- **Art style, lighting, mood, exclude, and seed** save with the character (schemaVersion 12). Randomize All derives the image seed from the character seed. Seed is `0`–`2147483647` with a slider, number field, and randomize
- **Wardrobe outfits** use the **mannequin** pose when one exists (T-pose lock only as fallback)
- Native Gemini image models can take a reference; Imagen `predict` remains text-only (platform limit)

Old library saves: a former 16:9 T-pose sheet is still treated as a leftover turnaround (not shown). Generate a new front lock, then side and back. A single stored profile is copied into both Canonical and Thirst slots.

### 3D Studio (Images or Text → Mesh → Rig → Clips → Export)
A top-level tab with an asset list, a **three.js viewport**, and an action rail. Tripo jobs **never** run from Generate All Images or from adding a wardrobe look — every billed call starts from an options dialog that shows the credit estimate against your live balance.

- **Sources**: turnaround lock (front T-pose plus side/back → multiview), mannequin (image), any wardrobe look (image), or a **Concept** prompt (text-to-model). Entry cards live in the Generation Studio and the Wardrobe; the `+` beside each source in the Studio does the same
- **Mesh profiles**: **Animation / game** (textured PBR, detailed texture, align-to-image, rig-ready) or **3D print** (untextured, detailed geometry). Every option (model version H3.1 / H3.0 / H2.5 / P1 low-poly / P2 quad, texture + geometry quality, face limit, quad, orientation, seed) stays editable in the dialog
- **Viewport**: orbit / pan / zoom, move / rotate / scale gizmo with snap (G / R / S, Esc, F to frame), wireframe, skeleton overlay, grid, exposure, PNG snapshot. The transform is saved per asset version. Stats show triangles, vertices, W×H×D, bones, file size, model, profile, and credits spent
- **Animation bar**: clip picker, play / pause / stop, scrub, speed 0.25–2×, loop
- **Rig**: free rig-check first, then biped / quadruped / hexapod / octopod / avian / serpentine / aquatic rigs with the **Mixamo** or Tripo skeleton spec, GLB or FBX output. Not riggable = nothing charged
- **Animate**: Tripo's preset clips (idle, walk, run, turn, jump, climb, dive, slash, shoot, hurt, fall, plus quadruped / hexapod / octopod / serpentine / aquatic gaits), up to five per job, each a playable GLB
- **Mesh ops**: re-texture (also "make animation version" of a print mesh), decimate to LODs, segment into parts, complete occluded parts
- **Convert**: FBX (Mixamo preset), glTF, USDZ, OBJ, STL, 3MF with texture size / format, animation, pack UV, symmetry, bake. **Make print version** writes STL + 3MF with a flat base, pivot at centre-bottom, scaled to a height in mm measured from the viewport
- **Export bundle**: one ZIP per asset version laid out by convention — `source/`, `model/glb`, `model/gltf`, `model/fbx` (+ textures, extracted from the GLB when Tripo's FBX ships without them), `model/usdz`, `animations/name@clip.glb`, `lod/`, `print/name_120mm.stl|3mf`, `manifest.json` (ids, Tripo task ids, options, rig, clips, credits, missing files) and a `README.txt` with Unity / Unreal / Godot / VRM / print notes. Targets: Unity / Unreal, glTF / GLB, USDZ, 3D print; the dialog lists what each target still needs and its cost
- **Jobs**: per-asset, up to three in parallel, cancellable, resumed after a reload through Tripo's task list. Results are downloaded into IndexedDB the moment a task finishes (Tripo links expire within minutes). Spent credits are read back from the task
- **History** per source: the latest mesh is current; regenerating archives the previous version so you can restore or delete it

Tripo has no browser CORS, so the app needs a relay. `npm run dev` / `npm run preview` provide one (`/tripo-api`, `/tripo-artifact`). For the GitHub Pages build deploy the Cloudflare Worker in [`proxy/`](proxy/README.md) and paste its URL into **Settings → Tripo proxy URL** (Test proxy checks it with a balance call). The Worker forwards your `Authorization` header per request and stores nothing.

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
- **schemaVersion 12** saves: dual profile slots, image prefs, line-item wardrobe, chat album, presence, timestamps, **3D assets** (`generatedModels`: lock / mannequin / concept / per-outfit, current + archive, each with a keyed file map, rig, clips, LODs, jobs, transform, print spec, stats, lineage), **motion** (chosen rig id + saved motion scripts), the **life ledger**, and the **character seed** recipe. Schema 11 and older 3D records migrate in place (legacy blob rows are still found), older saves load with an empty ledger and no seed
- **Models** object store holds GLB / preview / animation / STL / FBX blobs in the browser; Download is optional
- **rigProfiles** object store holds your custom rig JSON (`RIG_PROFILE_SCHEMA_VERSION` 1), separate from character saves
- **JPEG compression** on generated, wardrobe, analysis, and chat images
- Grid and list views with search, sort, and filter
- Bulk download (ZIP) and JSON import/export

## Getting Started

### Prerequisites
- **Node.js** (for local runs)
- A **Google AI API key** (free tier available) from [Google AI Studio](https://aistudio.google.com/apikey)
  - Used for Gemini text, vision, native image, and Imagen. Rolling characters and life ledgers works offline without it
  - Settings lets you refresh the model list for your account
- Optional **Tripo API key** from [Tripo](https://platform.tripo3d.ai) for the 3D Studio
  - Separate from Google. Stored locally. Used only when you confirm a job dialog (generate, rig, animate, convert, …)
  - Hosted (GitHub Pages) use needs the optional Cloudflare Worker proxy in `proxy/` — see the 3D Studio section

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

Output goes to `dist/`. `npm run preview` still uses the local Tripo proxy; a static host needs the Worker in `proxy/`.

## Deployment (GitHub Pages)

A GitHub Actions workflow deploys to GitHub Pages on every push to `main`.

1. Repo **Settings** → **Pages**
2. **Source**: GitHub Actions
3. Push to `main`

Live URL: `https://Elusid108.github.io/CharGen.AI/`

Image, chat, library and the 3D viewport work on the hosted site. **Tripo jobs need a relay**: run locally (`npm run dev` / `npm run preview`) or deploy the Cloudflare Worker in `proxy/` and set its URL in Settings. The deploy workflow runs `npm test` before building.

## Tech Stack

- **React 18** + **Vite 6**
- **TailwindCSS**
- **Zustand**
- **IndexedDB** (local characters, images, chat, 3D blobs, rig profiles, Google + Tripo keys)
- **Google Gemini** for text, image analysis, chat, and native image (`generateContent`)
- **Google Imagen** when selected (`predict`, no reference image)
- **Tripo OpenAPI v3** (path-style: generation, texture, convert, mesh ops, rig-check / rig / retarget, task list, balance) through the local Vite proxy or the optional **Cloudflare Worker** in `proxy/`
- **Three.js** (dynamic import, own chunk) for the Studio viewport: GLTF / FBX / USDZ / STL / 3MF loaders, OrbitControls, TransformControls, SkeletonHelper, AnimationMixer, RoomEnvironment
- **Vitest** (`npm test`) for the pure logic: seeded RNG and roll pipeline, OCEAN derivation, life-event templates and ledger invariants, story bible / chat prompt blocks, the motion layer, and the whole Tripo layer (endpoint builders, credits, asset records + legacy migration, transport with retry / abort, job schemas, export planner with a real ZIP, proxy allow-list, secret scan)
- **Playwright smoke** (`npm run test:e2e`, optional, needs a global `playwright`): runs the built app with every Tripo route mocked — concept mesh, rig, three clips, export ZIP, reload
- **JSZip** for bulk downloads
- **Lucide React** for icons

## Privacy

- **100% client-side** — no CharGen backend, no tracking
- API keys and library live in your browser
- Google key is sent only to Google. Tripo key is sent only to Tripo (directly through the local dev proxy, or through a Worker you deploy yourself), and only when you confirm a 3D job dialog
- No telemetry

## License

See [LICENSE](LICENSE).
