import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { theme } from './src/theme';
import ErrorBoundary from './src/components/ErrorBoundary';
import { getConfig, isDemoMode, setDemoMode } from './src/config';
import { testRailwayConnection } from './src/utils/railwayHelper';

function App() {
  useEffect(() => {
    const config = getConfig();
    const isRailwayConfigured = 
      config.apiBaseUrl && 
      !config.apiBaseUrl.includes('your-app.railway.app') &&
      !config.apiBaseUrl.includes('localhost');

    // Check if Railway backend is available
    if (isRailwayConfigured && !isDemoMode()) {
      // Test Railway backend connection
      testRailwayConnection()
        .then((connected) => {
          if (connected) {
            console.log('✅ Connected to Railway backend:', config.apiBaseUrl);
            setDemoMode(false);
          } else {
            console.warn('⚠️ Railway backend not available');
            // Only fallback to demo if explicitly allowed
            if (process.env.EXPO_PUBLIC_FALLBACK_TO_DEMO === 'true') {
              console.log('🔵 Falling back to demo mode');
              setDemoMode(true);
            }
          }
        })
        .catch((error) => {
          console.warn('⚠️ Error testing Railway connection:', error.message);
          if (process.env.EXPO_PUBLIC_FALLBACK_TO_DEMO === 'true') {
            setDemoMode(true);
          }
        });
    } else if (!isRailwayConfigured && !isDemoMode()) {
      console.log('🔵 No Railway URL configured, using demo mode');
      setDemoMode(true);
    }
  }, []);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </PaperProvider>
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;

