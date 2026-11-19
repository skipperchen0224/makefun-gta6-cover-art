// Draws the app's own Vice City sunset scene: gradient sky, low sun, a two-layer
// skyline, palm silhouettes and sunlit water. Everything is drawn from code — no
// Rockstar artwork, no photo. A seeded shuffle keeps the skyline stable per panel.

/** Tiny deterministic random source, so a panel's skyline never jumps between redraws. */
export function makeSeededRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawSky(ctx, w, h, top, mid, low) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  sky.addColorStop(0, top);
  sky.addColorStop(0.45, mid);
  sky.addColorStop(1, low);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.72);
}

function drawSun(ctx, w, h, rand) {
  const cx = w * (0.28 + rand() * 0.44);
  const cy = h * 0.52;
  const r = Math.min(w, h) * 0.16;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 3.2);
  glow.addColorStop(0, 'rgba(255, 201, 60, 0.55)');
  glow.addColorStop(1, 'rgba(255, 201, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 3.2, cy - r * 3.2, r * 6.4, r * 6.4);
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Sun slats: thin sky-coloured cuts across the lower sun, poster style.
  ctx.fillStyle = 'rgba(255, 122, 61, 0.85)';
  for (let i = 0; i < 3; i++) {
    const y = cy + r * (0.15 + i * 0.28);
    ctx.fillRect(cx - r, y, r * 2, r * 0.07);
  }
}

function drawClouds(ctx, w, h, rand) {
  ctx.fillStyle = 'rgba(255, 120, 160, 0.35)';
  for (let i = 0; i < 5; i++) {
    const y = h * (0.08 + rand() * 0.3);
    const cw = w * (0.18 + rand() * 0.25);
    const cx = rand() * w;
    ctx.beginPath();
    ctx.ellipse(cx, y, cw / 2, h * 0.012, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(20, 10, 40, 0.9)';
  for (let i = 0; i < 3; i++) {
    const x = w * (0.1 + rand() * 0.8);
    const y = h * (0.12 + rand() * 0.22);
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.quadraticCurveTo(x - 3, y - 7, x, y);
    ctx.quadraticCurveTo(x + 3, y - 7, x + 9, y);
    ctx.stroke();
  }
}

function drawSkylineLayer(ctx, w, h, baseY, minH, maxH, color, rand, lit) {
  ctx.fillStyle = color;
  let x = -10;
  while (x < w + 10) {
    const bw = w * (0.05 + rand() * 0.09);
    const bh = h * (minH + rand() * (maxH - minH));
    const top = baseY - bh;
    ctx.fillRect(x, top, bw, bh + 4);
    if (rand() < 0.4) { // rooftop antenna
      ctx.fillRect(x + bw / 2 - 1, top - h * 0.03, 2, h * 0.03);
    }
    if (lit) { // a few warm lit windows
      ctx.fillStyle = 'rgba(255, 201, 60, 0.85)';
      const rows = Math.floor(bh / (h * 0.045));
      const cols = Math.max(1, Math.floor(bw / (w * 0.03)));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rand() < 0.22) {
            ctx.fillRect(x + 4 + c * (w * 0.03), top + 6 + r * (h * 0.045), 3, 5);
          }
        }
      }
      ctx.fillStyle = color;
    }
    x += bw + w * 0.008;
  }
}

function drawWater(ctx, w, h, horizonY) {
  const sea = ctx.createLinearGradient(0, horizonY, 0, h);
  sea.addColorStop(0, '#ff7a3d');
  sea.addColorStop(0.35, '#c22a72');
  sea.addColorStop(1, '#1c1038');
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizonY, w, h - horizonY);
  // Sun glitter: short horizontal strokes under the sun.
  ctx.fillStyle = 'rgba(255, 220, 120, 0.5)';
  const cx = w * 0.5;
  for (let i = 0; i < 14; i++) {
    const y = horizonY + 6 + i * ((h - horizonY) / 15);
    const ww = w * (0.05 + 0.16 * (i / 14));
    ctx.fillRect(cx - ww / 2, y, ww, 2);
  }
}

function drawPalm(ctx, x, baseY, s, lean) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(lean);
  ctx.scale(s, s);
  ctx.strokeStyle = '#160a24';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(8, -60, -6, -118);
  ctx.stroke();
  ctx.fillStyle = '#160a24';
  for (let i = 0; i < 7; i++) {
    const a = (-Math.PI * 0.92) + (i * Math.PI * 0.30);
    ctx.save();
    ctx.translate(-6, -118);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(36, -16, 68, 10);
    ctx.quadraticCurveTo(38, 12, 14, 14);
    ctx.quadraticCurveTo(6, 8, 0, 8);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** Paints the sunset scene across the whole rectangle (0,0,w,h). `seed` picks the skyline. */
export function drawViceCityScene(ctx, w, h, seed) {
  const rand = makeSeededRandom(seed);
  ctx.save();
  drawSky(ctx, w, h, '#2b1b4e', '#6c2bd9', '#ff7a3d');
  drawSun(ctx, w, h, rand);
  drawClouds(ctx, w, h, rand);
  const horizon = h * 0.72;
  drawSkylineLayer(ctx, w, h, horizon, 0.10, 0.22, '#3a1c5e', rand, false);
  drawSkylineLayer(ctx, w, h, horizon, 0.05, 0.14, '#241238', rand, true);
  drawWater(ctx, w, h, horizon);
  const s = Math.min(w, h) / 540;
  drawPalm(ctx, w * 0.06, h * 0.99, s * 1.15, -0.08);
  drawPalm(ctx, w * 0.94, h * 0.99, s * 0.95, 0.1);
  ctx.restore();
}

/** Paints a neon night street variant: purple sky, lit towers, pink glow. */
export function drawNeonScene(ctx, w, h, seed) {
  const rand = makeSeededRandom(seed + 7);
  ctx.save();
  drawSky(ctx, w, h, '#0d0620', '#3b1160', '#ff2e88');
  const horizon = h * 0.72;
  drawSkylineLayer(ctx, w, h, horizon, 0.12, 0.26, '#170a30', rand, true);
  drawSkylineLayer(ctx, w, h, horizon, 0.06, 0.15, '#0d0620', rand, true);
  const sea = ctx.createLinearGradient(0, horizon, 0, h);
  sea.addColorStop(0, '#ff2e88');
  sea.addColorStop(1, '#0d0620');
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, h - horizon);
  // Neon sign bars on the water.
  ctx.fillStyle = 'rgba(0, 229, 199, 0.65)';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(w * (0.15 + rand() * 0.7), horizon + 8 + i * ((h - horizon) / 9), w * 0.08, 3);
  }
  const s = Math.min(w, h) / 540;
  drawPalm(ctx, w * 0.08, h * 0.99, s, -0.06);
  drawPalm(ctx, w * 0.92, h * 0.99, s * 1.1, 0.08);
  ctx.restore();
}
