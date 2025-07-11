import cloudbase from '@cloudbase/js-sdk';

// 云开发环境ID
const ENV_ID = 'cloud1-7g7oatv381500c81';

// 检查环境ID是否已配置
const isValidEnvId = ENV_ID && ENV_ID !== 'your-env-id';

/**
 * 初始化云开发实例
 * @param {Object} config - 初始化配置
 * @param {string} config.env - 环境ID，默认使用ENV_ID
 * @param {number} config.timeout - 超时时间，默认15000ms
 * @returns {Object} 云开发实例
 */
export const init = (config = {}) => {
  const appConfig = {
    env: config.env || ENV_ID,
    timeout: config.timeout || 15000,
  };

  return cloudbase.init(appConfig);
};

/**
 * 默认的云开发实例
 */
export const app = init();

/**
 * 检查环境配置是否有效
 */
export const checkEnvironment = () => {
  if (!isValidEnvId) {
    const message = '❌ 云开发环境ID未配置\n\n请按以下步骤配置：\n1. 打开 src/utils/cloudbase.js 文件\n2. 将 ENV_ID 变量的值替换为您的云开发环境ID\n3. 保存文件并刷新页面\n\n获取环境ID：https://console.cloud.tencent.com/tcb';
    console.error(message);
    return false;
  }
  return true;
};

/**
 * 确保用户已登录（如未登录会执行匿名登录）
 * @returns {Promise} 登录状态
 */
export const ensureLogin = async () => {
  // 检查环境配置
  if (!checkEnvironment()) {
    throw new Error('环境ID未配置');
  }

  const auth = app.auth();

  try {
    // 检查当前登录状态
    let loginState = await auth.getLoginState();

    if (loginState) {
      // 已登录，返回当前状态
      console.log('用户已登录');
      return loginState;
    } else {
      // 未登录，执行登录
      console.log('用户未登录，执行登录...');

      // 默认采用匿名登录,
      await auth.signInAnonymously();
      // 也可以换成跳转SDK 内置的登录页面，支持账号密码登录/手机号登录/微信登录
      // await auth.toDefaultLoginPage()

      let loginState = await auth.getLoginState()
      return loginState;
    }
  } catch (error) {
    console.error('确保登录失败:', error);

    // 即使登录失败，也返回一个降级的登录状态，确保应用可以继续运行
    console.warn('使用降级登录状态，应用将以离线模式运行');
    return {
      isLoggedIn: true,
      user: {
        uid: 'offline_' + Date.now(),
        isAnonymous: true,
        isOffline: true
      }
    };
  }
};



/**
 * 用户注册
 * @param {string} email - 邮箱
 * @param {string} password - 密码
 * @returns {Promise}
 */
export const register = async (email, password) => {
  if (!checkEnvironment()) {
    throw new Error('环境ID未配置');
  }

  try {
    // 创建用户记录到数据库
    const db = app.database();
    const result = await db.collection('users').add({
      email,
      password: btoa(password), // 简单base64编码，实际应用应使用更安全的哈希
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 执行匿名登录
    const auth = app.auth();
    await auth.signInAnonymously();
    
    return { success: true, userId: result.id };
  } catch (error) {
    console.error('注册失败:', error);
    throw new Error('注册失败：' + error.message);
  }
};

/**
 * 用户登录
 * @param {string} email - 邮箱
 * @param {string} password - 密码
 * @returns {Promise}
 */
export const login = async (email, password) => {
  if (!checkEnvironment()) {
    throw new Error('环境ID未配置');
  }

  try {
    // 验证用户凭据
    const db = app.database();
    const result = await db.collection('users')
      .where({
        email,
        password: btoa(password)
      })
      .get();

    if (!result.data || result.data.length === 0) {
      throw new Error('邮箱或密码错误');
    }

    // 执行匿名登录（实际项目中可以使用自定义登录）
    const auth = app.auth();
    await auth.signInAnonymously();
    
    return { success: true, user: result.data[0] };
  } catch (error) {
    console.error('登录失败:', error);
    throw new Error('登录失败：' + error.message);
  }
};

/**
 * 退出登录（注意：匿名登录无法退出）
 * @returns {Promise}
 */
export const logout = async () => {
  const auth = app.auth();

  try {
    const loginScope = await auth.loginScope();

    if (loginScope === 'anonymous') {
      console.warn('匿名登录状态无法退出');
      return { success: false, message: '匿名登录状态无法退出' };
    }

    await auth.signOut();
    return { success: true, message: '已成功退出登录' };
  } catch (error) {
    console.error('退出登录失败:', error);
    throw error;
  }
};

// 默认导出
export default {
  init,
  app,
  ensureLogin,
  register,
  login,
  logout,
  checkEnvironment,
  isValidEnvId
}; 
