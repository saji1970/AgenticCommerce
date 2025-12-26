import 'react-native-gesture-handler';
import React from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { theme } from './src/theme';
import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  console.log('App component rendering...');
  
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
