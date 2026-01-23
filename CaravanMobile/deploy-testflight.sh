#!/bin/bash

# TestFlight Deployment Script (Native Xcode Build)
# Mimics the manual Archive → Distribute workflow

set -e  # Exit on any error

echo "🚀 Starting TestFlight deployment via Xcode..."

# Navigate to project directory
cd "$(dirname "$0")"

# Configuration
SCHEME="CaravanMobile"
WORKSPACE="ios/CaravanMobile.xcworkspace"
ARCHIVE_PATH="$HOME/Library/Developer/Xcode/Archives/CaravanMobile-$(date +%Y%m%d-%H%M%S).xcarchive"
EXPORT_PATH="./build"
BUNDLE_ID="com.masongill.CaravanMobile"

# Step 1: Install dependencies
echo "📦 Installing npm dependencies..."
npm install

echo "📦 Installing CocoaPods..."
cd ios
pod install
cd ..

# Step 2: Prebuild with Expo
echo "🔨 Running Expo prebuild..."
npx expo prebuild --platform ios --clean

# Step 3: Archive the app
echo "📦 Archiving app..."
xcodebuild -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination 'generic/platform=iOS' \
  clean archive

# Step 4: Export IPA
echo "📤 Exporting IPA..."
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist ios/ExportOptions.plist

# Step 5: Upload to TestFlight
echo "🚀 Uploading to TestFlight..."
xcrun altool --upload-app \
  -f "$EXPORT_PATH/$SCHEME.ipa" \
  -t ios \
  --apiKey "$APP_STORE_API_KEY_ID" \
  --apiIssuer "$APP_STORE_API_ISSUER_ID"

echo "✅ Upload complete!"
echo "🎉 Your build is processing on App Store Connect. Check your email for updates."
