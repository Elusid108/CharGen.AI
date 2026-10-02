# CLAUDE.md — working rules for CharGen.AI

CharGen.AI is a client-only React 18 + Vite 6 + Zustand app (no backend). Everything a user makes
lives in their browser's IndexedDB. These rules apply to every change, including debug-session fixes
that stay in the code.

## 1. Version and README move together
- `package.json` `version` is the source of truth. Keep `package-lock.json` (root `version` and
  `packages[""].version`) and the fallback string in `src/appVersion.js` in lockstep.
- Bump: **patch** for fixes/wiring/copy, **minor** for a new user-facing feature, **major** only if
  library saves or a required setup path breaks. Skip for docs-only or reverted instrumentation.
- `README.md` header `**vX.Y.Z**` must match, and any feature / setup / privacy / tech-stack line the
  change made stale is updated in the same commit.

## 2. Schema discipline
- `CHARACTER_SCHEMA_VERSION` (`src/data/schemas.js`) is not the app version. Bump it only when the
  saved character shape changes, and mention the new schema in the README Library section.
- Every persisted shape has an `emptyX()` / `normalizeX()` pair. A bump ships a normalizer that
  accepts the previous shape and a test with a fixture of the old shape. `migrateSavedCharacter`
  never throws on garbage input.

## 3. Tests and build before any push
- `npm test` (Vitest, node environment) and `npm run build` must both pass.
- Pure modules in `src/utils` and `src/data` get a `*.test.js` next to them. Stub network with
  `vi.stubGlobal('fetch', vi.fn(...))`; never hit a real API in tests.
- No jsdom: keep DOM / WebGL / IndexedDB code behind thin wrappers so the logic stays testable.
- `npm run test:e2e` (Playwright, optional, global install) smokes the built 3D Studio with every Tripo
  route mocked; run it after touching the Studio, the job runner, or the export bundle. Fixture GLBs
  come from `npm run fixtures` (`scripts/make-fixture-glb.mjs`), never from a real Tripo job.

## 4. Secrets never touch the repo
- API keys (Google, Tripo) live only in the IndexedDB `settings` store and are sent only to their
  own provider (or the user's own proxy) as request headers. Never read them from `import.meta.env`,
  `localStorage`, files, or query strings.
- No `.env*` files, fixtures, or `references/` snippets may contain real keys.
  `src/utils/secretScan.test.js` fails the suite if a key-shaped string appears in the tree.
- The optional Tripo proxy (`proxy/`) forwards the browser's `Authorization` header and stores nothing.

## 5. Paid Tripo operations
- Every billed Tripo call goes through the job options dialog with a credit estimate and the
  current balance. Nothing triggers Tripo automatically (not Generate All, not adding a wardrobe look).
- Reconcile `credits_consumed` from the task result on every job and refresh the balance.
- Tripo output URLs expire minutes after a task completes: download artifacts into IndexedDB
  before persisting state or showing success.

## 6. Local-first generation
- Rolling the sheet, the life ledger, and motion scripts never calls an LLM. The character seed +
  locked fields must reproduce the same result. AI only runs from explicit buttons and falls back
  to the local path on failure with a toast.

## 7. Prompt conventions
- Model output is strict JSON parsed with `parseJsonFromModelText`; validate the shape and throw
  so callers can fall back. System prompts list allowed ids explicitly.
- Never name trait systems (OCEAN, MBTI, Enneagram, alignment) in prompts meant to produce prose
  or dialogue; compile them into behavior text first.

## 8. UI conventions
- Tailwind component classes: `btn-primary`, `btn-secondary`, `btn-danger`, `input-field`,
  `glass-panel`, `nav-item*`. Icons from `lucide-react`. Toasts via `useToastStore.addToast`.
- No emojis in UI copy or code. A new top-level tab = Sidebar `SPECIAL_TABS` + Header title + App route.

## 9. Module layout
- Pure logic in `src/utils` / `src/data` (no React, no store imports except the Tripo job modules).
  The store (`src/hooks/useCharacter.js`) only wires state; components never call `fetch` directly.
- three.js is used only through `src/utils/threeScene.js` / `src/utils/glbTextures.js` with dynamic
  `import()` so it stays out of the main chunk.

## 10. Git
- Work on feature branches; imperative commit subjects; the body says why. Never commit `dist/`,
  `node_modules/`, or anything under `.wrangler/`.
