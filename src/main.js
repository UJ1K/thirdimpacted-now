import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import maplibregl from 'maplibre-gl';
import nationCenters from './nation-centers.json';
import tonerStyle from './toner-style.json';

const initialCenter = [139.6917, 35.6895]; // Tokyo, Japan
const compactViewport = window.matchMedia('(max-width: 1024px) and (pointer: coarse)');
const desktopZoom = 3;
const mobileZoom = 2;
let initialZoom = compactViewport.matches ? mobileZoom : desktopZoom;
const minimumZoom = compactViewport.matches ? 1 : 3;

// Atmospheric crosses orbit the visible globe in screen space, without map coordinates.
const atmosphereLayer = document.querySelector('.atmosphere-crosses');
const atmosphereOrbits = [];
const atmosphereCrosses = [];
let crossSeed = 7319;
const randomCrossValue = () => {
  crossSeed = (crossSeed * 48271) % 2147483647;
  return crossSeed / 2147483647;
};
[
  ...(window.innerWidth <= 600
    ? [{ count: 18, size: 0.98, duration: 78 }, { count: 12, size: 1.12, duration: 106 }]
    : compactViewport.matches
      ? [{ count: 26, size: 0.98, duration: 78 }, { count: 16, size: 1.12, duration: 106 }]
      : [{ count: 34, size: 0.98, duration: 78 }, { count: 22, size: 1.12, duration: 106 }]),
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
    const flareAt = 28 + randomCrossValue() * 8;
    cross.dataset.lengthFactor = 0.18 + randomCrossValue() * 0.32;
    cross.dataset.flareFactor = 0.045 + randomCrossValue() * 0.065;
    cross.dataset.thicknessFactor = 0.003 + randomCrossValue() * 0.003;
    cross.dataset.flareThicknessFactor = 0.003 + randomCrossValue() * 0.0025;
    cross.dataset.starFactor = 0.008 + randomCrossValue() * 0.01;
    cross.style.setProperty('--flare-at', `${flareAt}%`);
    cross.style.setProperty('--twinkle-duration', `${2.2 + randomCrossValue() * 4.5}s`);
    cross.style.setProperty('--twinkle-delay', `${-randomCrossValue() * 6}s`);
    const brightness = 0.28 + randomCrossValue() * 0.68;
    cross.style.setProperty('--brightness', `${brightness}`);
    cross.style.setProperty('--dim-brightness', `${brightness * 0.55}`);
    const star = document.createElement('i');
    star.className = 'cross-star';
    cross.append(star);
    atmosphereCrosses.push(cross);
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
const orbitMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const idleOrbitDelay = 3200;
const orbitSpeed = 2.8;
let orbitFrame = 0;
let orbitResumeTimer = 0;
let orbitLastFrame = 0;
let mapHasLoaded = false;
const stopIdleOrbit = () => {
  if (orbitFrame) window.cancelAnimationFrame(orbitFrame);
  orbitFrame = 0;
  orbitLastFrame = 0;
};
const runIdleOrbit = (timestamp) => {
  if (!mapHasLoaded || orbitMotionPreference.matches) return;
  if (!orbitLastFrame) orbitLastFrame = timestamp;
  const elapsed = Math.min((timestamp - orbitLastFrame) / 1000, 0.05);
  orbitLastFrame = timestamp;
  const center = map.getCenter();
  center.lng += orbitSpeed * elapsed;
  map.setCenter(center);
  orbitFrame = window.requestAnimationFrame(runIdleOrbit);
};
const resumeIdleOrbit = () => {
  if (!mapHasLoaded || orbitMotionPreference.matches || orbitFrame) return;
  orbitLastFrame = 0;
  orbitFrame = window.requestAnimationFrame(runIdleOrbit);
};
const noteUserActivity = () => {
  stopIdleOrbit();
  window.clearTimeout(orbitResumeTimer);
  if (mapHasLoaded && !orbitMotionPreference.matches) {
    orbitResumeTimer = window.setTimeout(resumeIdleOrbit, idleOrbitDelay);
  }
};
const handlePointerMove = (event) => {
  if (event.buttons) noteUserActivity();
};
document.addEventListener('pointerdown', noteUserActivity, { passive: true });
document.addEventListener('pointerup', noteUserActivity, { passive: true });
document.addEventListener('pointermove', handlePointerMove, { passive: true });
document.addEventListener('wheel', noteUserActivity, { passive: true });
document.addEventListener('touchstart', noteUserActivity, { passive: true });
document.addEventListener('touchmove', noteUserActivity, { passive: true });
document.addEventListener('touchend', noteUserActivity, { passive: true });
document.addEventListener('keydown', noteUserActivity);
map.on('load', () => {
  mapHasLoaded = true;
  window.clearTimeout(orbitResumeTimer);
  orbitResumeTimer = window.setTimeout(resumeIdleOrbit, idleOrbitDelay);
});
orbitMotionPreference.addEventListener('change', ({ matches }) => {
  if (matches) stopIdleOrbit();
  else noteUserActivity();
});
const syncGlobeAura = () => {
  const radiusBase = compactViewport.matches
    ? (window.innerWidth <= 600 ? 65 : 63)
    : 60;
  const radiusLimit = compactViewport.matches
    ? (window.innerWidth <= 600 ? 190 : 195)
    : 200;
  const radius = Math.max(16, Math.min(
    radiusLimit,
    radiusBase * (2 ** (map.getZoom() - initialZoom)),
  ));
  const radiusPixels = radius * Math.min(window.innerWidth, window.innerHeight) / 100;
  mapPanel.style.setProperty('--globe-aura-radius', `${radius}vmin`);
  atmosphereOrbits.forEach((orbit) => {
    const diameter = radius * 2 * Number(orbit.dataset.orbitSize);
    orbit.style.width = `${diameter}vmin`;
    orbit.style.height = `${diameter}vmin`;
  });
  atmosphereCrosses.forEach((cross) => {
    const length = Math.max(38, radiusPixels * Number(cross.dataset.lengthFactor));
    const flareAt = Number.parseFloat(cross.style.getPropertyValue('--flare-at'));
    cross.style.setProperty('--length', `${length}px`);
    cross.style.setProperty('--flare-distance', `${length * (1 - flareAt / 100)}px`);
    cross.style.setProperty('--thickness', `${Math.max(0.8, radiusPixels * Number(cross.dataset.thicknessFactor))}px`);
    cross.style.setProperty('--flare-width', `${Math.max(10, radiusPixels * Number(cross.dataset.flareFactor))}px`);
    cross.style.setProperty('--flare-thickness', `${Math.max(0.8, radiusPixels * Number(cross.dataset.flareThicknessFactor))}px`);
    cross.style.setProperty('--star-size', `${Math.max(2, radiusPixels * Number(cross.dataset.starFactor))}px`);
  });
  mapPanel.classList.toggle('has-globe-aura', map.getZoom() < 4.5);
};
map.on('zoom', syncGlobeAura);
syncGlobeAura();
// MapLibre does not automatically detect every CSS or viewport size change.
const resizeMap = () => {
  map.resize();
  syncGlobeAura();
};
window.addEventListener('resize', resizeMap);
window.visualViewport?.addEventListener('resize', resizeMap);
compactViewport.addEventListener('change', ({ matches }) => {
  const nextMinimumZoom = matches ? 1 : 3;
  map.setMinZoom(nextMinimumZoom);
  if (map.getZoom() < nextMinimumZoom) map.setZoom(nextMinimumZoom);
  initialZoom = map.getZoom();
  syncGlobeAura();
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

window.addEventListener('pagehide', () => {
  stopIdleOrbit();
  window.clearTimeout(orbitResumeTimer);
  document.removeEventListener('pointerdown', noteUserActivity);
  document.removeEventListener('pointerup', noteUserActivity);
  document.removeEventListener('pointermove', handlePointerMove);
  document.removeEventListener('wheel', noteUserActivity);
  document.removeEventListener('touchstart', noteUserActivity);
  document.removeEventListener('touchmove', noteUserActivity);
  document.removeEventListener('touchend', noteUserActivity);
  document.removeEventListener('keydown', noteUserActivity);
  window.removeEventListener('resize', resizeMap);
  window.visualViewport?.removeEventListener('resize', resizeMap);
  map.remove();
}, { once: true });
