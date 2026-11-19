# Vice City Cover Maker

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/skipperchen0224/makefun-gta6-cover-art/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/skipperchen0224/makefun-gta6-cover-art/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An original web app for **make.fun gta6-cover-art-01** — turn your own photo
and a caption into multi-panel GTA-style cover art, and export it as a PNG to share.

No Rockstar Games logo, artwork or font is used anywhere: the sunset skyline,
palms and lettering are all drawn by this app's own code, and the two sample
photos were made with an image model for make.fun and are free to use.

## What it does

- **Multi-panel poster look** — three layouts (Hero Grid, Comic Strip, Portrait
  Stack) with the white-gapped panel grid of GTA box art.
- **Any photo** — load up to 3 of your own photos, or the built-in samples.
  Each panel gets its own crop: zoom and position sliders per panel.
- **Sunset / neon colour grades** — Sunset, Neon Nights, Vice Pink and Noir,
  plus halftone dots and a vignette for the printed-poster feel.
- **Your caption** — a bold title and subtitle, edited live, with outlined
  poster lettering.
- **Fast export** — one click exports a PNG in the common post sizes:
  1080 x 1080, 1080 x 1350 or 1920 x 1080.
- **Offline** — the app is static files under `app/`; photos never leave
  your machine and nothing loads over the network.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

1. Pick a layout and a post size.
2. Load a photo (or tap **Use sample photos**).
3. Drag the zoom / position sliders to frame each panel.
4. Type your caption, pick a colour grade.
5. **Export PNG** — done.

## Screenshots

The app stages its own screenshots deterministically (`app/src/shots.js`):
`?shot=cover` shows an exported cover full-screen, `?shot=editor` shows the
editor with a sample photo loaded. See `shots.json` for the exact scenes.

## Files

- `main.ts` — the entrypoint: copies `app/` and `screenshots/` to `/output`
  and writes `dossier.json` (Node 22, standard library only).
- `app/index.html`, `app/style.css` — the editor page.
- `app/src/main.js` — wires the controls, photo loading and PNG export.
- `app/src/cover.js` — draws the cover: panels, grades, caption lettering.
- `app/src/scene.js` — draws the original Vice City sunset scene (sky,
  sun, skyline, palms, water) used to fill panels without a photo.
- `app/src/shots.js` — fixed scenes for screenshots.
- `vendor/makefun-app.ts` — the kit's vendored library, unchanged.
