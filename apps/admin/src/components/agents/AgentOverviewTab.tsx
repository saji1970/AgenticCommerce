import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi, certificatesApi } from '../../api/client';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  Alert,
  Input,
} from '../common';
import {
  Shield,
  Activity,
  FileText,
  Upload,
  XCircle,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import type { Certificate, MerchantAgent } from '../../types';

interface AgentOverviewTabProps {
  agentId: string;
  merchantAgent?: MerchantAgent;
  monitoring: any;
  agent: any;
}

export function AgentOverviewTab({ agentId, merchantAgent, monitoring, agent }: AgentOverviewTabProps) {
  const queryClient = useQueryClient();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [certificateToRevoke, setCertificateToRevoke] = useState<Certificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [certificatePem, setCertificatePem] = useState('');

  const { data: certificatesData } = useQuery({
    queryKey: ['agent', agentId, 'certificates'],
    queryFn: () => agentsApi.getCertificates(agentId),
    enabled: !!agentId,
  });

  const { data: transactionsData } = useQuery({
    queryKey: ['agent', agentId, 'transactions'],
    queryFn: () => agentsApi.getTransactions(agentId, { limit: 10 }),
    enabled: !!agentId,
  });

  const uploadCertMutation = useMutation({
    mutationFn: (certPem: string) => agentsApi.uploadCertificate(agentId, certPem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId, 'certificates'] });
      setIsUploadModalOpen(false);
      setCertificatePem('');
    },
  });

  const revokeCertMutation = useMutation({
    mutationFn: ({ certId, reason }: { certId: string; reason: string }) =>
      certificatesApi.revoke(certId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId, 'certificates'] });
      setIsRevokeDialogOpen(false);
      setCertificateToRevoke(null);
      setRevokeReason('');
    },
  });

  const certificates: Certificate[] = certificatesData?.certificates || [];
  const transactions = transactionsData?.transactions || [];

  const handleRevokeCertificate = (cert: Certificate) => {
    setCertificateToRevoke(cert);
    setIsRevokeDialogOpen(true);
  };

  return (
    <div className="space-y-6 pt-6">
      {/* Merchant-specific config card */}
      {merchantAgent && (
        <Card>
          <CardHeader>
            <CardTitle>Merchant Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <Badge variant={merchantAgent.isActive ? 'success' : 'default'}>
                    {merchantAgent.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Added</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(merchantAgent.createdAt).toLocaleDateString()}
                </dd>
              </div>
              {merchantAgent.config && Object.keys(merchantAgent.config).length > 0 && (
                <div className="col-span-full">
                  <dt className="text-sm font-medium text-gray-500">Configuration</dt>
                  <dd className="mt-1">
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                      {JSON.stringify(merchantAgent.config, null, 2)}
                    </pre>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Actions</p>
                <p className="text-2xl font-bold">{monitoring?.actions?.total || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-primary-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold">
                  {monitoring?.actions?.total
                    ? Math.round((monitoring.actions.successful / monitoring.actions.total) * 100)
                    : 0}%
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Mandates</p>
                <p className="text-2xl font-bold">{monitoring?.mandates?.total || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ${(monitoring?.intents?.totalValue || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <Activity className="h-8 w-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Info & Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Agent Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Agent Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{agent.agentName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">API Endpoint</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {agent.apiEndpoint || 'Not configured'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Unique Users</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {monitoring?.actions?.uniqueUsers || 0}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((cap: string) => (
                <Badge key={cap} variant="info">
                  {cap}
                </Badge>
              ))}
              {agent.capabilities.length === 0 && (
                <p className="text-sm text-gray-500">No capabilities defined</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {monitoring?.actions?.dailyActivity?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monitoring.actions.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="actionCount"
                  stroke="#2563eb"
                  name="Actions"
                />
                <Line
                  type="monotone"
                  dataKey="successCount"
                  stroke="#10b981"
                  name="Successful"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No activity data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Actions by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {monitoring?.actions?.byType?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monitoring.actions.byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="action" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No action data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Certificates</CardTitle>
          <Button size="sm" onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Certificate
          </Button>
        </CardHeader>
        <CardContent>
          {certificates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No certificates associated with this agent</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fingerprint</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((cert) => {
                  const isExpired = new Date(cert.notAfter) < new Date();
                  const isExpiringSoon =
                    !isExpired &&
                    new Date(cert.notAfter) <
                      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                  return (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {cert.fingerprint.substring(0, 16)}...
                        </code>
                      </TableCell>
                      <TableCell>{cert.subjectDn || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {new Date(cert.notAfter).toLocaleDateString()}
                          {isExpiringSoon && !isExpired && (
                            <Badge variant="warning" size="sm">
                              Expiring Soon
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cert.revokedAt ? (
                          <Badge variant="error">Revoked</Badge>
                        ) : isExpired ? (
                          <Badge variant="error">Expired</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!cert.revokedAt && !isExpired && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeCertificate(cert)}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tx.userName}</div>
                        <div className="text-sm text-gray-500">{tx.userEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>{tx.items?.length || 0} items</TableCell>
                    <TableCell>
                      ${tx.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.status === 'executed'
                            ? 'success'
                            : tx.status === 'pending'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Certificate Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Certificate"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Certificate PEM
            </label>
            <textarea
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              value={certificatePem}
              onChange={(e) => setCertificatePem(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => uploadCertMutation.mutate(certificatePem)}
              disabled={!certificatePem.trim()}
              isLoading={uploadCertMutation.isPending}
            >
              Upload
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Certificate Dialog */}
      <Modal
        isOpen={isRevokeDialogOpen}
        onClose={() => {
          setIsRevokeDialogOpen(false);
          setCertificateToRevoke(null);
          setRevokeReason('');
        }}
        title="Revoke Certificate"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            Revoking a certificate will immediately invalidate it. This action cannot be undone.
          </Alert>
          <Input
            label="Reason for revocation"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            placeholder="Enter reason..."
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsRevokeDialogOpen(false);
                setCertificateToRevoke(null);
                setRevokeReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                certificateToRevoke &&
                revokeCertMutation.mutate({
                  certId: certificateToRevoke.id,
                  reason: revokeReason,
                })
              }
              disabled={!revokeReason.trim()}
              isLoading={revokeCertMutation.isPending}
            >
              Revoke Certificate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
