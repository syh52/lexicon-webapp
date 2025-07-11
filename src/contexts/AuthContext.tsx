import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { app } from '../utils/cloudbase';

interface User {
  uid: string; // CloudBase 用户 ID
  displayName: string;
  email: string;
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
      const auth = app.auth();
      const loginState = await auth.getLoginState();
      
      if (loginState && loginState.isLoggedIn) {
        // 用户已登录，获取用户信息
        const currentUser = await auth.getCurrentUser();
        if (currentUser) {
          // 从 CloudBase 获取基础用户信息，然后补充学习数据
          const userInfo = await auth.getUserInfo();
          
          // 通过云函数获取学习相关数据
          const learningData = await app.callFunction({
            name: 'userInfo',
            data: { userId: currentUser.uid }
          });
          
          const userData: User = {
            uid: currentUser.uid,
            displayName: userInfo.name || currentUser.email.split('@')[0],
            email: currentUser.email,
            avatar: userInfo.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.email}`,
            level: learningData.result?.level || 1,
            totalWords: learningData.result?.totalWords || 0,
            studiedWords: learningData.result?.studiedWords || 0,
            correctRate: learningData.result?.correctRate || 0,
            streakDays: learningData.result?.streakDays || 0,
            lastStudyDate: learningData.result?.lastStudyDate || null
          };
          
          setUser(userData);
          setIsLoggedIn(true);
          console.log('用户已登录，从 CloudBase 恢复状态');
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


  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const auth = app.auth();
      
      // 使用 CloudBase 标准登录 API
      const loginState = await auth.signIn({
        username: email,
        password: password
      });
      
      if (loginState && loginState.user) {
        // 获取用户信息
        const userInfo = await auth.getUserInfo();
        
        // 通过云函数获取或初始化学习数据
        const learningData = await app.callFunction({
          name: 'userInfo',
          data: { 
            userId: loginState.user.uid,
            action: 'getOrCreate'
          }
        });
        
        const userData: User = {
          uid: loginState.user.uid,
          displayName: userInfo.name || email.split('@')[0],
          email: loginState.user.email,
          avatar: userInfo.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          level: learningData.result?.level || 1,
          totalWords: learningData.result?.totalWords || 0,
          studiedWords: learningData.result?.studiedWords || 0,
          correctRate: learningData.result?.correctRate || 0,
          streakDays: learningData.result?.streakDays || 0,
          lastStudyDate: learningData.result?.lastStudyDate || null
        };
        
        setUser(userData);
        setIsLoggedIn(true);
        
        console.log('登录成功');
      } else {
        throw new Error('登录失败');
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
      const auth = app.auth();
      
      // 使用 CloudBase 标准注册 API
      const loginState = await auth.signUp({
        email: email,
        password: password,
        name: email.split('@')[0] // 使用邮箱前缀作为默认用户名
      });
      
      if (loginState && loginState.user) {
        // 注册成功后自动登录，初始化学习数据
        const result = await app.callFunction({
          name: 'userInfo',
          data: {
            userId: loginState.user.uid,
            action: 'init',
            email: email,
            displayName: email.split('@')[0]
          }
        });
        
        console.log('注册成功');
      } else {
        throw new Error('注册失败');
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
      
      // 使用 CloudBase 标准登出 API
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

      const auth = app.auth();
      const currentUser = await auth.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('用户未登录');
      }
      
      // 更新 CloudBase 基础用户信息（如果有相关字段）
      if (userInfo.displayName) {
        await currentUser.update({
          name: userInfo.displayName
        });
      }
      
      // 通过云函数更新学习相关数据
      const result = await app.callFunction({
        name: 'userInfo',
        data: {
          userId: user.uid,
          action: 'update',
          userInfo: {
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