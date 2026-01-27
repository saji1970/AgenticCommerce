/**
 * Certificate Manager Service
 * Manages secure storage and retrieval of CA certificates and configuration
 * Uses React Native Keychain for secure storage
 */

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keychain service identifiers for secure storage
const KEYCHAIN_SERVICE = 'com.agentic.mandate.ca';
const CA_PRIVATE_KEY_KEY = 'ca_private_key';
const CA_CERTIFICATE_KEY = 'ca_certificate';
const CA_ROOT_CERT_KEY = 'ca_root_certificate';
const SERVER_PUBLIC_KEY_KEY = 'server_public_key';

// AsyncStorage keys for non-sensitive data
const CERT_METADATA_KEY = 'ca_certificate_metadata';
const CA_CONFIG_KEY = 'ca_server_config';

export interface StoredCAConfig {
  serverUrl: string;
  port: string;
  apiKey: string; // Note: Consider storing in Keychain for production
  isConfigured: boolean;
}

export interface StoredCertificate {
  certificatePem: string;
  privateKeyPem: string;
  publicKeyPem: string;
  fingerprint: string;
  issuer: string;
  subject: string;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
  isTestMode: boolean;
}

export interface CertificateMetadata {
  fingerprint: string;
  issuer: string;
  subject: string;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
  isTestMode: boolean;
  storedAt: string;
}

class CertificateManagerService {
  /**
   * Store CA server configuration
   */
  async storeCAConfig(config: StoredCAConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(CA_CONFIG_KEY, JSON.stringify(config));

      // Store API key securely in Keychain
      if (config.apiKey) {
        await Keychain.setInternetCredentials(
          'ca_api_key',
          'ca_api_key',
          config.apiKey,
          { accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
        );
      }
    } catch (error) {
      console.error('Error storing CA config:', error);
      throw new Error('Failed to store CA configuration');
    }
  }

  /**
   * Retrieve CA server configuration
   */
  async getCAConfig(): Promise<StoredCAConfig | null> {
    try {
      const configData = await AsyncStorage.getItem(CA_CONFIG_KEY);
      if (!configData) {
        return null;
      }

      const config = JSON.parse(configData) as StoredCAConfig;

      // Retrieve API key from Keychain
      const apiKeyData = await Keychain.getInternetCredentials('ca_api_key');
      if (apiKeyData && apiKeyData.password) {
        config.apiKey = apiKeyData.password;
      }

      return config;
    } catch (error) {
      console.error('Error retrieving CA config:', error);
      return null;
    }
  }

  /**
   * Check if CA server is configured
   */
  async isCAConfigured(): Promise<boolean> {
    const config = await this.getCAConfig();
    return config !== null && config.isConfigured;
  }

  /**
   * Store CA-issued certificate and private key securely
   */
  async storeCertificate(cert: StoredCertificate): Promise<void> {
    try {
      // Store private key in Keychain (most secure)
      await Keychain.setInternetCredentials(
        CA_PRIVATE_KEY_KEY,
        CA_PRIVATE_KEY_KEY,
        cert.privateKeyPem,
        {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          authenticationPrompt: 'Access certificate private key',
        }
      );

      // Store certificate in Keychain
      await Keychain.setInternetCredentials(
        CA_CERTIFICATE_KEY,
        CA_CERTIFICATE_KEY,
        cert.certificatePem,
        { accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
      );

      // Store metadata in AsyncStorage (non-sensitive)
      const metadata: CertificateMetadata = {
        fingerprint: cert.fingerprint,
        issuer: cert.issuer,
        subject: cert.subject,
        serialNumber: cert.serialNumber,
        notBefore: cert.notBefore,
        notAfter: cert.notAfter,
        isTestMode: cert.isTestMode,
        storedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(CERT_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error storing certificate:', error);
      throw new Error('Failed to store certificate securely');
    }
  }

  /**
   * Retrieve stored certificate
   */
  async getCertificate(): Promise<StoredCertificate | null> {
    try {
      // Get private key from Keychain
      const privateKeyData = await Keychain.getInternetCredentials(CA_PRIVATE_KEY_KEY);
      if (!privateKeyData || !privateKeyData.password) {
        return null;
      }

      // Get certificate from Keychain
      const certData = await Keychain.getInternetCredentials(CA_CERTIFICATE_KEY);
      if (!certData || !certData.password) {
        return null;
      }

      // Get metadata from AsyncStorage
      const metadataStr = await AsyncStorage.getItem(CERT_METADATA_KEY);
      if (!metadataStr) {
        return null;
      }

      const metadata = JSON.parse(metadataStr) as CertificateMetadata;

      return {
        certificatePem: certData.password,
        privateKeyPem: privateKeyData.password,
        publicKeyPem: '', // Extract from certificate if needed
        fingerprint: metadata.fingerprint,
        issuer: metadata.issuer,
        subject: metadata.subject,
        serialNumber: metadata.serialNumber,
        notBefore: metadata.notBefore,
        notAfter: metadata.notAfter,
        isTestMode: metadata.isTestMode,
      };
    } catch (error) {
      console.error('Error retrieving certificate:', error);
      return null;
    }
  }

  /**
   * Get certificate metadata without private key
   */
  async getCertificateMetadata(): Promise<CertificateMetadata | null> {
    try {
      const metadataStr = await AsyncStorage.getItem(CERT_METADATA_KEY);
      if (!metadataStr) {
        return null;
      }
      return JSON.parse(metadataStr) as CertificateMetadata;
    } catch (error) {
      console.error('Error retrieving certificate metadata:', error);
      return null;
    }
  }

  /**
   * Check if a valid certificate is stored
   */
  async isCertificateValid(): Promise<boolean> {
    try {
      const metadata = await this.getCertificateMetadata();
      if (!metadata) {
        return false;
      }

      const now = new Date();
      const notBefore = new Date(metadata.notBefore);
      const notAfter = new Date(metadata.notAfter);

      return now >= notBefore && now <= notAfter;
    } catch (error) {
      console.error('Error checking certificate validity:', error);
      return false;
    }
  }

  /**
   * Check if certificate is about to expire (within 30 days)
   */
  async isCertificateExpiringSoon(): Promise<boolean> {
    try {
      const metadata = await this.getCertificateMetadata();
      if (!metadata) {
        return false;
      }

      const now = new Date();
      const notAfter = new Date(metadata.notAfter);
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      return notAfter <= thirtyDaysFromNow;
    } catch (error) {
      console.error('Error checking certificate expiry:', error);
      return false;
    }
  }

  /**
   * Store CA root certificate
   */
  async storeRootCertificate(rootCertPem: string): Promise<void> {
    try {
      await Keychain.setInternetCredentials(
        CA_ROOT_CERT_KEY,
        CA_ROOT_CERT_KEY,
        rootCertPem,
        { accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
      );
    } catch (error) {
      console.error('Error storing root certificate:', error);
      throw new Error('Failed to store root certificate');
    }
  }

  /**
   * Get CA root certificate
   */
  async getRootCertificate(): Promise<string | null> {
    try {
      const data = await Keychain.getInternetCredentials(CA_ROOT_CERT_KEY);
      return data && data.password ? data.password : null;
    } catch (error) {
      console.error('Error retrieving root certificate:', error);
      return null;
    }
  }

  /**
   * Store server's public key for encryption
   */
  async storeServerPublicKey(publicKeyPem: string): Promise<void> {
    try {
      await Keychain.setInternetCredentials(
        SERVER_PUBLIC_KEY_KEY,
        SERVER_PUBLIC_KEY_KEY,
        publicKeyPem,
        { accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
      );
    } catch (error) {
      console.error('Error storing server public key:', error);
      throw new Error('Failed to store server public key');
    }
  }

  /**
   * Get server's public key for encryption
   */
  async getServerPublicKey(): Promise<string | null> {
    try {
      const data = await Keychain.getInternetCredentials(SERVER_PUBLIC_KEY_KEY);
      return data && data.password ? data.password : null;
    } catch (error) {
      console.error('Error retrieving server public key:', error);
      return null;
    }
  }

  /**
   * Clear all stored certificates and keys
   */
  async clearAll(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(CA_PRIVATE_KEY_KEY);
      await Keychain.resetInternetCredentials(CA_CERTIFICATE_KEY);
      await Keychain.resetInternetCredentials(CA_ROOT_CERT_KEY);
      await Keychain.resetInternetCredentials(SERVER_PUBLIC_KEY_KEY);
      await Keychain.resetInternetCredentials('ca_api_key');
      await AsyncStorage.removeItem(CERT_METADATA_KEY);
      await AsyncStorage.removeItem(CA_CONFIG_KEY);
    } catch (error) {
      console.error('Error clearing certificate data:', error);
      throw new Error('Failed to clear certificate data');
    }
  }

  /**
   * Revoke stored certificate (clear from device)
   */
  async revokeCertificate(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(CA_PRIVATE_KEY_KEY);
      await Keychain.resetInternetCredentials(CA_CERTIFICATE_KEY);
      await AsyncStorage.removeItem(CERT_METADATA_KEY);
    } catch (error) {
      console.error('Error revoking certificate:', error);
      throw new Error('Failed to revoke certificate');
    }
  }
}

export const certificateManagerService = new CertificateManagerService();
export default certificateManagerService;
