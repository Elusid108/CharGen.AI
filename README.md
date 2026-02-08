# CharGen.AI - Universal Character Engine

A comprehensive character development engine for creating detailed characters of any type - human, alien, monster, fantasy, sci-fi, and everything in between. Generate character stats, backstories, and multiple image types with AI.

## Features

### Character Creation
- **8 attribute sections**: Identity, Physical Anatomy, Face & Grooming, Movement & Presence, Psychology, Narrative & History, Social & Speech, and Mature/Adult
- **100+ customizable attributes** across all sections
- **Conditional fields** that adapt based on species type
- **One-click randomization** per section or for the entire character
- **Context panel** with definitions, psychological implications, and roleplay tips

### Image Generation (Stats -> Images)
- **4 image types per character**:
  - Profile Portrait (1:1) - Head & shoulders
  - Full Body - Relaxed natural pose
  - T-Pose Reference - Multi-angle character sheet
  - Mannequin Base - For outfit generation
- **Art style controls**: Photorealistic, Anime, Cyberpunk, Watercolor, and 12+ more
- **Lighting & mood modifiers**: Cinematic, Golden Hour, Neon, Dark/Moody, etc.
- **Negative prompt** support for excluding unwanted elements

### Image Analysis (Images -> Stats)
- **Upload any character image** via drag-and-drop or file picker
- **AI-powered analysis** extracts physical attributes, personality, and more
- **Auto-populates** the character sheet from the analysis
- **Review and edit** before applying

### Wardrobe System
- Create and save **multiple outfits** per character
- Select from **clothing categories**: tops, bottoms, footwear, accessories
- **Generate outfit images** on your character
- **Style tags** for easy organization

### Character Library
- **IndexedDB storage** - all data saved locally in your browser
- **Grid and list views** with search, sort, and filter
- **Bulk operations**: multi-select, bulk download (ZIP), bulk delete
- **Import/Export** characters as JSON for backup and sharing

### Narrative Engine
- **AI backstory generation** with customizable length, tone, and genre
- **Editable output** - modify generated text directly
- **Genre options**: High Fantasy, Sci-Fi, Cyberpunk, Horror, Romance, and more

## Getting Started

### Prerequisites
- A **Google AI API key** (free tier available)
  - Get one at: https://aistudio.google.com/apikey
  - Enables: Gemini (text + vision) and Imagen 4.0 (image generation)

### Run Locally

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/CharGen.AI.git
cd CharGen.AI

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173/CharGen.AI/`

On first launch, you'll be prompted to enter your Google AI API key. It's stored locally in your browser's IndexedDB and never sent anywhere except Google's API endpoints.

### Build for Production

```bash
npm run build
```

Output goes to the `dist/` directory.

## Deployment (GitHub Pages)

This project includes an automatic GitHub Actions workflow that deploys to GitHub Pages on every push to `main`.

### Setup:
1. Go to your repo **Settings** > **Pages**
2. Under **Source**, select **GitHub Actions**
3. Push to `main` - the workflow handles the rest

Your app will be available at: `https://YOUR_USERNAME.github.io/CharGen.AI/`

## Tech Stack

- **React 18** with Vite
- **TailwindCSS** for styling
- **Zustand** for state management
- **IndexedDB** for local persistent storage
- **Google Gemini 2.5 Flash** for text generation and image analysis
- **Google Imagen 4.0** for image generation
- **JSZip** for bulk downloads
- **Lucide React** for icons

## Privacy & Security

- **100% client-side** - no backend, no server, no tracking
- **API key stored locally** in your browser's IndexedDB
- **All data stays on your device** - characters, images, and settings
- **No telemetry or analytics** of any kind

## License

See [LICENSE](LICENSE) for details.
