import Constants from 'expo-constants';

// Use custom scheme for development builds and production
const isExpoGo = Constants.appOwnership === 'expo';

export const config = {
  auth0: {
    domain: 'dev-zwnx45feos6o3mtr.us.auth0.com',
    clientId: 'LeDwgontRFEOO6YtLTLkE1qHitUFd7tz',
    audience: 'https://api.caravan',
    // Custom scheme for dev builds, Expo proxy for Expo Go (testing only)
    redirectUri: isExpoGo 
      ? 'https://auth.expo.io/@masongill/CaravanMobile'
      : 'caravanmobile://callback',
    scope: 'openid profile email offline_access',
  },
  api: {
    baseUrl: 'https://caravanapi-production.up.railway.app',
  },
};