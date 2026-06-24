import axios from 'axios';
import { DisputeRepository, Dispute } from '../repositories/dispute.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { MandateRepository, AgentMandate } from '../repositories/mandate.repository';
import { SignatureRepository, MandateSignature } from '../repositories/signature.repository';
import { auditLogService, AuditEntry } from './audit-log.service';
import { backendDataRepository } from '../repositories/backend-data.repository';

const disputeRepo = new DisputeRepository();
const transactionRepo = new TransactionRepository();
const mandateRepo = new MandateRepository();
const signatureRepo = new SignatureRepository();

export interface EvidencePack {
  transaction: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    type: string;
    isExceptional: boolean;
    isoFields: Record<string, string> | null;
    gatewayResponse: Record<string, any>;
    createdAt: string;
    processedAt: string | null;
  };
  consentChain: {
    mandateId: string;
    type: string;
    status: string;
    constraints: Record<string, any>;
    agentName: string;
    createdAt: string;
    signature?: {
      signatureData: string;
      biometricType: string | null;
      deviceInfo: Record<string, any> | null;
      verificationStatus: string;
      signatureTimestamp: string;
      mandateHash: string;
    } | null;
  }[];
  isoFields: Record<string, string>;
  spendingLimits: {
    vrpConsent: Record<string, any> | null;
    appMandate: Record<string, any> | null;
    merchantDefaults: Record<string, any> | null;
  };
  purchaseIntents: {
    id: string;
    items: any[];
    subtotal: number;
    tax: number;
    total: number;
    reasoning: string;
    status: string;
    createdAt: string;
  }[];
  auditTrail: {
    entries: AuditEntry[];
    chainIntegrity: { valid: boolean; brokenAt?: string };
  };
  generatedAt: string;
}

export class DisputeService {
  /**
   * Assemble a full evidence pack for a dispute by walking the mandate chain,
   * collecting signatures, ISO 8583 fields, audit trail, and purchase intents.
   */
  async assembleEvidencePack(disputeId: string): Promise<Dispute> {
    const dispute = await disputeRepo.getById(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    const transaction = await transactionRepo.getById(dispute.transactionId);
    if (!transaction) throw new Error('Transaction not found');

    // 1. Walk the mandate chain
    const consentChain: EvidencePack['consentChain'] = [];
    const chainMandateIds: string[] = [];

    if (transaction.mandateId) {
      await this.walkMandateChain(transaction.mandateId, consentChain, chainMandateIds);
    }

    // 2. Extract ISO 8583 fields from transaction
    const isoFields = this.extractIsoFields(transaction);

    // 3. Extract spending limits from mandate constraints
    const spendingLimits = this.extractSpendingLimits(consentChain);

    // 4. Fetch purchase intents from backend DB for all mandates in chain
    const purchaseIntents = await this.fetchPurchaseIntents(chainMandateIds);

    // 5. Fetch audit trail entries for all mandates in chain
    const auditEntries: AuditEntry[] = [];
    for (const mandateId of chainMandateIds) {
      const entries = await auditLogService.getByMandateId(mandateId, 200);
      auditEntries.push(...entries);
    }
    // Sort by date ascending for chronological order
    auditEntries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // 6. Verify chain integrity
    const chainIntegrity = await auditLogService.verifyChainIntegrity(1000);

    // 7. Assemble the evidence pack
    const evidencePack: EvidencePack = {
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        type: transaction.type,
        isExceptional: transaction.isExceptional,
        isoFields: isoFields,
        gatewayResponse: transaction.gatewayResponse,
        createdAt: transaction.createdAt.toISOString?.() ?? String(transaction.createdAt),
        processedAt: transaction.processedAt
          ? (transaction.processedAt.toISOString?.() ?? String(transaction.processedAt))
          : null,
      },
      consentChain,
      isoFields: isoFields || {},
      spendingLimits,
      purchaseIntents,
      auditTrail: {
        entries: auditEntries,
        chainIntegrity,
      },
      generatedAt: new Date().toISOString(),
    };

    // 8. Store evidence pack in dispute record
    const updated = await disputeRepo.update(disputeId, {
      evidencePack,
      status: dispute.status === 'open' ? 'investigating' : dispute.status,
    });

    return updated;
  }

  /**
   * Export dispute evidence as CSV string.
   */
  async exportCSV(disputeId: string): Promise<string> {
    const dispute = await disputeRepo.getById(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    const ep = dispute.evidencePack as EvidencePack;
    if (!ep?.transaction) {
      throw new Error('Evidence pack not assembled yet. Run assemble-evidence first.');
    }

    const rows: string[][] = [];

    // Header
    rows.push(['Section', 'Field', 'Value']);

    // Transaction
    rows.push(['Transaction', 'ID', ep.transaction.id]);
    rows.push(['Transaction', 'Amount', `${ep.transaction.amount} ${ep.transaction.currency}`]);
    rows.push(['Transaction', 'Status', ep.transaction.status]);
    rows.push(['Transaction', 'Type', ep.transaction.type]);
    rows.push(['Transaction', 'Exceptional', String(ep.transaction.isExceptional)]);
    rows.push(['Transaction', 'Created', ep.transaction.createdAt]);
    rows.push(['Transaction', 'Processed', ep.transaction.processedAt || 'N/A']);

    // ISO 8583 Fields
    if (ep.isoFields) {
      for (const [key, value] of Object.entries(ep.isoFields)) {
        rows.push(['ISO8583', key, value]);
      }
    }

    // Consent Chain
    for (const mandate of ep.consentChain || []) {
      rows.push(['ConsentChain', `${mandate.type} - ID`, mandate.mandateId]);
      rows.push(['ConsentChain', `${mandate.type} - Status`, mandate.status]);
      rows.push(['ConsentChain', `${mandate.type} - Agent`, mandate.agentName]);
      rows.push(['ConsentChain', `${mandate.type} - Created`, mandate.createdAt]);
      if (mandate.signature) {
        rows.push(['Signature', `${mandate.type} - BiometricType`, mandate.signature.biometricType || 'N/A']);
        rows.push(['Signature', `${mandate.type} - VerificationStatus`, mandate.signature.verificationStatus]);
        rows.push(['Signature', `${mandate.type} - Timestamp`, mandate.signature.signatureTimestamp]);
        rows.push(['Signature', `${mandate.type} - MandateHash`, mandate.signature.mandateHash]);
      }
    }

    // Spending Limits
    if (ep.spendingLimits) {
      for (const [tier, limits] of Object.entries(ep.spendingLimits)) {
        if (limits) {
          for (const [key, value] of Object.entries(limits)) {
            rows.push(['SpendingLimits', `${tier}.${key}`, String(value)]);
          }
        }
      }
    }

    // Purchase Intents
    for (const intent of ep.purchaseIntents || []) {
      rows.push(['PurchaseIntent', 'ID', intent.id]);
      rows.push(['PurchaseIntent', 'Total', String(intent.total)]);
      rows.push(['PurchaseIntent', 'Status', intent.status]);
      rows.push(['PurchaseIntent', 'Reasoning', intent.reasoning]);
      for (const item of intent.items || []) {
        rows.push(['PurchaseIntent', 'Item', `${item.productName || item.name} x${item.quantity} @ ${item.price}`]);
      }
    }

    // Audit Trail
    rows.push(['AuditTrail', 'ChainIntegrity', ep.auditTrail?.chainIntegrity?.valid ? 'VALID' : 'BROKEN']);
    if (ep.auditTrail?.chainIntegrity?.brokenAt) {
      rows.push(['AuditTrail', 'BrokenAt', ep.auditTrail.chainIntegrity.brokenAt]);
    }
    for (const entry of ep.auditTrail?.entries || []) {
      rows.push([
        'AuditEntry',
        entry.eventType,
        `${entry.description} | actor:${entry.actorType}:${entry.actorId} | ${entry.createdAt}`,
      ]);
    }

    // Dispute metadata
    rows.push(['Dispute', 'ID', dispute.id]);
    rows.push(['Dispute', 'Reason', dispute.reason]);
    rows.push(['Dispute', 'Amount', `${dispute.disputeAmount} ${dispute.currency}`]);
    rows.push(['Dispute', 'Status', dispute.status]);
    rows.push(['Dispute', 'ExternalCaseId', dispute.externalCaseId || 'N/A']);
    rows.push(['Dispute', 'GeneratedAt', ep.generatedAt]);

    // Convert to CSV
    return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  /**
   * Push evidence pack to an external BAU dispute system via webhook.
   */
  async pushToBAU(disputeId: string, webhookUrl: string): Promise<Dispute> {
    const dispute = await disputeRepo.getById(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    if (!dispute.evidencePack || !Object.keys(dispute.evidencePack).length) {
      throw new Error('Evidence pack not assembled yet. Run assemble-evidence first.');
    }

    try {
      const payload = {
        disputeId: dispute.id,
        transactionId: dispute.transactionId,
        reason: dispute.reason,
        amount: dispute.disputeAmount,
        currency: dispute.currency,
        externalCaseId: dispute.externalCaseId,
        evidencePack: dispute.evidencePack,
        pushedAt: new Date().toISOString(),
      };

      const response = await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      return await disputeRepo.update(disputeId, {
        bauPushStatus: 'pushed',
        bauPushResponse: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
        bauPushedAt: new Date(),
      });
    } catch (err: any) {
      const errorResponse = {
        error: err.message,
        status: err.response?.status,
        data: err.response?.data,
      };

      return await disputeRepo.update(disputeId, {
        bauPushStatus: 'failed',
        bauPushResponse: errorResponse,
      });
    }
  }

  // --- Private helpers ---

  private async walkMandateChain(
    mandateId: string,
    chain: EvidencePack['consentChain'],
    mandateIds: string[],
  ): Promise<void> {
    const mandate = await mandateRepo.getById(mandateId);
    if (!mandate) return;

    // Walk up to parent first (so chain is APP -> INTENT -> PAYMENT order)
    if (mandate.parentMandateId) {
      await this.walkMandateChain(mandate.parentMandateId, chain, mandateIds);
    }

    // Avoid duplicates
    if (mandateIds.includes(mandate.id)) return;
    mandateIds.push(mandate.id);

    // Get signature for this mandate
    const signature = await signatureRepo.getByMandateId(mandate.id);

    chain.push({
      mandateId: mandate.id,
      type: mandate.type,
      status: mandate.status,
      constraints: mandate.constraints || {},
      agentName: mandate.agentName,
      createdAt: mandate.createdAt.toISOString?.() ?? String(mandate.createdAt),
      signature: signature ? {
        signatureData: signature.signatureData,
        biometricType: signature.biometricType || null,
        deviceInfo: signature.deviceInfo || null,
        verificationStatus: signature.verificationStatus,
        signatureTimestamp: signature.signatureTimestamp.toISOString?.() ?? String(signature.signatureTimestamp),
        mandateHash: signature.mandateHash,
      } : null,
    });

    // Also walk down to children (intent/payment mandates under APP)
    if (mandate.type === 'app') {
      const children = await mandateRepo.getChildMandates(mandate.id);
      for (const child of children) {
        if (!mandateIds.includes(child.id)) {
          mandateIds.push(child.id);
          const childSig = await signatureRepo.getByMandateId(child.id);
          chain.push({
            mandateId: child.id,
            type: child.type,
            status: child.status,
            constraints: child.constraints || {},
            agentName: child.agentName,
            createdAt: child.createdAt.toISOString?.() ?? String(child.createdAt),
            signature: childSig ? {
              signatureData: childSig.signatureData,
              biometricType: childSig.biometricType || null,
              deviceInfo: childSig.deviceInfo || null,
              verificationStatus: childSig.verificationStatus,
              signatureTimestamp: childSig.signatureTimestamp.toISOString?.() ?? String(childSig.signatureTimestamp),
              mandateHash: childSig.mandateHash,
            } : null,
          });
        }
      }
    }
  }

  private extractIsoFields(transaction: any): Record<string, string> {
    const iso =
      transaction.gatewayResponse?.isoMessage ||
      transaction.metadata?.isoMessage ||
      {};

    const fields: Record<string, string> = {};
    const fieldKeys = [
      'MTI', 'DE2_PAN', 'DE2_NetworkToken', 'DE3_ProcessingCode',
      'DE4_Amount', 'DE7_TransmissionDateTime', 'DE11_STAN',
      'DE22_POSEntryMode', 'DE25_POSConditionCode',
      'DE41_TerminalId', 'DE42_MerchantId',
      'DE48_CoFIndicator', 'DE49_Currency',
      'DE63_OriginalCitRef', 'MandateId',
    ];

    for (const key of fieldKeys) {
      if (iso[key]) {
        fields[key] = String(iso[key]);
      }
    }

    return fields;
  }

  private extractSpendingLimits(chain: EvidencePack['consentChain']): EvidencePack['spendingLimits'] {
    let vrpConsent: Record<string, any> | null = null;
    let appMandate: Record<string, any> | null = null;

    for (const mandate of chain) {
      if (mandate.type === 'payment' && mandate.constraints?.checkoutMandate) {
        vrpConsent = {
          maxAmountPerPayment: mandate.constraints.maxAmountPerPayment ?? mandate.constraints.maxTransactionAmount ?? null,
          dailyLimit: mandate.constraints.dailyLimit ?? null,
          monthlyLimit: mandate.constraints.monthlyLimit ?? null,
        };
      }
      if (mandate.type === 'app') {
        appMandate = {
          maxTransactionAmount: mandate.constraints.maxTransactionAmount ?? null,
          dailySpendingLimit: mandate.constraints.dailySpendingLimit ?? null,
          monthlySpendingLimit: mandate.constraints.monthlySpendingLimit ?? null,
        };
      }
    }

    return {
      vrpConsent,
      appMandate,
      merchantDefaults: null, // Merchant defaults are not stored on mandates; would need merchant lookup
    };
  }

  private async fetchPurchaseIntents(mandateIds: string[]): Promise<EvidencePack['purchaseIntents']> {
    const allIntents: EvidencePack['purchaseIntents'] = [];
    for (const mandateId of mandateIds) {
      const intents = await backendDataRepository.getPurchaseIntentsByMandateId(mandateId);
      for (const intent of intents) {
        allIntents.push({
          id: intent.id,
          items: intent.items,
          subtotal: intent.subtotal,
          tax: intent.tax,
          total: intent.total,
          reasoning: intent.reasoning,
          status: intent.status,
          createdAt: intent.createdAt,
        });
      }
    }
    return allIntents;
  }
}

export const disputeService = new DisputeService();
