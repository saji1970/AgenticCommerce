import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from '../api/client';

export type AdminRole = 'super_admin' | 'merchant_admin' | 'merchant_operator';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  merchantId: string | null;
  merchantName: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isMerchantAdmin: boolean;
  isMerchantOperator: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await authApi.getCurrentUser();
      if (response.user) {
        setUser(response.user);
      } else {
        localStorage.removeItem('adminToken');
      }
    } catch {
      localStorage.removeItem('adminToken');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    localStorage.setItem('adminToken', response.token);
    setUser(response.user);
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'super_admin',
    isMerchantAdmin: user?.role === 'merchant_admin',
    isMerchantOperator: user?.role === 'merchant_operator',
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
