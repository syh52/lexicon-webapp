/**
 * 云函数预热和保活机制
 * 定期调用关键云函数以保持热启动状态
 */

import { getApp, updateActivity } from './cloudbase';

// 需要保活的云函数列表
const CRITICAL_FUNCTIONS = [
  'speech-recognition',
  'ai-chat', 
  'text-to-speech'
];

// 保活间隔（5分钟）
const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000;

// 预热间隔（30秒，用于初始化时的预热）
const WARMUP_INTERVAL = 30 * 1000;

let keepAliveTimer = null;
let warmupTimer = null;
let isWarmedUp = false;

/**
 * 轻量级ping操作 - 调用云函数进行保活
 */
const pingFunction = async (functionName) => {
  try {
    const app = getApp();
    console.log(`🔥 预热云函数: ${functionName}`);
    
    // 为不同函数使用不同的轻量级测试数据
    let testData = {};
    
    switch (functionName) {
      case 'speech-recognition':
        // 不发送音频数据，只测试连接
        testData = {
          audioData: '', // 空音频数据
          language: 'en',
          format: 'webm',
          test: true // 标记为测试请求
        };
        break;
        
      case 'ai-chat':
        testData = {
          messages: [{ role: 'user', content: 'ping' }],
          model: 'gpt-4o-mini',
          test: true // 标记为测试请求
        };
        break;
        
      case 'text-to-speech':
        testData = {
          text: 'ping',
          voice: 'alloy',
          test: true // 标记为测试请求
        };
        break;
        
      default:
        testData = { test: true };
    }
    
    // 使用较短的超时时间，避免长时间等待
    const result = await app.callFunction({
      name: functionName,
      data: testData,
      timeout: 10000 // 10秒超时
    });
    
    console.log(`✅ 云函数 ${functionName} 保活成功`);
    updateActivity();
    return true;
    
  } catch (error) {
    console.warn(`⚠️ 云函数 ${functionName} 保活失败:`, error.message);
    return false;
  }
};

/**
 * 批量预热所有关键云函数
 */
const warmupAllFunctions = async () => {
  console.log('🚀 开始预热关键云函数...');
  
  const promises = CRITICAL_FUNCTIONS.map(functionName => 
    pingFunction(functionName).catch(error => {
      console.warn(`预热 ${functionName} 失败:`, error);
      return false;
    })
  );
  
  try {
    const results = await Promise.allSettled(promises);
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;
    
    console.log(`🔥 预热完成: ${successCount}/${CRITICAL_FUNCTIONS.length} 个函数成功`);
    isWarmedUp = true;
    
  } catch (error) {
    console.error('❌ 批量预热失败:', error);
  }
};

/**
 * 定期保活操作
 */
const keepAliveCycle = async () => {
  console.log('🔄 执行云函数保活循环...');
  
  // 随机选择一个函数进行保活，避免同时调用所有函数
  const randomFunction = CRITICAL_FUNCTIONS[
    Math.floor(Math.random() * CRITICAL_FUNCTIONS.length)
  ];
  
  await pingFunction(randomFunction);
};

/**
 * 启动预热机制
 */
export const startWarmup = async () => {
  if (isWarmedUp) {
    console.log('📌 云函数已预热，跳过预热过程');
    return;
  }
  
  console.log('🔥 启动云函数预热机制...');
  
  // 立即执行一次预热
  await warmupAllFunctions();
  
  // 启动渐进式预热：前几分钟更频繁地预热
  let warmupCount = 0;
  const maxWarmups = 3; // 预热3次后停止
  
  warmupTimer = setInterval(async () => {
    warmupCount++;
    
    if (warmupCount <= maxWarmups) {
      console.log(`🔥 渐进式预热第 ${warmupCount} 轮...`);
      await warmupAllFunctions();
    } else {
      // 预热完成，清除预热定时器
      clearInterval(warmupTimer);
      warmupTimer = null;
      console.log('✅ 预热阶段完成，切换到正常保活模式');
    }
  }, WARMUP_INTERVAL);
};

/**
 * 启动保活机制
 */
export const startKeepAlive = () => {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
  }
  
  keepAliveTimer = setInterval(keepAliveCycle, KEEP_ALIVE_INTERVAL);
  console.log('✅ 云函数保活机制已启动');
};

/**
 * 停止所有保活机制
 */
export const stopKeepAlive = () => {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  
  if (warmupTimer) {
    clearInterval(warmupTimer);
    warmupTimer = null;
  }
  
  console.log('🛑 云函数保活机制已停止');
};

/**
 * 手动预热特定函数（在使用前调用）
 */
export const warmupFunction = async (functionName) => {
  if (!CRITICAL_FUNCTIONS.includes(functionName)) {
    console.log(`📌 ${functionName} 不在关键函数列表中，跳过预热`);
    return;
  }
  
  console.log(`🔥 手动预热函数: ${functionName}`);
  return await pingFunction(functionName);
};

/**
 * 智能预热 - 在用户即将使用功能前预热
 */
export const smartWarmup = async (action) => {
  const functionMap = {
    'speech-recognition': ['speech-recognition'],
    'ai-chat': ['ai-chat'],
    'tts': ['text-to-speech'],
    'voice-assistant': ['speech-recognition', 'ai-chat', 'text-to-speech']
  };
  
  const functionsToWarm = functionMap[action] || [];
  
  if (functionsToWarm.length > 0) {
    console.log(`🎯 智能预热: ${action} -> [${functionsToWarm.join(', ')}]`);
    
    const promises = functionsToWarm.map(functionName => 
      pingFunction(functionName)
    );
    
    await Promise.allSettled(promises);
  }
};

/**
 * 获取预热状态
 */
export const getWarmupStatus = () => {
  return {
    isWarmedUp,
    hasKeepAliveTimer: !!keepAliveTimer,
    hasWarmupTimer: !!warmupTimer,
    criticalFunctions: CRITICAL_FUNCTIONS
  };
};

export default {
  startWarmup,
  startKeepAlive,
  stopKeepAlive,
  warmupFunction,
  smartWarmup,
  getWarmupStatus
};