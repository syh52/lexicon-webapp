/**
 * 学习会话服务
 * 负责管理学习进度的持久化和恢复
 * 采用本地存储 + 云数据库的双重保存策略
 */

import { getApp, ensureLogin, getCurrentUserId } from '../utils/cloudbase';
import { DailyStudySession } from '../utils/sm2Algorithm';
import { SM2Card, StudyChoice } from '../types';

// 学习会话状态接口
export interface StudySessionState {
  userId: string;
  wordbookId: string;
  sessionId: string;
  currentCardIndex: number;
  totalCards: number;
  completedCards: number;
  sessionCards: string[]; // 保存卡片ID顺序
  choiceHistory: Array<{
    wordId: string;
    choice: StudyChoice;
    timestamp: number;
  }>;
  startTime: number;
  lastUpdateTime: number;
  isCompleted: boolean;
}

// 本地存储键名
const LOCAL_STORAGE_KEY = 'lexicon_study_session';

/**
 * 学习会话服务类
 */
export class StudySessionService {
  private static instance: StudySessionService;
  
  static getInstance(): StudySessionService {
    if (!StudySessionService.instance) {
      StudySessionService.instance = new StudySessionService();
    }
    return StudySessionService.instance;
  }

  /**
   * 创建新的学习会话状态
   */
  createSessionState(
    userId: string,
    wordbookId: string,
    session: DailyStudySession
  ): StudySessionState {
    const sessionId = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const allCards = session.getAllCards();
    
    return {
      userId,
      wordbookId,
      sessionId,
      currentCardIndex: 0,
      totalCards: allCards.length,
      completedCards: 0,
      sessionCards: allCards.map(card => card.wordId),
      choiceHistory: [],
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      isCompleted: false
    };
  }

  /**
   * 保存学习会话状态到本地存储
   */
  saveToLocalStorage(state: StudySessionState): void {
    try {
      const stateKey = `${LOCAL_STORAGE_KEY}_${state.userId}_${state.wordbookId}`;
      localStorage.setItem(stateKey, JSON.stringify(state));
      console.log('✅ 学习进度已保存到本地存储');
    } catch (error) {
      console.error('❌ 保存到本地存储失败:', error);
    }
  }

  /**
   * 从本地存储加载学习会话状态
   */
  loadFromLocalStorage(userId: string, wordbookId: string): StudySessionState | null {
    try {
      const stateKey = `${LOCAL_STORAGE_KEY}_${userId}_${wordbookId}`;
      const saved = localStorage.getItem(stateKey);
      
      if (!saved) return null;
      
      const state = JSON.parse(saved) as StudySessionState;
      
      // 验证状态有效性（不超过24小时）
      const now = Date.now();
      const sessionAge = now - state.startTime;
      const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24小时
      
      if (sessionAge > MAX_SESSION_AGE) {
        console.log('🕒 学习会话已过期，清除本地缓存');
        this.clearLocalStorage(userId, wordbookId);
        return null;
      }
      
      console.log('✅ 从本地存储恢复学习进度');
      return state;
      
    } catch (error) {
      console.error('❌ 从本地存储加载失败:', error);
      return null;
    }
  }

  /**
   * 清除本地存储的会话状态
   */
  clearLocalStorage(userId: string, wordbookId: string): void {
    try {
      const stateKey = `${LOCAL_STORAGE_KEY}_${userId}_${wordbookId}`;
      localStorage.removeItem(stateKey);
      console.log('🗑️ 已清除本地学习进度');
    } catch (error) {
      console.error('❌ 清除本地存储失败:', error);
    }
  }

  /**
   * 保存学习会话状态到云数据库
   */
  async saveToCloud(state: StudySessionState): Promise<void> {
    try {
      await ensureLogin();
      
      const dataUserId = await getCurrentUserId('data');
      const actualUserId = dataUserId || state.userId;
      
      const appInstance = await getApp();
      const db = appInstance.database();
      const collection = db.collection('study_sessions');
      
      // 查找现有会话记录
      const existingResult = await collection
        .where({
          userId: actualUserId,
          wordbookId: state.wordbookId,
          sessionId: state.sessionId
        })
        .get();

      const sessionData = {
        userId: actualUserId,
        wordbookId: state.wordbookId,
        sessionId: state.sessionId,
        currentCardIndex: state.currentCardIndex,
        totalCards: state.totalCards,
        completedCards: state.completedCards,
        sessionCards: state.sessionCards,
        choiceHistory: state.choiceHistory,
        startTime: new Date(state.startTime),
        lastUpdateTime: new Date(state.lastUpdateTime),
        isCompleted: state.isCompleted
      };

      if (existingResult.data && existingResult.data.length > 0) {
        // 更新现有记录
        await collection
          .doc(existingResult.data[0]._id)
          .update(sessionData);
      } else {
        // 创建新记录
        await collection.add(sessionData);
      }
      
      console.log('☁️ 学习进度已保存到云端');
      
    } catch (error) {
      console.error('❌ 保存到云端失败:', error);
      // 云端保存失败不影响本地使用
    }
  }

  /**
   * 从云数据库加载最新的学习会话状态
   */
  async loadFromCloud(userId: string, wordbookId: string): Promise<StudySessionState | null> {
    try {
      await ensureLogin();
      
      const dataUserId = await getCurrentUserId('data');
      const actualUserId = dataUserId || userId;
      
      const appInstance = await getApp();
      const db = appInstance.database();
      const result = await db.collection('study_sessions')
        .where({
          userId: actualUserId,
          wordbookId: wordbookId
        })
        .orderBy('lastUpdateTime', 'desc')
        .limit(1)
        .get();

      if (!result.data || result.data.length === 0) {
        return null;
      }

      const cloudData = result.data[0];
      
      // 验证云端数据有效性（不超过24小时）
      const sessionAge = Date.now() - cloudData.startTime.getTime();
      const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24小时
      
      if (sessionAge > MAX_SESSION_AGE) {
        console.log('🕒 云端学习会话已过期');
        return null;
      }

      const state: StudySessionState = {
        userId: cloudData.userId,
        wordbookId: cloudData.wordbookId,
        sessionId: cloudData.sessionId,
        currentCardIndex: cloudData.currentCardIndex || 0,
        totalCards: cloudData.totalCards || 0,
        completedCards: cloudData.completedCards || 0,
        sessionCards: cloudData.sessionCards || [],
        choiceHistory: cloudData.choiceHistory || [],
        startTime: cloudData.startTime.getTime(),
        lastUpdateTime: cloudData.lastUpdateTime.getTime(),
        isCompleted: cloudData.isCompleted || false
      };
      
      console.log('☁️ 从云端恢复学习进度');
      return state;
      
    } catch (error) {
      console.error('❌ 从云端加载失败:', error);
      return null;
    }
  }

  /**
   * 更新学习会话状态（处理用户选择）
   */
  updateSessionState(
    state: StudySessionState,
    wordId: string,
    choice: StudyChoice
  ): StudySessionState {
    // 防止边界溢出：确保不超过总卡片数
    const nextCardIndex = Math.min(state.currentCardIndex + 1, state.totalCards);
    const nextCompletedCards = Math.min(state.completedCards + 1, state.totalCards);
    
    const updatedState: StudySessionState = {
      ...state,
      currentCardIndex: nextCardIndex,
      completedCards: nextCompletedCards,
      choiceHistory: [
        ...state.choiceHistory,
        {
          wordId,
          choice,
          timestamp: Date.now()
        }
      ],
      lastUpdateTime: Date.now(),
      isCompleted: nextCardIndex >= state.totalCards
    };

    return updatedState;
  }

  /**
   * 恢复学习会话到DailyStudySession - 智能恢复算法
   */
  async restoreSession(
    state: StudySessionState,
    originalSession: DailyStudySession
  ): Promise<DailyStudySession> {
    try {
      console.log(`🔄 开始智能恢复学习会话，历史选择: ${state.choiceHistory.length} 个`);
      
      // 🔥 新策略：基于已完成的单词集合恢复，而不是严格按序
      const completedWords = new Set(state.choiceHistory.map(record => record.wordId));
      let restoredCount = 0;
      let maxAttempts = completedWords.size * 2; // 防止无限循环
      let attempts = 0;
      
      // 遍历所有可能的卡片，跳过已完成的单词
      while (attempts < maxAttempts) {
        const currentCard = originalSession.getCurrentCard();
        attempts++;
        
        if (!currentCard) {
          // 没有更多卡片，恢复完成
          console.log(`🏁 会话已完成，没有更多卡片`);
          break;
        }
        
        // 如果当前卡片已经学习过，找到对应的选择并应用
        if (completedWords.has(currentCard.wordId)) {
          const choiceRecord = state.choiceHistory.find(record => record.wordId === currentCard.wordId);
          
          if (choiceRecord) {
            originalSession.processChoice(choiceRecord.choice);
            restoredCount++;
            console.log(`✅ 智能恢复: ${currentCard.wordId} -> ${choiceRecord.choice} (${restoredCount}/${completedWords.size})`);
          } else {
            console.warn(`⚠️ 找不到单词 ${currentCard.wordId} 的选择记录`);
            break;
          }
        } else {
          // 当前卡片未学习过，恢复到此停止
          console.log(`🎯 恢复完成，当前卡片: ${currentCard.wordId} (未学习)`);
          break;
        }
        
        // 检查是否已恢复所有历史记录
        if (restoredCount >= completedWords.size) {
          console.log(`✅ 所有历史记录已恢复`);
          break;
        }
      }
      
      const finalStats = originalSession.getSessionStats();
      console.log(`🔄 智能恢复完成: ${restoredCount}/${completedWords.size} 个单词，会话状态: ${finalStats.completed}/${finalStats.total}`);
      
      return originalSession;
      
    } catch (error) {
      console.error('❌ 恢复学习会话失败:', error);
      throw error;
    }
  }

  // 添加缓存避免重复查询
  private loadCache = new Map<string, {
    data: StudySessionState | null;
    timestamp: number;
    ttl: number;
  }>();

  private getCacheKey(userId: string, wordbookId: string): string {
    return `${userId}_${wordbookId}`;
  }

  /**
   * 智能加载学习进度（优先本地，回退云端）
   * 增强版本：带版本冲突检测、数据一致性验证和缓存优化
   */
  async loadStudyProgress(userId: string, wordbookId: string): Promise<StudySessionState | null> {
    const cacheKey = this.getCacheKey(userId, wordbookId);
    const now = Date.now();
    
    // 检查缓存（30秒内有效）
    const cached = this.loadCache.get(cacheKey);
    if (cached && now - cached.timestamp < cached.ttl) {
      console.log('📦 使用缓存的学习进度');
      return cached.data;
    }
    
    try {
      // 1. 并行加载本地和云端数据
      const [localState, cloudState] = await Promise.allSettled([
        Promise.resolve(this.loadFromLocalStorage(userId, wordbookId)),
        this.loadFromCloud(userId, wordbookId)
      ]);
      
      const local = localState.status === 'fulfilled' ? localState.value : null;
      const cloud = cloudState.status === 'fulfilled' ? cloudState.value : null;
      
      // 2. 数据一致性验证
      if (local && cloud) {
        // 检查数据冲突
        const hasConflict = this.detectDataConflict(local, cloud);
        
        if (hasConflict) {
          console.warn('⚠️ 检测到数据冲突，选择最新的状态');
        }
        
        // 选择最新的状态
        if (local.lastUpdateTime >= cloud.lastUpdateTime) {
          console.log('📱 使用本地进度（最新）');
          // 异步同步到云端
          this.saveToCloud(local).catch(error => 
            console.warn('云端同步失败:', error)
          );
          this.cacheResult(userId, wordbookId, local);
          return local;
        } else {
          console.log('☁️ 使用云端进度（最新）');
          // 同步云端状态到本地
          this.saveToLocalStorage(cloud);
          this.cacheResult(userId, wordbookId, cloud);
          return cloud;
        }
      } else if (local) {
        console.log('📱 使用本地进度');
        // 异步备份到云端
        this.saveToCloud(local).catch(error => 
          console.warn('云端备份失败:', error)
        );
        this.cacheResult(userId, wordbookId, local);
        return local;
      } else if (cloud) {
        console.log('☁️ 使用云端进度');
        // 同步到本地
        this.saveToLocalStorage(cloud);
        this.cacheResult(userId, wordbookId, cloud);
        return cloud;
      }
      
      console.log('🆕 没有找到已保存的学习进度');
      
      // 缓存空结果（5分钟TTL）
      this.loadCache.set(cacheKey, {
        data: null,
        timestamp: now,
        ttl: 5 * 60 * 1000
      });
      
      return null;
      
    } catch (error) {
      console.error('加载学习进度失败:', error);
      // 降级到本地数据
      const fallbackData = this.loadFromLocalStorage(userId, wordbookId);
      
      // 缓存降级结果（1分钟TTL）
      this.loadCache.set(cacheKey, {
        data: fallbackData,
        timestamp: now,
        ttl: 60 * 1000
      });
      
      return fallbackData;
    }
  }
  
  // 帮助方法：缓存结果
  private cacheResult(userId: string, wordbookId: string, data: StudySessionState | null, ttl: number = 30000) {
    const cacheKey = this.getCacheKey(userId, wordbookId);
    this.loadCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  /**
   * 检测数据冲突
   */
  private detectDataConflict(local: StudySessionState, cloud: StudySessionState): boolean {
    // 检查关键数据是否一致
    return (
      local.sessionId !== cloud.sessionId ||
      local.completedCards !== cloud.completedCards ||
      local.choiceHistory.length !== cloud.choiceHistory.length
    );
  }

  /**
   * 保存学习进度（双重保存）
   */
  async saveStudyProgress(state: StudySessionState): Promise<void> {
    // 1. 立即保存到本地存储
    this.saveToLocalStorage(state);
    
    // 2. 更新缓存
    this.cacheResult(state.userId, state.wordbookId, state);
    
    // 3. 异步保存到云端（不阻塞UI）
    this.saveToCloud(state).catch(error => {
      console.warn('云端保存失败，但本地已保存:', error);
    });
  }

  /**
   * 清除所有学习进度
   */
  async clearAllProgress(userId: string, wordbookId: string): Promise<void> {
    // 清除本地存储
    this.clearLocalStorage(userId, wordbookId);
    
    // 清除缓存
    const cacheKey = this.getCacheKey(userId, wordbookId);
    this.loadCache.delete(cacheKey);
    
    // 清除云端记录
    try {
      await ensureLogin();
      const dataUserId = await getCurrentUserId('data');
      const actualUserId = dataUserId || userId;
      
      const appInstance = await getApp();
      const db = appInstance.database();
      const result = await db.collection('study_sessions')
        .where({
          userId: actualUserId,
          wordbookId: wordbookId
        })
        .get();

      if (result.data && result.data.length > 0) {
        for (const doc of result.data) {
          await db.collection('study_sessions').doc(doc._id).remove();
        }
      }
      
      console.log('🗑️ 已清除所有学习进度');
      
    } catch (error) {
      console.error('❌ 清除云端进度失败:', error);
    }
  }
}

// 导出单例实例
export const studySessionService = StudySessionService.getInstance();