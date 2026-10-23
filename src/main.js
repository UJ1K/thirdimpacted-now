import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import maplibregl from 'maplibre-gl';
import nationCenters from './nation-centers.json';
import tonerStyle from './toner-style.json';

const initialCenter = [139.6917, 35.6895]; // Tokyo, Japan
const initialZoom = 2.15;

const map = new maplibregl.Map({
  container: 'map',
  style: tonerStyle,
  center: initialCenter,
  zoom: initialZoom,
  attributionControl: false,
});
const mapPanel = document.querySelector('.map-panel');
const syncGlobeAura = () => {
  const radius = Math.max(16, Math.min(
    140,
    40 * (2 ** ((map.getZoom() - initialZoom) * 0.65)),
  ));
  mapPanel.style.setProperty('--globe-aura-radius', `${radius}vmin`);
  mapPanel.classList.toggle('has-globe-aura', map.getZoom() < 4.5);
};
map.on('zoom', syncGlobeAura);
syncGlobeAura();
// MapLibre does not automatically detect every CSS or viewport size change.
const resizeMap = () => map.resize();
window.addEventListener('resize', resizeMap);
window.visualViewport?.addEventListener('resize', resizeMap);
map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
map.on('style.load', () => {
  map.setProjection({ type: 'globe' });
});
map.on('load', () => {
  map.addSource('nation-centers', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: nationCenters.map(({ code, name, coordinates: [latitude, longitude] }) => ({
        type: 'Feature',
        properties: { code, name },
        geometry: { type: 'Point', coordinates: [longitude, latitude] },
      })),
    },
  });
  map.addLayer({
    id: 'nation-center-glow',
    type: 'circle',
    source: 'nation-centers',
    paint: {
      'circle-radius': 5,
      'circle-color': '#f22',
      'circle-opacity': 0.24,
      'circle-blur': 0.7,
    },
  });
  map.addLayer({
    id: 'nation-centers',
    type: 'circle',
    source: 'nation-centers',
    paint: {
      'circle-radius': 2,
      'circle-color': '#f22',
      'circle-stroke-color': '#ff7777',
      'circle-stroke-width': 0.5,
    },
  });
});
map.on('error', ({ error }) => {
  if (!error) return;
  const credit = document.querySelector('.map-credit');
  const detail = String(error.message ?? 'Unknown MapLibre error');
  credit.textContent = `MAP ERROR · ${detail}`;
  credit.classList.add('map-error');
  console.error('MapLibre error:', error);
});

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

window.addEventListener('pagehide', () => {
  window.removeEventListener('resize', resizeMap);
  window.visualViewport?.removeEventListener('resize', resizeMap);
  map.remove();
}, { once: true });
