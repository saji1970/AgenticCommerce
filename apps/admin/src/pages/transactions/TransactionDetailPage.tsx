import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ap2Api } from '../../api/client';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  LoadingPage,
  Alert,
} from '../../components/common';
import {
  ArrowLeft,
  CreditCard,
  User,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface TransactionDetail {
  id: string;
  userId: string;
  merchantId?: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: Record<string, unknown>;
  requestedAt: string;
  authorizedAt?: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  merchant?: {
    id: string;
    name: string;
    businessName: string;
    email: string;
  };
}

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => ap2Api.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingPage message="Loading transaction details..." />;
  }

  if (error || !data?.transaction) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/transactions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Transactions
        </Button>
        <Alert variant="error" title="Error">
          Failed to load transaction details.
        </Alert>
      </div>
    );
  }

  const transaction: TransactionDetail = data.transaction;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      completed: 'success',
      processing: 'info',
      pending: 'warning',
      failed: 'error',
      refunded: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'info' | 'warning' | 'success'> = {
      payment: 'success',
      refund: 'warning',
      authorization: 'info',
    };
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return (
      <div>
        <div className="font-medium">{date.toLocaleDateString()}</div>
        <div className="text-sm text-gray-500">{date.toLocaleTimeString()}</div>
      </div>
    );
  };

  const timelineEvents = [
    {
      label: 'Requested',
      time: transaction.requestedAt,
      icon: Clock,
      color: 'text-blue-500',
    },
    {
      label: 'Authorized',
      time: transaction.authorizedAt,
      icon: CheckCircle,
      color: 'text-yellow-500',
    },
    {
      label: 'Completed',
      time: transaction.completedAt,
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      label: 'Failed',
      time: transaction.failedAt,
      icon: XCircle,
      color: 'text-red-500',
    },
  ].filter(event => event.time);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/transactions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-100 rounded-lg">
            <CreditCard className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction Details</h1>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                {transaction.id.substring(0, 8)}...
              </code>
              {getStatusBadge(transaction.status)}
              {getTypeBadge(transaction.type)}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Transaction Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Transaction ID</dt>
                <dd className="mt-1">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                    {transaction.id}
                  </code>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1">{getTypeBadge(transaction.type)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Amount</dt>
                <dd className="mt-1 text-2xl font-bold text-gray-900">
                  {transaction.amount.toLocaleString('en-US', {
                    style: 'currency',
                    currency: transaction.currency,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Currency</dt>
                <dd className="mt-1 text-sm text-gray-900">{transaction.currency}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">{getStatusBadge(transaction.status)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(transaction.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>
            {transaction.failureReason && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Failure Reason:</span>
                </div>
                <p className="mt-1 text-sm text-red-700">{transaction.failureReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timelineEvents.map((event, index) => {
                const Icon = event.icon;
                return (
                  <div key={event.label} className="flex gap-3">
                    <div className={`flex-shrink-0 ${event.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{event.label}</p>
                      {event.time && (
                        <p className="text-sm text-gray-500">
                          {new Date(event.time).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {timelineEvents.length === 0 && (
                <p className="text-sm text-gray-500">No timeline events available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User & Merchant Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <CardTitle>User Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {transaction.user.firstName} {transaction.user.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{transaction.user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">User ID</dt>
                <dd className="mt-1">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                    {transaction.user.id}
                  </code>
                </dd>
              </div>
            </dl>
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/users/${transaction.user.id}`)}
              >
                View User
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Merchant Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-gray-400" />
              <CardTitle>Merchant Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {transaction.merchant ? (
              <>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{transaction.merchant.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Business Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{transaction.merchant.businessName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{transaction.merchant.email}</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/merchants/${transaction.merchant!.id}`)}
                  >
                    View Merchant
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No merchant associated</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(transaction.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
