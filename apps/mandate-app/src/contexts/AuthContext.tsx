import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storageService, User } from '../services/storage.service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userId: string, email?: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await storageService.getUser();
      setUser(storedUser);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userId: string, email?: string, name?: string) => {
    const newUser: User = { id: userId, email, name };
    await storageService.setUser(newUser);
    setUser(newUser);
  };

  const logout = async () => {
    await storageService.clearUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
