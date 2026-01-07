import React from 'react';
import { StatusBar } from 'react-native';
import 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { ProductProvider } from './src/contexts/ProductContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <RootNavigator />
        <StatusBar barStyle="dark-content" />
      </ProductProvider>
    </AuthProvider>
  );
}
