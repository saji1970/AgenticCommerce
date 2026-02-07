import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
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
import { LoadingPage } from './components/common';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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

      <Route
        path="/merchants"
        element={
          <ProtectedRoute>
            <MerchantsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchants/:id"
        element={
          <ProtectedRoute>
            <MerchantDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchants/:id/apps/:agentId"
        element={
          <ProtectedRoute>
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

      <Route
        path="/certificates"
        element={
          <ProtectedRoute>
            <CertificatesListPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UsersListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/:id"
        element={
          <ProtectedRoute>
            <UserDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute>
            <AuditLogsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
