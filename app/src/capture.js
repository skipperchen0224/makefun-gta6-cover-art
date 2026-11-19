// Neon Coast screenshot mode — ?shot=cover draws one exported cover full
// frame; ?shot=editor shows the editor with the sample photos loaded.
// Query keys are this app's own: p0/p1/p2 photo, t title, s subtitle,
// l layout, g grade, sz size, z zoom, oy vertical pan.
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
    state.panels.forEach((p, i) => {
      const pick = q.get("p" + i);
      if (pick === "boulevard" || pick === "pier") p.photo = pick;
      p.zoom = zoom;
      p.oy = oy;
    });
    const images = [];
    for (let i = 0; i < state.panels.length; i++) {
      const name = state.panels[i].photo;
      images.push(await loadImage(`samples/${name}.jpg`));
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
    state.panels.forEach((p, i) => {
      const pick = q.get("p" + i);
      if (pick === "boulevard" || pick === "pier") p.photo = pick;
    });
    const title = document.getElementById("titleInput");
    if (title) title.value = state.title;
    const sub = document.getElementById("subtitleInput");
    if (sub) sub.value = state.subtitle;
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
