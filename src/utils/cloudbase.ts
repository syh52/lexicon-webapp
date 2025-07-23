import cloudbase from '@cloudbase/js-sdk';

// 云开发环境ID
const ENV_ID = 'cloud1-7g7oatv381500c81';

// 检查环境ID是否已配置
const isValidEnvId = ENV_ID && ENV_ID !== 'your-env-id';

// 应用客户端ID - 用于CloudBase v2认证
const CLIENT_ID = 'lexicon-webapp-' + ENV_ID.split('-').pop();

// 配置接口
interface CloudBaseConfig {
  env?: string;
  region?: string;
  clientId?: string;
  timeout?: number;
}

// 登录状态接口
interface LoginState {
  isLoggedIn: boolean;
  uid?: string;
  isAnonymous?: boolean;
  user?: any;
}

// 全局单例实例缓存
let globalAppInstance: any = null;
let globalAuthInstance: any = null;
let globalLoginState: LoginState | null = null;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

// 认证状态缓存
let isLoggedIn = false;
let loginPromise: Promise<LoginState> | null = null;

/**
 * 初始化云开发实例（单例模式）
 * @param config - 初始化配置
 * @returns 云开发实例
 */
export const init = (config: CloudBaseConfig = {}): any => {
  // 如果已有实例，直接返回
  if (globalAppInstance) {
    return globalAppInstance;
  }

  // 如果正在初始化，等待现有的初始化过程
  if (isInitializing && initPromise) {
    return initPromise;
  }

  // 开始初始化过程
  isInitializing = true;
  
  const appConfig = {
    env: config.env || ENV_ID,
    region: config.region || 'ap-shanghai',
    // clientId: config.clientId || CLIENT_ID, // 根据官方文档，ClientId可以省略，默认使用环境ID
    timeout: config.timeout || 15000,
  };

  console.log('CloudBase初始化配置:', { env: appConfig.env, region: appConfig.region });
  
  try {
    // 创建应用实例
    globalAppInstance = cloudbase.init(appConfig);
    
    // 初始化 auth 实例（但不立即登录）
    globalAuthInstance = globalAppInstance.auth();
    
    console.log('CloudBase实例创建成功');
    
    isInitializing = false;
    initPromise = null;
    
    return globalAppInstance;
  } catch (error) {
    console.error('CloudBase初始化失败:', error);
    isInitializing = false;
    initPromise = null;
    throw error;
  }
};

/**
 * 获取全局CloudBase应用实例（单例）
 */
export const getApp = (): any => {
  if (!globalAppInstance) {
    return init();
  }
  return globalAppInstance;
};

/**
 * 获取auth实例（单例模式）
 */
export const getAuth = (): any => {
  if (!globalAuthInstance) {
    const app = getApp();
    globalAuthInstance = app.auth();
  }
  return globalAuthInstance;
};

/**
 * 默认的云开发实例（延迟初始化）
 */
export const app = getApp();

/**
 * 检查环境配置是否有效
 */
export const checkEnvironment = (): boolean => {
  if (!isValidEnvId) {
    const message = '❌ 云开发环境ID未配置\n\n请按以下步骤配置：\n1. 打开 src/utils/cloudbase.ts 文件\n2. 将 ENV_ID 变量的值替换为您的云开发环境ID\n3. 保存文件并刷新页面\n\n获取环境ID：https://console.cloud.tencent.com/tcb';
    console.error(message);
    return false;
  }
  return true;
};

/**
 * 获取当前登录状态
 * @returns 登录状态
 */
export const getLoginState = async (): Promise<LoginState | null> => {
  try {
    const auth = getAuth();
    return await auth.getLoginState();
  } catch (error) {
    console.error('获取登录状态失败:', error);
    return null;
  }
};

/**
 * 匿名登录（符合CloudBase v2最佳实践）
 * @returns 登录状态
 */
export const signInAnonymously = async (): Promise<LoginState> => {
  try {
    const auth = getAuth();
    const loginState = await auth.signInAnonymously();
    console.log('匿名登录成功');
    return loginState;
  } catch (error) {
    console.error('匿名登录失败:', error);
    throw error;
  }
};

/**
 * 确保已登录（如未登录则执行匿名登录）- 优化版本
 * @returns 登录状态
 */
export const ensureLogin = async (): Promise<LoginState> => {
  // 如果有缓存的登录状态，直接返回
  if (globalLoginState && globalLoginState.isLoggedIn) {
    return globalLoginState;
  }
  
  // 如果正在登录，等待现有的登录过程
  if (loginPromise) {
    return await loginPromise;
  }
  
  // 开始登录过程
  loginPromise = (async (): Promise<LoginState> => {
    try {
      console.log('🔄 检查登录状态...');
      let loginState = await getLoginState();
      
      if (!loginState || !loginState.isLoggedIn) {
        console.log('用户未登录，执行匿名登录...');
        loginState = await signInAnonymously();
        console.log('🔍 匿名登录后的状态结构:', {
          isLoggedIn: loginState?.isLoggedIn,
          uid: loginState?.uid,
          user: loginState?.user ? '存在用户对象' : '无用户对象',
          keys: Object.keys(loginState || {})
        });
        
        // CloudBase匿名登录成功后，手动设置登录状态
        if (loginState && loginState.user && !loginState.isLoggedIn) {
          console.log('🔧 手动修正匿名登录状态');
          loginState.isLoggedIn = true;
        }
      } else {
        console.log('✅ 用户已登录');
      }
      
      // 缓存登录状态
      globalLoginState = loginState;
      isLoggedIn = true;
      
      return loginState;
    } catch (error) {
      console.error('❌ 登录失败:', error);
      globalLoginState = null;
      isLoggedIn = false;
      throw error;
    } finally {
      loginPromise = null;
    }
  })();
  
  return await loginPromise;
};

/**
 * 清除缓存状态（用于测试或重置）
 */
export const clearCache = (): void => {
  globalLoginState = null;
  isLoggedIn = false;
  loginPromise = null;
  console.log('🔄 CloudBase缓存已清除');
};

/**
 * 获取当前缓存的登录状态（用于调试）
 */
export const getCachedLoginState = (): LoginState | null => {
  return globalLoginState;
};

// 默认导出
export default {
  init,
  app,
  getApp,
  checkEnvironment,
  isValidEnvId,
  CLIENT_ID,
  getAuth,
  getLoginState,
  signInAnonymously,
  ensureLogin,
  clearCache,
  getCachedLoginState
};