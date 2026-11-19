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
    if (panel.dataUrl) {
      loaded[i] = await loadImage(panel.dataUrl);
    } else if (panel.photo && SAMPLES[panel.photo]) {
      loaded[i] = await loadImage(SAMPLES[panel.photo]);
    } else {
      loaded[i] = null;
    }
  }

  async function loadAllPanels() {
    for (let i = 0; i < state.panels.length; i++) await loadPanel(i);
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
    await loadAllPanels();
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

  function exportPng() {
    const size = sizeOf();
    const canvas = document.createElement("canvas");
    canvas.width = size.w;
    canvas.height = size.h;
    window.NeonCoast.drawCover(canvas, state, loaded);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-${state.size}-${state.layout}.png`;
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
    const shuffle = $("shuffleBtn");
    if (shuffle) shuffle.addEventListener("click", () => {
      const layouts = Object.keys(window.NeonCoast.LAYOUTS);
      const grades = Object.keys(window.NeonCoast.GRADES);
      state.layout = layouts[Math.floor(Math.random() * layouts.length)];
      state.grade = grades[Math.floor(Math.random() * grades.length)];
      document.querySelectorAll("#layoutRow button").forEach((b) => {
        b.classList.toggle("on", b.dataset.layout === state.layout);
      });
      document.querySelectorAll("#gradeRow button").forEach((b) => {
        b.classList.toggle("on", b.dataset.grade === state.grade);
      });
      renderPreview();
    });
    const exportBtn = $("exportBtn");
    if (exportBtn) exportBtn.addEventListener("click", exportPng);
  }

  window.NeonCoastEditor = {
    state,
    loaded,
    refresh,
    renderPreview,
    setActivePanel,
    bindEditor,
    exportPng,
    SAMPLES,
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindEditor();
    setActivePanel(0);
    refresh();
  });
})();
