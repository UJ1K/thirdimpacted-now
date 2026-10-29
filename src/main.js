import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import maplibregl from 'maplibre-gl';
import nationCenters from './nation-centers.json';
import tonerStyle from './toner-style.json';

const initialCenter = [139.6917, 35.6895]; // Tokyo, Japan
const initialZoom = 2.15;
const minimumZoom = 3;

// Atmospheric crosses orbit the visible globe in screen space, without map coordinates.
const atmosphereLayer = document.querySelector('.atmosphere-crosses');
const atmosphereOrbits = [];
let crossSeed = 7319;
const randomCrossValue = () => {
  crossSeed = (crossSeed * 48271) % 2147483647;
  return crossSeed / 2147483647;
};
[
  { count: 34, size: 0.98, duration: 78 },
  { count: 22, size: 1.12, duration: 106 },
].forEach(({ count, size, duration }) => {
  const orbit = document.createElement('div');
  orbit.className = 'cross-orbit';
  orbit.dataset.orbitSize = size;
  orbit.style.setProperty('--orbit-duration', `${duration}s`);
  for (let i = 0; i < count; i += 1) {
    const angle = (360 * i) / count + (randomCrossValue() - 0.5) * (360 / count) * 0.7;
    const cross = document.createElement('span');
    cross.className = 'atmosphere-cross';
    cross.style.left = `${50 + Math.cos((angle * Math.PI) / 180) * 50}%`;
    cross.style.top = `${50 + Math.sin((angle * Math.PI) / 180) * 50}%`;
    cross.style.setProperty('--orientation', `${angle + 90}deg`);
    const length = 68 + randomCrossValue() * 180;
    const flareAt = 28 + randomCrossValue() * 8;
    cross.style.setProperty('--length', `${length}px`);
    cross.style.setProperty('--flare-distance', `${length * (1 - flareAt / 100)}px`);
    cross.style.setProperty('--thickness', `${0.8 + randomCrossValue() * 1.3}px`);
    cross.style.setProperty('--flare-at', `${flareAt}%`);
    cross.style.setProperty('--flare-width', `${14 + randomCrossValue() * 38}px`);
    cross.style.setProperty('--flare-thickness', `${0.8 + randomCrossValue() * 1.5}px`);
    cross.style.setProperty('--star-size', `${2 + randomCrossValue() * 7}px`);
    cross.style.setProperty('--twinkle-duration', `${2.2 + randomCrossValue() * 4.5}s`);
    cross.style.setProperty('--twinkle-delay', `${-randomCrossValue() * 6}s`);
    const brightness = 0.28 + randomCrossValue() * 0.68;
    cross.style.setProperty('--brightness', `${brightness}`);
    cross.style.setProperty('--dim-brightness', `${brightness * 0.55}`);
    const star = document.createElement('i');
    star.className = 'cross-star';
    cross.append(star);
    orbit.append(cross);
  }
  atmosphereLayer.append(orbit);
  atmosphereOrbits.push(orbit);
});

const map = new maplibregl.Map({
  container: 'map',
  style: tonerStyle,
  center: initialCenter,
  zoom: initialZoom,
  minZoom: minimumZoom,
  attributionControl: false,
});
const mapPanel = document.querySelector('.map-panel');
const syncGlobeAura = () => {
  const radius = Math.max(16, Math.min(
    140,
    40 * (2 ** ((map.getZoom() - initialZoom) * 0.65)),
  ));
  mapPanel.style.setProperty('--globe-aura-radius', `${radius}vmin`);
  atmosphereOrbits.forEach((orbit) => {
    const diameter = radius * 2 * Number(orbit.dataset.orbitSize);
    orbit.style.width = `${diameter}vmin`;
    orbit.style.height = `${diameter}vmin`;
  });
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

window.addEventListener('pagehide', () => {
  window.removeEventListener('resize', resizeMap);
  window.visualViewport?.removeEventListener('resize', resizeMap);
  map.remove();
}, { once: true });
