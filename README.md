# CharGen.AI - Universal Character Engine

**v1.6.0** — a client-side character workshop for humans, aliens, monsters, and everything in between. Fill a detailed sheet, generate a consistent identity lock and derived views, write a backstory that is not a résumé, then text the character.

## Features

### Character Creation
- **8 attribute sections**: Identity, Physical Anatomy, Face & Grooming, Movement & Presence, Psychology, Narrative & History, Social & Speech, and Mature/Adult
- **100+ customizable attributes**, including **Default Outfit** on Identity (used for clothed images)
- **Conditional fields** that adapt by species and custom values
- **One-click randomization** per section or for the whole character
- **Context panel** with definitions, psychological implications, and roleplay tips

### Image Generation (Stats → Images)
Identity is a **front T-pose lock** (3:4, underwear). Everything else is generated from that lock when a Gemini native image model is selected.

- **Generate All** order: T-pose lock → 16:9 turnaround sheet → profile → full body → mannequin
- **Five slots**: lock, turnaround, profile (1:1), full body, mannequin (relaxed dress-up pose)
- **Canonical vs Thirst**: Canonical uses Default Outfit and closed opaque clothing; Thirst uses Intimate Attire. Lock / turnaround / mannequin stay body-canon underwear shots
- **Art style, lighting, and mood** modifiers, plus an Exclude box (Canonical also appends coverage negatives)
- **Wardrobe outfits** use the same lock and presentation mode
- Native Gemini image models can take a reference; Imagen `predict` remains text-only (platform limit)

Old library saves without a lock are migrated: the former 16:9 T-pose sheet becomes the turnaround. Generate a new lock for identity.

### Image Analysis (Images → Stats)
- **Upload any character image** via drag-and-drop or file picker
- **AI analysis** extracts physical attributes, personality, and more
- **Auto-populates** the sheet; review and edit before applying
- Applied photos are JPEG-compressed before they hit the store

### Chat
- **Texting-first** thread (portrait + bubbles) once the character has a name
- System prompt compiled from the sheet, **chat canon**, scene, heat, and who they think you are
- **Scenes**: strangers, dating match, wrong number, tavern, briefing, interrogation, camp
- **Heat**: slow-burn, flirty, filthy (Mature fields only when filthy)
- Replies can use `[SPLIT]` / `[DELAY]` for multiple bubbles and a typing indicator
- `[SEND_PIC]` generates a selfie from the **T-pose lock**, using Generation Studio’s Canonical/Thirst setting
- Thread and settings save with the character

### Narrative Engine
- **Story bible**, not a full-sheet dump: one wound, one want, a scene instead of a CV
- **Lenses** (wanted poster, confession, personnel file, eulogy, dating bio, interrogation notes, campfire lie — or random)
- Optional **hooks first**, then Generate Backstory
- Returns a long backstory plus a three-sentence **chat canon**
- Genre defaults from species/origin until you change it

### Wardrobe System
- Multiple saved outfits per character
- Outfit images generated on the identity lock
- Respects Canonical / Thirst from Generation Studio

### Character Library
- **IndexedDB** — everything stays in the browser
- **Stable character id** so Save updates the same library row
- **schemaVersion 3** saves: lock slots, presentation mode, chat canon, chat thread
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
