import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { app, ensureLogin } from '../utils/cloudbase';

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
  email?: string;
  loginType?: 'anonymous' | 'email';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email?: string, password?: string) => Promise<void>;
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
    // 初始化时检查登录状态
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      // 直接使用CloudBase auth API检查登录状态
      const auth = app.auth();
      let loginState = await auth.getLoginState();
      
      console.log('CloudBase登录状态:', loginState, typeof loginState);
      
      // 处理CloudBase返回值的不同格式
      const isLoggedIn = loginState === true || 
                        (loginState && loginState.isLoggedIn === true) ||
                        (typeof loginState === 'object' && loginState.user);
      
      if (!isLoggedIn) {
        // 如果未登录，执行匿名登录
        console.log('执行匿名登录...');
        await auth.signInAnonymously();
        loginState = await auth.getLoginState();
        console.log('匿名登录后状态:', loginState, typeof loginState);
      }
      
      // 再次检查登录状态
      const finalLoggedIn = loginState === true || 
                           (loginState && loginState.isLoggedIn === true) ||
                           (typeof loginState === 'object' && loginState.user);
      
      if (finalLoggedIn) {
        // 用户已登录CloudBase，设置登录状态
        setIsLoggedIn(true);
        console.log('用户登录状态确认：已登录');
        // 尝试获取用户信息
        await loadUserInfo();
      } else {
        setIsLoggedIn(false);
        console.log('用户登录状态确认：未登录');
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserInfo = async () => {
    try {
      const result = await app.callFunction({
        name: 'userInfo',
        data: {
          action: 'get'
        }
      });

      if (result.result?.success) {
        const userData = result.result.data;
        setUser({
          id: userData.uid,
          displayName: userData.displayName,
          avatar: userData.avatar,
          level: userData.level,
          totalWords: userData.totalWords,
          studiedWords: userData.studiedWords,
          correctRate: userData.correctRate,
          streakDays: userData.streakDays,
          lastStudyDate: userData.lastStudyDate,
          isNewUser: userData.isNewUser,
          email: userData.email
        });
      } else {
        // 用户信息获取失败，但登录状态仍然有效
        console.warn('用户信息获取失败，但保持登录状态');
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 不要因为用户信息获取失败就重置登录状态
    }
  };

  const login = async (email?: string, password?: string) => {
    setIsLoading(true);
    try {
      if (email && password) {
        // 邮箱登录
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

        // 邮箱登录成功后执行匿名登录以获取CloudBase身份
        const auth = app.auth();
        await auth.signInAnonymously();
        
        // 设置登录状态
        setIsLoggedIn(true);
        
        // 加载用户信息
        await loadUserInfo();
      } else {
        // 匿名登录
        const auth = app.auth();
        await auth.signInAnonymously();
        
        // 获取登录状态
        const loginState = await auth.getLoginState();
        
        if (loginState && loginState.isLoggedIn) {
          // 设置登录状态
          setIsLoggedIn(true);
          // 加载用户信息
          await loadUserInfo();
        }
      }
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
      const auth = app.auth();
      await auth.signOut();
      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('登出失败:', error);
      // 即使CloudBase登出失败，也清除本地用户状态
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  const updateUserInfo = async (userInfo: Partial<User>) => {
    try {
      const result = await app.callFunction({
        name: 'userInfo',
        data: {
          action: 'update',
          userInfo: userInfo
        }
      });

      if (result.result?.success) {
        const userData = result.result.data;
        setUser({
          id: userData.uid,
          displayName: userData.displayName,
          avatar: userData.avatar,
          level: userData.level,
          totalWords: userData.totalWords,
          studiedWords: userData.studiedWords,
          correctRate: userData.correctRate,
          streakDays: userData.streakDays,
          lastStudyDate: userData.lastStudyDate
        });
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