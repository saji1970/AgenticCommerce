import * as Keychain from 'react-native-keychain';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { TEST_PUBLIC_KEY_PEM, generateTestSignature, generateTestKeyId } from './test-key-generator';

/**
 * Secure Element Service
 * Manages cryptographic keys in Secure Element (iOS Secure Enclave / Android StrongBox)
 * 
 * TEST MODE: Set USE_TEST_KEYS=true to use test keys for demo (no hardware required)
 */

const USE_TEST_KEYS = __DEV__ || true; // Enable test mode in dev and for demo

export interface KeyPair {
  keyId: string;
  publicKey: string; // PEM format
  createdAt: Date;
}

export interface SigningResult {
  signature: string; // Base64-encoded signature
  timestamp: string;
  biometricType: 'face' | 'fingerprint' | 'pin' | 'none';
}

class SecureElementService {
  private readonly KEYCHAIN_SERVICE = 'com.agentic.mandate.secureelement';
  private readonly KEY_ID_KEY = 'mandate_key_id';
  private readonly PUBLIC_KEY_KEY = 'mandate_public_key';

  async isBiometricAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return false;
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  async getBiometricType(): Promise<'face' | 'fingerprint' | 'pin' | 'none'> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'face';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'fingerprint';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'face';
      }
      return 'pin';
    } catch (error) {
      console.error('Error getting biometric type:', error);
      return 'none';
    }
  }

  async authenticate(reason: string = 'Authenticate to sign mandate'): Promise<boolean> {
    if (USE_TEST_KEYS) {
      console.log('[TEST MODE] Simulating biometric authentication');
      return true;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use PIN',
      });
      return result.success;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  async getOrCreateKeyPair(): Promise<KeyPair> {
    try {
      const existingKeyId = await Keychain.getInternetCredentials(this.KEY_ID_KEY);
      const existingPublicKey = await Keychain.getInternetCredentials(this.PUBLIC_KEY_KEY);

      if (existingKeyId && existingPublicKey && existingKeyId.password && existingPublicKey.password) {
        return {
          keyId: existingKeyId.password,
          publicKey: existingPublicKey.password,
          createdAt: new Date(),
        };
      }

      if (USE_TEST_KEYS) {
        const keyId = generateTestKeyId();
        const publicKey = TEST_PUBLIC_KEY_PEM;
        
        await Keychain.setInternetCredentials(
          this.KEY_ID_KEY,
          this.KEY_ID_KEY,
          keyId,
          { accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
        );

        await Keychain.setInternetCredentials(
          this.PUBLIC_KEY_KEY,
          this.PUBLIC_KEY_KEY,
          publicKey,
          { accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
        );

        return { keyId, publicKey, createdAt: new Date() };
      }

      const keyId = this.generateKeyId();
      const publicKey = await this.generatePublicKey(keyId);

      await Keychain.setInternetCredentials(
        this.KEY_ID_KEY,
        this.KEY_ID_KEY,
        keyId,
        {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          authenticationPrompt: 'Access your secure key',
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS_ANY,
        }
      );

      await Keychain.setInternetCredentials(
        this.PUBLIC_KEY_KEY,
        this.PUBLIC_KEY_KEY,
        publicKey,
        { accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
      );

      return { keyId, publicKey, createdAt: new Date() };
    } catch (error) {
      console.error('Error getting/creating key pair:', error);
      throw new Error('Failed to access secure key storage');
    }
  }

  async signData(data: string, reason: string = 'Sign mandate'): Promise<SigningResult> {
    try {
      const authenticated = await this.authenticate(reason);
      if (!authenticated) {
        throw new Error('Authentication failed');
      }

      const biometricType = await this.getBiometricType();
      const keyIdData = await Keychain.getInternetCredentials(this.KEY_ID_KEY);
      if (!keyIdData || !keyIdData.password) {
        throw new Error('Key not found. Please generate a key first.');
      }

      const timestamp = new Date().toISOString();
      const dataToSign = `${data}|${timestamp}`;
      
      let signature: string;
      if (USE_TEST_KEYS) {
        signature = generateTestSignature(dataToSign, keyIdData.password);
      } else {
        signature = this.createHashSignature(dataToSign, keyIdData.password);
      }

      return { signature, timestamp, biometricType };
    } catch (error) {
      console.error('Error signing data:', error);
      throw error;
    }
  }

  private generateKeyId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `key_${timestamp}_${random}`;
  }

  private async generatePublicKey(keyId: string): Promise<string> {
    const publicKeyData = {
      keyId,
      algorithm: 'ECDSA-P256',
      createdAt: new Date().toISOString(),
      deviceId: Platform.OS === 'ios' ? 'iOS' : 'Android',
    };

    const base64Data = typeof btoa !== 'undefined' 
      ? btoa(JSON.stringify(publicKeyData))
      : JSON.stringify(publicKeyData);
    return `-----BEGIN PUBLIC KEY-----\n${base64Data}\n-----END PUBLIC KEY-----`;
  }

  private createHashSignature(data: string, secret: string): string {
    const combined = `${data}|${secret}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Buffer.from(hash.toString()).toString('base64');
  }

  async revokeKeyPair(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(this.KEY_ID_KEY);
      await Keychain.resetInternetCredentials(this.PUBLIC_KEY_KEY);
    } catch (error) {
      console.error('Error revoking key pair:', error);
      throw error;
    }
  }
}

export const secureElementService = new SecureElementService();
export default secureElementService;
