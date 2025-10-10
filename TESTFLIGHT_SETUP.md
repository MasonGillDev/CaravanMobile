# TestFlight Deployment Setup Guide

This guide will help you configure automatic TestFlight deployments via GitHub Actions.

## Prerequisites

1. **Apple Developer Account** with admin access
2. **Expo Account** (create one at https://expo.dev if you don't have one)
3. **App Store Connect** app created for your app

## Setup Steps

### 1. Configure EAS Build

First, update your `eas.json` file with your App Store Connect details:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@example.com",  // Replace with your Apple ID
      "ascAppId": "your-app-store-connect-app-id",  // Replace with your ASC app ID
      "appleTeamId": "8VWXL68TT2"  // Already configured
    }
  }
}
```

**Finding your App Store Connect App ID:**
1. Go to https://appstoreconnect.apple.com
2. Click on your app
3. Go to "App Information"
4. Look for "Apple ID" (it's a numeric ID like 1234567890)

### 2. Configure Apple Credentials in EAS

Run the following command in the `mobile/CaravanMobile` directory:

```bash
eas credentials
```

Follow the prompts to:
- Select iOS platform
- Choose "production" profile
- Set up your Distribution Certificate and Provisioning Profile
- EAS can automatically create and manage these for you

### 3. Get Your Expo Token

1. Go to https://expo.dev/accounts/[your-username]/settings/access-tokens
2. Click "Create Token"
3. Give it a name like "GitHub Actions"
4. Copy the token (you'll only see it once!)

### 4. Add GitHub Secret

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `EXPO_TOKEN`
5. Value: Paste the token from step 3
6. Click "Add secret"

### 5. Create App in App Store Connect (if not already done)

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in the details:
   - **Platform:** iOS
   - **Name:** CaravanMobile
   - **Primary Language:** English
   - **Bundle ID:** com.masongill.CaravanMobile
   - **SKU:** Can be anything unique (e.g., caravan-mobile-001)

### 6. Enable TestFlight

In App Store Connect:
1. Go to your app
2. Click on "TestFlight" tab
3. Accept the TestFlight terms if prompted
4. Set up at least one Internal Testing group

## How It Works

The GitHub Actions workflow (`.github/workflows/testflight-deploy.yml`) will:

1. **Trigger** when you push to the `main` branch (or manually via GitHub UI)
2. **Build** your iOS app using EAS Build
3. **Submit** the build to TestFlight automatically

### Manual Trigger

You can also manually trigger a build from GitHub:
1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select "Deploy to TestFlight" workflow
4. Click "Run workflow"

## Customization

### Change Trigger Branch

Edit `.github/workflows/testflight-deploy.yml` line 5:

```yaml
branches:
  - main  # Change to your branch name
```

### Auto-increment Build Numbers

The configuration already includes `"autoIncrement": true` in `eas.json`, which automatically increments your build number with each build.

## Testing Your Setup

1. Make a small change to your app
2. Commit and push to the main branch
3. Go to GitHub Actions tab to watch the workflow run
4. After 15-30 minutes, check TestFlight for your new build

## Troubleshooting

### Build fails with "No credentials found"
- Run `eas credentials` locally to configure your certificates

### Submit fails with "Invalid Apple ID"
- Update the `appleId` and `ascAppId` in `eas.json`
- Make sure the app exists in App Store Connect

### Workflow doesn't trigger
- Check that you pushed to the correct branch
- Verify the workflow file is in `.github/workflows/`
- Check GitHub Actions is enabled in your repo settings

### Build succeeds but doesn't appear in TestFlight
- Check App Store Connect for any compliance or missing information prompts
- Verify export compliance is set in `app.json` (already configured as `false`)

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [GitHub Actions for Expo](https://docs.expo.dev/build/building-on-ci/)
