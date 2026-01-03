import { MD3LightTheme } from 'react-native-paper';
import { getConfig } from '../config';

const config = getConfig();

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: config.theme?.primaryColor || '#6200EE',
    secondary: config.theme?.secondaryColor || '#03DAC6',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    error: '#B00020',
  },
};

