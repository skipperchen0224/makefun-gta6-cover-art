// Neon Coast editor — wires the controls to the cover engine, loads photos
// from the machine (never uploaded), and exports the cover as a PNG.
(function () {
  "use strict";

  const SAMPLES = {
    pier: "samples/pier.jpg",
    boulevard: "samples/boulevard.jpg",
  };

  const state = window.NeonCoast.defaultState();
  const loaded = [null, null, null, null];
  let activePanel = 0;
  let previewScale = 1;
  let refreshToken = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function loadPanel(i) {
    const panel = state.panels[i];
    if (!panel) return;
    // Guard against stale loads: a panel whose photo changed while its
    // image was still loading must not be overwritten by the old image.
    // (The boot refresh and a screenshot preset load concurrently.)
    if (panel.dataUrl) {
      const want = panel.dataUrl;
      const img = await loadImage(want);
      if (state.panels[i] && state.panels[i].dataUrl === want) loaded[i] = img;
    } else if (panel.photo && SAMPLES[panel.photo]) {
      const want = panel.photo;
      const img = await loadImage(SAMPLES[panel.photo]);
      if (state.panels[i] && state.panels[i].photo === want) loaded[i] = img;
    } else {
      loaded[i] = null;
    }
  }

  async function loadAllPanels() {
    for (let i = 0; i < state.panels.length; i++) await loadPanel(i);
    if (state.foreground) {
      const want = state.foreground;
      const img = await loadImage(want);
      if (state.foreground === want) loaded.foreground = img;
    } else {
      loaded.foreground = null;
    }
  }

  function sizeOf() {
    return window.NeonCoast.SIZES[state.size] || window.NeonCoast.SIZES.wide;
  }

  function renderPreview() {
    const canvas = $("preview");
    if (!canvas) return;
    const size = sizeOf();
    const maxW = 660;
    const scale = Math.min(1, maxW / size.w);
    previewScale = scale;
    canvas.width = Math.round(size.w * scale);
    canvas.height = Math.round(size.h * scale);
    window.NeonCoast.drawCover(canvas, state, loaded);
    const info = $("sizeInfo");
    if (info) info.textContent = `${size.label} · ${state.layout} · ${state.grade}`;
  }

  async function refresh() {
    // Serialize: only the latest refresh may paint. The editor boots one
    // refresh on load and a screenshot preset starts another 60ms later;
    // without this the boot refresh (still loading its images) would paint
    // over the preset's state.
    const token = ++refreshToken;
    await loadAllPanels();
    if (token !== refreshToken) return;
    renderPreview();
  }

  function setActivePanel(i) {
    activePanel = i;
    document.querySelectorAll("[data-panel]").forEach((btn) => {
      btn.classList.toggle("on", Number(btn.dataset.panel) === i);
    });
    const zoom = $("zoom");
    const panX = $("panX");
    const panY = $("panY");
    const panel = state.panels[i];
    if (zoom) zoom.value = panel.zoom;
    if (panX) panX.value = panel.ox * 100;
    if (panY) panY.value = panel.oy * 100;
    const zoomVal = $("zoomVal");
    if (zoomVal) zoomVal.textContent = `${Math.round(panel.zoom * 100)}%`;
  }

  // Reflect state.scene back into the scene controls (after Randomize or a
  // screenshot preset), so the panel never disagrees with the canvas.
  function syncSceneUI() {
    const sc = state.scene;
    const set = (id, v) => { const el = $(id); if (el) el.value = v; };
    const setCheck = (id, v) => { const el = $(id); if (el) el.checked = !!v; };
    set("sunY", sc.sunY);
    set("gridDensity", sc.gridDensity);
    set("depth", sc.depth);
    set("hue", sc.hue);
    setCheck("synthwaveToggle", sc.synthwave);
    setCheck("showCar", sc.showCar);
    setCheck("showPalm", sc.showPalm);
    setCheck("showHeli", sc.showHeli);
    setCheck("showYacht", sc.showYacht);
    setCheck("scanlinesToggle", state.scanlines);
    setCheck("chromaToggle", state.chroma);
    const sunYVal = $("sunYVal");
    if (sunYVal) sunYVal.textContent = `${Math.round(sc.sunY * 100)}%`;
    const gridVal = $("gridVal");
    if (gridVal) gridVal.textContent = String(sc.gridDensity);
    const depthVal = $("depthVal");
    if (depthVal) depthVal.textContent = `${Number(sc.depth).toFixed(1)}×`;
    const hueVal = $("hueVal");
    if (hueVal) hueVal.textContent = `${sc.hue}°`;
  }

  function randomize() {
    const layouts = Object.keys(window.NeonCoast.LAYOUTS);
    const grades = Object.keys(window.NeonCoast.GRADES);
    state.layout = layouts[Math.floor(Math.random() * layouts.length)];
    state.grade = grades[Math.floor(Math.random() * grades.length)];
    const sc = state.scene;
    sc.sunY = 0.3 + Math.random() * 0.25;
    sc.gridDensity = 8 + Math.floor(Math.random() * 13);
    sc.depth = 0.7 + Math.random() * 0.9;
    sc.hue = Math.floor((Math.random() * 120 - 60) / 5) * 5;
    sc.showCar = Math.random() > 0.25;
    sc.showPalm = Math.random() > 0.2;
    sc.showHeli = Math.random() > 0.6;
    sc.showYacht = Math.random() > 0.6;
    document.querySelectorAll("#layoutRow button").forEach((b) => {
      b.classList.toggle("on", b.dataset.layout === state.layout);
    });
    document.querySelectorAll("#gradeRow button").forEach((b) => {
      b.classList.toggle("on", b.dataset.grade === state.grade);
    });
    syncSceneUI();
    renderPreview();
  }

  function bindChoice(containerId, attr, onPick) {
    const box = $(containerId);
    if (!box) return;
    box.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-" + attr + "]");
      if (!btn) return;
      box.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      onPick(btn.dataset[attr]);
    });
  }

  function exportPng(sizeOverride) {
    const size = sizeOverride || sizeOf();
    const canvas = document.createElement("canvas");
    canvas.width = size.w;
    canvas.height = size.h;
    window.NeonCoast.drawCover(canvas, state, loaded);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-${size.w}x${size.h}-${state.layout}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      const note = $("exportNote");
      if (note) note.textContent = `Exported ${size.label} PNG — check your downloads.`;
    }, "image/png");
  }

  function fillOnePhoto(photo) {
    state.panels.forEach((p) => {
      p.photo = photo;
      delete p.dataUrl;
    });
    refresh();
  }

  function bindEditor() {
    const title = $("titleInput");
    if (title) {
      title.value = state.title;
      title.addEventListener("input", () => {
        state.title = title.value;
        renderPreview();
      });
    }
    const sub = $("subtitleInput");
    if (sub) {
      sub.value = state.subtitle;
      sub.addEventListener("input", () => {
        state.subtitle = sub.value;
        renderPreview();
      });
    }
    bindChoice("layoutRow", "layout", (v) => {
      state.layout = v;
      renderPreview();
    });
    bindChoice("gradeRow", "grade", (v) => {
      state.grade = v;
      renderPreview();
    });
    bindChoice("sizeRow", "size", (v) => {
      state.size = v;
      renderPreview();
    });
    bindChoice("panelRow", "panel", (v) => setActivePanel(Number(v)));
    const grain = $("grainToggle");
    if (grain) {
      grain.checked = state.grain;
      grain.addEventListener("change", () => {
        state.grain = grain.checked;
        renderPreview();
      });
    }
    const vig = $("vignetteToggle");
    if (vig) {
      vig.checked = state.vignette;
      vig.addEventListener("change", () => {
        state.vignette = vig.checked;
        renderPreview();
      });
    }
    const scan = $("scanlinesToggle");
    if (scan) {
      scan.checked = state.scanlines;
      scan.addEventListener("change", () => {
        state.scanlines = scan.checked;
        renderPreview();
      });
    }
    const chroma = $("chromaToggle");
    if (chroma) {
      chroma.checked = state.chroma;
      chroma.addEventListener("change", () => {
        state.chroma = chroma.checked;
        renderPreview();
      });
    }
    const zoom = $("zoom");
    if (zoom) {
      zoom.addEventListener("input", () => {
        state.panels[activePanel].zoom = Number(zoom.value);
        const zv = $("zoomVal");
        if (zv) zv.textContent = `${Math.round(Number(zoom.value) * 100)}%`;
        renderPreview();
      });
    }
    const panX = $("panX");
    if (panX) {
      panX.addEventListener("input", () => {
        state.panels[activePanel].ox = Number(panX.value) / 100;
        renderPreview();
      });
    }
    const panY = $("panY");
    if (panY) {
      panY.addEventListener("input", () => {
        state.panels[activePanel].oy = Number(panY.value) / 100;
        renderPreview();
      });
    }
    const file = $("photoFile");
    if (file) {
      file.addEventListener("change", () => {
        const f = file.files && file.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          state.panels[activePanel].dataUrl = String(reader.result);
          state.panels[activePanel].photo = null;
          refresh();
        };
        reader.readAsDataURL(f);
      });
    }
    const sampleA = $("sampleA");
    if (sampleA) sampleA.addEventListener("click", () => {
      state.panels[activePanel].photo = "pier";
      delete state.panels[activePanel].dataUrl;
      refresh();
    });
    const sampleB = $("sampleB");
    if (sampleB) sampleB.addEventListener("click", () => {
      state.panels[activePanel].photo = "boulevard";
      delete state.panels[activePanel].dataUrl;
      refresh();
    });
    const fillA = $("fillA");
    if (fillA) fillA.addEventListener("click", () => fillOnePhoto("pier"));
    const fillB = $("fillB");
    if (fillB) fillB.addEventListener("click", () => fillOnePhoto("boulevard"));
    // Synthwave scene controls.
    const sc = state.scene;
    const bindSceneRange = (id, valId, fmt, apply) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => {
        apply(Number(el.value));
        const label = $(valId);
        if (label) label.textContent = fmt(Number(el.value));
        renderPreview();
      });
    };
    bindSceneRange("sunY", "sunYVal", (v) => `${Math.round(v * 100)}%`, (v) => { sc.sunY = v; });
    bindSceneRange("gridDensity", "gridVal", (v) => String(v), (v) => { sc.gridDensity = v; });
    bindSceneRange("depth", "depthVal", (v) => `${v.toFixed(1)}×`, (v) => { sc.depth = v; });
    bindSceneRange("hue", "hueVal", (v) => `${v}°`, (v) => { sc.hue = v; });
    const bindSceneCheck = (id, key) => {
      const el = $(id);
      if (!el) return;
      el.checked = sc[key];
      el.addEventListener("change", () => {
        sc[key] = el.checked;
        renderPreview();
      });
    };
    bindSceneCheck("synthwaveToggle", "synthwave");
    bindSceneCheck("showCar", "showCar");
    bindSceneCheck("showPalm", "showPalm");
    bindSceneCheck("showHeli", "showHeli");
    bindSceneCheck("showYacht", "showYacht");
    const fgFile = $("foregroundFile");
    if (fgFile) {
      fgFile.addEventListener("change", () => {
        const f = fgFile.files && fgFile.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          state.foreground = String(reader.result);
          refresh();
        };
        reader.readAsDataURL(f);
      });
    }
    const clearFg = $("clearForeground");
    if (clearFg) clearFg.addEventListener("click", () => {
      delete state.foreground;
      if (fgFile) fgFile.value = "";
      refresh();
    });
    const shuffle = $("shuffleBtn");
    if (shuffle) shuffle.addEventListener("click", randomize);
    const exportBtn = $("exportBtn");
    if (exportBtn) exportBtn.addEventListener("click", () => exportPng());
    const export4kBtn = $("export4kBtn");
    if (export4kBtn) export4kBtn.addEventListener("click", () => {
      exportPng(window.NeonCoast.SIZES["4k"]);
    });
  }

  window.NeonCoastEditor = {
    state,
    loaded,
    refresh,
    renderPreview,
    setActivePanel,
    bindEditor,
    exportPng,
    randomize,
    syncSceneUI,
    SAMPLES,
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindEditor();
    setActivePanel(0);
    syncSceneUI();
    refresh();
  });
})();
