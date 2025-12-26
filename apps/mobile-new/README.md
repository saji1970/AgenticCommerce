# Agentic Commerce Mobile App

## 🚀 Fresh Expo Managed Workflow - No Gradle Required!

This is a **completely rebuilt** mobile app using **Expo's managed workflow**. No Gradle, no Android Studio, no complex native dependencies!

## ✨ Features

- ✅ **AI Agent Chat** - Conversational shopping assistant
- ✅ **Product Discovery** - Search and browse products
- ✅ **Order Management** - Track your orders
- ✅ **User Profile** - Manage account and settings
- ✅ **Authentication** - Login and registration
- ✅ **Redux State Management** - Centralized app state
- ✅ **Material Design UI** - Beautiful React Native Paper components

## 🛠️ Tech Stack (Simple & Clean)

- **Expo SDK 54** - Managed workflow (no native code needed)
- **React Native 0.81** - Latest stable version
- **TypeScript** - Type-safe development
- **Redux Toolkit** - State management
- **React Navigation** - Screen navigation
- **React Native Paper** - Material Design components
- **Expo Secure Store** - Secure token storage
- **Axios** - HTTP client

## 📦 Installation

```bash
cd apps/mobile-new
npm install
```

## 🏃 Running the App

### Development Mode

```bash
# Start Expo development server
npm start

# Then:
# - Press 'a' for Android
# - Press 'i' for iOS
# - Scan QR code with Expo Go app
```

### Using Expo Go (Easiest)

1. Install **Expo Go** app on your phone (from Play Store/App Store)
2. Run `npm start`
3. Scan the QR code with Expo Go
4. App loads instantly - no build needed!

### Building Native Apps

#### Quick Build (EAS Build - Recommended)

```bash
# Install EAS CLI (one time)
npm install -g eas-cli

# Login to Expo
eas login

# Build Android APK
npm run build:android

# Build iOS app
npm run build:ios

# Build both for production
npm run build:all
```

**No Gradle, no Android Studio needed!** EAS builds in the cloud.

For detailed build instructions, see [BUILD_GUIDE.md](./BUILD_GUIDE.md)

## 📁 Project Structure

```
mobile-new/
├── src/
│   ├── components/      # Reusable components
│   ├── config/         # App configuration
│   ├── navigation/     # Navigation setup
│   ├── screens/        # App screens
│   │   ├── auth/       # Login, Register
│   │   └── main/       # Home, Agent, Orders, Profile
│   ├── services/       # API services
│   ├── store/          # Redux store
│   │   └── slices/     # Redux slices
│   ├── theme/          # App theming
│   └── utils/          # Utility functions
├── App.tsx            # Root component
├── app.json           # Expo configuration
└── package.json       # Dependencies
```

## 🔧 Configuration

### API URL

Update `src/config/api.ts` with your backend URL:

```typescript
const RAILWAY_API_URL = 'https://your-app.railway.app/api/v1';
```

## 🎯 Key Advantages

### ✅ No Gradle
- Expo handles all native builds
- No Android Studio needed for development
- No Gradle sync issues

### ✅ Simple Commands
```bash
npm start          # Start dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
eas build          # Build APK (cloud)
```

### ✅ Fast Development
- Hot reloading
- Expo Go for instant testing
- No native rebuilds needed

### ✅ Easy Deployment
- EAS Build for cloud builds
- No local Android SDK needed
- One command to build APK

## 📱 Testing

### Option 1: Expo Go (Recommended for Development)
1. Install Expo Go on your phone
2. Run `npm start`
3. Scan QR code
4. App loads instantly

### Option 2: Development Build
```bash
eas build --profile development --platform android
```

### Option 3: Preview APK
```bash
eas build --profile preview --platform android
```

## 🐛 Troubleshooting

### Metro Bundler Issues
```bash
npm start -- --clear
```

### Cache Issues
```bash
npx expo start -c
```

### Reinstall Dependencies
```bash
rm -rf node_modules
npm install
```

## 📚 Next Steps

1. **Update API URL** in `src/config/api.ts`
2. **Test with Expo Go** - `npm start` and scan QR
3. **Build APK when ready** - `eas build --platform android`

## 🎉 Benefits Over Old Setup

- ❌ **No Gradle** - Expo handles everything
- ❌ **No Android Studio** - Not needed for development
- ❌ **No Native Builds** - Expo Go for testing
- ✅ **Simple Commands** - Just `npm start`
- ✅ **Cloud Builds** - EAS handles APK creation
- ✅ **Faster Development** - Instant reloading

Enjoy your simplified mobile development experience! 🚀

