import 'dotenv/config';

export default {
  expo: {
    name: "CaravanMobile",
    slug: "CaravanMobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false, // Disabled - was causing Mapbox issues on physical device
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.masongill.CaravanMobile",
      buildNumber: "7",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: "Caravan uses your location to discover nearby places, track your visits, and provide personalized recommendations based on where you go.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Caravan needs continuous location access to automatically detect when you visit places and provide real-time recommendations even when the app is in the background.",
        NSLocationAlwaysUsageDescription: "Caravan uses your location to automatically detect visits to places and send you notifications when you arrive.",
      },
      appleTeamId: "8VWXL68TT2"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.masongill.CaravanMobile"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    scheme: "caravanmobile",
    plugins: [
      "expo-secure-store",
      "expo-web-browser",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#2563EB",
          sounds: []
        }
      ],
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "f3fa0cb6-e446-4d7b-9817-417fed8d42cb"
      },
      // Environment variables accessible via Constants.expoConfig.extra
      auth0Domain: process.env.AUTH0_DOMAIN,
      auth0ClientId: process.env.AUTH0_CLIENT_ID,
      auth0Audience: process.env.AUTH0_AUDIENCE,
      apiUrl: process.env.API_URL,
      ticketmasterApiKey: process.env.TICKETMASTER_API_KEY,
      mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN,
    }
  }
};
