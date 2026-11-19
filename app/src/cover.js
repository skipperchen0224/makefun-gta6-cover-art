// Draws the cover: the multi-panel poster grid, a photo or the app's own sunset
// scene in each panel, a colour grade over everything, and the bold caption
// lettering along the foot. All lettering is drawn with system fonts — no font
// file from any game is used.
import { drawNeonScene, drawViceCityScene } from './scene.js';

/** The colour grades: tint, wash and caption accent per preset. */
export const GRADES = {
  sunset: { wash: 'rgba(255, 122, 61, 0.16)', deep: 'rgba(200, 40, 120, 0.28)', accent: '#ffc93c', caption: '#ffffff' },
  neon: { wash: 'rgba(108, 43, 217, 0.22)', deep: 'rgba(0, 229, 199, 0.14)', accent: '#00e5c7', caption: '#ffffff' },
  vice: { wash: 'rgba(255, 46, 136, 0.24)', deep: 'rgba(108, 43, 217, 0.26)', accent: '#ff2e88', caption: '#ffffff' },
  noir: { wash: 'rgba(10, 8, 20, 0.30)', deep: 'rgba(10, 8, 20, 0.34)', accent: '#e8e2f2', caption: '#f4eefc' },
};

/** Panel rectangles for each layout, as fractions of the cover (x, y, w, h). */
export function layoutPanels(layout, W, H) {
  const gap = 0.012; // white grid gap, as a fraction of the short side
  const g = Math.min(W, H) * gap;
  const hero = [
    { x: 0, y: 0, w: W * 0.62 - g / 2, h: H * 0.66 - g / 2, seed: 11 },
    { x: W * 0.62 + g / 2, y: 0, w: W * 0.38 - g / 2, h: H * 0.32 - g / 2, seed: 23 },
    { x: W * 0.62 + g / 2, y: H * 0.32 + g / 2, w: W * 0.38 - g / 2, h: H * 0.34 - g / 2, seed: 37 },
    { x: 0, y: H * 0.66 + g / 2, w: W - 0, h: H * 0.34 - g / 2, seed: 51, captionBand: true },
  ];
  const comic = [
    { x: 0, y: 0, w: W * 0.36 - g / 2, h: H * 0.66 - g / 2, seed: 11 },
    { x: W * 0.36 + g / 2, y: 0, w: W * 0.28 - g / 2, h: H * 0.66 - g / 2, seed: 23 },
    { x: W * 0.64 + g / 2, y: 0, w: W * 0.36 - g / 2, h: H * 0.66 - g / 2, seed: 37 },
    { x: 0, y: H * 0.66 + g / 2, w: W, h: H * 0.34 - g / 2, seed: 51, captionBand: true },
  ];
  const stack = [
    { x: 0, y: 0, w: W, h: H * 0.46 - g / 2, seed: 11 },
    { x: 0, y: H * 0.46 + g / 2, w: W * 0.5 - g / 2, h: H * 0.2 - g / 2, seed: 23 },
    { x: W * 0.5 + g / 2, y: H * 0.46 + g / 2, w: W * 0.5 - g / 2, h: H * 0.2 - g / 2, seed: 37 },
    { x: 0, y: H * 0.66 + g / 2, w: W, h: H * 0.34 - g / 2, seed: 51, captionBand: true },
  ];
  if (layout === 'comic') return comic;
  if (layout === 'stack') return stack;
  return hero;
}

/** Draws one photo cover-fit into a panel rect, with the panel's zoom and pan. */
export function drawPhotoPanel(ctx, photo, rect, zoom, panX, panY) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const scale = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * zoom;
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  // Clamp the pan so the photo can never slide out of its panel and expose a
  // blank strip: the most it may move is half its own overhang on each axis.
  const dx = Math.max(-(pw - w) / 2, Math.min((pw - w) / 2, panX * w));
  const dy = Math.max(-(ph - h) / 2, Math.min((ph - h) / 2, panY * h));
  ctx.drawImage(photo, x + (w - pw) / 2 + dx, y + (h - ph) / 2 + dy, pw, ph);
  ctx.restore();
}

/** Fills a panel with the app's own scene when it holds no photo. */
export function drawScenePanel(ctx, rect, grade, seed) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x, y);
  if (grade === 'neon' || grade === 'noir') drawNeonScene(ctx, w, h, seed);
  else drawViceCityScene(ctx, w, h, seed);
  ctx.restore();
}

/** Washes a panel with the grade's tint, darkening its foot for the caption. */
export function gradePanel(ctx, rect, grade, captionBand) {
  const g = GRADES[grade] ?? GRADES.sunset;
  const { x, y, w, h } = rect;
  ctx.fillStyle = g.wash;
  ctx.fillRect(x, y, w, h);
  const shade = ctx.createLinearGradient(0, y + h * 0.4, 0, y + h);
  shade.addColorStop(0, 'rgba(20, 8, 32, 0)');
  shade.addColorStop(1, captionBand ? 'rgba(20, 8, 32, 0.72)' : g.deep);
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
}

/** Bold poster lettering: white capitals, dark outline, accent underline. */
export function drawCaption(ctx, rect, title, subtitle, grade) {
  const g = GRADES[grade] ?? GRADES.sunset;
  const { x, y, w, h } = rect;
  const text = title.trim().toUpperCase();
  const sub = subtitle.trim().toUpperCase();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (text) {
    let size = h * 0.44;
    ctx.font = `900 ${size}px "Arial Black", Impact, Arial, sans-serif`;
    try { ctx.letterSpacing = `${size * 0.02}px`; } catch { /* older canvas: no letter-spacing */ }
    while (ctx.measureText(text).width > w * 0.92 && size > 10) {
      size -= 2;
      ctx.font = `900 ${size}px "Arial Black", Impact, Arial, sans-serif`;
    }
    const cy = y + h * 0.42;
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = '#160a24';
    ctx.strokeText(text, x + w / 2, cy);
    ctx.fillStyle = g.caption;
    ctx.fillText(text, x + w / 2, cy);
    // Accent rule under the title.
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = g.accent;
    ctx.fillRect(x + (w - tw) / 2, cy + size * 0.62, tw, Math.max(4, h * 0.035));
  }
  if (sub) {
    let size = h * 0.13;
    ctx.font = `700 ${size}px Arial, sans-serif`;
    try { ctx.letterSpacing = `${size * 0.28}px`; } catch { /* older canvas */ }
    while (ctx.measureText(sub).width > w * 0.9 && size > 8) {
      size -= 1;
      ctx.font = `700 ${size}px Arial, sans-serif`;
    }
    ctx.fillStyle = g.accent;
    ctx.fillText(sub, x + w / 2, y + h * 0.82);
  }
  ctx.restore();
}

function drawHalftone(ctx, W, H) {
  ctx.save();
  ctx.fillStyle = 'rgba(20, 8, 32, 0.10)';
  const step = Math.max(10, Math.round(Math.min(W, H) / 110));
  for (let yy = H * 0.55; yy < H; yy += step) {
    for (let xx = 0; xx < W; xx += step) {
      const r = step * 0.16 * (1 + (yy / H));
      ctx.beginPath();
      ctx.arc(xx + step / 2, yy + step / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(10, 5, 20, 0)');
  v.addColorStop(1, 'rgba(10, 5, 20, 0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Draws the whole cover onto `canvas` at its own size.
 * state: { photos[3] (Image|null), layout, grade, caption, subtitle,
 *          zooms[3], pans[3] ({x,y}), halftone, vignette }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = state.grade ?? 'sunset';
  ctx.fillStyle = '#f4eefc'; // the white grid gap shows through as the poster grid
  ctx.fillRect(0, 0, W, H);
  const panels = layoutPanels(state.layout ?? 'hero', W, H);
  panels.forEach((rect, i) => {
    if (rect.captionBand) {
      // Caption band: the sunset scene behind the lettering.
      drawScenePanel(ctx, rect, grade, rect.seed);
      gradePanel(ctx, rect, grade, true);
      drawCaption(ctx, rect, state.caption ?? '', state.subtitle ?? '', grade);
    } else {
      const photo = state.photos?.[i] ?? null;
      if (photo) drawPhotoPanel(ctx, photo, rect, state.zooms?.[i] ?? 1, state.pans?.[i]?.x ?? 0, state.pans?.[i]?.y ?? 0);
      else drawScenePanel(ctx, rect, grade, rect.seed);
      gradePanel(ctx, rect, grade, false);
    }
    // Thin dark frame around each panel.
    ctx.strokeStyle = 'rgba(20, 8, 32, 0.55)';
    ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.004);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  if (state.halftone) drawHalftone(ctx, W, H);
  if (state.vignette) drawVignette(ctx, W, H);
}
