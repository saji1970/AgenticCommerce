import React from 'react';
import { StatusBar } from 'react-native';
import 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { MandateProvider } from './src/contexts/MandateContext';
import { CAConfigProvider } from './src/contexts/CAConfigContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useDemoData } from './src/hooks/useDemoData';

function AppContent() {
  // Initialize demo data in development mode
  useDemoData();

  return (
    <>
      <RootNavigator />
      <StatusBar barStyle="dark-content" />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CAConfigProvider>
        <MandateProvider>
          <AppContent />
        </MandateProvider>
      </CAConfigProvider>
    </AuthProvider>
  );
}
