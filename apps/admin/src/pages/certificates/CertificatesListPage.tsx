import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { certificatesApi } from '../../api/client';
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
  Pagination,
  Modal,
  LoadingPage,
  EmptyState,
  Alert,
  Input,
} from '../../components/common';
import { Shield, AlertTriangle, XCircle, Calendar } from 'lucide-react';
import type { Certificate } from '../../types';

const ITEMS_PER_PAGE = 10;

export function CertificatesListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [certificateToRevoke, setCertificateToRevoke] = useState<Certificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['certificates', { page }],
    queryFn: () =>
      certificatesApi.getAll({
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      }),
  });

  const { data: expiringData } = useQuery({
    queryKey: ['certificates', 'expiring'],
    queryFn: () => certificatesApi.getExpiring(30),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ certId, reason }: { certId: string; reason: string }) =>
      certificatesApi.revoke(certId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      setIsRevokeModalOpen(false);
      setCertificateToRevoke(null);
      setRevokeReason('');
    },
  });

  if (isLoading) {
    return <LoadingPage message="Loading certificates..." />;
  }

  if (error) {
    return (
      <Alert variant="error" title="Error loading certificates">
        Failed to load certificates. Please try again.
      </Alert>
    );
  }

  const certificates: Certificate[] = data?.certificates || [];
  const pagination = data?.pagination || { total: 0, limit: ITEMS_PER_PAGE, offset: 0 };
  const totalPages = Math.ceil(pagination.total / ITEMS_PER_PAGE);
  const expiringCertificates: Certificate[] = expiringData?.certificates || [];

  const handleRevoke = (cert: Certificate) => {
    setCertificateToRevoke(cert);
    setIsRevokeModalOpen(true);
  };

  const getCertificateStatus = (cert: Certificate) => {
    if (cert.revokedAt) {
      return <Badge variant="error">Revoked</Badge>;
    }
    const now = new Date();
    const expiry = new Date(cert.notAfter);
    if (expiry < now) {
      return <Badge variant="error">Expired</Badge>;
    }
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (expiry < thirtyDays) {
      return <Badge variant="warning">Expiring Soon</Badge>;
    }
    return <Badge variant="success">Active</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
        <p className="text-gray-500">Manage CA certificates across the platform</p>
      </div>

      {/* Expiring Certificates Alert */}
      {expiringCertificates.length > 0 && (
        <Alert variant="warning" title="Certificates Expiring Soon">
          <div className="mt-2">
            <p>{expiringCertificates.length} certificate(s) will expire within the next 30 days:</p>
            <ul className="mt-2 list-disc list-inside text-sm">
              {expiringCertificates.slice(0, 5).map((cert) => (
                <li key={cert.id}>
                  {cert.subjectDn || cert.fingerprint.substring(0, 16)} - expires{' '}
                  {new Date(cert.notAfter).toLocaleDateString()}
                </li>
              ))}
              {expiringCertificates.length > 5 && (
                <li>... and {expiringCertificates.length - 5} more</li>
              )}
            </ul>
          </div>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Certificates</p>
                <p className="text-2xl font-bold">{pagination.total}</p>
              </div>
              <Shield className="h-8 w-8 text-primary-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {certificates.filter((c) => !c.revokedAt && new Date(c.notAfter) > new Date()).length}
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
                <p className="text-sm text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {expiringCertificates.length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revoked</p>
                <p className="text-2xl font-bold text-red-600">
                  {certificates.filter((c) => c.revokedAt).length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Certificates Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Certificates</CardTitle>
        </CardHeader>
        {certificates.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-12 w-12" />}
            title="No certificates found"
            description="No certificates have been issued yet"
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fingerprint</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Issuer</TableHead>
                  <TableHead>Valid From</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {cert.fingerprint.substring(0, 20)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={cert.subjectDn || '-'}>
                        {cert.subjectDn || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={cert.issuerDn || '-'}>
                        {cert.issuerDn || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(cert.notBefore).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(cert.notAfter).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{getCertificateStatus(cert)}</TableCell>
                    <TableCell className="text-right">
                      {!cert.revokedAt && new Date(cert.notAfter) > new Date() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(cert)}
                        >
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={pagination.total}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            )}
          </>
        )}
      </Card>

      {/* Revoke Modal */}
      <Modal
        isOpen={isRevokeModalOpen}
        onClose={() => {
          setIsRevokeModalOpen(false);
          setCertificateToRevoke(null);
          setRevokeReason('');
        }}
        title="Revoke Certificate"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            Revoking a certificate will immediately invalidate it. This action cannot be undone.
          </Alert>
          {certificateToRevoke && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Certificate</p>
              <code className="text-sm">{certificateToRevoke.fingerprint}</code>
            </div>
          )}
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
                setIsRevokeModalOpen(false);
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
                revokeMutation.mutate({
                  certId: certificateToRevoke.id,
                  reason: revokeReason,
                })
              }
              disabled={!revokeReason.trim()}
              isLoading={revokeMutation.isPending}
            >
              Revoke Certificate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
