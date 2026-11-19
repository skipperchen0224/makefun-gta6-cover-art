// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo;
// ?shot=cover shows the cover alone, full-screen, at the requested post size.
// `photo` picks the sample (samples/<photo>.jpg), `caption` the words, `layout`
// and `grade` the look, `size` the post size. window.__shotReady is set once painted.

/** Loads the shot's photos into the state: photo 1 always, 2 and 3 if asked for. */
async function loadShotPhotos(controls, query) {
  controls.state.photos[0] = await controls.loadImage(`samples/${query.get('photo') ?? 'pier'}.jpg`);
  if (query.get('photo2')) controls.state.photos[1] = await controls.loadImage(`samples/${query.get('photo2')}.jpg`);
  if (query.get('photo3')) controls.state.photos[2] = await controls.loadImage(`samples/${query.get('photo3')}.jpg`);
}

/** Applies the shot's layout, grade, size, caption and hero framing to the state. */
function applyShotSettings(controls, query, shot) {
  controls.state.layout = query.get('layout') ?? (shot === 'cover' ? 'hero' : 'hero');
  controls.state.grade = query.get('grade') ?? 'sunset';
  controls.state.size = query.get('size') ?? '1080x1080';
  controls.setCaption(
    query.get('caption') ?? 'VICE CITY',
    query.get('subtitle') ?? 'LEONIDA · SUNSET HEIST',
  );
  // Frame the hero photo slightly tighter for the cover shot; `pany` shifts it
  // down (positive) to keep a face in a wide panel, or up (negative) for feet.
  controls.state.zooms[0] = Number(query.get('zoom') ?? 1.15);
  controls.state.pans[0].y = Number(query.get('pany') ?? 0);
}

export async function runShot(shot, query, controls) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  applyShotSettings(controls, query, shot);
  await loadShotPhotos(controls, query);
  controls.applySize();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
