import React from 'react';
import { StatusBar } from 'react-native';
import 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { MandateProvider } from './src/contexts/MandateContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <MandateProvider>
        <RootNavigator />
        <StatusBar barStyle="dark-content" />
      </MandateProvider>
    </AuthProvider>
  );
}
