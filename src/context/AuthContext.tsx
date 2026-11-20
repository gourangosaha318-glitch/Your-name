import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { millConfig } from '../data/mock';
import { MillUserAccount, UserRole } from '../types/mill';
import { apiFetch, getSessionToken, setSessionToken, setBankToken } from '../lib/apiClient';
import defaultAvatarImg from '../assets/images/owner_avatar_1793953010487.jpg';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  email: string;
  avatarUrl: string;
}

export interface RolePermissions {
  isOwner: boolean;
  isManager: boolean;
  isTester: boolean;
  canAccessFinances: boolean;
  canAccessBank: boolean;
  canApproveVouchers: boolean;
  canManageUsers: boolean;
  canAccessAuditLogs: boolean;
  canAccessCriticalSettings: boolean;
  canDeleteApproved: boolean;
  canEditApproved: boolean;
  canChangeStockDirectly: boolean;
  canViewDailyReports: boolean;
  canViewStockHistory: boolean;
  canManageSuppliersCustomers: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  users: MillUserAccount[];
  loading: boolean;
  initializing: boolean;
  login: (emailOrUser: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: (role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  isAuthenticated: boolean;
  permissions: RolePermissions;
  createUser: (data: {
    username: string;
    email: string;
    fullName: string;
    role: UserRole;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUsername: (userId: string, newUsername: string, newFullName?: string) => Promise<{ success: boolean; error?: string }>;
  changeUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  changeUserRole: (userId: string, newRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  toggleUserStatus: (userId: string) => Promise<{ success: boolean; error?: string }>;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'মালিক (OWNER)',
  MANAGER: 'ম্যানেজার (MANAGER)',
  TESTER: 'টেস্টার (TESTER)',
};

const DEFAULT_AVATAR = defaultAvatarImg;

export function getPermissionsForRole(role?: UserRole): RolePermissions {
  const isOwner = role === 'OWNER';
  const isManager = role === 'MANAGER';
  const isTester = role === 'TESTER';

  return {
    isOwner,
    isManager,
    isTester,
    canAccessFinances: isOwner || isManager,
    canAccessBank: isOwner || isManager,
    canApproveVouchers: isOwner,
    canManageUsers: isOwner,
    canAccessAuditLogs: isOwner,
    canAccessCriticalSettings: isOwner,
    canDeleteApproved: isOwner,
    canEditApproved: isOwner,
    canChangeStockDirectly: isOwner || isManager,
    canViewDailyReports: isOwner || isManager,
    canViewStockHistory: isOwner || isManager,
    canManageSuppliersCustomers: isOwner || isManager,
  };
}

function toUserProfile(u: {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  email: string;
}): UserProfile {
  return {
    id: u.id,
    username: u.username,
    name: u.fullName || millConfig.ownerName,
    role: u.role,
    roleLabel: ROLE_LABELS[u.role],
    email: u.email,
    avatarUrl: DEFAULT_AVATAR,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<MillUserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const refreshUsers = useCallback(async () => {
    try {
      const res = await apiFetch<{ users: MillUserAccount[] }>('/api/users');
      setUsers(res.users || []);
    } catch {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      const token = getSessionToken();
      if (!token) {
        if (active) setInitializing(false);
        return;
      }
      try {
        const res = await apiFetch<{ user: any }>('/api/auth/me');
        if (active && res.user) {
          const prof = toUserProfile(res.user);
          setUser(prof);
          if (prof.role === 'OWNER') {
            refreshUsers();
          }
        }
      } catch {
        setSessionToken(null);
        setBankToken(null);
        if (active) setUser(null);
      } finally {
        if (active) setInitializing(false);
      }
    }
    restoreSession();
    return () => {
      active = false;
    };
  }, [refreshUsers]);

  const login = async (emailOrUser: string, pass: string) => {
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: emailOrUser, password: pass }),
      });
      setSessionToken(res.token);
      setBankToken(null);
      const prof = toUserProfile(res.user);
      setUser(prof);
      if (prof.role === 'OWNER') {
        await refreshUsers();
      } else {
        setUsers([]);
      }
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err?.message || 'লগইন ব্যর্থ হয়েছে' };
    }
  };

  const loginAsDemo = async (role: UserRole = 'OWNER') => {
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: any }>('/api/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      setSessionToken(res.token);
      setBankToken(null);
      const prof = toUserProfile(res.user);
      setUser(prof);
      if (prof.role === 'OWNER') {
        await refreshUsers();
      } else {
        setUsers([]);
      }
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err?.message || 'ডেমো লগইন ব্যর্থ হয়েছে' };
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network error on logout
    }
    setSessionToken(null);
    setBankToken(null);
    setUser(null);
    setUsers([]);
  };

  const createUser: AuthContextType['createUser'] = async (data) => {
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await refreshUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'ইউজার তৈরি ব্যর্থ' };
    }
  };

  const updateUsername: AuthContextType['updateUsername'] = async (userId, newUsername, newFullName) => {
    try {
      const res = await apiFetch<{ user: any }>(`/api/users/${userId}/username`, {
        method: 'PATCH',
        body: JSON.stringify({ username: newUsername, fullName: newFullName }),
      });
      if (user && user.id === userId && res.user) {
        setUser(toUserProfile(res.user));
      }
      await refreshUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'ইউজারনেম পরিবর্তন ব্যর্থ' };
    }
  };

  const changeUserPassword: AuthContextType['changeUserPassword'] = async (userId, newPassword) => {
    try {
      await apiFetch(`/api/users/${userId}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPassword }),
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ' };
    }
  };

  const changeUserRole: AuthContextType['changeUserRole'] = async (userId, newRole) => {
    try {
      await apiFetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      await refreshUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'ভূমিকা পরিবর্তন ব্যর্থ' };
    }
  };

  const toggleUserStatus: AuthContextType['toggleUserStatus'] = async (userId) => {
    try {
      await apiFetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
      });
      await refreshUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'অবস্থা পরিবর্তন ব্যর্থ' };
    }
  };

  const permissions = getPermissionsForRole(user?.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        loading,
        initializing,
        login,
        loginAsDemo,
        logout,
        refreshUsers,
        isAuthenticated: !!user,
        permissions,
        createUser,
        updateUsername,
        changeUserPassword,
        changeUserRole,
        toggleUserStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
