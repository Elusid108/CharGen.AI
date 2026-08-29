# CharGen.AI - Universal Character Engine

**v1.7.0** — a client-side character workshop for humans, aliens, monsters, and everything in between. Fill a detailed sheet, generate a consistent identity lock and derived views, write a backstory that is not a résumé, then text the character.

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
- **Art style, lighting, mood, exclude, and seed** save with the character (schemaVersion 7). Seed is `0`–`2147483647` with a slider, number field, and randomize
- **Wardrobe outfits** use the **mannequin** pose when one exists (T-pose lock only as fallback)
- Native Gemini image models can take a reference; Imagen `predict` remains text-only (platform limit)

Old library saves: a former 16:9 T-pose sheet is still treated as a leftover turnaround (not shown). Generate a new front lock, then side and back. A single stored profile is copied into both Canonical and Thirst slots.

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

### Character Library
- **IndexedDB** — everything stays in the browser
- **Stable character id** so Save updates the same library row
- **schemaVersion 7** saves: dual profile slots, image prefs (style / lighting / mood / exclude / seed), line-item wardrobe, chat album, presence, timestamps
- **JPEG compression** on generated, wardrobe, analysis, and chat images
- Grid and list views with search, sort, and filter
- Bulk download (ZIP) and JSON import/export

## Getting Started

### Prerequisites
- **Node.js** (for local runs)
- A **Google AI API key** (free tier available) from [Google AI Studio](https://aistudio.google.com/apikey)
  - Used for Gemini text, vision, native image, and Imagen
  - Settings lets you refresh the model list for your account

### Run locally (Windows)

Double-click `launch.bat` in the repo root. It installs dependencies if needed and opens `http://localhost:5173/CharGen.AI/`.

### Run locally (any platform)

```bash
git clone https://github.com/Elusid108/CharGen.AI.git
cd CharGen.AI
npm install
npm run dev
```

The app is at `http://localhost:5173/CharGen.AI/`.

On first launch, enter your Google AI API key. It is stored in IndexedDB and only sent to Google’s API.

### Build for production

```bash
npm run build
```

Output goes to `dist/`.

## Deployment (GitHub Pages)

A GitHub Actions workflow deploys to GitHub Pages on every push to `main`.

1. Repo **Settings** → **Pages**
2. **Source**: GitHub Actions
3. Push to `main`

Live URL: `https://Elusid108.github.io/CharGen.AI/`

## Tech Stack

- **React 18** + **Vite 6**
- **TailwindCSS**
- **Zustand**
- **IndexedDB** (local characters, images, chat, API key)
- **Google Gemini** for text, image analysis, chat, and native image (`generateContent`)
- **Google Imagen** when selected (`predict`, no reference image)
- **JSZip** for bulk downloads
- **Lucide React** for icons

## Privacy

- **100% client-side** — no backend, no tracking
- API key and library live in your browser
- No telemetry

## License

See [LICENSE](LICENSE).
