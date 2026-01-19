import axios from 'axios';
import { storageService } from './storage.service';
import secureElementService from './secure-element.service';
import publicKeyService from './public-key.service';

const MANDATE_SERVICE_URL = __DEV__
  ? 'http://10.0.2.2:3001/api'
  : 'https://pure-wonder-production.up.railway.app/api';

export interface CreateSignatureRequest {
  mandateId: string;
  mandateText: string;
  signatureImageUrl?: string;
}

export interface MandateSignature {
  id: string;
  mandateId: string;
  verificationStatus: 'pending' | 'verified' | 'failed' | 'expired';
  signatureTimestamp: string;
  biometricType?: string;
  verifiedAt?: string;
  createdAt: string;
}

class SignatureService {
  private client = axios.create({
    baseURL: MANDATE_SERVICE_URL,
    headers: { 'Content-Type': 'application/json' },
  });

  private generateMandateHash(mandateText: string, timestamp: string): string {
    const data = `${mandateText}|${timestamp}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hexHash = Math.abs(hash).toString(16);
    return hexHash.padStart(64, '0').substring(0, 64);
  }

  async createSignature(request: CreateSignatureRequest): Promise<MandateSignature> {
    try {
      const user = await storageService.getUser();
      if (!user || !user.id) {
        throw new Error('User not logged in');
      }

      const hasKey = await publicKeyService.hasRegisteredKey();
      if (!hasKey) {
        await publicKeyService.registerPublicKey();
      }

      const keys = await publicKeyService.getUserPublicKeys();
      if (keys.length === 0) {
        throw new Error('No public key found. Please register a key first.');
      }

      const activeKey = keys[0];
      const timestamp = new Date().toISOString();
      const mandateHash = this.generateMandateHash(request.mandateText, timestamp);

      const signingResult = await secureElementService.signData(
        mandateHash,
        'Sign mandate to authorize AI agent'
      );

      const deviceInfo = {
        platform: require('react-native').Platform.OS,
        version: require('react-native').Platform.Version,
      };

      const response = await this.client.post<{
        success: boolean;
        data: MandateSignature;
      }>('/signatures/create', {
        mandateId: request.mandateId,
        userId: user.id,
        publicKeyId: activeKey.keyId,
        mandateText: request.mandateText,
        mandateHash,
        signatureData: signingResult.signature,
        signatureImageUrl: request.signatureImageUrl,
        signatureTimestamp: signingResult.timestamp,
        deviceInfo,
        biometricType: signingResult.biometricType,
      });

      if (!response.data.success) {
        throw new Error('Failed to create signature');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error creating signature:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error(error.message || 'Failed to create signature');
    }
  }

  async getSignatureByMandate(mandateId: string): Promise<MandateSignature | null> {
    try {
      const response = await this.client.get<{
        success: boolean;
        data: MandateSignature;
      }>(`/signatures/mandate/${mandateId}`);

      if (!response.data.success || !response.data.data) {
        return null;
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error getting signature:', error);
      throw new Error(error.message || 'Failed to get signature');
    }
  }
}

export const signatureService = new SignatureService();
export default signatureService;
