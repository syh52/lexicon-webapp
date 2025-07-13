import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { app, ensureLogin, getLoginState } from '../utils/cloudbase';

interface User {
  uid: string; // CloudBase 用户 ID
  displayName: string;
  username: string; // 用户名（登录用）
  email: string; // 邮箱地址
  avatar?: string;
  level: number;
  totalWords: number;
  studiedWords: number;
  correctRate: number;
  streakDays: number;
  lastStudyDate: string | null;
  isNewUser?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
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
      // 检查CloudBase登录状态
      const loginState = await getLoginState();
      if (loginState && loginState.isLoggedIn && loginState.user) {
        // 用户已登录，获取或创建用户信息
        const userInfoResult = await app.callFunction({
          name: 'userInfo',
          data: { 
            action: 'getOrCreate',
            userId: loginState.user.uid,
            displayName: loginState.user.customUserId || loginState.user.uid
          }
        });
        
        if (userInfoResult.result?.success) {
          const userInfo = userInfoResult.result.data;
          const userData: User = {
            uid: loginState.user.uid,
            displayName: userInfo.displayName,
            username: loginState.user.customUserId || loginState.user.uid,
            email: loginState.user.customUserId || '未设置邮箱', // 使用customUserId作为邮箱
            avatar: userInfo.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${loginState.user.uid}`,
            level: userInfo.level || 1,
            totalWords: userInfo.totalWords || 0,
            studiedWords: userInfo.studiedWords || 0,
            correctRate: userInfo.correctRate || 0,
            streakDays: userInfo.streakDays || 0,
            lastStudyDate: userInfo.lastStudyDate || null
          };
          
          setUser(userData);
          setIsLoggedIn(true);
          console.log('用户已登录，从CloudBase恢复状态');
        } else {
          setUser(null);
          setIsLoggedIn(false);
        }
      } else {
        console.log('用户未登录');
        setUser(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };



  // 邮箱+密码登录
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const auth = app.auth();
      
      console.log('使用邮箱+密码登录:', email);
      const loginState = await auth.signIn({
        username: email, // CloudBase v2中，邮箱登录时username字段填邮箱
        password: password
      });
      
      if (loginState && loginState.user) {
        // 获取或创建用户信息
        const userInfoResult = await app.callFunction({
          name: 'userInfo',
          data: { 
            action: 'getOrCreate',
            userId: loginState.user.uid,
            displayName: loginState.user.customUserId || email.split('@')[0]
          }
        });
        
        if (userInfoResult.result?.success) {
          const userInfo = userInfoResult.result.data;
          const userData: User = {
            uid: loginState.user.uid,
            displayName: userInfo.displayName,
            username: email,
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
          console.log('邮箱登录成功');
        } else {
          throw new Error(userInfoResult.result?.error || '获取用户信息失败');
        }
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
      console.log('开始注册:', email);
      
      // 确保已登录（匿名登录）以便调用云函数
      const auth = app.auth();
      const loginState = await auth.getLoginState();
      if (!loginState || !loginState.isLoggedIn) {
        console.log('先进行匿名登录以获取云函数调用权限');
        await auth.signInAnonymously();
      }
      
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
        console.log('云函数注册成功，创建本地用户状态');
        // 注册成功，创建本地用户状态
        const userData: User = {
          uid: registerResult.result.data.uid,
          displayName: displayName || email.split('@')[0],
          username: email,
          email: email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          level: 1,
          totalWords: 0,
          studiedWords: 0,
          correctRate: 0,
          streakDays: 0,
          lastStudyDate: null
        };
        
        setUser(userData);
        setIsLoggedIn(true);
        console.log('注册成功，用户状态已设置');
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
      const auth = app.auth();
      
      // CloudBase原生登出
      await auth.signOut();
      
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