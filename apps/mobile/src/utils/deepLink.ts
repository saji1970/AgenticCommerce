import { Linking, Platform, Alert } from 'react-native';

/**
 * Deep Link Utility
 * Handles opening the Mandate app via deep links
 */

const MANDATE_APP_SCHEME = 'mandate://mandate';
const MANDATE_APP_PACKAGE = 'com.agentic.mandate';

/**
 * Open Mandate app with a specific mandate ID
 */
export async function openMandateApp(mandateId: string): Promise<boolean> {
  try {
    const url = `${MANDATE_APP_SCHEME}/${mandateId}`;
    console.log('Opening Mandate app with URL:', url);
    
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      // Try to open Play Store if app not installed
      if (Platform.OS === 'android') {
        const playStoreUrl = `market://details?id=${MANDATE_APP_PACKAGE}`;
        const canOpenPlayStore = await Linking.canOpenURL(playStoreUrl);
        if (canOpenPlayStore) {
          await Linking.openURL(playStoreUrl);
          Alert.alert(
            'Mandate App Required',
            'Please install the Mandate Manager app to approve mandates.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Mandate App Required',
            'Please install the Mandate Manager app from the Play Store to approve mandates.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Mandate App Required',
          'Please install the Mandate Manager app to approve mandates.',
          [{ text: 'OK' }]
        );
      }
      return false;
    }

    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error('Error opening Mandate app:', error);
    Alert.alert('Error', 'Failed to open Mandate app');
    return false;
  }
}

/**
 * Check if Mandate app is installed
 */
export async function isMandateAppInstalled(): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(MANDATE_APP_SCHEME);
    return canOpen;
  } catch (error) {
    return false;
  }
}
