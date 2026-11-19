// Wires the page: pick photos, frame each panel, type a caption, pick a grade
// and a post size, export the cover as a PNG. A `?shot=` query sets up a fixed
// scene for a screenshot instead (./shots.js).
import { drawCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const statusLine = document.getElementById('status');
const zoomSlider = document.getElementById('zoom');
const panXSlider = document.getElementById('panx');
const panYSlider = document.getElementById('pany');
const panelName = document.getElementById('panelName');
const halftoneToggle = document.getElementById('halftone');
const vignetteToggle = document.getElementById('vignette');

/** Builds the cover state: everything drawCover needs, kept in one place. */
export function createCoverState() {
  return {
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
}

/** The cover state: everything drawCover needs, kept in one place. */
export const state = createCoverState();
let selectedPanel = 0;

function redraw() {
  state.caption = captionInput.value;
  state.subtitle = subtitleInput.value;
  state.halftone = halftoneToggle.checked;
  state.vignette = vignetteToggle.checked;
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

function syncFrameControls() {
  panelName.textContent = String(selectedPanel + 1);
  zoomSlider.value = String(state.zooms[selectedPanel]);
  panXSlider.value = String(state.pans[selectedPanel].x);
  panYSlider.value = String(state.pans[selectedPanel].y);
  document.querySelectorAll('#panels button').forEach((b) => {
    b.classList.toggle('on', Number(b.dataset.panel) === selectedPanel);
  });
}

/**
 * Binds a button group (layouts, grades, sizes): one button stays highlighted,
 * and picking it calls `onPick` with the button's data value.
 */
function bindChoiceGroup(groupId, dataAttr, onPick) {
  document.getElementById(groupId).addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    document.querySelectorAll(`#${groupId} button`).forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    onPick(btn.dataset[dataAttr]);
  });
}

/** Binds one photo file input: loading the file fills its panel. */
function bindPhotoSlot(index) {
  document.getElementById(`photo${index}`).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.photos[index] = await loadImage(URL.createObjectURL(file));
    statusLine.textContent = `Photo ${index + 1} loaded.`;
    redraw();
  });
}

/** Binds one framing slider (zoom / pan) to the selected panel's value. */
function bindFrameSlider(slider, apply) {
  slider.addEventListener('input', () => { apply(Number(slider.value)); redraw(); });
}

/** Exports the preview canvas as a PNG download, reporting the result. */
function exportPng() {
  canvas.toBlob((blob) => {
    if (!blob) {
      statusLine.textContent = 'Export failed in this browser — try a smaller size.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-city-cover-${canvas.width}x${canvas.height}.png`;
    a.click();
    statusLine.textContent = `Saved vice-city-cover-${canvas.width}x${canvas.height}.png`;
  }, 'image/png');
}

bindChoiceGroup('layouts', 'layout', (v) => { state.layout = v; redraw(); });
bindChoiceGroup('grades', 'grade', (v) => { state.grade = v; redraw(); });
bindChoiceGroup('sizes', 'size', (v) => { state.size = v; applySize(); });
document.getElementById('panels').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  selectedPanel = Number(btn.dataset.panel);
  syncFrameControls();
});

[0, 1, 2].forEach(bindPhotoSlot);

document.getElementById('samples').addEventListener('click', async () => {
  state.photos[0] = await loadImage('samples/pier.jpg');
  state.photos[1] = await loadImage('samples/boulevard.jpg');
  statusLine.textContent = 'Sample photos loaded.';
  redraw();
});

bindFrameSlider(zoomSlider, (v) => { state.zooms[selectedPanel] = v; });
bindFrameSlider(panXSlider, (v) => { state.pans[selectedPanel].x = v; });
bindFrameSlider(panYSlider, (v) => { state.pans[selectedPanel].y = v; });
captionInput.addEventListener('input', redraw);
subtitleInput.addEventListener('input', redraw);
halftoneToggle.addEventListener('change', redraw);
vignetteToggle.addEventListener('change', redraw);

document.getElementById('export').addEventListener('click', exportPng);

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state,
    loadImage,
    applySize,
    redraw,
    setCaption(text, sub) {
      captionInput.value = text;
      if (sub !== undefined) subtitleInput.value = sub;
    },
  });
} else {
  syncFrameControls();
  applySize();
}
