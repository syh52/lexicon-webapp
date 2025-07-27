/**
 * 学习会话服务
 * 负责管理学习进度的持久化和恢复
 * 采用本地存储 + 云数据库的双重保存策略
 */

import { app, ensureLogin, getCurrentUserId } from '../utils/cloudbase';
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
      
      const db = app.database();
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
      
      const db = app.database();
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
    const updatedState: StudySessionState = {
      ...state,
      currentCardIndex: state.currentCardIndex + 1,
      completedCards: state.completedCards + 1,
      choiceHistory: [
        ...state.choiceHistory,
        {
          wordId,
          choice,
          timestamp: Date.now()
        }
      ],
      lastUpdateTime: Date.now(),
      isCompleted: state.currentCardIndex + 1 >= state.totalCards
    };

    return updatedState;
  }

  /**
   * 恢复学习会话到DailyStudySession
   */
  async restoreSession(
    state: StudySessionState,
    originalSession: DailyStudySession
  ): Promise<DailyStudySession> {
    try {
      // 按照选择历史顺序重新应用用户的学习进度
      console.log(`🔄 开始恢复学习会话，需要重新应用 ${state.choiceHistory.length} 个选择`);
      
      for (let i = 0; i < state.choiceHistory.length; i++) {
        const choiceRecord = state.choiceHistory[i];
        const currentCard = originalSession.getCurrentCard();
        
        if (!currentCard) {
          console.warn(`⚠️ 第 ${i + 1} 步恢复时没有可用卡片`);
          break;
        }
        
        // 验证卡片匹配（确保恢复的一致性）
        if (currentCard.wordId !== choiceRecord.wordId) {
          console.warn(`⚠️ 卡片不匹配: 期望 ${choiceRecord.wordId}, 实际 ${currentCard.wordId}`);
          // 尝试跳过不匹配的记录
          continue;
        }
        
        // 应用用户的选择
        originalSession.processChoice(choiceRecord.choice);
        console.log(`✅ 恢复第 ${i + 1} 步: ${choiceRecord.wordId} -> ${choiceRecord.choice}`);
      }
      
      const finalStats = originalSession.getSessionStats();
      console.log(`🔄 学习会话恢复完成: ${finalStats.completed}/${finalStats.total}`);
      
      return originalSession;
      
    } catch (error) {
      console.error('❌ 恢复学习会话失败:', error);
      throw error;
    }
  }

  /**
   * 智能加载学习进度（优先本地，回退云端）
   */
  async loadStudyProgress(userId: string, wordbookId: string): Promise<StudySessionState | null> {
    // 1. 优先从本地存储加载
    let localState = this.loadFromLocalStorage(userId, wordbookId);
    
    // 2. 从云端加载最新状态
    let cloudState = await this.loadFromCloud(userId, wordbookId);
    
    // 3. 比较时间戳，选择最新的状态
    if (localState && cloudState) {
      if (localState.lastUpdateTime >= cloudState.lastUpdateTime) {
        console.log('📱 使用本地进度（更新）');
        return localState;
      } else {
        console.log('☁️ 使用云端进度（更新）');
        // 同步云端状态到本地
        this.saveToLocalStorage(cloudState);
        return cloudState;
      }
    } else if (localState) {
      console.log('📱 使用本地进度');
      return localState;
    } else if (cloudState) {
      console.log('☁️ 使用云端进度');
      // 同步到本地
      this.saveToLocalStorage(cloudState);
      return cloudState;
    }
    
    console.log('🆕 没有找到已保存的学习进度');
    return null;
  }

  /**
   * 保存学习进度（双重保存）
   */
  async saveStudyProgress(state: StudySessionState): Promise<void> {
    // 1. 立即保存到本地存储
    this.saveToLocalStorage(state);
    
    // 2. 异步保存到云端（不阻塞UI）
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
    
    // 清除云端记录
    try {
      await ensureLogin();
      const dataUserId = await getCurrentUserId('data');
      const actualUserId = dataUserId || userId;
      
      const db = app.database();
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