import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Bot,
  Shield,
  Users,
  FileText,
  Settings,
  ShoppingCart,
  CreditCard,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Merchants', href: '/merchants', icon: Building2 },
  { name: 'Agents', href: '/agents', icon: Bot },
  { name: 'Certificates', href: '/certificates', icon: Shield },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Mandates', href: '/mandates', icon: FileText },
  { name: 'Intents', href: '/intents', icon: ShoppingCart },
  { name: 'Transactions', href: '/transactions', icon: CreditCard },
  { name: 'Audit Logs', href: '/audit-logs', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
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
