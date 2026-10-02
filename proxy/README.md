# Tripo proxy (optional)

Tripo's API does not send CORS headers, so a browser can only reach it through a relay. When you run
CharGen.AI locally (`npm run dev` / `npm run preview`) Vite provides that relay. For the hosted build
(GitHub Pages) deploy this tiny Cloudflare Worker and paste its URL into **Settings -> Tripo proxy URL**.

The Worker forwards your browser's `Authorization: Bearer <key>` header to Tripo on each request
(`/v3/*` to `openapi.tripo3d.ai` for International keys, `/cn/v3/*` to `openapi.tripo3d.com` for
China-region keys) and relays allow-listed artifact downloads. **It never stores your key.**

A Worker deployed before CharGen.AI v1.13.0 has no `/cn/v3/*` route; run `wrangler deploy` again if
Settings says your proxy has no China route.

```bash
npm i -g wrangler
wrangler login
cd proxy
wrangler deploy
```

Wrangler prints a URL like `https://chargen-tripo-proxy.<account>.workers.dev`. Paste it into Settings,
press **Test proxy**, and 3D Studio works on the hosted site.

Edit `ALLOWED_ORIGINS` in `wrangler.toml` if you host CharGen.AI somewhere other than
`https://elusid108.github.io`. Keep `.wrangler/` and `.dev.vars` out of git (already ignored).
