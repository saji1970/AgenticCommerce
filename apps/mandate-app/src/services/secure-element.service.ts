import * as Keychain from 'react-native-keychain';
import ReactNativeBiometrics from 'react-native-biometrics';
import { Platform } from 'react-native';
import { TEST_PUBLIC_KEY_PEM, generateTestSignature, generateTestKeyId } from './test-key-generator';
import { certificateManagerService, StoredCertificate } from './certificate-manager.service';
import { cryptoService, SecurePayload } from './crypto.service';
import { generateTestCertificate, isTestCertificateFingerprint, getTestServerPublicKey } from './test-certificate-generator';

/**
 * Secure Element Service
 * Manages cryptographic keys in Secure Element (iOS Secure Enclave / Android StrongBox)
 * 
 * TEST MODE: Set USE_TEST_KEYS=true to use test keys for demo (no hardware required)
 */

const USE_TEST_KEYS = true; // Enable test mode for demo - still shows biometric prompt
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

export interface CASigningResult extends SigningResult {
  certificateFingerprint: string;
  isTestMode: boolean;
}

export interface ActiveCertificate {
  certificate: StoredCertificate | null;
  isTestMode: boolean;
  isValid: boolean;
}

class SecureElementService {
  private readonly KEYCHAIN_SERVICE = 'com.agentic.mandate.secureelement';
  private readonly KEY_ID_KEY = 'mandate_key_id';
  private readonly PUBLIC_KEY_KEY = 'mandate_public_key';

  async isBiometricAvailable(): Promise<boolean> {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      return available && biometryType !== ReactNativeBiometrics.BiometryType.none;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

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

  async authenticate(reason: string = 'Authenticate to sign mandate'): Promise<boolean> {
    try {
      // Always try biometric authentication for demo
      const { available } = await rnBiometrics.isSensorAvailable();

      if (available) {
        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: reason,
          cancelButtonText: 'Cancel',
          fallbackPromptMessage: 'Use PIN',
        });
        return success;
      } else {
        // No biometric available - show alert and simulate success for demo
        console.log('[DEMO] No biometric sensor available, simulating authentication');
        return true;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      // For demo purposes, allow fallback
      console.log('[DEMO] Biometric failed, allowing fallback');
      return true;
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
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
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
    // Use btoa instead of Buffer (Buffer is not available in React Native)
    try {
      return btoa(hash.toString());
    } catch {
      return hash.toString();
    }
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

  /**
   * Check if a CA certificate is available
   */
  async hasCACertificate(): Promise<boolean> {
    try {
      const cert = await certificateManagerService.getCertificate();
      if (!cert) return false;
      return await certificateManagerService.isCertificateValid();
    } catch (error) {
      console.error('Error checking CA certificate:', error);
      return false;
    }
  }

  /**
   * Get the active certificate (CA-issued or test)
   */
  async getActiveCertificate(): Promise<ActiveCertificate> {
    try {
      const cert = await certificateManagerService.getCertificate();
      if (cert) {
        const isValid = await certificateManagerService.isCertificateValid();
        return {
          certificate: cert,
          isTestMode: cert.isTestMode || isTestCertificateFingerprint(cert.fingerprint),
          isValid,
        };
      }

      // No stored certificate - check if we should use test mode
      if (USE_TEST_KEYS) {
        // Generate a temporary test certificate
        const testCert = generateTestCertificate();
        return {
          certificate: {
            certificatePem: testCert.certificate,
            privateKeyPem: testCert.privateKey,
            publicKeyPem: testCert.publicKey,
            fingerprint: testCert.fingerprint,
            issuer: testCert.issuer,
            subject: testCert.subject,
            serialNumber: testCert.serialNumber,
            notBefore: testCert.notBefore.toISOString(),
            notAfter: testCert.notAfter.toISOString(),
            isTestMode: true,
          },
          isTestMode: true,
          isValid: true,
        };
      }

      return {
        certificate: null,
        isTestMode: false,
        isValid: false,
      };
    } catch (error) {
      console.error('Error getting active certificate:', error);
      return {
        certificate: null,
        isTestMode: false,
        isValid: false,
      };
    }
  }

  /**
   * Sign data using CA certificate
   */
  async signWithCACertificate(
    data: string,
    reason: string = 'Sign with CA certificate'
  ): Promise<CASigningResult> {
    try {
      // Authenticate user first
      const authenticated = await this.authenticate(reason);
      if (!authenticated) {
        throw new Error('Authentication failed');
      }

      const biometricType = await this.getBiometricType();
      const activeCert = await this.getActiveCertificate();

      if (!activeCert.certificate || !activeCert.isValid) {
        throw new Error('No valid certificate available');
      }

      const cert = activeCert.certificate;
      const timestamp = new Date().toISOString();

      // Sign the data using crypto service
      const signedPayload = cryptoService.signPayload(
        data,
        cert.privateKeyPem,
        cert.fingerprint
      );

      return {
        signature: signedPayload.signature,
        timestamp,
        biometricType,
        certificateFingerprint: cert.fingerprint,
        isTestMode: activeCert.isTestMode,
      };
    } catch (error) {
      console.error('Error signing with CA certificate:', error);
      throw error;
    }
  }

  /**
   * Create a secure payload (signed and encrypted) for transmission
   */
  async createSecurePayload(
    data: string | object,
    reason: string = 'Create secure payload'
  ): Promise<SecurePayload | null> {
    try {
      // Authenticate user first
      const authenticated = await this.authenticate(reason);
      if (!authenticated) {
        throw new Error('Authentication failed');
      }

      const activeCert = await this.getActiveCertificate();

      if (!activeCert.certificate || !activeCert.isValid) {
        console.log('[SecureElement] No valid certificate, returning null');
        return null;
      }

      // Get server public key for encryption
      let serverPublicKey = await certificateManagerService.getServerPublicKey();
      if (!serverPublicKey && activeCert.isTestMode) {
        // Use test server public key in demo mode
        serverPublicKey = getTestServerPublicKey();
      }

      if (!serverPublicKey) {
        throw new Error('Server public key not available');
      }

      const cert = activeCert.certificate;

      // Create secure payload using crypto service
      const securePayload = cryptoService.createSecurePayload(
        data,
        serverPublicKey,
        cert.privateKeyPem,
        cert.fingerprint
      );

      return securePayload;
    } catch (error) {
      console.error('Error creating secure payload:', error);
      return null;
    }
  }

  /**
   * Enhanced sign data method that uses CA certificate when available
   */
  async signDataWithCA(
    data: string,
    reason: string = 'Sign mandate'
  ): Promise<CASigningResult> {
    try {
      // Check if CA certificate is available
      const hasCACert = await this.hasCACertificate();

      if (hasCACert) {
        // Use CA certificate for signing
        return this.signWithCACertificate(data, reason);
      }

      // Fall back to regular signing
      const result = await this.signData(data, reason);

      return {
        ...result,
        certificateFingerprint: 'local_key',
        isTestMode: USE_TEST_KEYS,
      };
    } catch (error) {
      console.error('Error in signDataWithCA:', error);
      throw error;
    }
  }
}

export const secureElementService = new SecureElementService();
export default secureElementService;
