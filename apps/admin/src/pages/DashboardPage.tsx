import { useQuery } from '@tanstack/react-query';
import { dashboardApi, certificatesApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, LoadingPage, Alert } from '../components/common';
import {
  Building2,
  Bot,
  Users,
  FileText,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import type { DashboardStats, Certificate } from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: { value: number; isPositive: boolean };
}

function StatCard({ title, value, icon, description, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
            {trend && (
              <p className={`mt-1 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}% from last period
              </p>
            )}
          </div>
          <div className="p-3 bg-primary-100 rounded-lg text-primary-600">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();

  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: expiringCerts } = useQuery({
    queryKey: ['certificates', 'expiring'],
    queryFn: () => certificatesApi.getExpiring(30),
  });

  const stats: DashboardStats = statsData?.stats || {
    totalUsers: 0,
    totalMerchants: 0,
    totalAgents: 0,
    mandates: { byStatus: {}, byType: {}, total: 0 },
    intents: { byStatus: {}, total: 0 },
    spending: { totalSpent: 0 },
    activity: { recent: [] },
    ap2: { totalTransactions: 0, totalVolume: 0 },
  };

  const expiringCertificates: Certificate[] = expiringCerts?.certificates || [];

  // Prepare chart data
  const activityChartData = stats.activity.recent.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    actions: item.count,
  }));

  const mandateStatusData = Object.entries(stats.mandates.byStatus).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count,
  }));

  const intentStatusData = Object.entries(stats.intents.byStatus).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          {user?.merchantName
            ? `Overview for ${user.merchantName}`
            : 'Overview of your AgenticCommerce platform'}
        </p>
      </div>

      {/* Error Banner */}
      {statsError && (
        <Alert variant="warning" title="Unable to load some dashboard data">
          Some statistics could not be loaded. The data shown below may be incomplete.
        </Alert>
      )}

      {/* Alerts Section */}
      {expiringCertificates.length > 0 && (
        <Alert variant="warning" title="Certificates Expiring Soon">
          {expiringCertificates.length} certificate(s) will expire within the next 30 days.
          Review them in the Certificates section.
        </Alert>
      )}

      {statsLoading ? (
        <LoadingPage message="Loading dashboard..." />
      ) : (
        <>
          {/* Row 1: Platform Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Merchants"
              value={(stats.totalMerchants || 0).toLocaleString()}
              icon={<Building2 className="h-6 w-6" />}
            />
            <StatCard
              title="AI Agents"
              value={(stats.totalAgents || 0).toLocaleString()}
              icon={<Bot className="h-6 w-6" />}
            />
            <StatCard
              title="Users"
              value={stats.totalUsers.toLocaleString()}
              icon={<Users className="h-6 w-6" />}
            />
          </div>

          {/* Row 2: Aggregate Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Active Mandates"
              value={stats.mandates.total.toLocaleString()}
              icon={<FileText className="h-6 w-6" />}
              description={`${stats.mandates.byStatus.active || 0} active, across all agents`}
            />
            <StatCard
              title="Purchase Intents"
              value={stats.intents.total.toLocaleString()}
              icon={<ShoppingCart className="h-6 w-6" />}
              description={`${stats.intents.byStatus.pending || 0} pending, across all agents`}
            />
            <StatCard
              title="Total Volume"
              value={`$${(stats.spending.totalSpent || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              icon={<DollarSign className="h-6 w-6" />}
              description="Across all merchants and agents"
            />
          </div>

          {/* Row 3: AP2 Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              title="AP2 Transactions"
              value={stats.ap2.totalTransactions.toLocaleString()}
              icon={<TrendingUp className="h-6 w-6" />}
            />
            <StatCard
              title="AP2 Volume"
              value={`$${(stats.ap2.totalVolume || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              icon={<DollarSign className="h-6 w-6" />}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity (Last 7 Days)</CardTitle>
                <p className="text-sm text-gray-500">Aggregate across all merchants and agents</p>
              </CardHeader>
              <CardContent>
                {activityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={activityChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="actions"
                        stroke="#2563eb"
                        strokeWidth={2}
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

            {/* Mandate Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Mandates by Status</CardTitle>
                <p className="text-sm text-gray-500">Aggregate across all merchants and agents</p>
              </CardHeader>
              <CardContent>
                {mandateStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={mandateStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No mandate data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Intent Status Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Intents by Status</CardTitle>
              <p className="text-sm text-gray-500">Aggregate across all merchants and agents</p>
            </CardHeader>
            <CardContent>
              {intentStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={intentStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No intent data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Mandates by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  {Object.entries(stats.mandates.byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <dt className="text-sm text-gray-500 capitalize">{type}</dt>
                      <dd className="text-sm font-medium text-gray-900">{count}</dd>
                    </div>
                  ))}
                  {Object.keys(stats.mandates.byType).length === 0 && (
                    <p className="text-sm text-gray-500">No data</p>
                  )}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Intent Status</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  {Object.entries(stats.intents.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between">
                      <dt className="text-sm text-gray-500 capitalize">{status}</dt>
                      <dd className="text-sm font-medium text-gray-900">{count}</dd>
                    </div>
                  ))}
                  {Object.keys(stats.intents.byStatus).length === 0 && (
                    <p className="text-sm text-gray-500">No data</p>
                  )}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between items-center">
                    <dt className="text-sm text-gray-500">API Status</dt>
                    <dd className="flex items-center text-sm font-medium text-green-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                      Operational
                    </dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-sm text-gray-500">Database</dt>
                    <dd className="flex items-center text-sm font-medium text-green-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                      Connected
                    </dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-sm text-gray-500">Expiring Certs</dt>
                    <dd className={`text-sm font-medium ${expiringCertificates.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {expiringCertificates.length > 0 ? (
                        <span className="flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {expiringCertificates.length}
                        </span>
                      ) : (
                        'None'
                      )}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
