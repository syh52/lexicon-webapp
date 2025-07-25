/**
 * TTS结果本地缓存机制
 * 缓存常用的TTS结果到localStorage，避免重复API调用
 */

// 缓存相关常量
const CACHE_PREFIX = 'tts_cache_';
const CACHE_VERSION = 'v1.0';
const MAX_CACHE_SIZE = 50; // 最多缓存50个音频
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7天过期
const MAX_TEXT_LENGTH = 200; // 只缓存200字符以内的文本

/**
 * 生成缓存键
 */
const getCacheKey = (text, voice, speed = 1.0, model = 'tts-1') => {
  // 标准化输入参数
  const normalizedText = text.trim().toLowerCase();
  const params = `${voice}_${speed}_${model}`;
  
  // 使用简单的哈希算法生成唯一键
  const hash = simpleHash(`${normalizedText}_${params}`);
  return `${CACHE_PREFIX}${CACHE_VERSION}_${hash}`;
};

/**
 * 简单哈希函数
 */
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(36);
};

/**
 * 检查文本是否适合缓存
 */
const shouldCache = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  // 长度检查
  if (text.length > MAX_TEXT_LENGTH) return false;
  
  // 避免缓存包含动态内容的文本
  const dynamicPatterns = [
    /\d{4}-\d{2}-\d{2}/, // 日期
    /\d{2}:\d{2}:\d{2}/, // 时间
    /\b\d+\.\d+\%/, // 百分比
    /\b\d+\.\d+\$/, // 价格
    /session|request|id/i // 会话ID等
  ];
  
  return !dynamicPatterns.some(pattern => pattern.test(text));
};

/**
 * 获取缓存的音频数据
 */
export const getCachedTTS = (text, voice, speed = 1.0, model = 'tts-1') => {
  try {
    if (!shouldCache(text)) {
      return null;
    }
    
    const cacheKey = getCacheKey(text, voice, speed, model);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    const data = JSON.parse(cached);
    
    // 检查是否过期
    if (Date.now() - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    console.log('🎯 TTS缓存命中:', text.substring(0, 30) + (text.length > 30 ? '...' : ''));
    return data.audioData;
    
  } catch (error) {
    console.warn('读取TTS缓存失败:', error);
    return null;
  }
};

/**
 * 缓存TTS音频数据
 */
export const cacheTTS = (text, voice, speed = 1.0, model = 'tts-1', audioData) => {
  try {
    if (!shouldCache(text) || !audioData) {
      return false;
    }
    
    const cacheKey = getCacheKey(text, voice, speed, model);
    const cacheData = {
      text: text.substring(0, 100), // 只存储前100个字符用于调试
      voice,
      speed,
      model,
      audioData,
      timestamp: Date.now(),
      size: audioData.length
    };
    
    // 检查存储空间
    const dataStr = JSON.stringify(cacheData);
    
    // 如果单个缓存项过大（>1MB），不缓存
    if (dataStr.length > 1024 * 1024) {
      console.warn('TTS数据过大，不进行缓存:', dataStr.length);
      return false;
    }
    
    // 清理过期缓存
    cleanExpiredCache();
    
    // 如果缓存已满，删除最旧的项
    limitCacheSize();
    
    localStorage.setItem(cacheKey, dataStr);
    console.log('💾 TTS结果已缓存:', text.substring(0, 30) + (text.length > 30 ? '...' : ''));
    
    return true;
    
  } catch (error) {
    console.warn('缓存TTS失败:', error);
    
    // 如果是存储空间不足，尝试清理缓存后重试
    if (error.name === 'QuotaExceededError') {
      console.log('存储空间不足，清理缓存后重试...');
      clearOldCache();
      
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        return true;
      } catch (retryError) {
        console.error('重试缓存仍然失败:', retryError);
      }
    }
    
    return false;
  }
};

/**
 * 清理过期的缓存
 */
const cleanExpiredCache = () => {
  const now = Date.now();
  const keysToRemove = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (now - data.timestamp > CACHE_DURATION) {
          keysToRemove.push(key);
        }
      } catch (error) {
        // 如果解析失败，也删除这个键
        keysToRemove.push(key);
      }
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  if (keysToRemove.length > 0) {
    console.log(`🧹 清理了 ${keysToRemove.length} 个过期的TTS缓存`);
  }
};

/**
 * 限制缓存大小
 */
const limitCacheSize = () => {
  const cacheItems = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        cacheItems.push({ key, timestamp: data.timestamp });
      } catch (error) {
        // 忽略解析错误的项
      }
    }
  }
  
  if (cacheItems.length > MAX_CACHE_SIZE) {
    // 按时间戳排序，删除最旧的项
    cacheItems.sort((a, b) => a.timestamp - b.timestamp);
    const itemsToRemove = cacheItems.slice(0, cacheItems.length - MAX_CACHE_SIZE);
    
    itemsToRemove.forEach(item => {
      localStorage.removeItem(item.key);
    });
    
    console.log(`🧹 清理了 ${itemsToRemove.length} 个旧的TTS缓存`);
  }
};

/**
 * 清理所有旧缓存（紧急清理）
 */
const clearOldCache = () => {
  const keysToRemove = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  // 保留最近的10个缓存
  const recentItems = [];
  keysToRemove.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      recentItems.push({ key, timestamp: data.timestamp });
    } catch (error) {
      localStorage.removeItem(key);
    }
  });
  
  recentItems.sort((a, b) => b.timestamp - a.timestamp);
  const itemsToKeep = recentItems.slice(0, 10);
  const keysToKeep = new Set(itemsToKeep.map(item => item.key));
  
  keysToRemove.forEach(key => {
    if (!keysToKeep.has(key)) {
      localStorage.removeItem(key);
    }
  });
  
  console.log(`🧹 紧急清理完成，保留了 ${itemsToKeep.length} 个最新缓存`);
};

/**
 * 获取缓存统计信息
 */
export const getCacheStats = () => {
  let count = 0;
  let totalSize = 0;
  const oldestTimestamp = Date.now();
  let newestTimestamp = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        count++;
        totalSize += data.size || 0;
        newestTimestamp = Math.max(newestTimestamp, data.timestamp);
      } catch (error) {
        // 忽略解析错误的项
      }
    }
  }
  
  return {
    count,
    totalSize,
    averageSize: count > 0 ? Math.round(totalSize / count) : 0,
    oldestAge: oldestTimestamp - newestTimestamp,
    maxSize: MAX_CACHE_SIZE,
    cacheDuration: CACHE_DURATION
  };
};

/**
 * 清空所有TTS缓存
 */
export const clearTTSCache = () => {
  const keysToRemove = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log(`🧹 清空了所有TTS缓存 (${keysToRemove.length} 项)`);
  return keysToRemove.length;
};

/**
 * 预缓存常用文本
 */
export const precacheCommonTexts = async (commonTexts, voice = 'alloy', speed = 1.0) => {
  console.log('📦 开始预缓存常用TTS文本...');
  
  const results = [];
  for (const text of commonTexts) {
    if (shouldCache(text) && !getCachedTTS(text, voice, speed)) {
      results.push({
        text,
        cached: false, // 需要实际的TTS调用来缓存
        reason: 'need_api_call'
      });
    } else {
      results.push({
        text,
        cached: true,
        reason: 'already_cached_or_not_suitable'
      });
    }
  }
  
  return results;
};

export default {
  getCachedTTS,
  cacheTTS,
  getCacheStats,
  clearTTSCache,
  precacheCommonTexts
};