/**
 * 重新设计的CloudBase认证系统
 * 基于CloudBase原生认证，移除localStorage依赖
 */

import cloudbase from '@cloudbase/js-sdk';

const config = {
  env: 'cloud1-7g7oatv381500c81',
  region: 'ap-shanghai'
};

console.log('CloudBase初始化配置:', config);

// 全局CloudBase实例
let app: cloudbase.App;

try {
  app = cloudbase.init(config);
  console.log('CloudBase实例创建成功');
} catch (error) {
  console.error('CloudBase初始化失败:', error);
  throw error;
}

export const getApp = () => app;

/**
 * 获取当前认证状态
 * 直接从CloudBase获取，不依赖本地存储
 */
export const getAuthState = async () => {
  try {
    const auth = app.auth();
    const loginState = await auth.getLoginState();
    
    return {
      isLoggedIn: !!(loginState && loginState.isLoggedIn),
      cloudbaseUserId: loginState?.uid || loginState?.user?.uid || null,
      user: loginState?.user || null
    };
  } catch (error) {
    console.error('获取认证状态失败:', error);
    return {
      isLoggedIn: false,
      cloudbaseUserId: null,
      user: null
    };
  }
};

/**
 * 确保用户已认证
 * 如果未认证，执行匿名登录
 */
export const ensureAuthenticated = async () => {
  try {
    const authState = await getAuthState();
    
    if (!authState.isLoggedIn) {
      console.log('🔄 用户未认证，执行匿名登录...');
      const auth = app.auth();
      await auth.signInAnonymously();
      
      // 重新获取认证状态
      return await getAuthState();
    }
    
    return authState;
  } catch (error) {
    console.error('确保认证失败:', error);
    throw error;
  }
};

/**
 * 获取当前用户信息
 * 直接从云数据库获取，包含权限信息
 */
export const getCurrentUserInfo = async () => {
  try {
    const authState = await ensureAuthenticated();
    
    if (!authState.cloudbaseUserId) {
      throw new Error('无法获取用户ID');
    }

    // 从云数据库获取用户完整信息
    const db = app.database();
    const userResult = await db.collection('users')
      .where({ uid: authState.cloudbaseUserId })
      .get();

    if (userResult.data && userResult.data.length > 0) {
      const userData = userResult.data[0];
      return {
        ...userData,
        isLoggedIn: true,
        cloudbaseUserId: authState.cloudbaseUserId
      };
    }

    // 如果数据库中没有用户记录，创建一个匿名用户
    const newUser = {
      uid: authState.cloudbaseUserId,
      displayName: '匿名用户',
      email: '',
      role: 'user',
      permissions: ['basic_learning'],
      level: 1,
      totalWords: 0,
      studiedWords: 0,
      correctRate: 0,
      streakDays: 0,
      lastStudyDate: null,
      isAnonymous: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 保存到数据库
    await db.collection('users').add(newUser);
    
    return {
      ...newUser,
      isLoggedIn: true,
      cloudbaseUserId: authState.cloudbaseUserId
    };

  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
};

/**
 * 邮箱密码登录
 */
export const loginWithEmailPassword = async (email: string, password: string) => {
  try {
    console.log('🔄 开始邮箱密码登录...');
    
    // 使用云函数验证凭据
    const result = await app.callFunction({
      name: 'userInfo',
      data: {
        action: 'login',
        email,
        password
      }
    });

    if (!result.result?.success) {
      throw new Error(result.result?.error || '登录失败');
    }

    const userData = result.result.data;
    console.log('✅ 邮箱密码登录成功:', userData);
    
    return userData;
  } catch (error) {
    console.error('❌ 邮箱密码登录失败:', error);
    throw error;
  }
};

/**
 * 注册新用户
 */
export const registerUser = async (email: string, password: string, displayName?: string) => {
  try {
    console.log('🔄 开始用户注册...');
    
    const result = await app.callFunction({
      name: 'userInfo',
      data: {
        action: 'register',
        email,
        password,
        displayName
      }
    });

    if (!result.result?.success) {
      throw new Error(result.result?.error || '注册失败');
    }

    const userData = result.result.data;
    console.log('✅ 用户注册成功:', userData);
    
    return userData;
  } catch (error) {
    console.error('❌ 用户注册失败:', error);
    throw error;
  }
};

/**
 * 更新用户信息
 */
export const updateUserInfo = async (updates: any) => {
  try {
    const authState = await ensureAuthenticated();
    
    if (!authState.cloudbaseUserId) {
      throw new Error('用户未认证');
    }

    const db = app.database();
    await db.collection('users')
      .where({ uid: authState.cloudbaseUserId })
      .update({
        ...updates,
        updatedAt: new Date()
      });

    console.log('✅ 用户信息更新成功');
  } catch (error) {
    console.error('❌ 更新用户信息失败:', error);
    throw error;
  }
};

/**
 * 提升用户权限
 */
export const promoteUserWithKey = async (adminKey: string) => {
  try {
    const authState = await ensureAuthenticated();
    
    const result = await app.callFunction({
      name: 'userInfo',
      data: {
        action: 'promoteWithKey',
        adminKey,
        userId: authState.cloudbaseUserId
      }
    });

    if (!result.result?.success) {
      throw new Error(result.result?.error || '权限提升失败');
    }

    console.log('✅ 权限提升成功');
    return result.result.data;
  } catch (error) {
    console.error('❌ 权限提升失败:', error);
    throw error;
  }
};

/**
 * 登出
 */
export const logout = async () => {
  try {
    const auth = app.auth();
    await auth.signOut();
    console.log('✅ 用户已登出');
  } catch (error) {
    console.error('❌ 登出失败:', error);
    throw error;
  }
};

/**
 * 检查用户权限
 */
export const checkPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('*');
};

/**
 * 检查用户角色
 */
export const checkRole = (userRole: string, requiredRole: string): boolean => {
  const roleHierarchy = {
    'user': 1,
    'admin': 2,
    'super_admin': 3
  };
  
  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
  
  return userLevel >= requiredLevel;
};

export default app;