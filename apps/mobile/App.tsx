import React from 'react';
import { StatusBar } from 'react-native';
import 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { ProductProvider } from './src/contexts/ProductContext';
import { CartProvider } from './src/contexts/CartContext';
import { MandateProvider } from './src/contexts/MandateContext';
import { IntentProvider } from './src/contexts/IntentContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <MandateProvider>
        <IntentProvider>
          <ProductProvider>
            <CartProvider>
              <RootNavigator />
              <StatusBar barStyle="dark-content" />
            </CartProvider>
          </ProductProvider>
        </IntentProvider>
      </MandateProvider>
    </AuthProvider>
  );
}
