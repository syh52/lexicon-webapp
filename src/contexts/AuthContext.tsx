import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getApp, 
  checkAuthStatus, 
  getCurrentUserId, 
  establishUserMapping,
  sendEmailVerification,
  verifyEmailCode,
  signUpWithEmail,
  signInWithEmail,
  signOut
} from '../utils/cloudbase';
import { User as UserType, ApiResponse } from '../types';

interface User extends UserType {
  level: number;
  totalWords: number;
  studiedWords: number;
  correctRate: number;
  streakDays: number;
  lastStudyDate: string | null;
  isNewUser?: boolean;
  isAnonymous?: boolean;
  // 权限系统相关字段
  role?: 'user' | 'admin' | 'super_admin';
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, verificationCode: string, verificationToken: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserInfo: (userInfo: Partial<User>) => Promise<void>;
  refreshUserFromCloud: () => Promise<void>;
  isLoggedIn: boolean;
  // 验证码相关方法
  sendVerificationCode: (email: string) => Promise<{ verification_id: string; is_user: boolean }>;
  verifyCode: (code: string, verificationId: string) => Promise<{ verification_token: string }>;
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

  // 从云端刷新用户权限信息
  const refreshUserFromCloud = async () => {
    try {
      if (!isLoggedIn) return;
      
      console.log('🔄 AuthContext: 从云端刷新用户权限...');
      
      // 使用统一的用户ID获取方法
      const cloudbaseUserId = await getCurrentUserId('auth');
      if (!cloudbaseUserId) {
        console.warn('⚠️ AuthContext: 无法获取CloudBase用户ID');
        return;
      }
      
      const app = getApp();
      
      // 从云端获取最新的用户权限信息
      const result = await app.callFunction({
        name: 'userInfo',
        data: { 
          action: 'get',
          userId: cloudbaseUserId
        }
      });
      
      if (result.result?.success && result.result.data) {
        const cloudUserData = result.result.data;
        
        // 合并云端权限信息到本地用户数据
        // 如果当前没有用户对象，使用云端数据创建一个基础用户对象
        const currentUser = user || {
          uid: cloudUserData.uid || 'anonymous_' + Date.now(),
          displayName: cloudUserData.displayName || '匿名用户',
          username: 'anonymous',
          email: '',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=anonymous`,
          level: 1,
          totalWords: 0,
          studiedWords: 0,
          correctRate: 0,
          streakDays: 0,
          lastStudyDate: null,
          isAnonymous: true
        };
        
        const updatedUser: User = {
          ...currentUser,
          role: cloudUserData.role || 'user',
          permissions: cloudUserData.permissions || ['basic_learning']
        };
        
        setUser(updatedUser);
        
        // 更新本地存储
        localStorage.setItem('lexicon_user', JSON.stringify(updatedUser));
        
        // 确保用户ID映射关系已建立
        if (updatedUser.uid && cloudbaseUserId !== updatedUser.uid) {
          establishUserMapping(cloudbaseUserId, updatedUser.uid).catch(error => {
            console.warn('建立用户映射失败:', error);
          });
        }
        
        console.log('✅ AuthContext: 权限信息已从云端刷新', {
          role: updatedUser.role,
          permissions: updatedUser.permissions,
          userMapping: { cloudbaseUserId, appUserId: updatedUser.uid }
        });
      }
    } catch (error) {
      console.error('❗ AuthContext: 从云端刷新权限失败:', error);
    }
  };

  useEffect(() => {
    // 初始化时检查本地存储的用户信息
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      console.log('🔄 AuthContext: 检查登录状态...');
      
      // 首先检查CloudBase的认证状态
      const cloudBaseLoginState = await checkAuthStatus();
      
      if (cloudBaseLoginState && cloudBaseLoginState.isLoggedIn) {
        console.log('✅ 检测到CloudBase登录状态');
        
        // 检查本地存储的用户信息
        const savedUser = localStorage.getItem('lexicon_user');
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            setUser(userData);
            setIsLoggedIn(true);
            
            // 从云端刷新权限信息
            setTimeout(() => {
              refreshUserFromCloud().catch(error => {
                console.warn('后台刷新权限失败:', error);
              });
            }, 1000);
            
            return;
          } catch (parseError) {
            console.error('解析本地用户信息失败:', parseError);
            localStorage.removeItem('lexicon_user');
          }
        }
        
        // 如果CloudBase已登录但本地没有用户信息，尝试从云端获取
        try {
          await refreshUserFromCloud();
        } catch (error) {
          console.warn('从云端获取用户信息失败:', error);
          setUser(null);
          setIsLoggedIn(false);
        }
        
      } else {
        console.log('ℹ️ 未检测到CloudBase登录状态');
        // 清除本地存储
        localStorage.removeItem('lexicon_user');
        setUser(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      localStorage.removeItem('lexicon_user');
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 邮箱+密码登录 - 使用CloudBase原生认证
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('🔄 AuthContext: 开始CloudBase原生登录...');
      
      // 使用CloudBase原生登录
      const loginState = await signInWithEmail(email, password);
      
      if (loginState && loginState.isLoggedIn) {
        console.log('✅ CloudBase登录成功，获取用户信息...');
        
        // 获取CloudBase用户ID
        const cloudbaseUserId = loginState.uid || loginState.user?.uid;
        if (!cloudbaseUserId) {
          throw new Error('无法获取用户ID');
        }
        
        // 从云函数获取或创建用户扩展信息
        const app = getApp();
        const userInfoResult = await app.callFunction({
          name: 'userInfo',
          data: { 
            action: 'getOrCreate',
            userId: cloudbaseUserId,
            displayName: email.split('@')[0]
          }
        });
        
        if (userInfoResult.result?.success) {
          const userInfo = userInfoResult.result.data;
          const userData: User = {
            uid: userInfo.uid,
            displayName: userInfo.displayName,
            username: userInfo.username || email.split('@')[0],
            email: email,
            avatar: userInfo.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            level: userInfo.level || 1,
            totalWords: userInfo.totalWords || 0,
            studiedWords: userInfo.studiedWords || 0,
            correctRate: userInfo.correctRate || 0,
            streakDays: userInfo.streakDays || 0,
            lastStudyDate: userInfo.lastStudyDate || null,
            // 权限相关字段
            role: userInfo.role || 'user',
            permissions: userInfo.permissions || ['basic_learning']
          };
          
          setUser(userData);
          setIsLoggedIn(true);
          
          // 保存到本地存储
          localStorage.setItem('lexicon_user', JSON.stringify(userData));
          
          console.log('✅ 登录完成');
        } else {
          throw new Error('获取用户信息失败');
        }
      } else {
        throw new Error('CloudBase登录失败');
      }
    } catch (error) {
      console.error('❌ 登录失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 邮箱验证码注册
  const register = async (
    email: string, 
    password: string, 
    verificationCode: string, 
    verificationToken: string, 
    displayName?: string
  ) => {
    setIsLoading(true);
    try {
      console.log('🔄 AuthContext: 开始CloudBase验证码注册...');
      
      // 使用CloudBase原生注册
      const loginState = await signUpWithEmail(
        email, 
        password, 
        verificationCode, 
        verificationToken, 
        displayName || email.split('@')[0]
      );
      
      if (loginState && loginState.isLoggedIn) {
        console.log('✅ CloudBase注册成功，创建用户信息...');
        
        // 获取CloudBase用户ID
        const cloudbaseUserId = loginState.uid || loginState.user?.uid;
        if (!cloudbaseUserId) {
          throw new Error('无法获取用户ID');
        }
        
        // 创建用户扩展信息
        const app = getApp();
        const userInfoResult = await app.callFunction({
          name: 'userInfo',
          data: { 
            action: 'create',
            userId: cloudbaseUserId,
            userInfo: {
              displayName: displayName || email.split('@')[0]
            }
          }
        });
        
        if (userInfoResult.result?.success) {
          const userInfo = userInfoResult.result.data;
          const userData: User = {
            uid: userInfo.uid,
            displayName: userInfo.displayName,
            username: userInfo.username || email.split('@')[0],
            email: email,
            avatar: userInfo.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            level: userInfo.level || 1,
            totalWords: userInfo.totalWords || 0,
            studiedWords: userInfo.studiedWords || 0,
            correctRate: userInfo.correctRate || 0,
            streakDays: userInfo.streakDays || 0,
            lastStudyDate: userInfo.lastStudyDate || null,
            // 权限相关字段
            role: userInfo.role || 'user',
            permissions: userInfo.permissions || ['basic_learning']
          };
          
          setUser(userData);
          setIsLoggedIn(true);
          
          // 保存到本地存储
          localStorage.setItem('lexicon_user', JSON.stringify(userData));
          
          console.log('✅ 注册完成');
        } else {
          throw new Error('创建用户信息失败');
        }
      } else {
        throw new Error('CloudBase注册失败');
      }
    } catch (error) {
      console.error('❌ 注册失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🔄 AuthContext: 开始登出...');
      
      // 使用CloudBase原生登出
      await signOut();
      
      // 清除本地存储和状态
      localStorage.removeItem('lexicon_user');
      setUser(null);
      setIsLoggedIn(false);
      
      console.log('✅ 登出成功');
    } catch (error) {
      console.error('❌ 登出失败:', error);
      // 即使出错，也要清除本地状态
      localStorage.removeItem('lexicon_user');
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  // 发送邮箱验证码
  const sendVerificationCode = async (email: string) => {
    try {
      console.log('📧 AuthContext: 发送验证码到', email);
      return await sendEmailVerification(email);
    } catch (error) {
      console.error('❌ AuthContext: 发送验证码失败:', error);
      throw error;
    }
  };

  // 验证邮箱验证码
  const verifyCode = async (code: string, verificationId: string) => {
    try {
      console.log('🔍 AuthContext: 验证验证码');
      return await verifyEmailCode(code, verificationId);
    } catch (error) {
      console.error('❌ AuthContext: 验证码验证失败:', error);
      throw error;
    }
  };

  const updateUserInfo = async (userInfo: Partial<User>) => {
    try {
      if (!user) {
        throw new Error('用户未登录');
      }

      console.log('🔄 AuthContext: 更新用户信息...');
      
      const app = getApp();

      // 通过云函数更新学习相关数据
      const result = await app.callFunction({
        name: 'userInfo',
        data: {
          action: 'update',
          userId: user.uid,
          userInfo: {
            displayName: userInfo.displayName,
            level: userInfo.level,
            totalWords: userInfo.totalWords,
            studiedWords: userInfo.studiedWords,
            correctRate: userInfo.correctRate,
            streakDays: userInfo.streakDays,
            lastStudyDate: userInfo.lastStudyDate
          }
        }
      });

      if (result.result?.success) {
        // 更新本地用户信息
        const updatedUser = { ...user, ...userInfo };
        setUser(updatedUser);
        
        } else {
        throw new Error(result.result?.error || '更新用户信息失败');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  };

  // 权限检查方法 - 从云端实时验证权限
  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const hasRole = (role: 'user' | 'admin' | 'super_admin'): boolean => {
    if (!user || !user.role) return false;
    return user.role === role;
  };

  // 使用密钥提升权限
  const promoteWithKey = async (adminKey: string) => {
    setIsLoading(true);
    try {
      console.log('🔑 AuthContext: 开始权限提升...');
      
      // 使用统一的用户ID获取方法
      const cloudbaseUserId = await getCurrentUserId('auth');
      if (!cloudbaseUserId) {
        throw new Error('无法获取用户ID');
      }
      
      console.log('🔍 AuthContext: 使用CloudBase用户ID:', cloudbaseUserId);
      
      const app = getApp();
      
      // 调用权限提升云函数
      const result = await app.callFunction({
        name: 'userInfo',
        data: { 
          action: 'promoteWithKey',
          adminKey: adminKey,
          userId: cloudbaseUserId
        }
      });
      
      if (result.result?.success) {
        const promotionData = result.result.data;
        
        // 直接使用权限提升返回的信息更新用户状态
        if (user) {
          const updatedUser: User = {
            ...user,
            role: promotionData.role || 'user',
            permissions: promotionData.permissions || ['basic_learning']
          };
          
          setUser(updatedUser);
          
          // 更新本地存储
          localStorage.setItem('lexicon_user', JSON.stringify(updatedUser));
          
          // 确保用户ID映射关系已建立（权限提升后重新确认映射）
          if (updatedUser.uid && cloudbaseUserId !== updatedUser.uid) {
            establishUserMapping(cloudbaseUserId, updatedUser.uid).catch(error => {
              console.warn('建立用户映射失败:', error);
            });
          }
          
          console.log('🔄 AuthContext: 立即更新用户权限状态', {
            role: updatedUser.role,
            permissions: updatedUser.permissions,
            userMapping: { cloudbaseUserId, appUserId: updatedUser.uid }
          });
        }
        
        // 权限提升成功后，从云端重新获取完整的用户信息（作为备份验证）
        setTimeout(() => {
          refreshUserFromCloud().catch(error => {
            console.warn('后台刷新权限失败:', error);
          });
        }, 500);
        
        console.log('✅ AuthContext: 权限提升成功', promotionData);
      } else {
        throw new Error(result.result?.error || '权限提升失败');
      }
    } catch (error) {
      console.error('❗ AuthContext: 权限提升失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 计算属性
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateUserInfo,
    refreshUserFromCloud,
    isLoggedIn,
    // 验证码相关方法
    sendVerificationCode,
    verifyCode,
    // 权限相关方法
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