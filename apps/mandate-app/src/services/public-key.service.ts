import axios from 'axios';
import { Platform } from 'react-native';
import { storageService } from './storage.service';
import secureElementService from './secure-element.service';

const MANDATE_SERVICE_URL = __DEV__
  ? 'http://10.0.2.2:3001/api'
  : 'https://pure-wonder-production.up.railway.app/api';

export interface RegisteredPublicKey {
  id: string;
  keyId: string;
  userId: string;
  createdAt: string;
}

class PublicKeyService {
  private client = axios.create({
    baseURL: MANDATE_SERVICE_URL,
    headers: { 'Content-Type': 'application/json' },
  });

  async registerPublicKey(): Promise<RegisteredPublicKey> {
    try {
      const user = await storageService.getUser();
      if (!user || !user.id) {
        throw new Error('User not logged in');
      }

      const keyPair = await secureElementService.getOrCreateKeyPair();
      const deviceId = `${Platform.OS}_${Date.now()}`;
      const biometricType = await secureElementService.getBiometricType();

      const response = await this.client.post<{
        success: boolean;
        data: RegisteredPublicKey;
      }>('/signatures/keys/register', {
        userId: user.id,
        publicKeyPem: keyPair.publicKey,
        keyId: keyPair.keyId,
        keyAlgorithm: 'ECDSA-P256',
        deviceId,
        attestationData: {
          platform: Platform.OS,
          biometricType,
          createdAt: keyPair.createdAt.toISOString(),
        },
      });

      if (!response.data.success) {
        throw new Error('Failed to register public key');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error registering public key:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error(error.message || 'Failed to register public key');
    }
  }

  async getUserPublicKeys(): Promise<RegisteredPublicKey[]> {
    try {
      const user = await storageService.getUser();
      if (!user || !user.id) {
        throw new Error('User not logged in');
      }

      const response = await this.client.get<{
        success: boolean;
        data: RegisteredPublicKey[];
      }>('/signatures/keys', {
        params: { userId: user.id },
      });

      return response.data.data || [];
    } catch (error: any) {
      console.error('Error getting public keys:', error);
      throw new Error(error.message || 'Failed to get public keys');
    }
  }

  async hasRegisteredKey(): Promise<boolean> {
    try {
      const keys = await this.getUserPublicKeys();
      return keys.length > 0;
    } catch (error) {
      return false;
    }
  }
}

export const publicKeyService = new PublicKeyService();
export default publicKeyService;
