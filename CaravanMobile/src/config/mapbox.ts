// Mapbox configuration
// Get your token from https://account.mapbox.com/access-tokens/

import Constants from 'expo-constants';

// Debug: Log what we're getting from env
console.log('Constants.expoConfig?.extra:', Constants.expoConfig?.extra);

export const MAPBOX_ACCESS_TOKEN = Constants.expoConfig?.extra?.mapboxAccessToken || 'pk.eyJ1IjoibWFzb25naWxsbWFwIiwiYSI6ImNtNXdxeW9odDAxMmkya290YzMzd3F2dzcifQ.QyV0hJQIwzfGsoCwUxyDWw';

console.log('MAPBOX_ACCESS_TOKEN:', MAPBOX_ACCESS_TOKEN ? 'Token loaded successfully' : 'NO TOKEN!');

export const MAPBOX_STYLE_URLS = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  warm: 'mapbox://styles/mapbox/standard',
  custom: 'mapbox://styles/masongillmap/cmkpt6zxg002z01sr36vt1ya1'
};

export const DEFAULT_MAP_CONFIG = {
  zoomLevel: 14,
  animationDuration: 300,
  compassEnabled: true,
  pitchEnabled: true,
  rotateEnabled: true,
};