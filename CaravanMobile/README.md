# CaravanMobile

A React Native mobile application with Auth0 authentication, built with Expo and TypeScript.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Xcode (for iOS development)
- Android Studio (for Android development)
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Fastlane (`brew install fastlane` for iOS builds)

## Project Structure

```
CaravanMobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation configuration
│   ├── services/       # API and Auth services
│   ├── context/        # React contexts (Auth)
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions and config
│   └── styles/         # Shared styles and themes
├── assets/            # Images, fonts, and static files
├── app.json          # Expo configuration
├── eas.json          # EAS Build configuration
└── package.json      # Dependencies and scripts
```

## Environment Setup

### Auth0 Configuration

1. Create an Auth0 application with the following settings:
   - Application Type: Native
   - Allowed Callback URLs: `caravanmobile://callback`
   - Allowed Logout URLs: `caravanmobile://logout`

2. Update `src/utils/config.ts` with your Auth0 credentials:
```typescript
export const config = {
  auth0: {
    domain: 'your-auth0-domain.auth0.com',
    clientId: 'your-client-id',
    audience: 'your-api-audience',
    // ...
  }
}
```

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd mobile/CaravanMobile

# Install dependencies
npm install
```

## Development

### Using Expo Go (Limited - No Custom Native Code)

For quick prototyping without Auth0:
```bash
npm start
# or
npx expo start
```

### Using Development Build (Recommended)

The development build includes custom native code for Auth0 authentication with custom URL schemes.

#### First Time Setup

1. **Configure EAS** (one-time setup):
```bash
# Login to Expo account
eas login

# Configure your project
eas build:configure
```

2. **Build for iOS Simulator**:
```bash
# Local build (faster, requires Xcode)
eas build --platform ios --profile development --local

# Or use EAS cloud build
eas build --platform ios --profile development
```

3. **Build for Android Emulator**:
```bash
# Local build (requires Android Studio)
eas build --platform android --profile development --local

# Or use EAS cloud build
eas build --platform android --profile development
```

#### Installing the Development Build

**iOS Simulator:**
```bash
# After local build completes
tar -xzf build-*.tar.gz
xcrun simctl install booted CaravanMobile.app

# Or drag the .app file to the simulator
```

**Android Emulator:**
```bash
# Install the APK
adb install build-*.apk
```

**Physical Device:**
- iOS: Use TestFlight or Ad Hoc distribution
- Android: Enable developer mode and install APK directly

#### Running with Development Build

Once the development build is installed:
```bash
# Start the development server
npx expo start --dev-client

# The app will appear in your simulator/device
# Open it and it will connect to the dev server
```

## Building for Production

### iOS Production Build
```bash
eas build --platform ios --profile production
```

### Android Production Build
```bash
eas build --platform android --profile production
```

## Common Commands

```bash
# Start development server
npm start

# Clear cache and restart
npm run clear

# Run on iOS
npm run ios

# Run on Android
npm run android

# Type check
npx tsc --noEmit

# Lint
npx eslint .
```

## Troubleshooting

### "Open up App.tsx to start working on your app!" Message
Clear the Metro bundler cache:
```bash
npm run clear
# or
rm -rf node_modules/.cache && npx expo start -c --reset-cache
```

### Auth0 Redirect Issues
Ensure your Auth0 application settings match:
- Callback URL: `caravanmobile://callback`
- The bundle identifier in `app.json` matches your Auth0 settings
- You're using the development build, not Expo Go

### Build Errors
1. Ensure all prerequisites are installed
2. For iOS: Check Xcode and accept licenses: `sudo xcodebuild -license accept`
3. For Android: Ensure ANDROID_HOME is set correctly

### When to Rebuild

You need to create a new development build when:
- Adding new native dependencies
- Changing native configuration (app.json, Info.plist, etc.)
- Updating URL schemes or bundle identifiers
- Adding new Expo plugins

You do NOT need to rebuild for:
- JavaScript/TypeScript changes
- React component updates
- Style changes
- API endpoint changes
- Business logic updates

## API Integration

The app connects to the Caravan API. Configure the API base URL in `src/utils/config.ts`:
```typescript
api: {
  baseUrl: 'https://your-api-url.com',
}
```

## Security Notes

- Never commit `.env` files or sensitive credentials
- Use environment variables for sensitive configuration
- Ensure proper token storage using SecureStore
- Validate all API responses
- Implement proper error handling for network requests

## Support

For issues or questions, please open an issue in the repository.# CaravanMobile
# CaravanMobile
