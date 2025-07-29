// 导入 CloudBase SDK - 使用完整版本确保包含所有模块
import cloudbase from '@cloudbase/js-sdk';

// 💡 CloudBase Web SDK 模块检查和初始化
console.log('🔍 检查 CloudBase SDK 模块加载状态...');

// 测试基础功能是否可用
let isSDKReady = false;
try {
  const testApp = cloudbase.init({ env: 'test-check' });
  const hasDatabase = typeof testApp.database === 'function';
  const hasCallFunction = typeof testApp.callFunction === 'function';
  
  console.log('📊 CloudBase SDK 功能检查:');
  console.log(`  - database: ${hasDatabase ? '✅' : '❌'}`);
  console.log(`  - callFunction: ${hasCallFunction ? '✅' : '❌'}`);
  
  if (hasDatabase && hasCallFunction) {
    isSDKReady = true;
    console.log('🎉 CloudBase SDK 所有必需模块已正确加载');
  } else {
    console.error('❌ CloudBase SDK 关键模块缺失，应用功能将受限');
  }
} catch (error) {
  console.error('❌ CloudBase SDK 初始化检查失败:', error);
}

// 云开发环境ID
const ENV_ID = 'cloud1-7g7oatv381500c81';

// 检查环境ID是否已配置
const isValidEnvId = ENV_ID && ENV_ID.length > 0;

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

// 验证码相关接口
interface VerificationRequest {
  email: string;
}

interface VerificationResponse {
  verification_id: string;
  is_user: boolean;
}

interface VerifyRequest {
  verification_code: string;
  verification_id: string;
}

interface VerifyResponse {
  verification_token: string;
}

interface SignUpRequest {
  email: string;
  verification_code: string;
  verification_token: string;
  password: string;
  name?: string;
}

interface SignInRequest {
  username: string; // 邮箱地址
  password: string;
}

// 🔒 全局单例实例缓存 - 确保整个应用只有唯一的CloudBase实例
let globalAppInstance: any = null;
let globalAuthInstance: any = null;
let globalLoginState: LoginState | null = null;

// 🚫 严格的初始化控制，防止任何形式的重复初始化
let isInitialized = false;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

// 🛡️ 实例创建锁，确保同一时间只能有一个初始化过程
const INSTANCE_LOCK = { locked: false };

// 防抖机制 - 防止短时间内重复调用ensureLogin
let ensureLoginDebounce: {
  promise: Promise<LoginState> | null;
  timestamp: number;
} = {
  promise: null,
  timestamp: 0
};

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
 * 🔒 CloudBase单例初始化 - 绝对防止重复实例创建
 * @param config - 初始化配置
 * @returns 云开发实例
 */
export const init = async (config: CloudBaseConfig = {}): Promise<any> => {
  // 🚀 严格的单例检查：如果已经初始化，直接返回现有实例
  if (isInitialized && globalAppInstance) {
    console.log('✅ 复用现有CloudBase单例实例');
    return globalAppInstance;
  }

  // 🔄 如果正在初始化，等待现有的初始化过程完成
  if (isInitializing && initPromise) {
    console.log('⏳ 等待CloudBase单例初始化完成...');
    return initPromise;
  }

  // 🛡️ 获取实例创建锁，防止并发初始化
  if (INSTANCE_LOCK.locked) {
    console.log('🔒 实例创建被锁定，等待解锁...');
    // 等待锁释放
    while (INSTANCE_LOCK.locked) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    // 锁释放后，再次检查是否已初始化
    if (isInitialized && globalAppInstance) {
      return globalAppInstance;
    }
  }

  // 🔒 加锁，开始初始化过程
  INSTANCE_LOCK.locked = true;
  isInitializing = true;
  
  console.log('🚀 开始创建CloudBase单例实例...');
  
  initPromise = (async () => {
    try {
      // 🔍 最后一次检查：确保没有其他进程已经创建了实例
      if (globalAppInstance) {
        console.log('⚠️ 检测到已存在的实例，取消创建');
        return globalAppInstance;
      }

      const targetEnv = config.env || ENV_ID;
      const appConfig = {
        env: targetEnv,
        region: config.region || 'ap-shanghai',
        timeout: config.timeout || 15000,
      };

      console.log('📋 CloudBase单例配置:', appConfig);
      
      // 🔨 创建唯一的CloudBase实例
      globalAppInstance = cloudbase.init(appConfig);
      
      // ⏰ 等待SDK内部初始化完成（增加等待时间）
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 🧪 验证实例是否包含必要的方法
      const hasDatabaseMethod = typeof globalAppInstance.database === 'function';
      const hasCallFunctionMethod = typeof globalAppInstance.callFunction === 'function';
      
      console.log('📊 实例方法验证:');
      console.log(`  - database(): ${hasDatabaseMethod ? '✅' : '❌'}`);
      console.log(`  - callFunction(): ${hasCallFunctionMethod ? '✅' : '❌'}`);
      
      if (!hasDatabaseMethod || !hasCallFunctionMethod) {
        console.error('❌ CloudBase 实例缺少关键方法，这将导致功能异常');
        console.error('💡 尝试重新创建实例...');
        
        // 尝试重新创建
        globalAppInstance = cloudbase.init(appConfig);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 再次验证
        const retryDbCheck = typeof globalAppInstance.database === 'function';
        const retryFnCheck = typeof globalAppInstance.callFunction === 'function';
        console.log(`🔄 重试验证: database=${retryDbCheck}, callFunction=${retryFnCheck}`);
      }
      
      // 🔐 创建全局auth实例（使用持久化配置）
      // CloudBase SDK需要在创建auth实例时指定持久化模式
      // 注意：不要在这里创建auth实例，因为getAuth函数会负责创建
      console.log('🔐 CloudBase实例初始化完成，auth实例将在首次调用时创建');
      
      // 再等待一段时间确保auth实例完全初始化
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 🎯 标记初始化完成
      isInitialized = true;
      isInitializing = false;
      
      console.log('✅ CloudBase单例实例创建成功');
      
      return globalAppInstance;
      
    } catch (error) {
      console.error('❌ CloudBase单例创建失败:', error);
      
      // 🧹 清理失败状态
      globalAppInstance = null;
      isInitialized = false;
      isInitializing = false;
      initPromise = null;
      
      throw error;
    } finally {
      // 🔓 释放创建锁
      INSTANCE_LOCK.locked = false;
    }
  })();
  
  return initPromise;
};

/**
 * 获取全局CloudBase应用实例（单例，异步版本）
 */
export const getApp = async (): Promise<any> => {
  if (!globalAppInstance) {
    return await init();
  }
  return globalAppInstance;
};

/**
 * 为兼容性提供的app导出（同步版本，返回Promise）
 * @deprecated 建议使用 await getApp() 替代
 */
export const app = getApp();

/**
 * 获取auth实例（单例模式，异步版本）
 */
export const getAuth = async (): Promise<any> => {
  if (!globalAuthInstance) {
    const app = await getApp();
    // 如果在init时没有创建auth实例，这里创建（保持兼容性）
    globalAuthInstance = app.auth({
      persistence: 'local' // 使用localStorage持久化
    });
  }
  return globalAuthInstance;
};

/**
 * 默认的云开发实例（延迟初始化）
 * 注意：由于init现在是异步的，这个导出已移除，请使用getApp()函数
 */
// export const app = getApp(); // 已移除，请使用 await getApp()

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
    const auth = await getAuth();
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
    const auth = await getAuth();
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
  const now = Date.now();
  
  // 防抖检查：如果500ms内有相同的调用，直接返回
  if (ensureLoginDebounce.promise && (now - ensureLoginDebounce.timestamp) < 500) {
    console.log('⏸️ 防抖机制：使用进行中的登录请求');
    return ensureLoginDebounce.promise;
  }
  
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

      // 🔧 关键修复：获取CloudBase用户ID，不依赖localStorage
      if (loginState && loginState.isLoggedIn) {
        const cloudbaseUserId = loginState.uid || loginState.user?.uid;
        if (cloudbaseUserId) {
          console.log('🔗 CloudBase用户认证成功:', {
            cloudbaseUserId,
            loginMethod: '直接CloudBase认证'
          });
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
      // 清除防抖缓存
      ensureLoginDebounce.promise = null;
    }
  })();
  
  // 设置防抖缓存
  ensureLoginDebounce.promise = loginPromise;
  ensureLoginDebounce.timestamp = now;
  
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
    const auth = await getAuth();
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

// 用户ID映射缓存
const userMappingCache = new Map<string, {
  appUserId: string;
  timestamp: number;
  ttl: number;
}>();

const USER_MAPPING_CACHE_TTL = 10 * 60 * 1000; // 10分钟缓存

/**
 * 获取用于数据访问的用户ID（支持ID映射，带缓存优化）
 * @param cloudbaseUserId CloudBase用户ID
 * @returns 用于数据访问的用户ID
 */
export const getDataUserId = async (cloudbaseUserId: string): Promise<string | null> => {
  try {
    // 🚀 检查缓存
    const cached = userMappingCache.get(cloudbaseUserId);
    if (cached && (Date.now() - cached.timestamp < cached.ttl)) {
      console.log('⚡ 使用缓存的用户映射:', cached.appUserId);
      return cached.appUserId;
    }
    
    const app = await getApp();
    
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
      
      // 🚀 缓存映射结果
      userMappingCache.set(cloudbaseUserId, {
        appUserId: appUserId,
        timestamp: Date.now(),
        ttl: USER_MAPPING_CACHE_TTL
      });
      
      return appUserId;
    }
    
    // 2. 如果没有映射，直接使用CloudBase ID作为数据ID
    console.log('🎯 没有找到用户映射，使用CloudBase ID作为数据ID');
    
    // 🚀 缓存"无映射"结果，避免重复查询
    userMappingCache.set(cloudbaseUserId, {
      appUserId: cloudbaseUserId,
      timestamp: Date.now(),
      ttl: USER_MAPPING_CACHE_TTL
    });
    
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
    const app = await getApp();
    
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

// ==================== 邮箱验证码认证功能 ====================

/**
 * 发送邮箱验证码
 * @param email - 邮箱地址
 * @returns 验证码信息
 */
export const sendEmailVerification = async (email: string): Promise<VerificationResponse> => {
  try {
    if (!email || !email.includes('@')) {
      throw new Error('请输入有效的邮箱地址');
    }

    const auth = await getAuth();
    const verification = await auth.getVerification({
      email: email
    });

    console.log('📧 邮箱验证码发送成功:', {
      verification_id: verification.verification_id,
      is_user: verification.is_user
    });

    return verification;
  } catch (error) {
    console.error('❌ 发送邮箱验证码失败:', error);
    throw error;
  }
};

/**
 * 验证邮箱验证码
 * @param verificationCode - 验证码
 * @param verificationId - 验证码ID
 * @returns 验证token
 */
export const verifyEmailCode = async (verificationCode: string, verificationId: string): Promise<VerifyResponse> => {
  try {
    if (!verificationCode || !verificationId) {
      throw new Error('验证码和验证ID都不能为空');
    }

    const auth = await getAuth();
    const result = await auth.verify({
      verification_code: verificationCode,
      verification_id: verificationId
    });

    console.log('✅ 邮箱验证码验证成功');
    return result;
  } catch (error) {
    console.error('❌ 验证邮箱验证码失败:', error);
    throw error;
  }
};

/**
 * 邮箱验证码注册
 * @param email - 邮箱地址
 * @param password - 密码
 * @param verificationCode - 验证码
 * @param verificationToken - 验证token
 * @param displayName - 显示名称
 * @returns 登录状态
 */
export const signUpWithEmail = async (
  email: string, 
  password: string, 
  verificationCode: string, 
  verificationToken: string,
  displayName?: string
): Promise<LoginState> => {
  try {
    const auth = await getAuth();
    
    const result = await auth.signUp({
      email: email,
      password: password,
      verification_code: verificationCode,
      verification_token: verificationToken,
      name: displayName || email.split('@')[0]
    });

    console.log('✅ 邮箱注册原始返回:', result);

    // CloudBase signUp 成功后可能需要手动获取登录状态
    let loginState = result;
    
    // 如果返回的不是标准登录状态，尝试获取当前登录状态
    if (!loginState || (!loginState.isLoggedIn && !loginState.uid)) {
      console.log('🔄 注册后获取登录状态...');
      loginState = await auth.getLoginState();
      console.log('🔍 获取到的登录状态:', loginState);
    }

    // 确保有效的登录状态
    if (!loginState || (!loginState.isLoggedIn && !loginState.uid && !loginState.user)) {
      throw new Error('注册成功但无法获取登录状态，请尝试直接登录');
    }

    // 标准化登录状态
    const normalizedState: LoginState = {
      isLoggedIn: loginState.isLoggedIn || !!loginState.uid || !!loginState.user,
      uid: loginState.uid || loginState.user?.uid,
      user: loginState.user
    };

    console.log('✅ 邮箱注册成功:', {
      isLoggedIn: normalizedState.isLoggedIn,
      uid: normalizedState.uid
    });

    // 更新全局登录状态
    globalLoginState = normalizedState;
    isLoggedIn = normalizedState.isLoggedIn;
    lastAuthCheck = Date.now();
    
    return normalizedState;
  } catch (error) {
    console.error('❌ 邮箱注册失败:', error);
    throw error;
  }
};

/**
 * 邮箱密码登录
 * @param email - 邮箱地址
 * @param password - 密码
 * @returns 登录状态
 */
export const signInWithEmail = async (email: string, password: string): Promise<LoginState> => {
  try {
    const auth = await getAuth();
    
    console.log('🔑 尝试使用邮箱登录:', email);
    
    const result = await auth.signIn({
      username: email, // CloudBase使用username字段接收邮箱
      password: password
    });

    console.log('✅ 邮箱登录原始返回:', result);

    // CloudBase signIn 成功后可能需要手动获取登录状态
    let loginState = result;
    
    // 如果返回的不是标准登录状态，尝试获取当前登录状态
    if (!loginState || (!loginState.isLoggedIn && !loginState.uid)) {
      console.log('🔄 登录后获取登录状态...');
      // 等待一下让认证状态稳定
      await new Promise(resolve => setTimeout(resolve, 500));
      loginState = await auth.getLoginState();
      console.log('🔍 获取到的登录状态:', loginState);
    }

    // 确保有效的登录状态
    if (!loginState || (!loginState.isLoggedIn && !loginState.uid && !loginState.user)) {
      throw new Error('登录成功但无法获取登录状态，请稍后重试');
    }

    // 标准化登录状态
    const normalizedState: LoginState = {
      isLoggedIn: loginState.isLoggedIn || !!loginState.uid || !!loginState.user,
      uid: loginState.uid || loginState.user?.uid,
      user: loginState.user
    };

    console.log('✅ 邮箱登录成功:', {
      isLoggedIn: normalizedState.isLoggedIn,
      uid: normalizedState.uid
    });

    // 更新全局登录状态
    globalLoginState = normalizedState;
    isLoggedIn = normalizedState.isLoggedIn;
    lastAuthCheck = Date.now();
    
    // 调试：登录成功后立即检查localStorage
    console.log('🔍 登录成功后的localStorage状态:');
    debugCloudBaseStorage();
    
    return normalizedState;
  } catch (error) {
    console.error('❌ 邮箱登录失败:', error);
    throw error;
  }
};

/**
 * 简化版邮箱登录（适配AuthContext使用）
 * @param email - 邮箱地址
 * @param password - 密码
 * @returns 登录状态
 */
export const signInWithEmailSimple = async (email: string, password: string): Promise<LoginState> => {
  try {
    const auth = await getAuth();
    
    const result = await auth.signIn({
      username: email, // CloudBase使用username字段接收邮箱
      password: password
    });

    // 基于uid判断登录是否成功，而不是isLoggedIn字段
    const uid = result.uid || result.user?.uid;
    const loginSuccess = !!uid;

    console.log('✅ 邮箱登录成功:', {
      isLoggedIn: loginSuccess,
      uid: uid
    });

    // 返回标准化的登录状态
    return {
      isLoggedIn: loginSuccess,
      uid: uid,
      user: result.user
    };
  } catch (error) {
    console.error('❌ 邮箱登录失败:', error);
    throw error;
  }
};

/**
 * 登出
 * @returns void
 */
export const signOut = async (): Promise<void> => {
  try {
    const auth = await getAuth();
    await auth.signOut();
    
    // 清除全局状态
    globalLoginState = null;
    isLoggedIn = false;
    lastAuthCheck = 0;
    
    console.log('✅ 登出成功');
  } catch (error) {
    console.error('❌ 登出失败:', error);
    // 即使登出失败，也清除本地状态
    globalLoginState = null;
    isLoggedIn = false;
    lastAuthCheck = 0;
    throw error;
  }
};

/**
 * 检查是否有有效的CloudBase登录状态（增强版本，支持重试和更好的持久化恢复）
 * @returns 登录状态
 */
export const checkAuthStatus = async (): Promise<LoginState | null> => {
  console.log('🔍 正在检查CloudBase登录状态...');
  
  try {
    // 确保CloudBase已完全初始化
    const auth = await getAuth();
    
    // 🔄 重试机制：CloudBase SDK可能需要时间从localStorage恢复状态
    let loginState = null;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 800; // 每次重试延迟800ms，给SDK更多时间
    
    // 首次尝试前先等待一下，让SDK有时间加载localStorage
    console.log('⏰ 等待SDK加载localStorage中的认证状态...');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    while (retryCount < maxRetries) {
      console.log(`⏳ 尝试获取登录状态 (${retryCount + 1}/${maxRetries})...`);
      
      // 获取当前登录状态
      loginState = await auth.getLoginState();
      
      // 调试：打印返回的原始状态
      if (loginState) {
        console.log('🔍 getLoginState返回的原始数据:', {
          hasLoginState: !!loginState,
          isLoggedIn: loginState.isLoggedIn,
          uid: loginState.uid,
          hasUser: !!loginState.user,
          userUid: loginState.user?.uid
        });
      }
      
      // 如果获取到有效的登录状态，立即返回
      if (loginState && (loginState.isLoggedIn || loginState.uid || loginState.user)) {
        break;
      }
      
      // 如果是最后一次尝试，不再等待
      if (retryCount < maxRetries - 1) {
        console.log(`⏰ 等待${retryDelay}ms后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
      retryCount++;
    }
    
    // 检查最终的登录状态
    if (loginState && (loginState.isLoggedIn || loginState.uid || loginState.user)) {
      // 标准化登录状态（兼容不同版本的SDK返回格式）
      const normalizedState: LoginState = {
        isLoggedIn: loginState.isLoggedIn || !!loginState.uid || !!loginState.user,
        uid: loginState.uid || loginState.user?.uid,
        user: loginState.user
      };
      
      // 更新全局状态缓存（仅用于性能优化）
      globalLoginState = normalizedState;
      isLoggedIn = normalizedState.isLoggedIn;
      lastAuthCheck = Date.now();
      
      console.log('✅ 检测到有效的登录状态', { 
        uid: normalizedState.uid,
        isLoggedIn: normalizedState.isLoggedIn,
        retryCount: retryCount
      });
      return normalizedState;
    } else {
      // 清除缓存状态
      globalLoginState = null;
      isLoggedIn = false;
      console.log('ℹ️ 未检测到有效的登录状态（已尝试' + retryCount + '次）');
      return null;
    }
  } catch (error) {
    console.error('❌ 检查认证状态失败:', error);
    // 清除缓存状态
    globalLoginState = null;
    isLoggedIn = false;
    return null;
  }
};

/**
 * 调试函数：打印CloudBase相关的localStorage键值
 * 用于诊断持久化问题
 */
export const debugCloudBaseStorage = (): void => {
  console.log('🔍 === CloudBase localStorage 调试信息 ===');
  const allKeys = Object.keys(localStorage);
  
  // 更广泛的搜索模式
  const cloudbaseKeys = allKeys.filter(key => 
    key.includes('cloudbase') || 
    key.includes('tcb') || 
    key.includes('auth') ||
    key.includes('lexicon') ||
    key.includes('access_token') ||
    key.includes('refresh_token') ||
    key.includes('cloud1-7g7oatv381500c81') // 环境ID
  );
  
  if (cloudbaseKeys.length === 0) {
    console.log('❌ 未找到CloudBase相关的localStorage键');
    console.log('📋 所有localStorage键:', allKeys);
  } else {
    console.log(`✅ 找到 ${cloudbaseKeys.length} 个相关键:`);
    cloudbaseKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value && value.length > 200) {
          console.log(`📝 ${key}: [长内容，前100字符]`, value.substring(0, 100) + '...');
        } else {
          const parsed = JSON.parse(value);
          console.log(`📝 ${key}:`, parsed);
        }
      } catch (e) {
        const rawValue = localStorage.getItem(key);
        if (rawValue && rawValue.length > 200) {
          console.log(`📝 ${key}: [无法解析的长值]`, rawValue.substring(0, 100) + '...');
        } else {
          console.log(`📝 ${key}: [无法解析的值]`, rawValue);
        }
      }
    });
  }
  console.log('🔍 === 调试信息结束 ===');
};

// 默认导出
export default {
  init,
  getApp,
  getAuth,
  checkEnvironment,
  isValidEnvId,
  CLIENT_ID,
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
  establishUserMapping,
  // 邮箱验证码相关方法
  sendEmailVerification,
  verifyEmailCode,
  signUpWithEmail,
  signInWithEmail,
  signOut,
  checkAuthStatus,
  // 调试函数
  debugCloudBaseStorage
};