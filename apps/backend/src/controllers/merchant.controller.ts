import { Request, Response } from 'express';
import { MerchantRepository } from '../repositories/merchant.repository';
import { AP2TransactionRepository } from '../repositories/ap2-transaction.repository';
import { AP2WebhookService } from '../services/ap2-webhook.service';
import {
  CreateMerchantRequest,
  MerchantStatus,
  MerchantSettings,
} from '@agentic-commerce/shared-types';

export class MerchantController {
  private merchantRepository: MerchantRepository;
  private transactionRepository: AP2TransactionRepository;
  private webhookService: AP2WebhookService;

  constructor() {
    this.merchantRepository = new MerchantRepository();
    this.transactionRepository = new AP2TransactionRepository();
    this.webhookService = new AP2WebhookService();
  }

  registerMerchant = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: CreateMerchantRequest = req.body;

      // Check if merchant with this email already exists
      const existing = await this.merchantRepository.getByEmail(request.email);
      if (existing) {
        res.status(400).json({
          error: 'Merchant with this email already exists',
        });
        return;
      }

      // Create merchant
      const merchant = await this.merchantRepository.create(request);

      // Return merchant details (excluding apiSecret for security)
      res.status(201).json({
        merchant: {
          id: merchant.id,
          name: merchant.name,
          businessName: merchant.businessName,
          email: merchant.email,
          website: merchant.website,
          status: merchant.status,
          tier: merchant.tier,
          apiKey: merchant.apiKey,
          apiSecret: merchant.apiSecret, // Include on registration only
          webhookUrl: merchant.webhookUrl,
          webhookSecret: merchant.webhookSecret, // Include on registration only
          settings: merchant.settings,
          createdAt: merchant.createdAt,
        },
        message: 'Merchant registered successfully. Please save your API credentials securely.',
      });
    } catch (error) {
      console.error('Error registering merchant:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to register merchant',
      });
    }
  };

  getMerchant = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId } = req.params;

      const merchant = await this.merchantRepository.getById(merchantId);

      if (!merchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }

      // Don't return apiSecret
      const { apiSecret, webhookSecret, ...merchantData } = merchant;

      res.json({ merchant: merchantData });
    } catch (error) {
      console.error('Error getting merchant:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get merchant',
      });
    }
  };

  updateMerchantStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId } = req.params;
      const { status } = req.body as { status: MerchantStatus };

      const merchant = await this.merchantRepository.updateStatus(merchantId, status);

      const { apiSecret, webhookSecret, ...merchantData } = merchant;

      res.json({
        merchant: merchantData,
        message: `Merchant status updated to ${status}`,
      });
    } catch (error) {
      console.error('Error updating merchant status:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update merchant status',
      });
    }
  };

  updateMerchantSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId } = req.params;
      const settings: Partial<MerchantSettings> = req.body;

      const merchant = await this.merchantRepository.updateSettings(merchantId, settings);

      const { apiSecret, webhookSecret, ...merchantData } = merchant;

      res.json({
        merchant: merchantData,
        message: 'Merchant settings updated successfully',
      });
    } catch (error) {
      console.error('Error updating merchant settings:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update merchant settings',
      });
    }
  };

  updateWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId } = req.params;
      const { webhookUrl } = req.body as { webhookUrl: string | null };

      const merchant = await this.merchantRepository.updateWebhook(merchantId, webhookUrl);

      res.json({
        merchant: {
          id: merchant.id,
          webhookUrl: merchant.webhookUrl,
          webhookSecret: merchant.webhookSecret, // Return new secret
        },
        message: 'Webhook configuration updated successfully',
      });
    } catch (error) {
      console.error('Error updating webhook:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update webhook',
      });
    }
  };

  rotateApiKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId } = req.params;

      const newKeys = await this.merchantRepository.rotateApiKeys(merchantId);

      res.json({
        ...newKeys,
        message: 'API keys rotated successfully. Please update your integration with the new keys.',
      });
    } catch (error) {
      console.error('Error rotating API keys:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to rotate API keys',
      });
    }
  };

  getTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId } = req.params;
      const { status, type, limit, offset } = req.query;

      const transactions = await this.transactionRepository.getByMerchant(merchantId, {
        status: status as any,
        type: type as any,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({ transactions });
    } catch (error) {
      console.error('Error getting transactions:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get transactions',
      });
    }
  };

  getAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId } = req.params;
      const { period } = req.query;

      // Get daily stats
      const dailyStats = await this.transactionRepository.getDailyStats(
        merchantId,
        new Date()
      );

      // Get monthly stats
      const now = new Date();
      const monthlyStats = await this.transactionRepository.getMonthlyStats(
        merchantId,
        now.getFullYear(),
        now.getMonth() + 1
      );

      // Get webhook stats
      const webhookStats = await this.webhookService.getWebhookStats(
        merchantId,
        (period as any) || 'day'
      );

      res.json({
        analytics: {
          today: dailyStats,
          thisMonth: monthlyStats,
          webhooks: webhookStats,
        },
      });
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get analytics',
      });
    }
  };

  getWebhookLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId } = req.params;
      const { event, delivered, limit, offset } = req.query;

      const webhooks = await this.webhookService.getWebhookLogs(merchantId, {
        event: event as any,
        delivered: delivered === 'true' ? true : delivered === 'false' ? false : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({ webhooks });
    } catch (error) {
      console.error('Error getting webhook logs:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get webhook logs',
      });
    }
  };
}
