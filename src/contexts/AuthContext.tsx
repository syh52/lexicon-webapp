import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { app } from '../utils/cloudbase';

interface User {
  id: string;
  displayName: string;
  avatar: string;
  level: number;
  totalWords: number;
  studiedWords: number;
  correctRate: number;
  streakDays: number;
  lastStudyDate: string | null;
  isNewUser?: boolean;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
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
      // 检查本地存储中的用户信息
      const storedUser = localStorage.getItem('lexicon_user');
      const storedToken = localStorage.getItem('lexicon_token');
      
      if (storedUser && storedToken) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsLoggedIn(true);
          console.log('用户已登录，从本地存储恢复状态');
        } catch (error) {
          console.error('解析本地用户信息失败:', error);
          // 清除无效的本地存储
          localStorage.removeItem('lexicon_user');
          localStorage.removeItem('lexicon_token');
          setIsLoggedIn(false);
        }
      } else {
        console.log('用户未登录');
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };


  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // 先进行 CloudBase 匿名登录以获得调用云函数的权限
      const auth = app.auth();
      await auth.signInAnonymously();
      
      // 然后进行邮箱登录验证
      const result = await app.callFunction({
        name: 'auth-new',
        data: {
          action: 'login',
          email,
          password
        }
      });

      if (!result.result?.success) {
        throw new Error(result.result?.error || '登录失败');
      }

      // 登录成功，设置用户信息
      const userData = result.result.data;
      const user: User = {
        id: userData.userId,
        displayName: userData.displayName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.email}`,
        level: userData.level || 1,
        totalWords: userData.totalWords || 0,
        studiedWords: userData.studiedWords || 0,
        correctRate: userData.correctRate || 0,
        streakDays: userData.streakDays || 0,
        lastStudyDate: userData.lastStudyDate || null,
        email: userData.email
      };

      // 保存到本地存储
      localStorage.setItem('lexicon_user', JSON.stringify(user));
      localStorage.setItem('lexicon_token', userData.userId);

      // 设置状态
      setUser(user);
      setIsLoggedIn(true);

      console.log('登录成功:', userData.message);
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // 先进行 CloudBase 匿名登录以获得调用云函数的权限
      const auth = app.auth();
      await auth.signInAnonymously();
      
      // 然后进行邮箱注册
      const result = await app.callFunction({
        name: 'auth-new',
        data: {
          action: 'register',
          email,
          password
        }
      });

      if (!result.result?.success) {
        throw new Error(result.result?.error || '注册失败');
      }

      console.log('注册成功:', result.result.message);
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
      localStorage.removeItem('lexicon_token');
      
      // 清除状态
      setUser(null);
      setIsLoggedIn(false);
      
      console.log('登出成功');
    } catch (error) {
      console.error('登出失败:', error);
      // 即使出错，也要清除本地状态
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  const updateUserInfo = async (userInfo: Partial<User>) => {
    try {
      if (!user) {
        throw new Error('用户未登录');
      }

      // 先确保 CloudBase 匿名登录
      const auth = app.auth();
      const loginState = await auth.getLoginState();
      if (!loginState || !loginState.isLoggedIn) {
        await auth.signInAnonymously();
      }
      
      // 使用 auth-new 云函数更新用户信息
      const result = await app.callFunction({
        name: 'auth-new',
        data: {
          action: 'updateUserInfo',
          userId: user.id,
          userInfo: userInfo
        }
      });

      if (result.result?.success) {
        // 更新本地用户信息
        const updatedUser = { ...user, ...userInfo };
        setUser(updatedUser);
        
        // 更新本地存储
        localStorage.setItem('lexicon_user', JSON.stringify(updatedUser));
        
        console.log('用户信息更新成功');
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