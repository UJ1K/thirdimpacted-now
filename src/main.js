import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import maplibregl from 'maplibre-gl';
import nationCenters from './nation-centers.json';
import tonerStyle from './toner-style.json';

const events = [
  { name: 'Tokyo-3', region: 'JAPAN · 3RD NEW TOKYO CITY', coordinates: [138.7274, 35.3606], magnitude: '7.4', note: 'A city built to rise, and built to shelter.' },
  { name: 'Hakone', region: 'JAPAN · KANTŌ REGION', coordinates: [139.023, 35.232], magnitude: '6.8', note: 'The quiet edge of the old world.' },
  { name: 'Tokyo', region: 'JAPAN · TOKYO BAY', coordinates: [139.6917, 35.6895], magnitude: '5.9', note: 'Life carrying on, one ordinary morning at a time.' },
  { name: 'Nerv HQ', region: 'JAPAN · GEOFRONT', coordinates: [139.025, 35.238], magnitude: '—', note: 'Beneath the surface, the last line of defense.' },
];

const initialCenter = [139.6917, 35.6895]; // Tokyo, Japan
const initialZoom = 2.15;

const map = new maplibregl.Map({
  container: 'map',
  style: tonerStyle,
  center: initialCenter,
  zoom: initialZoom,
  attributionControl: false,
});
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
  map.remove();
}, { once: true });
