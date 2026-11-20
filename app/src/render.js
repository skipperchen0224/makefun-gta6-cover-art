// Neon Coast cover engine — draws a multi-panel Vice City style cover
// onto a 2D canvas. Pure canvas, no network, no external assets.
// Every number here is my own layout math for this entry.
// Round 3: synthwave scene (neon sky, sun with scanline cuts, perspective
// grid, palm / car / helicopter / yacht silhouettes), CRT + chromatic
// aberration post, layered-glow italic title, ESRB + barcode packaging.
(function () {
  "use strict";

  // Panel rectangles as fractions of the cover, per layout name.
  // Each entry lists one rect per panel: [x, y, w, h].
  const LAYOUTS = {
    hero: [
      [0, 0, 0.6, 1],
      [0.6, 0, 0.4, 0.52],
      [0.6, 0.52, 0.4, 0.48],
    ],
    stack: [
      [0, 0, 1, 0.56],
      [0, 0.56, 0.5, 0.44],
      [0.5, 0.56, 0.5, 0.44],
    ],
    trio: [
      [0, 0, 0.34, 1],
      [0.34, 0, 0.33, 1],
      [0.67, 0, 0.33, 1],
    ],
    quad: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  };

  // Colour grades: wash gradient, title colour, accent colour, subtitle colour.
  const GRADES = {
    sunset: {
      wash: ["rgba(255,122,26,0.34)", "rgba(214,32,112,0.30)", "rgba(64,16,96,0.34)"],
      title: "#fff7e8",
      accent: "#ff7a1a",
      subtitle: "#ffd166",
      band: "rgba(20,4,32,0.72)",
    },
    neon: {
      wash: ["rgba(255,45,149,0.36)", "rgba(24,220,255,0.26)", "rgba(8,8,40,0.40)"],
      title: "#ffffff",
      accent: "#ff2d95",
      subtitle: "#37e6ff",
      band: "rgba(6,2,24,0.74)",
    },
    palm: {
      wash: ["rgba(0,190,166,0.30)", "rgba(255,196,66,0.28)", "rgba(6,64,54,0.34)"],
      title: "#f4fff8",
      accent: "#00beA6",
      subtitle: "#ffc442",
      band: "rgba(2,32,28,0.72)",
    },
    noir: {
      wash: ["rgba(255,255,255,0.10)", "rgba(0,0,0,0.42)", "rgba(0,0,0,0.55)"],
      title: "#f2f2f2",
      accent: "#e8e8e8",
      subtitle: "#c9c9c9",
      band: "rgba(0,0,0,0.78)",
    },
  };

  const SIZES = {
    square: { w: 1080, h: 1080, label: "1080 × 1080" },
    portrait: { w: 1080, h: 1350, label: "1080 × 1350" },
    wide: { w: 1920, h: 1080, label: "1920 × 1080" },
    "4k": { w: 3840, h: 2160, label: "3840 × 2160 (4K)" },
  };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- Synthwave scene -------------------------------------------------
  // Neon gradient sky (hot pink #FF007F up top, deep purple #2B1055 at the
  // horizon), a scanline-cut sun (#FFD700 -> #FF00FF), a cyan #00FFFF
  // perspective grid, and deep-purple-to-deep-blue silhouettes edged in
  // 1px hot pink. Drawn into any rect (full cover or one empty panel).

  function drawSun(g, cx, cy, r) {
    // Paint the sun on its own tile so the scanline gaps can be punched
    // out of the disc without erasing the sky behind it.
    const tile = document.createElement("canvas");
    const d = Math.ceil(r * 2) + 4;
    tile.width = d;
    tile.height = d;
    const t = tile.getContext("2d");
    const grad = t.createLinearGradient(0, 0, 0, d);
    grad.addColorStop(0, "#FFD700");
    grad.addColorStop(0.55, "#FF7A3D");
    grad.addColorStop(1, "#FF00FF");
    t.fillStyle = grad;
    t.beginPath();
    t.arc(d / 2, d / 2, r, 0, Math.PI * 2);
    t.fill();
    // Horizontal scanline cuts, gaps widening toward the bottom of the disc.
    t.globalCompositeOperation = "destination-out";
    let y = d / 2 + r * 0.08;
    let gap = Math.max(1.5, r * 0.02);
    while (y < d / 2 + r) {
      t.fillRect(0, y, d, gap);
      y += gap + Math.max(4, r * 0.09);
      gap *= 1.55;
    }
    t.globalCompositeOperation = "source-over";
    // Neon glow, Screen blend so the sky lights up around the disc.
    g.save();
    g.globalCompositeOperation = "screen";
    const glow = g.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.6);
    glow.addColorStop(0, "rgba(255,0,127,0.55)");
    glow.addColorStop(0.5, "rgba(255,0,127,0.18)");
    glow.addColorStop(1, "rgba(255,0,127,0)");
    g.fillStyle = glow;
    g.fillRect(cx - r * 2.6, cy - r * 2.6, r * 5.2, r * 5.2);
    g.restore();
    g.drawImage(tile, cx - d / 2, cy - d / 2);
  }

  function drawGrid(g, x, horizonY, w, groundH, density, depth) {
    const cx = x + w / 2;
    const bottom = horizonY + groundH;
    const ground = g.createLinearGradient(0, horizonY, 0, bottom);
    ground.addColorStop(0, "#160428");
    ground.addColorStop(1, "#05010a");
    g.fillStyle = ground;
    g.fillRect(x, horizonY, w, groundH);
    g.save();
    g.strokeStyle = "#00FFFF";
    g.globalCompositeOperation = "screen";
    g.shadowColor = "#00FFFF";
    g.shadowBlur = Math.max(2, w * 0.004);
    // Verticals: fan out from the vanishing point to the bottom edge.
    const n = Math.max(4, Math.round(density));
    g.lineWidth = Math.max(1, w * 0.0016);
    for (let i = -n; i <= n; i++) {
      const spread = (i / n) * w * 0.9 * depth;
      g.beginPath();
      g.moveTo(cx + (i / n) * w * 0.06, horizonY);
      g.lineTo(cx + spread, bottom);
      g.stroke();
    }
    // Horizontals: exponential spacing, dense at the horizon, wide below.
    const rows = Math.max(4, Math.round(density * 0.7));
    for (let i = 1; i <= rows; i++) {
      const t = i / rows;
      const y = horizonY + groundH * Math.pow(t, 2.1) * depth * 0.9 + groundH * (1 - depth * 0.9) * t * 0;
      if (y > bottom) break;
      g.lineWidth = Math.max(1, w * 0.0012 + t * w * 0.0016);
      g.globalAlpha = 0.35 + 0.65 * t;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + w, y);
      g.stroke();
    }
    g.restore();
  }

  function silhouetteFill(g, y0, y1) {
    const grad = g.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0, "#2B1055");
    grad.addColorStop(1, "#0a1030");
    g.fillStyle = grad;
    g.strokeStyle = "#FF00FF";
    g.lineWidth = 1;
  }

  function drawPalm(g, bx, by, s, lean) {
    // bx,by = base of the trunk; s = height in px; lean bends the trunk.
    g.save();
    g.beginPath();
    g.moveTo(bx - s * 0.03, by);
    g.quadraticCurveTo(bx + lean * s * 0.2, by - s * 0.55, bx + lean * s * 0.16, by - s);
    g.lineTo(bx + lean * s * 0.16 + s * 0.03, by - s);
    g.quadraticCurveTo(bx + lean * s * 0.2 + s * 0.03, by - s * 0.5, bx + s * 0.04, by);
    g.closePath();
    const tx = bx + lean * s * 0.16;
    const ty = by - s;
    for (let i = 0; i < 7; i++) {
      const a = (-0.15 - i * 0.24) * Math.PI + (lean > 0 ? 0.12 : -0.12);
      const len = s * (0.42 - Math.abs(i - 3) * 0.03);
      g.moveTo(tx, ty);
      g.quadraticCurveTo(
        tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.4 - s * 0.06,
        tx + Math.cos(a) * len, ty + Math.sin(a) * len + s * 0.10,
      );
    }
    silhouetteFill(g, ty - s * 0.4, by);
    g.fill();
    g.stroke();
    g.restore();
  }

  function drawCar(g, cx, by, s) {
    // Retro wedge sports car, side profile. s = body length in px.
    const h = s * 0.24;
    g.save();
    g.beginPath();
    g.moveTo(cx - s / 2, by);
    g.lineTo(cx - s / 2, by - h * 0.55);
    g.lineTo(cx - s * 0.28, by - h * 0.62);
    g.lineTo(cx - s * 0.08, by - h);
    g.lineTo(cx + s * 0.22, by - h);
    g.lineTo(cx + s * 0.38, by - h * 0.6);
    g.lineTo(cx + s / 2, by - h * 0.5);
    g.lineTo(cx + s / 2, by);
    g.closePath();
    silhouetteFill(g, by - h, by);
    g.fill();
    g.stroke();
    // Wheels.
    g.beginPath();
    g.arc(cx - s * 0.3, by, h * 0.22, 0, Math.PI * 2);
    g.arc(cx + s * 0.3, by, h * 0.22, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.restore();
  }

  function drawHelicopter(g, cx, cy, s) {
    g.save();
    g.beginPath();
    g.ellipse(cx, cy, s * 0.32, s * 0.16, 0, 0, Math.PI * 2);
    g.moveTo(cx + s * 0.3, cy);
    g.lineTo(cx + s * 0.62, cy - s * 0.06);
    g.lineTo(cx + s * 0.62, cy + s * 0.02);
    g.lineTo(cx + s * 0.3, cy + s * 0.05);
    g.closePath();
    silhouetteFill(g, cy - s * 0.2, cy + s * 0.2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(cx - s * 0.55, cy - s * 0.22);
    g.lineTo(cx + s * 0.55, cy - s * 0.22);
    g.stroke();
    g.restore();
  }

  function drawYacht(g, cx, by, s) {
    g.save();
    g.beginPath();
    g.moveTo(cx - s / 2, by - s * 0.08);
    g.lineTo(cx + s / 2, by - s * 0.08);
    g.lineTo(cx + s * 0.34, by);
    g.lineTo(cx - s * 0.34, by);
    g.closePath();
    g.moveTo(cx, by - s * 0.08);
    g.lineTo(cx, by - s * 0.72);
    g.moveTo(cx, by - s * 0.7);
    g.lineTo(cx + s * 0.3, by - s * 0.12);
    g.lineTo(cx, by - s * 0.12);
    g.closePath();
    silhouetteFill(g, by - s * 0.72, by);
    g.fill();
    g.stroke();
    g.restore();
  }

  // Draws the full synthwave scene into rect (x, y, w, h) on ctx.
  // scene: { sunY, gridDensity, depth, showCar, showPalm, showHeli,
  //          showYacht, hue, seed }.
  function drawSynthwaveScene(ctx, x, y, w, h, scene) {
    const s = scene || {};
    const horizonY = y + h * (s.sunY != null ? s.sunY : 0.42);
    const rnd = mulberry32((s.seed || 7) * 2654435761 >>> 0);
    const tile = document.createElement("canvas");
    tile.width = Math.max(2, Math.round(w));
    tile.height = Math.max(2, Math.round(h));
    const g = tile.getContext("2d");
    // Sky: hot pink #FF007F up top -> deep purple #2B1055 at the horizon.
    const sky = g.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, "#FF007F");
    sky.addColorStop(0.45, "#B01E7A");
    sky.addColorStop(1, "#2B1055");
    g.fillStyle = sky;
    g.fillRect(0, 0, tile.width, horizonY);
    // Radial glow / cloud wash over the sky (Screen blend).
    g.save();
    g.globalCompositeOperation = "screen";
    const glow = g.createRadialGradient(
      tile.width * 0.5, horizonY * 0.55, 10,
      tile.width * 0.5, horizonY * 0.55, Math.max(tile.width, horizonY) * 0.85,
    );
    glow.addColorStop(0, "rgba(255,120,200,0.35)");
    glow.addColorStop(0.6, "rgba(120,40,160,0.16)");
    glow.addColorStop(1, "rgba(60,10,90,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, tile.width, horizonY);
    g.restore();
    // Perspective grid ground.
    drawGrid(g, 0, horizonY, tile.width, tile.height - horizonY,
      s.gridDensity != null ? s.gridDensity : 12,
      s.depth != null ? s.depth : 1);
    // Sun last, in front of the grid: the full disc (with its scanline
    // cuts) straddles the horizon and the grid shows through the slits.
    const sunR = Math.min(tile.width, tile.height) * 0.17;
    drawSun(g, tile.width / 2, horizonY - sunR * 0.15, sunR);
    // Foreground silhouettes, seeded positions so a panel keeps its look.
    const gy = tile.height;
    if (s.showPalm !== false) {
      drawPalm(g, tile.width * (0.08 + rnd() * 0.06), gy - 2, tile.height * 0.34, -1);
      drawPalm(g, tile.width * (0.86 + rnd() * 0.06), gy - 2, tile.height * 0.42, 1);
      if (tile.width > 420) drawPalm(g, tile.width * (0.2 + rnd() * 0.05), gy - 2, tile.height * 0.24, 1);
    }
    if (s.showCar !== false) {
      // Parked above the title band (bottom 24% of the cover), not under it.
      drawCar(g, tile.width * (0.5 + (rnd() - 0.5) * 0.1), tile.height * 0.72, tile.width * 0.34);
    }
    if (s.showHeli) drawHelicopter(g, tile.width * (0.78 + rnd() * 0.08), horizonY - tile.height * 0.16, tile.width * 0.14);
    if (s.showYacht) drawYacht(g, tile.width * (0.24 + rnd() * 0.06), horizonY + (tile.height - horizonY) * 0.35, tile.width * 0.2);
    // Custom foreground PNG (imported by the user): drawn over the ground,
    // centred, bottom-aligned, like a cut-out silhouette.
    if (s.foreground && s.foreground.naturalWidth) {
      const fw = tile.width * 0.55;
      const fh = Math.min(tile.height * 0.45, fw * s.foreground.naturalHeight / s.foreground.naturalWidth);
      g.drawImage(s.foreground, (tile.width - fw) / 2, tile.height - fh, fw, fh);
    }
    // Hue shift, if any: one filtered blit of the finished scene.
    ctx.save();
    if (s.hue) {
      try { ctx.filter = `hue-rotate(${s.hue}deg)`; } catch (e) { /* ignore */ }
    }
    ctx.drawImage(tile, x, y, w, h);
    ctx.restore();
  }

  let grainTile = null;
  function getGrainTile() {
    if (grainTile) return grainTile;
    const c = document.createElement("canvas");
    c.width = 180;
    c.height = 180;
    const g = c.getContext("2d");
    const img = g.createImageData(180, 180);
    const rnd = mulberry32(20261119);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rnd() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    grainTile = c;
    return c;
  }

  // A seeded barcode: deterministic black bars on a white strip.
  function drawBarcode(ctx, x, y, w, h, seed) {
    const rnd = mulberry32(seed || 99);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#000000";
    let bx = x + w * 0.04;
    while (bx < x + w * 0.96) {
      const bw = (1 + Math.floor(rnd() * 4)) * Math.max(1, w * 0.006);
      if (rnd() > 0.35) ctx.fillRect(bx, y + h * 0.06, bw, h * 0.88);
      bx += bw + (1 + Math.floor(rnd() * 3)) * Math.max(1, w * 0.006);
    }
  }

  function drawPhoto(ctx, image, rect, panel, scene) {
    const [x, y, w, h] = rect;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (!image || !image.naturalWidth) {
      // Empty panel: fill it with the synthwave scene, not a flat gradient.
      drawSynthwaveScene(ctx, x, y, w, h, { ...scene, seed: 11 + Math.round(x + y) });
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = `700 ${Math.max(13, w * 0.032)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("ADD A PHOTO", x + w / 2, y + h * 0.12);
    } else {
      const iw = image.naturalWidth;
      const ih = image.naturalHeight;
      const zoom = panel.zoom || 1;
      const scale = Math.max(w / iw, h / ih) * zoom;
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = x + (w - dw) / 2 + (panel.ox || 0) * w;
      const dy = y + (h - dh) / 2 + (panel.oy || 0) * h;
      ctx.drawImage(image, dx, dy, dw, dh);
    }
    ctx.restore();
  }

  function drawGradeWash(ctx, W, H, grade) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grade.wash.forEach((color, i) => {
      grad.addColorStop(i / (grade.wash.length - 1), color);
    });
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const top = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    top.addColorStop(0, "rgba(255,170,60,0.10)");
    top.addColorStop(1, "rgba(255,170,60,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, H * 0.45);
  }

  function drawGutters(ctx, W, H, rects, gutter) {
    ctx.fillStyle = "#0b0710";
    rects.forEach(([fx, fy, fw, fh]) => {
      const x = fx * W;
      const y = fy * H;
      const w = fw * W;
      const h = fh * H;
      ctx.fillRect(x - gutter / 2, y, gutter, h);
      ctx.fillRect(x, y - gutter / 2, w, gutter);
    });
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = Math.max(1, gutter * 0.12);
    rects.forEach(([fx, fy, fw, fh]) => {
      ctx.strokeRect(fx * W + 1, fy * H + 1, fw * W - 2, fh * H - 2);
    });
  }

  function drawTitleBlock(ctx, W, H, state, grade) {
    const bandH = H * 0.24;
    const bandY = H - bandH;
    ctx.fillStyle = grade.band;
    ctx.fillRect(0, bandY, W, bandH);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(0, bandY, W, Math.max(3, H * 0.006));
    const pad = W * 0.045;
    const title = (state.title || "NEON COAST").toUpperCase();
    const sub = (state.subtitle || "LEONIDA · A SUNSET HEIST").toUpperCase();
    // Shrink the title until it fits the cover width.
    let titleSize = Math.min(W * 0.115, bandH * 0.52);
    const titleFont = (s) => `italic 900 ${s}px "Arial Black", Impact, "Helvetica Neue", sans-serif`;
    ctx.font = titleFont(titleSize);
    while (titleSize > 12 && ctx.measureText(title).width > W - pad * 2) {
      titleSize *= 0.92;
      ctx.font = titleFont(titleSize);
    }
    const titleY = bandY + bandH * 0.58;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    try {
      ctx.letterSpacing = `${Math.max(1, W * 0.002)}px`;
    } catch (e) {
      /* letterSpacing unsupported: ignore */
    }
    // GTA-style italic title: hard black drop shadow (4px, 80%) plus three
    // stacked neon glows — 5px white inside, 15px neon pink, 30px deep
    // purple outside. One fillText per glow layer, same position.
    ctx.save();
    ctx.translate(pad, titleY);
    ctx.transform(1, 0, -0.14, 1, 0, 0); // italic shear
    ctx.font = titleFont(titleSize);
    const glowPass = (color, blur) => {
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = grade.title;
      ctx.fillText(title, 0, 0);
    };
    glowPass("#2B1055", Math.max(6, titleSize * 0.28)); // outer, ~30px
    glowPass("#FF2D95", Math.max(4, titleSize * 0.14)); // mid, ~15px
    glowPass("#FFFFFF", Math.max(2, titleSize * 0.05)); // inner, ~5px
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.lineWidth = Math.max(2, titleSize * 0.05);
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = grade.title;
    ctx.fillText(title, 0, 0);
    ctx.restore();
    try {
      ctx.letterSpacing = `${Math.max(2, W * 0.004)}px`;
    } catch (e) {
      /* ignore */
    }
    // Bottom row: ESRB-style rating box (left), subtitle, barcode (right).
    const rowH = bandH * 0.3;
    const rowY = bandY + bandH * 0.66;
    const boxW = rowH * 0.78;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(pad, rowY, boxW, rowH);
    ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.strokeStyle = "#000000";
    ctx.strokeRect(pad, rowY, boxW, rowH);
    ctx.fillStyle = "#000000";
    ctx.font = `900 ${rowH * 0.62}px "Arial Black", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("M", pad + boxW / 2, rowY + rowH * 0.52);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const subSize = Math.max(11, W * 0.02);
    ctx.font = `700 ${subSize}px "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = grade.subtitle;
    ctx.fillText(sub, pad + boxW + W * 0.012, rowY + rowH * 0.62);
    const barW = W * 0.11;
    const barH = rowH * 0.55;
    const barX = W - pad - barW;
    drawBarcode(ctx, barX, rowY + rowH * 0.05, barW, barH, 20261120);
    ctx.font = `700 ${Math.max(8, W * 0.0075)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.textAlign = "right";
    ctx.fillText("A ROCKSTAR GAMES PRODUCTION", W - pad, H - H * 0.015);
    ctx.textAlign = "left";
    try {
      ctx.letterSpacing = "0px";
    } catch (e) {
      /* ignore */
    }
    // Star badge, top-right corner of the cover (clear of the tag line).
    const bx = W - pad - W * 0.052;
    const by = pad + W * 0.052;
    const br = W * 0.052;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = grade.accent;
    ctx.fill();
    ctx.lineWidth = Math.max(2, W * 0.003);
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${br * 0.62}px "Arial Black", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", bx, by + br * 0.04);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `700 ${Math.max(11, W * 0.013)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = grade.subtitle;
    ctx.textAlign = "right";
    ctx.fillText("VICE CITY · LEONIDA", W - pad, bandY + bandH * 0.3);
    ctx.textAlign = "left";
  }

  function drawVignette(ctx, W, H) {
    const g = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.75,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  let scanTile = null;
  function drawScanlines(ctx, W, H) {
    // CRT scanlines: one 10%-black line every 2px.
    if (!scanTile) {
      const c = document.createElement("canvas");
      c.width = 1;
      c.height = 2;
      const g = c.getContext("2d");
      g.clearRect(0, 0, 1, 2);
      g.fillStyle = "rgba(0,0,0,0.10)";
      g.fillRect(0, 1, 1, 1);
      scanTile = c;
    }
    const pattern = ctx.createPattern(scanTile, "repeat");
    ctx.save();
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawChroma(ctx, W, H) {
    // Chromatic aberration: red channel -2px, blue channel +2px.
    // Skipped silently if the canvas is tainted (e.g. a cross-origin photo).
    try {
      const img = ctx.getImageData(0, 0, W, H);
      const d = img.data;
      const copy = new Uint8ClampedArray(d);
      const shift = 2;
      for (let y = 0; y < H; y++) {
        const row = y * W;
        for (let x = 0; x < W; x++) {
          const i = (row + x) * 4;
          const xr = row + Math.max(0, x - shift);
          const xb = row + Math.min(W - 1, x + shift);
          d[i] = copy[xr * 4];
          d[i + 2] = copy[xb * 4 + 2];
        }
      }
      ctx.putImageData(img, 0, 0);
    } catch (e) {
      /* tainted canvas: leave the image unshifted */
    }
  }

  function drawGrain(ctx, W, H) {
    const tile = getGrainTile();
    const pattern = ctx.createPattern(tile, "repeat");
    ctx.save();
    ctx.globalAlpha = 0.05; // 5% film grain
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawCover(canvas, state, images) {
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext("2d");
    const grade = GRADES[state.grade] || GRADES.sunset;
    const scene = state.scene || defaultScene();
    // Full-bleed synthwave backdrop: the scene frames the photo grid.
    const margin = scene.synthwave ? W * 0.03 : 0;
    const rects = (LAYOUTS[state.layout] || LAYOUTS.hero).map(([x, y, w, h]) => [
      margin + x * (W - margin * 2),
      margin + y * (H - margin * 2),
      w * (W - margin * 2),
      h * (H - margin * 2),
    ]);
    ctx.fillStyle = "#0b0710";
    ctx.fillRect(0, 0, W, H);
    const fg = images && images.foreground;
    if (scene.synthwave) drawSynthwaveScene(ctx, 0, 0, W, H, { ...scene, seed: 7, foreground: fg });
    rects.forEach((rect, i) => {
      drawPhoto(ctx, images[i] || null, rect, (state.panels && state.panels[i]) || {}, { ...scene, foreground: fg });
    });
    drawGradeWash(ctx, W, H, grade);
    drawGutters(ctx, W, H, rects.map(([x, y, w, h]) => [x / W, y / H, w / W, h / H]), Math.max(4, W * 0.008));
    drawTitleBlock(ctx, W, H, state, grade);
    if (state.vignette !== false) drawVignette(ctx, W, H);
    if (state.scanlines !== false) drawScanlines(ctx, W, H);
    if (state.grain !== false) drawGrain(ctx, W, H);
    if (state.chroma !== false) drawChroma(ctx, W, H);
    return { width: W, height: H, layout: state.layout, grade: state.grade };
  }

  function defaultScene() {
    return {
      synthwave: true,
      sunY: 0.42,
      gridDensity: 12,
      depth: 1,
      showCar: true,
      showPalm: true,
      showHeli: false,
      showYacht: false,
      hue: 0,
    };
  }

  function defaultState() {
    return {
      title: "NEON COAST",
      subtitle: "Leonida · A Sunset Heist",
      layout: "hero",
      grade: "sunset",
      size: "wide",
      grain: true,
      vignette: true,
      scanlines: true,
      chroma: true,
      scene: defaultScene(),
      panels: [
        { photo: "pier", zoom: 1, ox: 0, oy: 0 },
        { photo: "boulevard", zoom: 1, ox: 0, oy: 0 },
        { photo: "pier", zoom: 1.1, ox: 0, oy: 0.06 },
        { photo: "boulevard", zoom: 1, ox: 0, oy: 0 },
      ],
    };
  }

  window.NeonCoast = {
    LAYOUTS,
    GRADES,
    SIZES,
    drawCover,
    drawSynthwaveScene,
    defaultState,
    defaultScene,
  };
})();
