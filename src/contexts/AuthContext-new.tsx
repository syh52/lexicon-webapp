import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getAuthState, 
  ensureAuthenticated, 
  getCurrentUserInfo, 
  loginWithEmailPassword, 
  registerUser, 
  updateUserInfo, 
  promoteUserWithKey, 
  logout as performLogout,
  checkPermission,
  checkRole
} from '../utils/cloudbase-new';
import { User as UserType } from '../types';

interface User extends UserType {
  level: number;
  totalWords: number;
  studiedWords: number;
  correctRate: number;
  streakDays: number;
  lastStudyDate: string | null;
  isAnonymous?: boolean;
  cloudbaseUserId?: string;
  // 权限系统相关字段
  role?: 'user' | 'admin' | 'super_admin';
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  
  // 认证方法
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // 用户信息管理
  updateUser: (userInfo: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  
  // 权限相关方法
  hasPermission: (permission: string) => boolean;
  hasRole: (role: 'user' | 'admin' | 'super_admin') => boolean;
  promoteWithKey: (adminKey: string) => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 初始化认证状态
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 初始化认证状态...');
      
      // 确保CloudBase认证并获取用户信息
      const authState = await ensureAuthenticated();
      
      if (authState.isLoggedIn && authState.cloudbaseUserId) {
        const userInfo = await getCurrentUserInfo();
        setUser(userInfo);
        setIsLoggedIn(true);
        console.log('✅ 认证初始化成功:', userInfo);
      } else {
        setUser(null);
        setIsLoggedIn(false);
        console.log('ℹ️ 用户未认证，保持匿名状态');
      }
    } catch (error) {
      console.error('❌ 认证初始化失败:', error);
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新用户信息
  const refreshUser = async () => {
    try {
      if (!isLoggedIn) return;
      
      console.log('🔄 刷新用户信息...');
      const userInfo = await getCurrentUserInfo();
      setUser(userInfo);
      console.log('✅ 用户信息已刷新');
    } catch (error) {
      console.error('❌ 刷新用户信息失败:', error);
      // 如果刷新失败，可能是认证过期，重新初始化
      await initializeAuth();
    }
  };

  // 邮箱密码登录
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('🔄 执行登录...');
      
      const userData = await loginWithEmailPassword(email, password);
      
      // 登录成功后重新初始化认证状态
      await initializeAuth();
      
      console.log('✅ 登录成功');
    } catch (error) {
      console.error('❌ 登录失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 用户注册
  const register = async (email: string, password: string, displayName?: string) => {
    try {
      setIsLoading(true);
      console.log('🔄 执行注册...');
      
      const userData = await registerUser(email, password, displayName);
      
      // 注册成功后重新初始化认证状态
      await initializeAuth();
      
      console.log('✅ 注册成功');
    } catch (error) {
      console.error('❌ 注册失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 更新用户信息
  const updateUser = async (userInfo: Partial<User>) => {
    try {
      await updateUserInfo(userInfo);
      
      // 更新本地状态
      if (user) {
        setUser({ ...user, ...userInfo });
      }
      
      console.log('✅ 用户信息更新成功');
    } catch (error) {
      console.error('❌ 更新用户信息失败:', error);
      throw error;
    }
  };

  // 权限提升
  const promoteWithKey = async (adminKey: string) => {
    try {
      await promoteUserWithKey(adminKey);
      
      // 提升成功后刷新用户信息
      await refreshUser();
      
      console.log('✅ 权限提升成功');
    } catch (error) {
      console.error('❌ 权限提升失败:', error);
      throw error;
    }
  };

  // 登出
  const logout = async () => {
    try {
      setIsLoading(true);
      await performLogout();
      
      setUser(null);
      setIsLoggedIn(false);
      
      console.log('✅ 登出成功');
    } catch (error) {
      console.error('❌ 登出失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 权限检查方法
  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return checkPermission(user.permissions, permission);
  };

  const hasRole = (role: 'user' | 'admin' | 'super_admin'): boolean => {
    if (!user || !user.role) return false;
    return checkRole(user.role, role);
  };

  // 计算权限状态
  const isAdmin = hasRole('admin');
  const isSuperAdmin = hasRole('super_admin');

  const value: AuthContextType = {
    user,
    isLoading,
    isLoggedIn,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    hasPermission,
    hasRole,
    promoteWithKey,
    isAdmin,
    isSuperAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;