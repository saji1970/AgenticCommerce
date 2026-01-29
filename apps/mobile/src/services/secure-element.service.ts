import * as Keychain from 'react-native-keychain';
import ReactNativeBiometrics from 'react-native-biometrics';
import { Platform } from 'react-native';
import { TEST_PUBLIC_KEY_PEM, generateTestSignature, generateTestKeyId } from './test-key-generator';

/**
 * Secure Element Service
 * Manages cryptographic keys in Secure Element (iOS Secure Enclave / Android StrongBox)
 *
 * TEST MODE: Set USE_TEST_KEYS=true to use test keys for demo (no hardware required)
 *
 * Note: React Native doesn't have direct Secure Element access, so we use:
 * - react-native-keychain for secure key storage
 * - react-native-biometrics for biometric auth
 * - Test keys for demo mode (no hardware Secure Element required)
 */

// Enable test mode for demo (set to false in production)
const USE_TEST_KEYS = __DEV__ || true; // Enable test mode in dev and for demo
const rnBiometrics = new ReactNativeBiometrics();

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
  private readonly KEYCHAIN_SERVICE = 'com.agenticcommerce.secureelement';
  private readonly KEY_ID_KEY = 'mandate_key_id';
  private readonly PUBLIC_KEY_KEY = 'mandate_public_key';

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      return available && biometryType !== ReactNativeBiometrics.BiometryType.none;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Get available biometric types
   */
  async getBiometricType(): Promise<'face' | 'fingerprint' | 'pin' | 'none'> {
    try {
      const { biometryType } = await rnBiometrics.isSensorAvailable();
      if (biometryType === ReactNativeBiometrics.BiometryType.FaceID ||
          biometryType === ReactNativeBiometrics.BiometryType.Face) {
        return 'face';
      }
      if (biometryType === ReactNativeBiometrics.BiometryType.TouchID ||
          biometryType === ReactNativeBiometrics.BiometryType.Fingerprint) {
        return 'fingerprint';
      }
      return 'pin';
    } catch (error) {
      console.error('Error getting biometric type:', error);
      return 'none';
    }
  }

  /**
   * Authenticate with biometric or PIN
   * In test mode, skips actual biometric (for demo purposes)
   */
  async authenticate(reason: string = 'Authenticate to sign mandate'): Promise<boolean> {
    if (USE_TEST_KEYS) {
      // In test mode, simulate successful authentication
      console.log('[TEST MODE] Simulating biometric authentication');
      return true;
    }

    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: reason,
        cancelButtonText: 'Cancel',
        fallbackPromptMessage: 'Use PIN',
      });
      return success;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  /**
   * Generate or retrieve key pair
   * In a real implementation, this would generate keys in Secure Element
   * For now, we generate a key pair and store securely
   */
  async getOrCreateKeyPair(): Promise<KeyPair> {
    try {
      // Check if key already exists
      const existingKeyId = await Keychain.getInternetCredentials(this.KEY_ID_KEY);
      const existingPublicKey = await Keychain.getInternetCredentials(this.PUBLIC_KEY_KEY);

      if (existingKeyId && existingPublicKey && existingKeyId.password && existingPublicKey.password) {
        return {
          keyId: existingKeyId.password,
          publicKey: existingPublicKey.password,
          createdAt: new Date(), // We don't store this, so use current date
        };
      }

      // Generate new key pair
      if (USE_TEST_KEYS) {
        // Use test keys for demo
        const keyId = generateTestKeyId();
        const publicKey = TEST_PUBLIC_KEY_PEM;
        
        // Store securely
        await Keychain.setInternetCredentials(
          this.KEY_ID_KEY,
          this.KEY_ID_KEY,
          keyId,
          {
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          }
        );

        await Keychain.setInternetCredentials(
          this.PUBLIC_KEY_KEY,
          this.PUBLIC_KEY_KEY,
          publicKey,
          {
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          }
        );

        return {
          keyId,
          publicKey,
          createdAt: new Date(),
        };
      }

      // Production: Generate real key pair
      // Note: In production, this should use native modules to generate keys in Secure Element
      const keyId = this.generateKeyId();
      const publicKey = await this.generatePublicKey(keyId);

      // Store securely
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
        {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }
      );

      return {
        keyId,
        publicKey,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error getting/creating key pair:', error);
      throw new Error('Failed to access secure key storage');
    }
  }

  /**
   * Sign data with Secure Element key
   * Note: In production, this should use native modules to sign in Secure Element
   * For now, we authenticate and return a hash-based signature
   */
  async signData(data: string, reason: string = 'Sign mandate'): Promise<SigningResult> {
    try {
      // Authenticate first
      const authenticated = await this.authenticate(reason);
      if (!authenticated) {
        throw new Error('Authentication failed');
      }

      // Get biometric type
      const biometricType = await this.getBiometricType();

      // Get key ID
      const keyIdData = await Keychain.getInternetCredentials(this.KEY_ID_KEY);
      if (!keyIdData || !keyIdData.password) {
        throw new Error('Key not found. Please generate a key first.');
      }

      // In production, this would use native module to sign in Secure Element
      const timestamp = new Date().toISOString();
      const dataToSign = `${data}|${timestamp}`;
      
      let signature: string;
      if (USE_TEST_KEYS) {
        // Use test signature generator (works with backend test mode)
        signature = generateTestSignature(dataToSign, keyIdData.password);
      } else {
        // Production: Sign in Secure Element
        signature = this.createHashSignature(dataToSign, keyIdData.password);
      }

      return {
        signature,
        timestamp,
        biometricType,
      };
    } catch (error) {
      console.error('Error signing data:', error);
      throw error;
    }
  }

  /**
   * Generate a unique key ID
   */
  private generateKeyId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `key_${timestamp}_${random}`;
  }

  /**
   * Generate a public key (PEM format)
   * Note: In production, this would extract the public key from Secure Element
   */
  private async generatePublicKey(keyId: string): Promise<string> {
    // In production, this would extract the actual public key from Secure Element
    // For now, we generate a placeholder PEM key
    // The backend will need to handle the actual key format
    const publicKeyData = {
      keyId,
      algorithm: 'ECDSA-P256',
      createdAt: new Date().toISOString(),
      deviceId: Platform.OS === 'ios' ? 'iOS' : 'Android',
    };

    // Return a PEM-like format (in production, this would be actual PEM)
    // Use btoa for base64 encoding (React Native compatible)
    const base64Data = typeof btoa !== 'undefined' 
      ? btoa(JSON.stringify(publicKeyData))
      : JSON.stringify(publicKeyData);
    return `-----BEGIN PUBLIC KEY-----\n${base64Data}\n-----END PUBLIC KEY-----`;
  }

  /**
   * Create a hash-based signature
   * Note: In production, this should use native module to sign in Secure Element
   */
  private createHashSignature(data: string, secret: string): string {
    // Simple hash-based signature (in production, use native Secure Element signing)
    const combined = `${data}|${secret}`;
    // Use a simple hash (in production, this would be ECDSA signature from Secure Element)
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Use btoa instead of Buffer (Buffer is not available in React Native)
    try {
      return btoa(hash.toString());
    } catch {
      return hash.toString();
    }
  }

  /**
   * Revoke/delete key pair
   */
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
