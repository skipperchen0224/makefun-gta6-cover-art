[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/competitions/gta6-cover-art-01) [![rank](https://make.fun/badge/gta6-cover-art-01/skipperchen0224/makefun-gta6-cover-art/rank.svg)](https://make.fun/competitions/gta6-cover-art-01) [![reward](https://make.fun/badge/gta6-cover-art-01/skipperchen0224/makefun-gta6-cover-art/reward.svg)](https://make.fun/competitions/gta6-cover-art-01)

# Neon Coast — Vice City Cover Maker

Turn any photo and a caption into GTA 6-style multi-panel cover art, in the
browser, offline. Photos stay on your machine — nothing is uploaded.

## What it does

- **Multi-panel covers**: four layouts (Hero, Stack, Trio, Quad) that fill
  3–4 panels with one photo or several.
- **Any photo**: load your own photo per panel, or use the two bundled
  samples. Zoom and pan each panel to crop it just right.
- **Caption lettering**: a bold condensed title plus a neon subtitle, with a
  star badge and a "Vice City · Leonida" tag line. All lettering is original
  system-font type — no Rockstar logos, artwork or fonts.
- **Colour grades**: Sunset, Neon, Palm and Noir washes, plus film grain and
  a vignette.
- **One-step export**: PNG in the common post sizes — 1080 × 1080,
  1080 × 1350 and 1920 × 1080.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Pick a layout and a grade, type a title, load photos, and hit **Export PNG**.

## How it is built

- `app/index.html` + `app/style.css` — the editor shell and studio UI.
- `app/src/render.js` — the cover engine: panel layouts, photo cover-fit,
  grade washes, title block, grain and vignette on a 2D canvas.
- `app/src/editor.js` — controls, photo loading, live preview, PNG export.
- `app/src/capture.js` — `?shot=cover` / `?shot=editor` screenshot mode.
- `main.ts` — the entrypoint: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json` with the kit's `buildDossier`.

## Verify

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.
