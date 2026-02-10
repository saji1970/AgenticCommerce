import { useAuth } from '../contexts/AuthContext';

export function usePermissions() {
  const { user, isSuperAdmin, isMerchantAdmin } = useAuth();

  return {
    canManageMerchants: isSuperAdmin,
    canCreateMerchants: isSuperAdmin,
    canCreateUsers: isSuperAdmin || isMerchantAdmin,
    canManageAgents: isSuperAdmin || isMerchantAdmin,
    canViewAuditLogs: isSuperAdmin,
    canManageSettings: isSuperAdmin,
    canViewCertificates: isSuperAdmin,
    canViewEndUsers: isSuperAdmin,
    merchantId: user?.merchantId || null,
    role: user?.role || null,
  };
}
