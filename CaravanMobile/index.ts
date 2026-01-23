import { registerRootComponent } from 'expo';
import MapboxGL from '@rnmapbox/maps';

import App from './App';
import { MAPBOX_ACCESS_TOKEN } from './src/config/mapbox';

// Initialize Mapbox BEFORE the app renders
console.log('Initializing Mapbox with token length:', MAPBOX_ACCESS_TOKEN?.length);
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
console.log('Mapbox initialized successfully');

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
