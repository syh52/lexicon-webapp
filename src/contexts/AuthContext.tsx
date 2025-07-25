import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getApp, ensureLogin, getLoginState, getCachedLoginState } from '../utils/cloudbase';
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
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  anonymousLogin: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserInfo: (userInfo: Partial<User>) => Promise<void>;
  isLoggedIn: boolean;
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

  useEffect(() => {
    // 初始化时检查本地存储的用户信息
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      // 检查本地存储的用户信息
      const savedUser = localStorage.getItem('lexicon_user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setIsLoggedIn(true);
          } catch (parseError) {
          console.error('解析本地用户信息失败:', parseError);
          localStorage.removeItem('lexicon_user');
          setUser(null);
          setIsLoggedIn(false);
        }
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      // 确保loading状态始终被设置为false
      setIsLoading(false);
    }
  };

  // 邮箱+密码登录 - 使用云函数验证
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('🔄 AuthContext: 开始登录流程...');
      
      // 确保CloudBase实例已初始化并登录
      await ensureLogin();
      const app = getApp();
      
      console.log('🔄 AuthContext: 调用登录云函数...');
      // 使用云函数验证用户凭据
      const loginResult = await app.callFunction({
        name: 'userInfo',
        data: { 
          action: 'login',
          email: email,
          password: password
        }
      });
      
      if (loginResult.result?.success) {
        const userInfo = loginResult.result.data;
        const userData: User = {
          uid: userInfo.uid,
          displayName: userInfo.displayName,
          username: userInfo.username || email,
          email: email,
          avatar: userInfo.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          level: userInfo.level || 1,
          totalWords: userInfo.totalWords || 0,
          studiedWords: userInfo.studiedWords || 0,
          correctRate: userInfo.correctRate || 0,
          streakDays: userInfo.streakDays || 0,
          lastStudyDate: userInfo.lastStudyDate || null
        };
        
        setUser(userData);
        setIsLoggedIn(true);
        
        // 将用户信息保存到本地存储
        localStorage.setItem('lexicon_user', JSON.stringify(userData));
        
        } else {
        throw new Error(loginResult.result?.error || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 邮箱+密码注册（使用云函数）
  const register = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true);
    try {
      console.log('🔄 AuthContext: 开始注册流程...');
      
      // 确保CloudBase实例已初始化并登录
      await ensureLogin();
      const app = getApp();
      
      console.log('🔄 AuthContext: 调用注册云函数...');
      // 使用云函数注册
      const registerResult = await app.callFunction({
        name: 'userInfo',
        data: { 
          action: 'register',
          email: email,
          password: password,
          displayName: displayName || email.split('@')[0],
          type: 'email'
        }
      });
      
      if (registerResult.result?.success) {
        // 注册成功，创建本地用户状态
        const userInfo = registerResult.result.data;
        const userData: User = {
          uid: userInfo.uid,
          displayName: userInfo.displayName,
          username: userInfo.username || email,
          email: email,
          avatar: userInfo.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          level: userInfo.level || 1,
          totalWords: userInfo.totalWords || 0,
          studiedWords: userInfo.studiedWords || 0,
          correctRate: userInfo.correctRate || 0,
          streakDays: userInfo.streakDays || 0,
          lastStudyDate: userInfo.lastStudyDate || null
        };
        
        setUser(userData);
        setIsLoggedIn(true);
        
        // 将用户信息保存到本地存储
        localStorage.setItem('lexicon_user', JSON.stringify(userData));
        
        } else {
        throw new Error(registerResult.result?.error || '注册失败，请重试');
      }
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // 清除本地存储
      localStorage.removeItem('lexicon_user');
      
      // 清除状态
      setUser(null);
      setIsLoggedIn(false);
      
      } catch (error) {
      console.error('登出失败:', error);
      // 即使出错，也要清除本地状态
      localStorage.removeItem('lexicon_user');
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  // 匿名登录
  const anonymousLogin = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 AuthContext: 执行匿名登录...');
      
      // 使用统一的ensureLogin来处理匿名登录
      const loginState = await ensureLogin();
      
      console.log('🔍 AuthContext: 检查匿名登录状态:', { 
        hasLoginState: !!loginState, 
        isLoggedIn: loginState?.isLoggedIn,
        loginStateKeys: loginState ? Object.keys(loginState) : null 
      });
      
      if (loginState && loginState.isLoggedIn) {
        // 创建匿名用户状态
        const userData: User = {
          uid: loginState.user?.uid || 'anonymous_' + Date.now(),
          displayName: '游客用户',
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
        
        setUser(userData);
        setIsLoggedIn(true);
        
        // 将用户信息保存到本地存储
        localStorage.setItem('lexicon_user', JSON.stringify(userData));
        
        console.log('✅ AuthContext: 匿名登录成功');
      } else {
        throw new Error('匿名登录失败');
      }
    } catch (error) {
      console.error('❌ AuthContext: 匿名登录失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserInfo = async (userInfo: Partial<User>) => {
    try {
      if (!user) {
        throw new Error('用户未登录');
      }

      console.log('🔄 AuthContext: 更新用户信息...');
      
      // 确保CloudBase实例可用
      await ensureLogin();
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

  // isLoggedIn 状态已经在上面定义为状态变量，不再依赖user对象

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    anonymousLogin,
    logout,
    updateUserInfo,
    isLoggedIn
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};