// Mapbox configuration
// Get your token from https://account.mapbox.com/access-tokens/

export const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibWFzb25naWxsbWFwIiwiYSI6ImNtNXdxeW9odDAxMmkya290YzMzd3F2dzcifQ.QyV0hJQIwzfGsoCwUxyDWw';

// Replace with your actual Mapbox token
// For production, store this in environment variables

export const MAPBOX_STYLE_URLS = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  // You can create custom styles at https://studio.mapbox.com/
  custom: 'mapbox://styles/yourusername/yourStyleId'
};

export const DEFAULT_MAP_CONFIG = {
  zoomLevel: 14,
  animationDuration: 300,
  compassEnabled: true,
  pitchEnabled: true,
  rotateEnabled: true,
};