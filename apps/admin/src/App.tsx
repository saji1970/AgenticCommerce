import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth, AdminRole } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MerchantsListPage } from './pages/merchants/MerchantsListPage';
import { MerchantDetailPage } from './pages/merchants/MerchantDetailPage';
import { MerchantAppProfilePage } from './pages/merchants/MerchantAppProfilePage';
import { CertificatesListPage } from './pages/certificates/CertificatesListPage';
import { UsersListPage } from './pages/users/UsersListPage';
import { UserDetailPage } from './pages/users/UserDetailPage';
import { AuditLogsPage } from './pages/audit/AuditLogsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { AdminUsersPage } from './pages/admin-users/AdminUsersPage';
import { MandatesListPage } from './pages/mandates/MandatesListPage';
import { TransactionsListPage } from './pages/transactions/TransactionsListPage';
import { LoadingPage } from './components/common';

function ProtectedRoute({ children, requiredRoles }: { children: React.ReactNode; requiredRoles?: AdminRole[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingPage message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AgentTabRedirect({ tab }: { tab: string }) {
  const { id, agentId } = useParams<{ id: string; agentId: string }>();
  return <Navigate to={`/merchants/${id}/apps/${agentId}?tab=${tab}`} replace />;
}

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage message="Loading..." />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Merchants - super_admin sees list, merchant_admin/operator sees own */}
      <Route
        path="/merchants"
        element={
          <ProtectedRoute requiredRoles={['super_admin']}>
            <MerchantsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchants/:id"
        element={
          <ProtectedRoute requiredRoles={['super_admin', 'merchant_admin']}>
            <MerchantDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchants/:id/apps/:agentId"
        element={
          <ProtectedRoute requiredRoles={['super_admin', 'merchant_admin']}>
            <MerchantAppProfilePage />
          </ProtectedRoute>
        }
      />
      {/* Backward-compatible redirects to tabbed view */}
      <Route
        path="/merchants/:id/apps/:agentId/mandates"
        element={<AgentTabRedirect tab="mandates" />}
      />
      <Route
        path="/merchants/:id/apps/:agentId/intents"
        element={<AgentTabRedirect tab="intents" />}
      />
      <Route
        path="/merchants/:id/apps/:agentId/transactions"
        element={<AgentTabRedirect tab="transactions" />}
      />

      {/* Admin Users */}
      <Route
        path="/admin-users"
        element={
          <ProtectedRoute requiredRoles={['super_admin', 'merchant_admin']}>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />

      {/* Mandates - all roles */}
      <Route
        path="/mandates"
        element={
          <ProtectedRoute>
            <MandatesListPage />
          </ProtectedRoute>
        }
      />

      {/* Transactions - all roles */}
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <TransactionsListPage />
          </ProtectedRoute>
        }
      />

      {/* Certificates - super_admin only */}
      <Route
        path="/certificates"
        element={
          <ProtectedRoute requiredRoles={['super_admin']}>
            <CertificatesListPage />
          </ProtectedRoute>
        }
      />

      {/* End Users - super_admin only */}
      <Route
        path="/users"
        element={
          <ProtectedRoute requiredRoles={['super_admin']}>
            <UsersListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/:id"
        element={
          <ProtectedRoute requiredRoles={['super_admin']}>
            <UserDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Audit Logs - super_admin only */}
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute requiredRoles={['super_admin']}>
            <AuditLogsPage />
          </ProtectedRoute>
        }
      />

      {/* Settings - super_admin only */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute requiredRoles={['super_admin']}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
