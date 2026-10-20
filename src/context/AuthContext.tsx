import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types/index.ts';
import { api, setStoredToken, removeStoredToken, getStoredToken } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { full_name: string; email: string; password: string; phone?: string; roll_number?: string }) => Promise<void>;
  logout: () => void;
  quickDemoLogin: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  isStudent: boolean;
  isOfficer: boolean;
  isHead: boolean;
  isNodal: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_ACCOUNTS = [
  { role: 'STUDENT' as Role, label: 'Student (Alex)', email: 'student.alex@smartcollege.edu', pass: 'Student@123', badge: 'Student A' },
  { role: 'STUDENT' as Role, label: 'Student (Priya)', email: 'student.priya@smartcollege.edu', pass: 'Student@123', badge: 'Student B' },
  { role: 'DEPARTMENT_OFFICER' as Role, label: 'Officer (Amit - Hostel)', email: 'officer.hostel@smartcollege.edu', pass: 'Officer@123', badge: 'Dept Officer' },
  { role: 'DEPARTMENT_HEAD' as Role, label: 'Head (Verma - Hostel)', email: 'head.hostel@smartcollege.edu', pass: 'Head@123', badge: 'Dept Head' },
  { role: 'NODAL_OFFICER' as Role, label: 'Nodal (Prof. Rao)', email: 'nodal@smartcollege.edu', pass: 'Nodal@123', badge: 'Nodal Officer' },
  { role: 'SUPER_ADMIN' as Role, label: 'Super Admin (Dr. Sharma)', email: 'admin@smartcollege.edu', pass: 'Admin@123', badge: 'Super Admin' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const data = await api.getCurrentUser();
      setUser(data.user);
    } catch {
      setUser(null);
      removeStoredToken();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      if (token) {
        await refreshProfile();
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      setStoredToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { full_name: string; email: string; password: string; phone?: string; roll_number?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      setStoredToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeStoredToken();
    setUser(null);
  };

  const quickDemoLogin = async (email: string) => {
    const acc = DEMO_ACCOUNTS.find(a => a.email === email);
    if (!acc) throw new Error('Demo account not found');
    await login(acc.email, acc.pass);
  };

  const isStudent = user?.role === 'STUDENT';
  const isOfficer = user?.role === 'DEPARTMENT_OFFICER';
  const isHead = user?.role === 'DEPARTMENT_HEAD';
  const isNodal = user?.role === 'NODAL_OFFICER';
  const isAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        quickDemoLogin,
        refreshProfile,
        isStudent,
        isOfficer,
        isHead,
        isNodal,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
