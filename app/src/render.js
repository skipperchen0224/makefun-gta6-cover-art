// Neon Coast cover engine — draws a multi-panel Vice City style cover
// onto a 2D canvas. Pure canvas, no network, no external assets.
// Every number here is my own layout math for this entry.
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

  function drawPhoto(ctx, image, rect, panel) {
    const [fx, fy, fw, fh] = rect;
    const x = fx;
    const y = fy;
    const w = fw;
    const h = fh;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (!image || !image.naturalWidth) {
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, "#3a2b52");
      grad.addColorStop(1, "#12081f");
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = `700 ${Math.max(14, w * 0.045)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("ADD A PHOTO", x + w / 2, y + h / 2);
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
    const titleFont = (s) => `900 ${s}px "Arial Black", Impact, "Helvetica Neue", sans-serif`;
    ctx.font = titleFont(titleSize);
    while (titleSize > 12 && ctx.measureText(title).width > W - pad * 2) {
      titleSize *= 0.92;
      ctx.font = titleFont(titleSize);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    try {
      ctx.letterSpacing = `${Math.max(1, W * 0.002)}px`;
    } catch (e) {
      /* letterSpacing unsupported: ignore */
    }
    ctx.font = titleFont(titleSize);
    ctx.lineWidth = Math.max(2, titleSize * 0.07);
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(title, pad, bandY + bandH * 0.62);
    ctx.fillStyle = grade.title;
    ctx.fillText(title, pad, bandY + bandH * 0.62);
    try {
      ctx.letterSpacing = `${Math.max(2, W * 0.004)}px`;
    } catch (e) {
      /* ignore */
    }
    const subSize = Math.max(13, W * 0.021);
    ctx.font = `700 ${subSize}px "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = grade.subtitle;
    ctx.fillText(sub, pad, bandY + bandH * 0.88);
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

  function drawGrain(ctx, W, H) {
    const tile = getGrainTile();
    const pattern = ctx.createPattern(tile, "repeat");
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawCover(canvas, state, images) {
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext("2d");
    const grade = GRADES[state.grade] || GRADES.sunset;
    const rects = (LAYOUTS[state.layout] || LAYOUTS.hero).map(([x, y, w, h]) => [
      x * W, y * H, w * W, h * H,
    ]);
    ctx.fillStyle = "#0b0710";
    ctx.fillRect(0, 0, W, H);
    rects.forEach((rect, i) => {
      drawPhoto(ctx, images[i] || null, rect, (state.panels && state.panels[i]) || {});
    });
    drawGradeWash(ctx, W, H, grade);
    drawGutters(ctx, W, H, rects, Math.max(4, W * 0.008));
    drawTitleBlock(ctx, W, H, state, grade);
    if (state.vignette !== false) drawVignette(ctx, W, H);
    if (state.grain !== false) drawGrain(ctx, W, H);
    return { width: W, height: H, layout: state.layout, grade: state.grade };
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
    defaultState,
  };
})();
