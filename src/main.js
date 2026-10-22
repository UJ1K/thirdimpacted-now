import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import maplibregl from 'maplibre-gl';
import createGlobe from 'cobe';
import style from '../toner(1).json';

const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY;

const events = [
  { name: 'Tokyo-3', region: 'JAPAN · 3RD NEW TOKYO CITY', coordinates: [138.7274, 35.3606], magnitude: '7.4', note: 'A city built to rise, and built to shelter.' },
  { name: 'Hakone', region: 'JAPAN · KANTŌ REGION', coordinates: [139.023, 35.232], magnitude: '6.8', note: 'The quiet edge of the old world.' },
  { name: 'Tokyo', region: 'JAPAN · TOKYO BAY', coordinates: [139.6917, 35.6895], magnitude: '5.9', note: 'Life carrying on, one ordinary morning at a time.' },
  { name: 'Nerv HQ', region: 'JAPAN · GEOFRONT', coordinates: [139.025, 35.238], magnitude: '—', note: 'Beneath the surface, the last line of defense.' },
];

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="experience">
    <div class="map-panel"><div id="map" role="application" aria-label="Interactive full screen map centered on Japan"></div><div class="map-credit">TONER MAP · © OPENSTREETMAP CONTRIBUTORS</div></div>
    <div class="globe-layer" aria-hidden="true"><canvas class="globe"></canvas></div>
    <header class="topbar">
      <a class="wordmark" href="#" aria-label="Third Impact home"><span class="wordmark-mark">III</span><span>THIRD<br>IMPACT</span></a>
      <div class="topbar-center"><span class="live-dot"></span> AN AMBIENT ATLAS <span class="topbar-divider">/</span> 01:10:00</div>
      <button class="sound-toggle" type="button" aria-pressed="false"><span class="sound-icon">◖</span> SOUND OFF</button>
    </header>

    <section class="intro" aria-label="About this experience">
      <p class="eyebrow">IN THE TIME BEFORE</p>
      <h1>Ten seconds<br>of <em>stillness.</em></h1>
      <p class="intro-copy">A small pause in a world on the edge.<br>Take a breath. Let the map unfold.</p>
      <button class="begin-button" type="button"><span class="begin-icon">↗</span> BEGIN THE PAUSE <span class="button-time">00:10</span></button>
      <p class="intro-foot">NO DESTINATION. NO RUSH.<br>JUST HERE, FOR A MOMENT.</p>
    </section>

    <aside class="event-card" aria-live="polite">
      <div class="card-top"><span class="card-index">FIELD NOTE &nbsp; / &nbsp; <b>01</b></span><span class="card-status"><i></i> OBSERVED</span></div>
      <div class="card-image"><span class="image-coordinate">35° 21′ 38″ N<br>138° 43′ 50″ E</span><span class="image-stamp">FIELD<br>RECORD</span><div class="image-crosshair">＋</div></div>
      <p class="card-region">JAPAN &nbsp; / &nbsp; KANTŌ</p>
      <h2 class="event-name">Tokyo-3</h2>
      <p class="event-note">A city built to rise, and built to shelter.</p>
      <div class="card-bottom"><span>SEISMIC INDEX</span><span class="magnitude">7.4 <small>ML</small></span></div>
    </aside>

    <footer class="footer"><span>THE WORLD DOESN'T END ALL AT ONCE.</span><span class="footer-center">BREATHE IN &nbsp; · &nbsp; BREATHE OUT</span><span>AN UNOFFICIAL FAN EXPERIENCE</span></footer>
    <div class="pause-overlay" aria-hidden="true"><div class="pause-mark">III</div><p class="pause-label">STAY HERE</p><div class="timer">00:10</div><div class="timer-track"><span></span></div><p class="pause-message">Nothing to solve. Nowhere to be.</p><button class="end-pause" type="button">RETURN TO THE ATLAS &nbsp; ↗</button></div>
    <audio class="ambience" loop preload="none" src="https://cdn.pixabay.com/audio/2022/10/25/audio_946b8c6a4d.mp3"></audio>
  </main>`;

const tonerV2StyleUrl = `https://api.maptiler.com/maps/toner-v2/style.json?key=${encodeURIComponent(mapTilerKey ?? '')}`;

async function createTonerStyle() {
  let tonerV2;
  try {
    const response = await fetch(tonerV2StyleUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    tonerV2 = await response.json();
  } catch (error) {
    console.warn('Could not fetch Toner v2 metadata; using the edited style endpoints directly.', error);
    const fallback = structuredClone(style);
    fallback.sources.openmaptiles = {
      type: 'vector',
      url: `https://api.maptiler.com/tiles/v3-openmaptiles/tiles.json?key=${encodeURIComponent(mapTilerKey ?? '')}`,
    };
    delete fallback.sources.dihmr5h;
    fallback.glyphs = `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${encodeURIComponent(mapTilerKey ?? '')}`;
    fallback.center = events[0].coordinates;
    fallback.zoom = 10.5;
    return fallback;
  }
  const vectorSource = Object.entries(tonerV2.sources).find(([, source]) => source.type === 'vector');
  if (!vectorSource) throw new Error('Toner v2 does not provide a vector tile source');

  const [sourceId, source] = vectorSource;
  const sources = { ...tonerV2.sources, openmaptiles: source };
  // Keep Toner v2's working data, sprite, glyphs and metadata, while using
  // the edited JSON as the complete source of layer styling.
  const layers = structuredClone(style.layers).map((layer) =>
    layer.source === 'openmaptiles' ? { ...layer, source: 'openmaptiles' } : layer,
  );
  if (sourceId === 'openmaptiles') sources.openmaptiles = source;

  return {
    ...tonerV2,
    ...style,
    sources,
    // The edited style references pattern sprites (dash-t, dots-t, cross-t)
    // from its original sprite sheet, so keep that sheet rather than Toner v2's.
    sprite: style.sprite,
    glyphs: tonerV2.glyphs,
    layers,
    center: events[0].coordinates,
    zoom: 10.5,
  };
}

createTonerStyle().then((mapStyle) => {

const map = new maplibregl.Map({
  container: 'map',
  style: mapStyle,
  center: events[0].coordinates,
  zoom: 10.5,
  attributionControl: false,
});
map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
map.on('error', ({ error }) => {
  if (!error) return;
  const credit = document.querySelector('.map-credit');
  credit.textContent = 'MAP DATA UNAVAILABLE · CHECK MAPTILER KEY / NETWORK';
  credit.classList.add('map-error');
  console.error('MapLibre error:', error);
});

const selectEvent = (event, index) => {
  document.querySelector('.card-index b').textContent = String(index + 1).padStart(2, '0');
  document.querySelector('.card-region').textContent = event.region;
  document.querySelector('.event-name').textContent = event.name;
  document.querySelector('.event-note').textContent = event.note;
  document.querySelector('.magnitude').innerHTML = `${event.magnitude} <small>${event.magnitude === '—' ? '' : 'ML'}</small>`;
  document.querySelector('.image-coordinate').innerHTML = `${Math.abs(event.coordinates[1]).toFixed(2)}° N<br>${event.coordinates[0].toFixed(2)}° E`;
};

events.forEach((event, index) => {
  const marker = document.createElement('button');
  marker.className = `map-marker${index === 0 ? ' is-active' : ''}`;
  marker.type = 'button';
  marker.setAttribute('aria-label', `Show ${event.name}`);
  marker.innerHTML = '<span></span>';
  marker.addEventListener('click', () => {
    document.querySelectorAll('.map-marker').forEach((item) => item.classList.remove('is-active'));
    marker.classList.add('is-active');
    selectEvent(event, index);
    map.flyTo({ center: event.coordinates, zoom: 10, duration: 1400 });
  });
  new maplibregl.Marker({ element: marker, anchor: 'center' }).setLngLat(event.coordinates).addTo(map);
});

const canvas = document.querySelector('.globe');
let phi = 0;
const globeLayer = document.querySelector('.globe-layer');
const globe = createGlobe(canvas, {
  devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  width: 900,
  height: 900,
  phi,
  theta: 0.18,
  dark: 0,
  diffuse: 2.1,
  mapSamples: 18000,
  mapBrightness: 5,
  baseColor: [0.03, 0.03, 0.03],
  markerColor: [0.95, 0.0, 0.0],
  glowColor: [0.05, 0.3, 0.34],
  markers: events.map((event, index) => ({ location: [event.coordinates[1], event.coordinates[0]], size: index === 0 ? 0.09 : 0.055 })),
  onRender: (state) => {
    state.phi = phi;
    phi += 0.0012;
  },
});

// The wide view belongs to COBE; the close view belongs to the Toner map.
// Separate enter/exit thresholds keep the crossfade steady while zooming.
const mapPanel = document.querySelector('.map-panel');
const transitionStartZoom = 2.5;
const transitionEndZoom = 7.5;
const syncView = () => {
  const zoomProgress = Math.max(0, Math.min(1,
    (map.getZoom() - transitionStartZoom) / (transitionEndZoom - transitionStartZoom),
  ));
  // Smoothstep gives the handoff a soft start and finish while staying tied
  // directly to the user's zoom gesture in either direction.
  const progress = zoomProgress * zoomProgress * (3 - 2 * zoomProgress);
  globeLayer.style.setProperty('--globe-opacity', String(1 - progress));
  globeLayer.style.setProperty('--globe-scale', String(1 + progress * 0.24));
  mapPanel.style.setProperty('--map-opacity', String(progress));
  mapPanel.style.setProperty('--map-scale', String(0.96 + progress * 0.04));
  globeLayer.classList.toggle('is-visible', progress < 1);
  mapPanel.classList.toggle('is-visible', progress > 0);
};
map.on('zoom', syncView);
syncView();

const pauseOverlay = document.querySelector('.pause-overlay');
let pauseInterval;
document.querySelector('.begin-button').addEventListener('click', () => {
  pauseOverlay.classList.add('is-visible');
  pauseOverlay.setAttribute('aria-hidden', 'false');
  document.querySelector('.begin-button').disabled = true;
  let remaining = 10;
  const timer = document.querySelector('.timer');
  const update = () => { timer.textContent = `00:${String(remaining).padStart(2, '0')}`; };
  update();
  pauseInterval = window.setInterval(() => {
    remaining -= 1;
    update();
    if (remaining <= 0) endPause();
  }, 1000);
});

function endPause() {
  window.clearInterval(pauseInterval);
  pauseOverlay.classList.remove('is-visible');
  pauseOverlay.setAttribute('aria-hidden', 'true');
  document.querySelector('.begin-button').disabled = false;
}
document.querySelector('.end-pause').addEventListener('click', endPause);

const soundToggle = document.querySelector('.sound-toggle');
const audio = document.querySelector('.ambience');
soundToggle.addEventListener('click', async () => {
  if (audio.paused) {
    try {
      await audio.play();
      soundToggle.setAttribute('aria-pressed', 'true');
      soundToggle.innerHTML = '<span class="sound-icon">◖</span> SOUND ON';
    } catch {
      soundToggle.setAttribute('aria-pressed', 'false');
      soundToggle.innerHTML = '<span class="sound-icon">◖</span> AUDIO UNAVAILABLE';
    }
  } else {
    audio.pause();
    soundToggle.setAttribute('aria-pressed', 'false');
    soundToggle.innerHTML = '<span class="sound-icon">◖</span> SOUND OFF';
  }
});

window.addEventListener('pagehide', () => { globe.destroy(); map.remove(); }, { once: true });
}).catch((error) => {
  console.error('Unable to load the Toner map style:', error);
  const credit = document.querySelector('.map-credit');
  credit.textContent = 'MAP STYLE UNAVAILABLE · CHECK MAPTILER KEY / NETWORK';
  credit.classList.add('map-error');
});
