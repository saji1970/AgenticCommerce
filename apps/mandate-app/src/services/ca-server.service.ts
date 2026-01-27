/**
 * CA Server Service
 * REST API client for communicating with Certificate Authority server
 *
 * Endpoints:
 * POST   /certificates/issue     - Request new certificate
 * POST   /certificates/revoke    - Revoke certificate
 * GET    /certificates/validate  - Validate certificate chain
 * GET    /certificates/status    - Get certificate status
 * GET    /ca/root                - Fetch CA root certificate
 * GET    /ca/health              - Health check
 */

export interface CAServerConfig {
  serverUrl: string;
  port?: string;
  apiKey: string;
}

export interface CSR {
  commonName: string;
  organization?: string;
  organizationalUnit?: string;
  country?: string;
  state?: string;
  locality?: string;
  emailAddress?: string;
  publicKey: string; // PEM-encoded public key
}

export interface IssuedCertificate {
  certificateId: string;
  certificatePem: string;
  privateKeyPem?: string; // Only if server generates key pair
  publicKeyPem: string;
  fingerprint: string;
  issuer: string;
  subject: string;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
  chain?: string[]; // Intermediate certificates
}

export interface CertificateStatus {
  certificateId: string;
  fingerprint: string;
  status: 'valid' | 'expired' | 'revoked' | 'pending' | 'unknown';
  notBefore: string;
  notAfter: string;
  revokedAt?: string;
  revokedReason?: string;
}

export interface RootCertificate {
  certificatePem: string;
  fingerprint: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  publicKeyPem: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  chain?: {
    subject: string;
    issuer: string;
    notAfter: string;
  }[];
}

export interface RevocationRequest {
  certificateId: string;
  reason: 'unspecified' | 'keyCompromise' | 'affiliationChanged' | 'superseded' | 'cessationOfOperation' | 'privilegeWithdrawn';
}

export interface RevocationResult {
  success: boolean;
  revokedAt: string;
  message?: string;
}

class CAServerService {
  private config: CAServerConfig | null = null;

  /**
   * Configure the CA server connection
   */
  configure(config: CAServerConfig): void {
    this.config = config;
  }

  /**
   * Get the base URL for API calls
   */
  private getBaseUrl(): string {
    if (!this.config) {
      throw new Error('CA server not configured. Call configure() first.');
    }
    const { serverUrl, port } = this.config;
    return port ? `${serverUrl}:${port}` : serverUrl;
  }

  /**
   * Make an authenticated request to the CA server
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: object
  ): Promise<T> {
    if (!this.config) {
      throw new Error('CA server not configured');
    }

    const url = `${this.getBaseUrl()}${endpoint}`;
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CA server error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Test connection to CA server
   */
  async testConnection(config: CAServerConfig): Promise<{ success: boolean; message: string; serverInfo?: object }> {
    try {
      const baseUrl = config.port ? `${config.serverUrl}:${config.port}` : config.serverUrl;
      const response = await fetch(`${baseUrl}/ca/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Connection successful',
          serverInfo: data,
        };
      } else {
        return {
          success: false,
          message: `Server returned status ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Connection failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Fetch the CA root certificate
   */
  async fetchRootCertificate(): Promise<RootCertificate> {
    return this.request<RootCertificate>('GET', '/ca/root');
  }

  /**
   * Request a new certificate from the CA
   */
  async requestCertificate(csr: CSR): Promise<IssuedCertificate> {
    return this.request<IssuedCertificate>('POST', '/certificates/issue', { csr });
  }

  /**
   * Revoke a certificate
   */
  async revokeCertificate(request: RevocationRequest): Promise<RevocationResult> {
    return this.request<RevocationResult>('POST', '/certificates/revoke', request);
  }

  /**
   * Validate a certificate against the CA
   */
  async validateCertificate(certificatePem: string): Promise<ValidationResult> {
    return this.request<ValidationResult>('POST', '/certificates/validate', { certificate: certificatePem });
  }

  /**
   * Get certificate status by ID or fingerprint
   */
  async getCertificateStatus(identifier: string): Promise<CertificateStatus> {
    return this.request<CertificateStatus>('GET', `/certificates/status?id=${encodeURIComponent(identifier)}`);
  }

  /**
   * Get the server's public key for payload encryption
   */
  async getServerPublicKey(): Promise<{ publicKeyPem: string; keyId: string }> {
    return this.request<{ publicKeyPem: string; keyId: string }>('GET', '/ca/public-key');
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return this.config !== null && !!this.config.serverUrl && !!this.config.apiKey;
  }
}

export const caServerService = new CAServerService();
export default caServerService;
