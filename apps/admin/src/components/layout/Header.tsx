import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  merchant_admin: 'Merchant Admin',
  merchant_operator: 'Operator',
};

const roleBadgeColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  merchant_admin: 'bg-blue-100 text-blue-800',
  merchant_operator: 'bg-green-100 text-green-800',
};

export function Header() {
  const { user, logout } = useAuth();

  const roleLabel = user?.role ? roleLabels[user.role] || user.role : '';
  const badgeColor = user?.role ? roleBadgeColors[user.role] || 'bg-gray-100 text-gray-800' : '';

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
        {user?.merchantName && (
          <span className="text-sm text-gray-500">| {user.merchantName}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}>
          {roleLabel}
        </span>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span>{user?.firstName} {user?.lastName}</span>
          <span className="text-xs text-gray-400">({user?.email})</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
