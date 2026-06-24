import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Shield,
  Users,
  UserCog,
  FileText,
  Settings,
  CreditCard,
  RefreshCw,
  Bot,
  Wallet,
  SlidersHorizontal,
  AlertTriangle,
  Scale,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

export function Sidebar() {
  const { isSuperAdmin, isMerchantAdmin, isMerchantOperator, user } = useAuth();

  const navigation: NavItem[] = [];

  // Dashboard - all roles
  navigation.push({ name: 'Dashboard', href: '/', icon: LayoutDashboard });

  if (isSuperAdmin) {
    navigation.push({ name: 'Merchants & Agents', href: '/merchants', icon: Building2 });
    navigation.push({ name: 'AI Apps', href: '/ai-apps', icon: Bot });
    navigation.push({ name: 'Admin Users', href: '/admin-users', icon: UserCog });
    navigation.push({ name: 'End Users', href: '/users', icon: Users });
    navigation.push({ name: 'Mandates', href: '/mandates', icon: FileText });
    navigation.push({ name: 'VRP Consents', href: '/vrp-consents', icon: RefreshCw });
    navigation.push({ name: 'VRP Transactions', href: '/vrp-transactions', icon: AlertTriangle });
    navigation.push({ name: 'Payment Methods', href: '/payment-methods', icon: Wallet });
    navigation.push({ name: 'Transactions', href: '/transactions', icon: CreditCard });
    navigation.push({ name: 'Disputes', href: '/disputes', icon: Scale });
    navigation.push({ name: 'Default Limits', href: '/default-limits', icon: SlidersHorizontal });
    navigation.push({ name: 'Certificates', href: '/certificates', icon: Shield });
    navigation.push({ name: 'Audit Logs', href: '/audit-logs', icon: FileText });
    navigation.push({ name: 'Settings', href: '/settings', icon: Settings });
  } else if (isMerchantAdmin) {
    navigation.push({ name: 'My Merchant', href: user?.merchantId ? `/merchants/${user.merchantId}` : '/merchants', icon: Building2 });
    navigation.push({ name: 'AI Apps', href: '/ai-apps', icon: Bot });
    navigation.push({ name: 'Team Members', href: '/admin-users', icon: UserCog });
    navigation.push({ name: 'Mandates', href: '/mandates', icon: FileText });
    navigation.push({ name: 'VRP Consents', href: '/vrp-consents', icon: RefreshCw });
    navigation.push({ name: 'VRP Transactions', href: '/vrp-transactions', icon: AlertTriangle });
    navigation.push({ name: 'Payment Methods', href: '/payment-methods', icon: Wallet });
    navigation.push({ name: 'Transactions', href: '/transactions', icon: CreditCard });
    navigation.push({ name: 'Disputes', href: '/disputes', icon: Scale });
  } else if (isMerchantOperator) {
    navigation.push({ name: 'AI Apps', href: '/ai-apps', icon: Bot });
    navigation.push({ name: 'Mandates', href: '/mandates', icon: FileText });
    navigation.push({ name: 'VRP Consents', href: '/vrp-consents', icon: RefreshCw });
    navigation.push({ name: 'VRP Transactions', href: '/vrp-transactions', icon: AlertTriangle });
    navigation.push({ name: 'Payment Methods', href: '/payment-methods', icon: Wallet });
    navigation.push({ name: 'Transactions', href: '/transactions', icon: CreditCard });
    navigation.push({ name: 'Disputes', href: '/disputes', icon: Scale });
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white">
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <span className="text-xl font-bold text-white">AgenticCommerce</span>
      </div>
      <nav className="mt-6 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
                end={item.href === '/'}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
