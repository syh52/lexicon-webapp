import cloudbase from '@cloudbase/js-sdk';

// 云开发环境ID
const ENV_ID = 'cloud1-7g7oatv381500c81';

// 检查环境ID是否已配置
const isValidEnvId = ENV_ID && ENV_ID !== 'your-env-id';

// 应用客户端ID - 用于CloudBase v2认证
const CLIENT_ID = 'lexicon-webapp-' + ENV_ID.split('-').pop();

/**
 * 初始化云开发实例
 * @param {Object} config - 初始化配置
 * @param {string} config.env - 环境ID，默认使用ENV_ID
 * @param {string} config.region - 地域，默认ap-shanghai
 * @param {string} config.clientId - 客户端ID
 * @param {number} config.timeout - 超时时间，默认15000ms
 * @returns {Object} 云开发实例
 */
export const init = (config = {}) => {
  const appConfig = {
    env: config.env || ENV_ID,
    region: config.region || 'ap-shanghai',
    // clientId: config.clientId || CLIENT_ID, // 根据官方文档，ClientId可以省略，默认使用环境ID
    timeout: config.timeout || 15000,
  };

  console.log('CloudBase初始化配置:', { env: appConfig.env, region: appConfig.region });
  
  const app = cloudbase.init(appConfig);
  
  // 初始化 auth，支持未登录模式
  app.auth();
  
  return app;
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
 * 获取当前登录状态
 * @returns {Promise<object|null>} 登录状态
 */
export const getLoginState = async () => {
  try {
    const auth = app.auth();
    return await auth.getLoginState();
  } catch (error) {
    console.error('获取登录状态失败:', error);
    return null;
  }
};

/**
 * 匿名登录（符合CloudBase v2最佳实践）
 * @returns {Promise<object>} 登录状态
 */
export const signInAnonymously = async () => {
  try {
    const auth = app.auth();
    const loginState = await auth.signInAnonymously();
    console.log('匿名登录成功');
    return loginState;
  } catch (error) {
    console.error('匿名登录失败:', error);
    throw error;
  }
};

/**
 * 确保已登录（如未登录则执行匿名登录）
 * @returns {Promise<object>} 登录状态
 */
export const ensureLogin = async () => {
  let loginState = await getLoginState();
  
  if (!loginState || !loginState.isLoggedIn) {
    console.log('用户未登录，执行匿名登录...');
    loginState = await signInAnonymously();
  }
  
  return loginState;
};

// 默认导出
export default {
  init,
  app,
  checkEnvironment,
  isValidEnvId,
  CLIENT_ID,
  getLoginState,
  signInAnonymously,
  ensureLogin
}; 
