import { AP2WebhookRepository } from '../repositories/ap2-webhook.repository';
import {
  Merchant,
  AP2WebhookEvent,
  AP2WebhookPayload,
  AP2WebhookDelivery,
} from '@agentic-commerce/shared-types';
import crypto from 'crypto';
import axios from 'axios';

export class AP2WebhookService {
  private webhookRepository: AP2WebhookRepository;

  constructor() {
    this.webhookRepository = new AP2WebhookRepository();
  }

  async sendWebhook(
    merchant: Merchant,
    event: AP2WebhookEvent,
    data: any
  ): Promise<AP2WebhookDelivery | null> {
    // Check if merchant has webhook URL configured
    if (!merchant.webhookUrl) {
      return null;
    }

    // Check if merchant wants to receive this type of event
    if (!this.shouldNotify(merchant, event)) {
      return null;
    }

    // Create webhook payload
    const payload: AP2WebhookPayload = {
      event,
      merchantId: merchant.id,
      data,
      timestamp: new Date(),
      signature: '',
    };

    // Generate signature
    payload.signature = this.generateWebhookSignature(
      payload,
      merchant.webhookSecret || ''
    );

    // Create webhook delivery record
    const delivery = await this.webhookRepository.create(
      merchant.id,
      event,
      payload,
      merchant.webhookUrl
    );

    // Attempt immediate delivery (fire and forget)
    this.attemptDelivery(delivery, merchant).catch(error => {
      console.error('Webhook delivery failed:', error);
    });

    return delivery;
  }

  async processWebhookQueue(): Promise<void> {
    // Get pending webhooks
    const pendingWebhooks = await this.webhookRepository.getPendingDeliveries(10);

    // Process each webhook
    for (const webhook of pendingWebhooks) {
      try {
        // Get merchant info (we need webhook secret for verification)
        // For now, we'll attempt delivery without re-fetching merchant
        await this.attemptDelivery(webhook);
      } catch (error) {
        console.error(`Failed to deliver webhook ${webhook.id}:`, error);
      }
    }
  }

  private async attemptDelivery(
    delivery: AP2WebhookDelivery,
    merchant?: Merchant
  ): Promise<void> {
    try {
      const response = await axios.post(
        delivery.url,
        delivery.payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-AP2-Event': delivery.event,
            'X-AP2-Signature': delivery.payload.signature,
            'X-AP2-Timestamp': delivery.payload.timestamp.toString(),
          },
          timeout: 10000, // 10 second timeout
        }
      );

      // Mark as delivered if successful (2xx status)
      if (response.status >= 200 && response.status < 300) {
        await this.webhookRepository.recordAttempt(
          delivery.id,
          true,
          response.status,
          JSON.stringify(response.data)
        );
      } else {
        await this.webhookRepository.recordAttempt(
          delivery.id,
          false,
          response.status,
          JSON.stringify(response.data)
        );
      }
    } catch (error) {
      // Record failed attempt
      let status = 0;
      let responseBody = '';

      if (axios.isAxiosError(error)) {
        status = error.response?.status || 0;
        responseBody = JSON.stringify(error.response?.data || error.message);
      } else {
        responseBody = error instanceof Error ? error.message : 'Unknown error';
      }

      await this.webhookRepository.recordAttempt(
        delivery.id,
        false,
        status,
        responseBody
      );
    }
  }

  private generateWebhookSignature(payload: AP2WebhookPayload, secret: string): string {
    const data = {
      event: payload.event,
      merchantId: payload.merchantId,
      data: payload.data,
      timestamp: payload.timestamp,
    };

    const signaturePayload = JSON.stringify(data);

    return crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');
  }

  verifyWebhookSignature(
    payload: AP2WebhookPayload,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = this.generateWebhookSignature(payload, secret);
    return signature === expectedSignature;
  }

  private shouldNotify(merchant: Merchant, event: AP2WebhookEvent): boolean {
    const settings = merchant.settings;

    switch (event) {
      case AP2WebhookEvent.MANDATE_CREATED:
      case AP2WebhookEvent.MANDATE_APPROVED:
      case AP2WebhookEvent.MANDATE_SUSPENDED:
      case AP2WebhookEvent.MANDATE_REVOKED:
      case AP2WebhookEvent.MANDATE_EXPIRED:
        return settings.notifyOnMandateCreated;

      case AP2WebhookEvent.INTENT_CREATED:
      case AP2WebhookEvent.INTENT_APPROVED:
      case AP2WebhookEvent.INTENT_REJECTED:
      case AP2WebhookEvent.INTENT_EXECUTED:
      case AP2WebhookEvent.INTENT_EXPIRED:
        return settings.notifyOnIntentCreated;

      case AP2WebhookEvent.PAYMENT_INITIATED:
      case AP2WebhookEvent.PAYMENT_COMPLETED:
      case AP2WebhookEvent.PAYMENT_FAILED:
      case AP2WebhookEvent.PAYMENT_REFUNDED:
        return settings.notifyOnPaymentExecuted;

      case AP2WebhookEvent.CART_UPDATED:
        return true; // Always notify for cart updates

      default:
        return false;
    }
  }

  async getWebhookLogs(
    merchantId: string,
    options?: {
      event?: AP2WebhookEvent;
      delivered?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<AP2WebhookDelivery[]> {
    return await this.webhookRepository.getByMerchant(merchantId, options);
  }

  async getWebhookStats(merchantId: string, period: 'day' | 'week' | 'month') {
    return await this.webhookRepository.getDeliveryStats(merchantId, period);
  }

  async retryWebhook(webhookId: string): Promise<void> {
    const webhook = await this.webhookRepository.getById(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (webhook.deliveredAt) {
      throw new Error('Webhook already delivered');
    }

    await this.attemptDelivery(webhook);
  }
}
