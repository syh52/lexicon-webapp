import * as React from 'react';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getApp,
  getAuth, 
  checkAuthStatus, 
  signUpWithEmail,
  signInWithEmail,
  signOut,
  sendEmailVerification,
  verifyEmailCode,
  getCurrentUserId,
  establishUserMapping,
  debugCloudBaseStorage
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
  // CloudBase用户ID映射
  cloudbaseUserId?: string;
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
      
      const app = await getApp();
      
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
          avatar: `/user-avatar.png`,
          level: 1,
          totalWords: 0,
          studiedWords: 0,
          correctRate: 0,
          streakDays: 0,
          lastStudyDate: null,
          isAnonymous: true,
          createdAt: new Date()
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
    let mounted = true;
    
    // 🔒 确保认证系统只初始化一次
    const initializeAuth = async () => {
      
      try {
        console.log('🔄 AuthContext: 开始初始化认证系统...');
        
        // 🚀 使用严格的单例模式获取CloudBase实例
        const app = await getApp();
        if (!app) {
          throw new Error('无法获取CloudBase应用实例');
        }
        
        // 🔐 获取认证实例（使用getAuth确保单例）
        const auth = await getAuth();
        if (!auth) {
          throw new Error('无法获取CloudBase认证实例');
        }
        
        // ⏰ 确保SDK完全初始化（增加等待时间确保稳定性）
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!mounted) {
          console.log('🛑 AuthContext: 组件已卸载，停止初始化');
          return;
        }
        
        // 📡 设置登录状态变化监听器（只设置一次）
        console.log('📡 AuthContext: 设置登录状态监听器...');
        auth.onLoginStateChanged((params) => {
          if (!mounted) return;
          
          const { eventType } = params?.data || {};
          console.log('🔄 AuthContext: 登录状态变化', { eventType });
          
          switch (eventType) {
            case 'sign_in': {
              console.log('✅ AuthContext: 检测到登录成功事件');
              // 延迟检查状态，确保CloudBase状态已稳定
              setTimeout(() => {
                if (mounted) checkLoginStatus();
              }, 300);
              break;
            }
            case 'sign_out': {
              console.log('🚪 AuthContext: 检测到登出事件');
              if (mounted) {
                localStorage.removeItem('lexicon_user');
                setUser(null);
                setIsLoggedIn(false);
              }
              break;
            }
            case 'credentials_error': {
              console.log('❌ AuthContext: 检测到权限失效事件');
              if (mounted) {
                localStorage.removeItem('lexicon_user');
                setUser(null);
                setIsLoggedIn(false);
              }
              break;
            }
            default:
              break;
          }
        });
        
        // 🔍 开始初始登录状态检查
        if (mounted) {
          console.log('✅ AuthContext: 认证系统初始化完成，开始检查登录状态');
          await checkLoginStatus();
        }
        
      } catch (error) {
        console.error('❌ AuthContext: 认证系统初始化失败:', error);
        if (mounted) {
          setIsLoading(false);
          // 即使初始化失败，也要清除可能存在的无效状态
          localStorage.removeItem('lexicon_user');
          setUser(null);
          setIsLoggedIn(false);
        }
      }
    };
    
    // 🚀 启动初始化
    if (mounted) {
      initializeAuth();
    }
    
    return () => {
      console.log('🧹 AuthContext: 组件卸载，清理资源');
      mounted = false;
    };
  }, []); // 空依赖数组确保只运行一次

  const checkLoginStatus = async () => {
    console.log('🔄 AuthContext: 开始检查登录状态...');
    
    // 调试：打印localStorage中的CloudBase相关信息
    debugCloudBaseStorage();
    
    setIsLoading(true);
    
    try {
      // 使用改进后的checkAuthStatus函数，它已经包含了重试机制
      const cloudBaseLoginState = await checkAuthStatus();
      
      if (cloudBaseLoginState && cloudBaseLoginState.isLoggedIn) {
        console.log('✅ CloudBase登录状态有效', {
          uid: cloudBaseLoginState.uid,
          user: cloudBaseLoginState.user
        });
        
        // CloudBase认证有效，现在获取或创建应用用户信息
        const cloudbaseUserId = cloudBaseLoginState.uid || cloudBaseLoginState.user?.uid;
        if (!cloudbaseUserId) {
          throw new Error('CloudBase登录成功但无法获取用户ID');
        }
        
        // 检查本地是否有对应的用户数据
        const savedUser = localStorage.getItem('lexicon_user');
        let shouldFetchFromCloud = true;
        
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            // 检查本地用户数据是否与当前CloudBase用户匹配
            if (userData.uid === cloudbaseUserId || userData.cloudbaseUserId === cloudbaseUserId) {
              setUser(userData);
              setIsLoggedIn(true);
              shouldFetchFromCloud = false;
              console.log('✅ 使用本地用户信息', { uid: userData.uid });
            } else {
              console.log('⚠️ 本地用户数据与CloudBase用户不匹配，需要重新获取');
              localStorage.removeItem('lexicon_user');
            }
          } catch (parseError) {
            console.warn('⚠️ 本地用户数据解析失败:', parseError);
            localStorage.removeItem('lexicon_user');
          }
        }
        
        // 如果需要从云端获取用户信息
        if (shouldFetchFromCloud) {
          await fetchUserFromCloud(cloudbaseUserId);
        }
        
      } else {
        console.log('ℹ️ CloudBase未检测到有效登录状态');
        // CloudBase没有有效的登录状态，清除应用状态
        localStorage.removeItem('lexicon_user');
        setUser(null);
        setIsLoggedIn(false);
      }
      
    } catch (error) {
      console.error('❌ 检查登录状态失败:', error);
      
      // 🔐 重要：错误处理时要更谨慎
      // 只有在确认没有有效认证时才清除状态
      const savedUser = localStorage.getItem('lexicon_user');
      if (!savedUser) {
        // 没有保存的用户数据，可以安全地清除状态
        setUser(null);
        setIsLoggedIn(false);
      } else {
        // 有保存的用户数据，可能是网络问题
        // 暂时使用本地数据，避免用户被强制登出
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setIsLoggedIn(true);
          console.log('⚠️ CloudBase检查失败，暂时使用本地用户数据');
        } catch (e) {
          // 本地数据也无效，只能清除状态
          localStorage.removeItem('lexicon_user');
          setUser(null);
          setIsLoggedIn(false);
        }
      }
      
    } finally {
      setIsLoading(false);
      console.log('✅ 登录状态检查完成');
    }
  };

  // 从云端获取用户信息的辅助函数
  const fetchUserFromCloud = async (cloudbaseUserId: string) => {
    try {
      console.log('🌐 从云端获取用户信息...', { cloudbaseUserId });
      const app = await getApp();
      
      const result = await app.callFunction({
        name: 'userInfo',
        data: { 
          action: 'getOrCreate',
          userId: cloudbaseUserId,
          displayName: 'User'
        }
      });
      
      if (result.result && result.result.code === 0) {
        const userData = result.result.data;
        
        // 确保用户数据包含CloudBase用户ID用于后续匹配
        const enhancedUserData = {
          ...userData,
          cloudbaseUserId: cloudbaseUserId // 添加CloudBase用户ID引用
        };
        
        setUser(enhancedUserData);
        setIsLoggedIn(true);
        
        // 保存增强的用户数据到本地
        localStorage.setItem('lexicon_user', JSON.stringify(enhancedUserData));
        
        console.log('✅ 用户信息获取成功', { 
          uid: userData.uid, 
          cloudbaseUserId: cloudbaseUserId 
        });
        
      } else {
        throw new Error(result.result?.message || '获取用户信息失败');
      }
    } catch (error) {
      console.error('❌ 从云端获取用户信息失败:', error);
      
      // 获取失败时的处理策略：
      // 1. 不立即清除CloudBase认证状态（因为CloudBase本身是有效的）
      // 2. 但清除应用层的用户状态，让用户知道应用数据有问题
      localStorage.removeItem('lexicon_user');
      setUser(null);
      setIsLoggedIn(false);
      
      // 可以考虑显示一个错误提示，告诉用户网络问题或服务器问题
      throw error; // 重新抛出错误，让上层处理
    }
  };

  // 邮箱+密码登录 - 使用CloudBase原生认证
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('🔄 开始登录...');
      
      // CloudBase登录
      const loginState = await signInWithEmail(email, password);
      
      if (loginState && loginState.isLoggedIn) {
        console.log('✅ 登录成功，获取用户信息...');
        
        // 获取用户信息
        const app = await getApp();
        const result = await app.callFunction({
          name: 'userInfo',
          data: { 
            action: 'getOrCreate',
            userId: loginState.uid,
            displayName: email.split('@')[0],
            email: email // 传递邮箱信息
          }
        });
        
        if (result.result && result.result.code === 0) {
          const userData = result.result.data;
          
          // 添加CloudBase用户ID映射和邮箱信息
          const enhancedUserData = {
            ...userData,
            email: email, // 确保邮箱信息存在
            cloudbaseUserId: loginState.uid
          };
          
          setUser(enhancedUserData);
          setIsLoggedIn(true);
          localStorage.setItem('lexicon_user', JSON.stringify(enhancedUserData));
          console.log('✅ 登录完成');
        } else {
          throw new Error('获取用户信息失败');
        }
      } else {
        throw new Error('登录失败');
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
        const app = await getApp();
        console.log('🔍 AuthContext: 调用userInfo云函数(创建)', {
          action: 'create',
          userId: cloudbaseUserId,
          userInfo: {
            displayName: displayName || email.split('@')[0]
          }
        });
        
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
        
        console.log('📊 AuthContext: userInfo云函数(创建)返回结果', userInfoResult);
        
        if (userInfoResult.result?.success) {
          const userInfo = userInfoResult.result.data;
          const userData: User = {
            uid: userInfo.uid,
            displayName: userInfo.displayName,
            username: userInfo.username || email.split('@')[0],
            email: email,
            avatar: userInfo.avatar || `/user-avatar.png`,
            level: userInfo.level || 1,
            totalWords: userInfo.totalWords || 0,
            studiedWords: userInfo.studiedWords || 0,
            correctRate: userInfo.correctRate || 0,
            streakDays: userInfo.streakDays || 0,
            lastStudyDate: userInfo.lastStudyDate || null,
            // 权限相关字段
            role: userInfo.role || 'user',
            permissions: userInfo.permissions || ['basic_learning'],
            // 添加CloudBase用户ID映射
            cloudbaseUserId: cloudbaseUserId,
            // 添加必需的时间字段
            createdAt: userInfo.createdAt ? new Date(userInfo.createdAt) : new Date()
          };
          
          setUser(userData);
          setIsLoggedIn(true);
          
          // 保存到本地存储
          localStorage.setItem('lexicon_user', JSON.stringify(userData));
          
          console.log('✅ 注册完成');
        } else {
          const errorMsg = userInfoResult.result?.error || '创建用户信息失败';
          console.error('❌ AuthContext: 创建用户信息失败', {
            error: errorMsg,
            fullResult: userInfoResult
          });
          throw new Error(errorMsg);
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
      
      const app = await getApp();

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
      
      const app = await getApp();
      
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