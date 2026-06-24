import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disputesApi } from '../../api/client';
import { Modal, Badge, Button, LoadingPage, Select, Alert } from '../common';
import {
  Shield,
  FileText,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Link,
  Key,
  Activity,
  ShoppingCart,
  DollarSign,
} from 'lucide-react';
import type { Dispute } from '../../types';

interface DisputeDetailModalProps {
  disputeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'evidence_submitted', label: 'Evidence Submitted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'closed', label: 'Closed' },
];

export function DisputeDetailModal({ disputeId, isOpen, onClose }: DisputeDetailModalProps) {
  const queryClient = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [externalCaseId, setExternalCaseId] = useState('');
  const [activeSection, setActiveSection] = useState<string>('chain');

  const { data, isLoading } = useQuery({
    queryKey: ['dispute-detail', disputeId],
    queryFn: () => disputesApi.getById(disputeId!),
    enabled: !!disputeId && isOpen,
  });

  const dispute = data?.data as Dispute | undefined;
  const ep = dispute?.evidencePack as any;

  const assembleMutation = useMutation({
    mutationFn: () => disputesApi.assembleEvidence(disputeId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dispute-detail', disputeId] }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { status?: string; notes?: string; externalCaseId?: string }) =>
      disputesApi.update(disputeId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute-detail', disputeId] });
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
  });

  const pushBAUMutation = useMutation({
    mutationFn: () => disputesApi.pushToBAU(disputeId!, webhookUrl),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dispute-detail', disputeId] }),
  });

  const handleExportCSV = async () => {
    try {
      const blob = await disputesApi.exportCSV(disputeId!);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `dispute-${disputeId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  const statusVariant = (s: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      open: 'warning',
      investigating: 'info',
      evidence_submitted: 'default',
      won: 'success',
      lost: 'error',
      closed: 'default',
    };
    return map[s] || 'default';
  };

  const bauVariant = (s: string): 'success' | 'warning' | 'error' | 'default' => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      pending: 'warning',
      pushed: 'success',
      failed: 'error',
      not_required: 'default',
    };
    return map[s] || 'default';
  };

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleString() : '-';

  const sections = [
    { id: 'chain', label: 'Consent Chain', icon: Link },
    { id: 'signatures', label: 'Signatures', icon: Key },
    { id: 'iso', label: 'ISO 8583', icon: FileText },
    { id: 'limits', label: 'Spending Limits', icon: DollarSign },
    { id: 'intents', label: 'Purchase Intents', icon: ShoppingCart },
    { id: 'audit', label: 'Audit Trail', icon: Activity },
    { id: 'actions', label: 'Actions', icon: Shield },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dispute Detail" size="3xl">
      {isLoading || !dispute ? (
        <LoadingPage message="Loading dispute..." />
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={statusVariant(dispute.status)}>{dispute.status}</Badge>
            <Badge variant={bauVariant(dispute.bauPushStatus)}>BAU: {dispute.bauPushStatus}</Badge>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{dispute.id}</code>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-4">
            <div>
              <span className="text-gray-500">Reason:</span>{' '}
              <span className="font-medium">{dispute.reason}</span>
            </div>
            <div>
              <span className="text-gray-500">Amount:</span>{' '}
              <span className="font-semibold">${dispute.disputeAmount.toFixed(2)} {dispute.currency}</span>
            </div>
            <div>
              <span className="text-gray-500">Transaction:</span>{' '}
              <code className="text-xs">{dispute.transactionId.slice(0, 8)}...</code>
            </div>
            <div>
              <span className="text-gray-500">External Case:</span>{' '}
              {dispute.externalCaseId || '-'}
            </div>
            <div>
              <span className="text-gray-500">Created:</span> {formatDate(dispute.createdAt)}
            </div>
            <div>
              <span className="text-gray-500">Resolved:</span> {formatDate(dispute.resolvedAt)}
            </div>
            {dispute.notes && (
              <div className="col-span-2">
                <span className="text-gray-500">Notes:</span> {dispute.notes}
              </div>
            )}
          </div>

          {/* Evidence not assembled yet */}
          {(!ep || !ep.transaction) && (
            <Alert variant="warning" title="Evidence not assembled">
              Click "Assemble Evidence" to collect the mandate chain, signatures, ISO fields, and audit trail.
            </Alert>
          )}

          {/* Section Tabs */}
          <div className="flex flex-wrap gap-1 border-b pb-2">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                  activeSection === s.id
                    ? 'bg-primary-100 text-primary-700 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            ))}
          </div>

          {/* Consent Chain */}
          {activeSection === 'chain' && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Consent Chain</h3>
              {ep?.consentChain?.length > 0 ? (
                <div className="space-y-2">
                  {ep.consentChain.map((m: any, i: number) => (
                    <div key={m.mandateId} className="flex items-start gap-3">
                      {i > 0 && <div className="text-gray-400 text-lg mt-1">&rarr;</div>}
                      <div className={`flex-1 rounded-lg p-3 border ${
                        m.type === 'app' ? 'bg-blue-50 border-blue-200' :
                        m.type === 'intent' ? 'bg-purple-50 border-purple-200' :
                        'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">{m.type.toUpperCase()}</Badge>
                          <Badge variant={m.status === 'active' ? 'success' : 'default'}>{m.status}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          <div>ID: <code>{m.mandateId.slice(0, 12)}...</code></div>
                          <div>Agent: {m.agentName}</div>
                          <div>Created: {formatDate(m.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No consent chain data. Assemble evidence first.</p>
              )}
            </div>
          )}

          {/* Signatures */}
          {activeSection === 'signatures' && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Signatures & Biometrics</h3>
              {ep?.consentChain?.some((m: any) => m.signature) ? (
                <div className="space-y-2">
                  {ep.consentChain
                    .filter((m: any) => m.signature)
                    .map((m: any) => (
                      <div key={m.mandateId} className="bg-gray-50 rounded-lg p-3 border text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{m.type.toUpperCase()} Mandate</span>
                          <code className="text-xs">{m.mandateId.slice(0, 12)}...</code>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Biometric Type:</span>{' '}
                            {m.signature.biometricType || 'N/A'}
                          </div>
                          <div>
                            <span className="text-gray-500">Verification:</span>{' '}
                            <Badge
                              variant={m.signature.verificationStatus === 'verified' ? 'success' : 'warning'}
                            >
                              {m.signature.verificationStatus}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-gray-500">Timestamp:</span>{' '}
                            {formatDate(m.signature.signatureTimestamp)}
                          </div>
                          <div>
                            <span className="text-gray-500">Mandate Hash:</span>{' '}
                            <code className="text-xs">{m.signature.mandateHash?.slice(0, 16)}...</code>
                          </div>
                          {m.signature.deviceInfo && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Device:</span>{' '}
                              {JSON.stringify(m.signature.deviceInfo)}
                            </div>
                          )}
                        </div>
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">Raw Signature Data</summary>
                          <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                            {m.signature.signatureData}
                          </pre>
                        </details>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No signatures found. Assemble evidence first.</p>
              )}
            </div>
          )}

          {/* ISO 8583 Fields */}
          {activeSection === 'iso' && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">ISO 8583 Fields</h3>
              {ep?.isoFields && Object.keys(ep.isoFields).length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Field</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(ep.isoFields).map(([key, value]) => (
                        <tr key={key} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs">{key}</td>
                          <td className="px-3 py-2 font-mono text-xs">{String(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No ISO 8583 fields. Assemble evidence first.</p>
              )}
            </div>
          )}

          {/* Spending Limits */}
          {activeSection === 'limits' && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Spending Limits</h3>
              {ep?.spendingLimits ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { key: 'vrpConsent', label: 'VRP Consent', color: 'green' },
                    { key: 'appMandate', label: 'APP Mandate', color: 'blue' },
                    { key: 'merchantDefaults', label: 'Merchant Defaults', color: 'gray' },
                  ].map(({ key, label, color }) => (
                    <div key={key} className={`bg-${color}-50 rounded-lg p-3 border border-${color}-200`}>
                      <h4 className="text-xs font-semibold uppercase text-gray-600 mb-2">{label}</h4>
                      {ep.spendingLimits[key] ? (
                        <div className="space-y-1 text-xs">
                          {Object.entries(ep.spendingLimits[key]).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-gray-500">{k}:</span>{' '}
                              <span className="font-medium">{v != null ? String(v) : 'None'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Not available</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No spending limits data. Assemble evidence first.</p>
              )}
            </div>
          )}

          {/* Purchase Intents */}
          {activeSection === 'intents' && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Purchase Intents</h3>
              {ep?.purchaseIntents?.length > 0 ? (
                <div className="space-y-2">
                  {ep.purchaseIntents.map((intent: any) => (
                    <div key={intent.id} className="bg-gray-50 rounded-lg p-3 border text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <code className="text-xs">{intent.id.slice(0, 12)}...</code>
                        <Badge variant={intent.status === 'executed' ? 'success' : 'warning'}>
                          {intent.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">{intent.reasoning}</div>
                      <div className="space-y-1">
                        {intent.items?.map((item: any, i: number) => (
                          <div key={i} className="text-xs">
                            {item.productName || item.name} x{item.quantity} @ ${item.price}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs font-medium">
                        Total: ${intent.total?.toFixed(2)} (subtotal: ${intent.subtotal?.toFixed(2)}, tax: ${intent.tax?.toFixed(2)})
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No purchase intents found.</p>
              )}
            </div>
          )}

          {/* Audit Trail */}
          {activeSection === 'audit' && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Audit Trail</h3>
              {ep?.auditTrail ? (
                <>
                  <div className={`flex items-center gap-2 text-sm p-2 rounded ${
                    ep.auditTrail.chainIntegrity?.valid
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {ep.auditTrail.chainIntegrity?.valid ? (
                      <><CheckCircle className="h-4 w-4" /> Hash chain integrity: VALID</>
                    ) : (
                      <><XCircle className="h-4 w-4" /> Hash chain integrity: BROKEN at {ep.auditTrail.chainIntegrity?.brokenAt}</>
                    )}
                  </div>
                  {ep.auditTrail.entries?.length > 0 ? (
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      <div className="divide-y divide-gray-100">
                        {ep.auditTrail.entries.map((entry: any) => (
                          <div key={entry.id} className="px-3 py-2 text-xs hover:bg-gray-50">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  entry.severity === 'critical' ? 'error' :
                                  entry.severity === 'warning' ? 'warning' : 'default'
                                }
                              >
                                {entry.eventType}
                              </Badge>
                              <span className="text-gray-400">{formatDate(entry.createdAt)}</span>
                            </div>
                            <div className="mt-1 text-gray-600">{entry.description}</div>
                            <div className="text-gray-400">
                              Actor: {entry.actorType}:{entry.actorId}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No audit entries found.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">No audit trail. Assemble evidence first.</p>
              )}
            </div>
          )}

          {/* Actions */}
          {activeSection === 'actions' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Actions</h3>

              {/* Assemble & Export */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => assembleMutation.mutate()}
                  disabled={assembleMutation.isPending}
                >
                  <FileText className="h-4 w-4 mr-1 inline" />
                  {assembleMutation.isPending ? 'Assembling...' : 'Assemble Evidence'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={!ep?.transaction}
                >
                  <Download className="h-4 w-4 mr-1 inline" />
                  Export CSV
                </Button>
              </div>

              {assembleMutation.isError && (
                <Alert variant="error" title="Evidence assembly failed">
                  {(assembleMutation.error as any)?.response?.data?.error || 'Unknown error'}
                </Alert>
              )}

              {/* BAU Push */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Push to BAU System</h4>
                <div className="flex gap-2">
                  <input
                    type="url"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://webhook.example.com/disputes"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => pushBAUMutation.mutate()}
                    disabled={!webhookUrl || pushBAUMutation.isPending || !ep?.transaction}
                  >
                    <Send className="h-4 w-4 mr-1 inline" />
                    {pushBAUMutation.isPending ? 'Pushing...' : 'Push'}
                  </Button>
                </div>
                {dispute.bauPushResponse && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600">Last BAU Response</summary>
                    <pre className="mt-1 bg-white p-2 rounded border overflow-auto max-h-32">
                      {JSON.stringify(dispute.bauPushResponse, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              {/* Update Status */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Update Dispute</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Status</label>
                    <Select
                      options={STATUS_OPTIONS}
                      value={newStatus || dispute.status}
                      onChange={(e) => setNewStatus(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">External Case ID</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={externalCaseId || dispute.externalCaseId || ''}
                      onChange={(e) => setExternalCaseId(e.target.value)}
                      placeholder="VISA-12345"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={2}
                    value={newNotes || dispute.notes || ''}
                    onChange={(e) => setNewNotes(e.target.value)}
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const data: any = {};
                    if (newStatus && newStatus !== dispute.status) data.status = newStatus;
                    if (newNotes !== (dispute.notes || '')) data.notes = newNotes;
                    if (externalCaseId && externalCaseId !== (dispute.externalCaseId || '')) data.externalCaseId = externalCaseId;
                    if (Object.keys(data).length > 0) {
                      updateMutation.mutate(data);
                    }
                  }}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
