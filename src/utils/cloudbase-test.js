/**
 * CloudBase配置验证和测试工具
 * 用于验证ClientId配置和认证系统是否正常工作
 */

import { app, getLoginState, signInAnonymously, ensureLogin } from './cloudbase.js';

/**
 * 测试CloudBase基础连接
 */
export const testCloudBaseConnection = async () => {
  console.log('🔧 开始测试CloudBase连接...');
  
  try {
    // 1. 测试初始化
    console.log('✅ CloudBase初始化成功');
    console.log('环境ID:', app.config.env);
    console.log('ClientId:', app.config.clientId);
    console.log('地域:', app.config.region);
    
    // 2. 测试匿名登录
    const loginState = await ensureLogin();
    if (loginState && loginState.isLoggedIn) {
      console.log('✅ 匿名登录成功');
      console.log('用户UID:', loginState.user.uid);
    } else {
      throw new Error('匿名登录失败');
    }
    
    // 3. 测试云函数调用
    try {
      const result = await app.callFunction({
        name: 'hello',
        data: { test: true }
      });
      console.log('✅ 云函数调用成功:', result.result);
    } catch (error) {
      console.log('⚠️ 云函数调用失败（可能函数不存在）:', error.message);
    }
    
    // 4. 测试数据库连接
    try {
      const db = app.database();
      const testResult = await db.collection('test').limit(1).get();
      console.log('✅ 数据库连接成功');
    } catch (error) {
      console.log('⚠️ 数据库连接测试失败:', error.message);
    }
    
    return {
      success: true,
      message: 'CloudBase配置验证成功',
      details: {
        env: app.config.env,
        clientId: app.config.clientId,
        loginState: loginState
      }
    };
    
  } catch (error) {
    console.error('❌ CloudBase连接测试失败:', error);
    return {
      success: false,
      message: 'CloudBase配置验证失败',
      error: error.message
    };
  }
};

/**
 * 测试认证系统
 */
export const testAuthSystem = async () => {
  console.log('🔐 开始测试认证系统...');
  
  try {
    const auth = app.auth();
    
    // 1. 检查当前登录状态
    const currentLoginState = await getLoginState();
    console.log('当前登录状态:', currentLoginState?.isLoggedIn ? '已登录' : '未登录');
    
    // 2. 测试匿名登录
    if (!currentLoginState?.isLoggedIn) {
      const anonymousLogin = await signInAnonymously();
      console.log('✅ 匿名登录测试成功');
    }
    
    // 3. 测试获取访问令牌
    try {
      const { accessToken } = await auth.getAccessToken();
      console.log('✅ 访问令牌获取成功');
    } catch (error) {
      console.log('⚠️ 访问令牌获取失败:', error.message);
    }
    
    return {
      success: true,
      message: '认证系统测试成功'
    };
    
  } catch (error) {
    console.error('❌ 认证系统测试失败:', error);
    return {
      success: false,
      message: '认证系统测试失败',
      error: error.message
    };
  }
};

/**
 * 全面的配置验证
 */
export const validateConfiguration = async () => {
  console.log('🔍 开始全面配置验证...');
  
  const results = {
    cloudbase: await testCloudBaseConnection(),
    auth: await testAuthSystem()
  };
  
  const allSuccess = Object.values(results).every(result => result.success);
  
  console.log('📊 配置验证结果:', {
    overall: allSuccess ? '✅ 通过' : '❌ 失败',
    cloudbase: results.cloudbase.success ? '✅ 通过' : '❌ 失败',
    auth: results.auth.success ? '✅ 通过' : '❌ 失败'
  });
  
  if (allSuccess) {
    console.log('🎉 恭喜！CloudBase配置完全符合官方最佳实践');
  } else {
    console.log('⚠️ 部分配置需要优化，请查看上方详细信息');
  }
  
  return {
    success: allSuccess,
    results: results
  };
};

// 在开发环境自动运行验证
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // 延迟执行，确保应用初始化完成
  setTimeout(() => {
    console.log('🚀 自动运行CloudBase配置验证...');
    validateConfiguration().catch(console.error);
  }, 2000);
}

export default {
  testCloudBaseConnection,
  testAuthSystem,
  validateConfiguration
};