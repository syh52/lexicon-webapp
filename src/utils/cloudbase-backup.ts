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
  appUserId?: string; // 应用层用户ID，用于数据关联映射
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

// 连接保活相关
let keepAliveTimer: NodeJS.Timeout | null = null;
let lastActivity = Date.now();
const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000; // 5分钟
const AUTH_CACHE_DURATION = 10 * 60 * 1000; // 10分钟
let lastAuthCheck = 0;

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
 * 确保已登录（如未登录则执行匿名登录）- 智能缓存优化版本
 * 修复版本：正确处理应用层用户ID和CloudBase匿名ID的映射关系
 * @returns 登录状态
 */
export const ensureLogin = async (): Promise<LoginState> => {
  // 更新活动时间
  updateActivity();
  
  // 如果有有效的缓存登录状态且不需要重新认证，直接返回
  if (globalLoginState && globalLoginState.isLoggedIn && !shouldReauth()) {
    console.log('🚀 使用缓存的登录状态');
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

      // 🔧 关键修复：建立应用层用户ID和CloudBase用户ID的映射关系
      if (loginState && loginState.isLoggedIn) {
        const cloudbaseUserId = loginState.uid || loginState.user?.uid;
        if (cloudbaseUserId) {
          // 从localStorage获取应用层用户信息
          const savedUser = localStorage.getItem('lexicon_user');
          if (savedUser) {
            try {
              const appUser = JSON.parse(savedUser);
              // 将CloudBase用户ID存储到应用用户信息中，用于数据关联
              loginState.appUserId = appUser.uid;
              console.log('🔗 用户ID映射建立:', {
                cloudbaseUserId,
                appUserId: appUser.uid
              });
            } catch (error) {
              console.warn('解析应用用户信息失败:', error);
            }
          }
        }
      }
      
      // 缓存登录状态并更新检查时间
      globalLoginState = loginState;
      isLoggedIn = true;
      lastAuthCheck = Date.now();
      
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

/**
 * 连接保活 - 定期调用轻量级API保持连接活跃
 */
const keepConnectionAlive = async (): Promise<void> => {
  try {
    lastActivity = Date.now();
    const auth = getAuth();
    // 轻量级的状态检查，不执行登录操作
    await auth.getLoginState();
    console.log('🔄 CloudBase连接保活成功');
  } catch (error) {
    console.warn('⚠️ 连接保活失败:', error);
    // 保活失败时清除缓存，强制下次重新认证
    globalLoginState = null;
    isLoggedIn = false;
  }
};

/**
 * 启动连接保活机制
 */
export const startKeepAlive = (): void => {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
  }
  
  keepAliveTimer = setInterval(keepConnectionAlive, KEEP_ALIVE_INTERVAL);
  console.log('✅ CloudBase连接保活已启动');
};

/**
 * 停止连接保活机制
 */
export const stopKeepAlive = (): void => {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
    console.log('🛑 CloudBase连接保活已停止');
  }
};

/**
 * 更新活动时间戳
 */
export const updateActivity = (): void => {
  lastActivity = Date.now();
};

/**
 * 统一获取当前用户ID - 解决身份映射问题
 * @param useCase - 使用场景：'data' | 'auth' | 'mapping'
 * @returns 用户ID
 */
export const getCurrentUserId = async (useCase: 'data' | 'auth' | 'mapping' = 'data'): Promise<string | null> => {
  try {
    // 获取当前登录状态
    const loginState = await ensureLogin();
    const cloudbaseUserId = loginState?.uid || loginState?.user?.uid;
    
    if (!cloudbaseUserId) {
      console.warn('未能获取CloudBase用户ID');
      return null;
    }
    
    switch (useCase) {
      case 'auth':
        // 权限验证场景：直接使用CloudBase ID
        console.log('🔑 权限验证使用CloudBase用户ID:', cloudbaseUserId);
        return cloudbaseUserId;
        
      case 'mapping':
        // 映射管理场景：返回CloudBase ID用于建立映射关系
        return cloudbaseUserId;
        
      case 'data':
      default:
        // 数据访问场景：优先使用映射后的应用层ID
        return await getDataUserId(cloudbaseUserId);
    }
    
  } catch (error) {
    console.error('获取用户ID失败:', error);
    return null;
  }
};

/**
 * 获取用于数据访问的用户ID（支持ID映射）
 * @param cloudbaseUserId CloudBase用户ID
 * @returns 用于数据访问的用户ID
 */
export const getDataUserId = async (cloudbaseUserId: string): Promise<string | null> => {
  try {
    const app = getApp();
    
    // 1. 首先检查ID映射表
    const mappingResult = await app.callFunction({
      name: 'userInfo',
      data: { 
        action: 'getUserMapping',
        cloudbaseUserId: cloudbaseUserId
      }
    });
    
    if (mappingResult.result?.success && mappingResult.result.data?.appUserId) {
      const appUserId = mappingResult.result.data.appUserId;
      console.log('🎯 从映射表获取应用层用户ID:', appUserId);
      return appUserId;
    }
    
    // 2. 回退到本地存储的应用用户信息
    const savedUser = localStorage.getItem('lexicon_user');
    if (savedUser) {
      try {
        const appUser = JSON.parse(savedUser);
        if (appUser.uid) {
          console.log('🎯 从本地存储获取应用层用户ID:', appUser.uid);
          
          // 异步建立映射关系（不阻塞主流程）
          establishUserMapping(cloudbaseUserId, appUser.uid).catch(error => {
            console.warn('建立用户映射失败:', error);
          });
          
          return appUser.uid;
        }
      } catch (error) {
        console.warn('解析应用用户信息失败:', error);
      }
    }
    
    // 3. 最后回退到CloudBase ID
    console.log('🔄 回退使用CloudBase用户ID作为数据ID:', cloudbaseUserId);
    return cloudbaseUserId;
    
  } catch (error) {
    console.error('获取数据用户ID失败:', error);
    // 发生错误时回退到CloudBase ID
    return cloudbaseUserId;
  }
};

/**
 * 建立用户ID映射关系
 * @param cloudbaseUserId CloudBase用户ID
 * @param appUserId 应用层用户ID
 */
export const establishUserMapping = async (cloudbaseUserId: string, appUserId: string): Promise<boolean> => {
  try {
    const app = getApp();
    
    const result = await app.callFunction({
      name: 'userInfo',
      data: { 
        action: 'establishMapping',
        cloudbaseUserId: cloudbaseUserId,
        appUserId: appUserId
      }
    });
    
    if (result.result?.success) {
      console.log('✅ 用户ID映射建立成功:', { cloudbaseUserId, appUserId });
      return true;
    } else {
      console.warn('❌ 用户ID映射建立失败:', result.result?.error);
      return false;
    }
  } catch (error) {
    console.error('建立用户ID映射时发生错误:', error);
    return false;
  }
};

/**
 * 智能认证缓存 - 根据时间和活动状态决定是否需要重新检查
 */
const shouldReauth = (): boolean => {
  const now = Date.now();
  const timeSinceLastCheck = now - lastAuthCheck;
  const timeSinceActivity = now - lastActivity;
  
  // 如果距离上次检查超过缓存时间，或者长时间无活动，则重新认证
  return timeSinceLastCheck > AUTH_CACHE_DURATION || timeSinceActivity > KEEP_ALIVE_INTERVAL;
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
  getCachedLoginState,
  startKeepAlive,
  stopKeepAlive,
  updateActivity,
  getCurrentUserId,
  getDataUserId,
  establishUserMapping
};