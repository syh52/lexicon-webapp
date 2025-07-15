import { app } from './cloudbase';

/**
 * 测试数据库连接和数据获取
 */
export const testDatabaseConnection = async () => {
  console.log('🔍 开始测试数据库连接...');
  
  try {
    // 测试基本连接
    const db = app.database();
    console.log('✅ 数据库实例创建成功');
    
    // 测试认证状态
    const auth = app.auth();
    const loginState = await auth.getLoginState();
    console.log('🔐 认证状态:', loginState);
    
    // 测试词书数据查询
    console.log('📚 正在查询词书数据...');
    const wordbooksResult = await db.collection('wordbooks').get();
    console.log('📚 词书查询结果:', wordbooksResult);
    
    // 测试单词数据查询
    console.log('📝 正在查询单词数据...');
    const wordsResult = await db.collection('words').limit(5).get();
    console.log('📝 单词查询结果:', wordsResult);
    
    // 测试用户数据查询
    console.log('👤 正在查询用户数据...');
    const usersResult = await db.collection('users').limit(5).get();
    console.log('👤 用户查询结果:', usersResult);
    
    return {
      success: true,
      wordbooks: wordbooksResult.data || [],
      words: wordsResult.data || [],
      users: usersResult.data || []
    };
    
  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 测试匿名登录
 */
export const testAnonymousLogin = async () => {
  console.log('🔍 开始测试匿名登录...');
  
  try {
    const auth = app.auth();
    
    // 检查当前登录状态
    const currentState = await auth.getLoginState();
    console.log('当前登录状态:', currentState);
    
    if (!currentState) {
      console.log('尝试匿名登录...');
      const result = await auth.anonymousAuthProvider().signIn();
      console.log('匿名登录结果:', result);
    }
    
    // 重新检查登录状态
    const newState = await auth.getLoginState();
    console.log('新的登录状态:', newState);
    
    return {
      success: true,
      loginState: newState
    };
    
  } catch (error) {
    console.error('❌ 匿名登录测试失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 