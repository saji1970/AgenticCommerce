# Local EAS Build Guide for Mandate App

## Prerequisites

EAS local builds require **macOS or Linux**. On Windows, you have these options:

### Option 1: Use WSL (Windows Subsystem for Linux) - Recommended

1. **Install WSL 2** (if not already installed):
   ```powershell
   wsl --install
   ```

2. **Install Node.js and pnpm in WSL**:
   ```bash
   # In WSL terminal
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   npm install -g pnpm eas-cli
   ```

3. **Install Android SDK in WSL**:
   ```bash
   # Install Android SDK
   sudo apt-get update
   sudo apt-get install -y openjdk-17-jdk
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   ```

4. **Clone and build in WSL**:
   ```bash
   # Navigate to your project (mounted at /mnt/c/AgenticCommerce)
   cd /mnt/c/AgenticCommerce/apps/mandate-app
   
   # Install dependencies
   pnpm install
   
   # Run local build
   eas build --platform android --local --profile preview
   ```

### Option 2: Use Docker (Alternative)

You can use Docker to run a Linux container with the build environment:

```bash
# Build using Docker (requires Docker Desktop)
docker run -it --rm \
  -v ${PWD}:/workspace \
  -w /workspace \
  node:20 bash -c "npm install -g eas-cli && eas build --platform android --local"
```

### Option 3: Use Cloud Build (Current Method)

Continue using EAS cloud builds (what you're doing now):
```bash
eas build --platform android --profile preview
```

## Local Build Commands

Once you have Linux/macOS environment:

```bash
# Preview build (APK)
eas build --platform android --local --profile preview

# Production build (APK)
eas build --platform android --local --profile production

# Development build
eas build --platform android --local --profile development

# Specify output location
eas build --platform android --local --profile preview --output ./build/mandate-app.apk
```

## Benefits of Local Builds

- ✅ Faster builds (no queue waiting)
- ✅ No build quota usage
- ✅ Better debugging (full logs on your machine)
- ✅ Test build configuration before cloud builds
- ✅ Offline capability (after initial setup)

## Troubleshooting

### Missing Android SDK
```bash
# Check Android SDK location
echo $ANDROID_HOME

# Set if missing
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### Missing Java/JDK
```bash
# Install OpenJDK 17
sudo apt-get install openjdk-17-jdk

# Verify
java -version
```

### Credentials Issues
```bash
# Make sure you're logged in
eas whoami

# If not logged in
eas login
```

## Notes

- Local builds use your local Android SDK and build tools
- Some `eas.json` options (like custom Node versions) may be ignored in local builds
- Windows users should use WSL 2 for best compatibility
- Local builds still require EAS credentials for signing
