import { MerchantRepository, CreateMerchantRequest, UpdateMerchantRequest } from '../repositories/merchant.repository';
import bcrypt from 'bcrypt';

export class MerchantService {
  private merchantRepository: MerchantRepository;

  constructor() {
    this.merchantRepository = new MerchantRepository();
  }

  async createMerchant(data: CreateMerchantRequest) {
    // Hash the API secret
    const hashedSecret = await bcrypt.hash(data.api_secret, 10);

    // Check if slug or api_key already exists
    const existingBySlug = await this.merchantRepository.getBySlug(data.slug);
    if (existingBySlug) {
      throw new Error('Merchant with this slug already exists');
    }

    const existingByApiKey = await this.merchantRepository.getByApiKey(data.api_key);
    if (existingByApiKey) {
      throw new Error('Merchant with this API key already exists');
    }

    return await this.merchantRepository.create({
      ...data,
      api_secret: hashedSecret,
    });
  }

  async getAllMerchants() {
    return await this.merchantRepository.getAll();
  }

  async getMerchant(id: string) {
    const merchant = await this.merchantRepository.getById(id);
    if (!merchant) {
      throw new Error('Merchant not found');
    }
    // Don't return the hashed secret
    const { api_secret, ...merchantWithoutSecret } = merchant;
    return merchantWithoutSecret;
  }

  async getMerchantBySlug(slug: string) {
    const merchant = await this.merchantRepository.getBySlug(slug);
    if (!merchant) {
      throw new Error('Merchant not found');
    }
    // Don't return the hashed secret
    const { api_secret, ...merchantWithoutSecret } = merchant;
    return merchantWithoutSecret;
  }

  async updateMerchant(id: string, data: UpdateMerchantRequest) {
    const merchant = await this.merchantRepository.getById(id);
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    return await this.merchantRepository.update(id, data);
  }

  async deleteMerchant(id: string) {
    const merchant = await this.merchantRepository.getById(id);
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    return await this.merchantRepository.delete(id);
  }

  async verifyApiKey(apiKey: string, apiSecret: string): Promise<boolean> {
    const merchant = await this.merchantRepository.getByApiKey(apiKey);
    if (!merchant) {
      return false;
    }

    return await bcrypt.compare(apiSecret, merchant.api_secret);
  }
}
