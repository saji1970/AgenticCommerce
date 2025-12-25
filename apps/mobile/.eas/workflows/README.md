# EAS Build Workflows

This directory contains GitHub Actions workflows for automated EAS builds.

## Workflows

### 1. Create Production Builds (`create-production-builds.yml`)

**Triggers:**
- Manual trigger via GitHub Actions UI
- Automatic on push to `main` or `master` branch

**What it does:**
- Builds both Android and iOS production apps
- Uses the `production` profile from `eas.json`
- Runs builds in parallel (non-blocking)

**Output:**
- Android: AAB (Android App Bundle) for Google Play Store
- iOS: IPA for App Store

### 2. Create Preview Builds (`create-preview-builds.yml`)

**Triggers:**
- Manual trigger via GitHub Actions UI
- Automatic on pull requests

**What it does:**
- Builds Android APK for testing
- Uses the `preview` profile from `eas.json`
- Comments the build link on the PR

**Output:**
- Android: APK file that can be installed directly on devices

## Setup Instructions

### 1. Get Your Expo Token

```bash
npx eas login
npx eas whoami
npx expo token:create
```

Copy the token that's generated.

### 2. Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `EXPO_TOKEN`
5. Value: Paste the token from step 1
6. Click **Add secret**

### 3. Move Workflows to GitHub Actions Directory

These workflows need to be in `.github/workflows/` to work with GitHub Actions:

```bash
# From the mobile app directory
mkdir -p ../../.github/workflows
cp .eas/workflows/create-production-builds.yml ../../.github/workflows/
cp .eas/workflows/create-preview-builds.yml ../../.github/workflows/
```

Or manually move them to:
- `C:\AgenticCommerce\.github\workflows\create-production-builds.yml`
- `C:\AgenticCommerce\.github\workflows\create-preview-builds.yml`

## Manual Build Trigger

If you want to trigger a build manually:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select the workflow (Production or Preview)
4. Click **Run workflow**
5. Select the branch
6. Click **Run workflow**

## Local Builds (Alternative)

You can still build locally without workflows:

```bash
# Preview build (APK for testing)
cd apps/mobile
npx eas build --platform android --profile preview

# Production build
npx eas build --platform android --profile production
```

## Monitoring Builds

Check build status:
- GitHub Actions tab in your repository
- https://expo.dev/accounts/[your-account]/projects/agenticai/builds
- Or run: `npx eas build:list`

## Build Artifacts

After builds complete:
- **Production builds**: Available in your Expo dashboard
- **Preview builds**: Download link in GitHub Actions run or Expo dashboard

## Notes

- Builds typically take 10-15 minutes
- Free tier has limited builds per month
- iOS builds require Apple Developer account credentials
- Android builds use auto-generated keystores (stored securely on Expo)

## Troubleshooting

**"No EXPO_TOKEN found"**
- Make sure you added the token to GitHub Secrets (step 2 above)

**"Build failed" errors**
- Check the Actions tab for detailed logs
- Verify `eas.json` configuration is correct
- Ensure all dependencies are in `package.json`

**iOS build requires credentials**
- Set up credentials: `npx eas credentials`
- Or build locally on a Mac first to set up credentials
