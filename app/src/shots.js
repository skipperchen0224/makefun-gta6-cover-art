// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo;
// ?shot=cover shows the cover alone, full-screen, at the requested post size.
// `photo` picks the sample (samples/<photo>.jpg), `caption` the words, `layout`
// and `grade` the look, `size` the post size. window.__shotReady is set once painted.
export async function runShot(shot, query, api) {
  const photo = query.get('photo') ?? 'pier';
  const text = query.get('caption') ?? 'VICE CITY';
  const sub = query.get('subtitle') ?? 'LEONIDA · SUNSET HEIST';
  const layout = query.get('layout') ?? (shot === 'cover' ? 'hero' : 'hero');
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1080x1080';
  if (shot === 'cover') document.body.classList.add('shot-cover');
  api.state.layout = layout;
  api.state.grade = grade;
  api.state.size = size;
  api.state.photos[0] = await api.loadImage(`samples/${photo}.jpg`);
  if (query.get('photo2')) api.state.photos[1] = await api.loadImage(`samples/${query.get('photo2')}.jpg`);
  if (query.get('photo3')) api.state.photos[2] = await api.loadImage(`samples/${query.get('photo3')}.jpg`);
  api.setCaption(text, sub);
  // Frame the hero photo slightly tighter for the cover shot; `pany` shifts it
  // down (positive) to keep a face in a wide panel, or up (negative) for feet.
  api.state.zooms[0] = Number(query.get('zoom') ?? 1.15);
  api.state.pans[0].y = Number(query.get('pany') ?? 0);
  api.applySize();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
