// Wires the page: pick photos, frame each panel, type a caption, pick a grade
// and a post size, export the cover as a PNG. A `?shot=` query sets up a fixed
// scene for a screenshot instead (./shots.js).
import { drawCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const caption = document.getElementById('caption');
const subtitle = document.getElementById('subtitle');
const status = document.getElementById('status');
const zoom = document.getElementById('zoom');
const panx = document.getElementById('panx');
const pany = document.getElementById('pany');
const panelName = document.getElementById('panelName');
const halftone = document.getElementById('halftone');
const vignette = document.getElementById('vignette');

/** The cover state: everything drawCover needs, kept in one place. */
export const state = {
  photos: [null, null, null],
  layout: 'hero',
  grade: 'sunset',
  caption: 'VICE CITY',
  subtitle: 'LEONIDA · SUNSET HEIST',
  zooms: [1, 1, 1],
  pans: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
  halftone: true,
  vignette: true,
  size: '1080x1080',
};
let activePanel = 0;

function redraw() {
  state.caption = caption.value;
  state.subtitle = subtitle.value;
  state.halftone = halftone.checked;
  state.vignette = vignette.checked;
  drawCover(canvas, state);
}

function applySize() {
  const [w, h] = state.size.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
  redraw();
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function syncPanelControls() {
  panelName.textContent = String(activePanel + 1);
  zoom.value = String(state.zooms[activePanel]);
  panx.value = String(state.pans[activePanel].x);
  pany.value = String(state.pans[activePanel].y);
  document.querySelectorAll('#panels button').forEach((b) => {
    b.classList.toggle('on', Number(b.dataset.panel) === activePanel);
  });
}

function wireChoice(id, attr, fn) {
  document.getElementById(id).addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    document.querySelectorAll(`#${id} button`).forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    fn(btn.dataset[attr]);
  });
}

wireChoice('layouts', 'layout', (v) => { state.layout = v; redraw(); });
wireChoice('grades', 'grade', (v) => { state.grade = v; redraw(); });
wireChoice('sizes', 'size', (v) => { state.size = v; applySize(); });
document.getElementById('panels').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  activePanel = Number(btn.dataset.panel);
  syncPanelControls();
});

[0, 1, 2].forEach((i) => {
  document.getElementById(`photo${i}`).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.photos[i] = await loadImage(URL.createObjectURL(file));
    status.textContent = `Photo ${i + 1} loaded.`;
    redraw();
  });
});

document.getElementById('samples').addEventListener('click', async () => {
  state.photos[0] = await loadImage('samples/pier.jpg');
  state.photos[1] = await loadImage('samples/boulevard.jpg');
  status.textContent = 'Sample photos loaded.';
  redraw();
});

zoom.addEventListener('input', () => { state.zooms[activePanel] = Number(zoom.value); redraw(); });
panx.addEventListener('input', () => { state.pans[activePanel].x = Number(panx.value); redraw(); });
pany.addEventListener('input', () => { state.pans[activePanel].y = Number(pany.value); redraw(); });
caption.addEventListener('input', redraw);
subtitle.addEventListener('input', redraw);
halftone.addEventListener('change', redraw);
vignette.addEventListener('change', redraw);

document.getElementById('export').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed in this browser — try a smaller size.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-city-cover-${canvas.width}x${canvas.height}.png`;
    a.click();
    status.textContent = `Saved vice-city-cover-${canvas.width}x${canvas.height}.png`;
  }, 'image/png');
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state,
    loadImage,
    applySize,
    redraw,
    setCaption(text, sub) {
      caption.value = text;
      if (sub !== undefined) subtitle.value = sub;
    },
  });
} else {
  syncPanelControls();
  applySize();
}
