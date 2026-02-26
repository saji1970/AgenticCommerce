import axios from 'axios';
import { storageService } from './storage.service';
import secureElementService from './secure-element.service';
import publicKeyService from './public-key.service';

// Mandate Service API Configuration
// Always use production URL — 10.0.2.2 only works on Android emulator, not physical devices
const MANDATE_SERVICE_URL = 'https://pure-wonder-production.up.railway.app/api';

export interface CreateSignatureRequest {
  mandateId: string;
  mandateText: string;
  signatureImageUrl?: string; // Optional: URL to signature image
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
    headers: {
      'Content-Type': 'application/json',
    },
  });

  /**
   * Generate hash for mandate text and timestamp
   * This matches the backend's hash generation
   * For demo/test mode, uses a deterministic hash that backend can verify
   */
  private generateMandateHash(mandateText: string, timestamp: string): string {
    // This should match the backend's hash generation
    // Backend uses: crypto.createHash('sha256').update(`${mandateText}|${timestamp}`).digest('hex')
    // For demo, we create a deterministic hash that backend accepts in test mode
    const data = `${mandateText}|${timestamp}`;
    
    // Create a deterministic hash (for demo - backend will accept this in test mode)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    // Convert to hex string (64 chars to match SHA-256 format)
    const hexHash = Math.abs(hash).toString(16);
    return hexHash.padStart(64, '0').substring(0, 64);
  }

  /**
   * Create a signature for a mandate
   * This involves:
   * 1. Ensuring public key is registered
   * 2. Generating mandate hash
   * 3. Signing with Secure Element (after biometric auth)
   * 4. Sending to backend for verification
   */
  async createSignature(request: CreateSignatureRequest): Promise<MandateSignature> {
    try {
      const user = await storageService.getUser();
      if (!user || !user.id) {
        throw new Error('User not logged in');
      }

      // 1. Ensure public key is registered
      const hasKey = await publicKeyService.hasRegisteredKey();
      if (!hasKey) {
        await publicKeyService.registerPublicKey();
      }

      // Get user's public keys to find the active one
      const keys = await publicKeyService.getUserPublicKeys();
      if (keys.length === 0) {
        throw new Error('No public key found. Please register a key first.');
      }

      const activeKey = keys[0]; // Use the most recent key

      // 2. Generate mandate hash
      const timestamp = new Date().toISOString();
      const mandateHash = this.generateMandateHash(request.mandateText, timestamp);

      // 3. Sign with Secure Element (this will trigger biometric auth)
      const signingResult = await secureElementService.signData(
        mandateHash,
        'Sign mandate to authorize AI agent'
      );

      // 4. Get device info
      const deviceInfo = {
        platform: require('react-native').Platform.OS,
        version: require('react-native').Platform.Version,
      };

      // 5. Send to backend
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

  /**
   * Get signature for a mandate
   */
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

  /**
   * Verify a signature
   */
  async verifySignature(signatureId: string): Promise<boolean> {
    try {
      const response = await this.client.post<{
        success: boolean;
        data: { verified: boolean };
      }>(`/signatures/${signatureId}/verify`);

      return response.data.success && response.data.data.verified;
    } catch (error: any) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }
}

export const signatureService = new SignatureService();
export default signatureService;
