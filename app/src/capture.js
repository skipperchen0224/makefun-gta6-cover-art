// Neon Coast screenshot mode — ?shot=cover draws one exported cover full
// frame; ?shot=editor shows the editor with the sample photos loaded.
// Query keys are this app's own: p0/p1/p2 photo (or "none" for a synthwave
// scene panel), t title, s subtitle, l layout, g grade, sz size, z zoom,
// oy vertical pan, sw synthwave backdrop (0/1), sy sun Y, gd grid density,
// dp depth, hue hue shift, car/palm/heli/yacht foreground toggles (0/1),
// sc scanlines (0/1), ch chroma (0/1).
(function () {
  "use strict";

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function applySceneParams(q, state) {
    const sc = state.scene;
    const num = (key, fallback) => {
      const v = Number(q.get(key));
      return Number.isFinite(v) ? v : fallback;
    };
    const flag = (key, fallback) => {
      const v = q.get(key);
      return v == null ? fallback : v !== "0";
    };
    sc.synthwave = flag("sw", sc.synthwave);
    sc.sunY = num("sy", sc.sunY);
    sc.gridDensity = num("gd", sc.gridDensity);
    sc.depth = num("dp", sc.depth);
    sc.hue = num("hue", sc.hue);
    sc.showCar = flag("car", sc.showCar);
    sc.showPalm = flag("palm", sc.showPalm);
    sc.showHeli = flag("heli", sc.showHeli);
    sc.showYacht = flag("yacht", sc.showYacht);
    state.scanlines = flag("sc", state.scanlines);
    state.chroma = flag("ch", state.chroma);
  }

  function applyPanelPhotos(q, state) {
    state.panels.forEach((p, i) => {
      const pick = q.get("p" + i);
      if (pick === "boulevard" || pick === "pier") {
        p.photo = pick;
        delete p.dataUrl;
      } else if (pick === "none") {
        p.photo = null;
        delete p.dataUrl;
      }
    });
  }

  async function shotCover(q) {
    document.body.classList.add("shot-cover");
    const editor = document.querySelector(".shell");
    if (editor) editor.style.display = "none";
    const stage = document.getElementById("shotStage");
    if (!stage) return;
    stage.style.display = "block";
    const canvas = document.getElementById("shotCanvas");
    // Use the exact shot pixels from the query when present: headless
    // Chrome's innerHeight can be smaller than the window size, which
    // would leave a black strip at the bottom of the screenshot.
    const vw = Number(q.get("vw") || window.innerWidth);
    const vh = Number(q.get("vh") || window.innerHeight);
    canvas.width = vw;
    canvas.height = vh;
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    const state = window.NeonCoast.defaultState();
    state.title = q.get("t") || "NEON COAST";
    state.subtitle = q.get("s") || "Leonida · A Sunset Heist";
    state.layout = q.get("l") || "hero";
    state.grade = q.get("g") || "sunset";
    const zoom = Number(q.get("z") || "1");
    const oy = Number(q.get("oy") || "0");
    state.panels.forEach((p) => {
      p.zoom = zoom;
      p.oy = oy;
    });
    applySceneParams(q, state);
    applyPanelPhotos(q, state);
    const images = [];
    for (let i = 0; i < state.panels.length; i++) {
      const name = state.panels[i].photo;
      images.push(name ? await loadImage(`samples/${name}.jpg`) : null);
    }
    window.NeonCoast.drawCover(canvas, state, images);
    window.__shotReady = true;
    document.title = "Neon Coast — cover";
  }

  async function shotEditor(q) {
    const ed = window.NeonCoastEditor;
    if (!ed) return;
    const state = ed.state;
    if (q.get("t")) state.title = q.get("t");
    if (q.get("s")) state.subtitle = q.get("s");
    if (q.get("l")) state.layout = q.get("l");
    if (q.get("g")) state.grade = q.get("g");
    if (q.get("sz")) state.size = q.get("sz");
    applySceneParams(q, state);
    applyPanelPhotos(q, state);
    const title = document.getElementById("titleInput");
    if (title) title.value = state.title;
    const sub = document.getElementById("subtitleInput");
    if (sub) sub.value = state.subtitle;
    ed.syncSceneUI();
    await ed.refresh();
    window.__shotReady = true;
    document.title = "Neon Coast — editor";
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const q = params();
    const shot = q.get("shot");
    if (shot === "cover") {
      await shotCover(q);
    } else if (shot === "editor") {
      // Let the editor boot first, then apply the shot state.
      setTimeout(() => shotEditor(q), 60);
    }
  });
})();
