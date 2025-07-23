import { app, ensureLogin } from '../utils/cloudbase';

export interface Word {
  _id: string;
  word: string;
  meaning: string;
  phonetic?: string;
  pos?: string;
  example?: string;
  audioUrl?: string;
  wordbookId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Wordbook {
  _id: string;
  name: string;
  description: string;
  cover: string;
  totalCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StudyRecord {
  _id: string;
  uid: string;
  wordId: string;
  wordbookId: string;
  stage: number;
  nextReview: Date;
  failures: number;
  successes: number;
  lastReview?: Date;
  status: 'new' | 'learning' | 'reviewing' | 'mastered';
  createdAt?: Date;
  updatedAt?: Date;
}

export const wordbookService = {
  /**
   * 获取所有词书 - 统一使用云函数
   */
  async getWordbooks(): Promise<Wordbook[]> {
    try {
      const result = await app.callFunction({
        name: 'getWordbooks',
        data: {}
      });

      if (result.result?.success && result.result?.data?.wordbooks) {
        return result.result.data.wordbooks;
      } else {
        throw new Error(result.result?.error || '获取词书失败');
      }
    } catch (error) {
      console.error('获取词书失败:', error);
      throw error;
    }
  },

  /**
   * 获取指定词书的单词 - 统一使用云函数
   */
  async getWordsByWordbook(wordbookId: string, limit?: number, offset?: number): Promise<Word[]> {
    try {
      const result = await app.callFunction({
        name: 'getWordsByWordbook',
        data: { wordbookId, limit, offset }
      });

      if (result.result?.success) {
        return result.result.data || [];
      } else {
        throw new Error(result.result?.error || '获取单词失败');
      }
    } catch (error) {
      console.error('获取单词失败:', error);
      throw error;
    }
  },

  /**
   * 获取待复习的卡片 - 使用FSRS云函数
   */
  async getDueCards(userId: string, wordbookId: string, limit?: number): Promise<any[]> {
    try {
      const result = await app.callFunction({
        name: 'fsrs-service',
        data: {
          action: 'getDueCards',
          data: { userId, wordbookId, limit }
        }
      });

      if (result.result?.success) {
        return result.result.data || [];
      } else {
        throw new Error(result.result?.error || '获取待复习卡片失败');
      }
    } catch (error) {
      console.error('获取待复习卡片失败:', error);
      throw error;
    }
  },

  /**
   * 提交复习结果 - 使用FSRS云函数
   */
  async submitReview(userId: string, cardId: string, rating: number, timeSpent?: number): Promise<void> {
    try {
      const result = await app.callFunction({
        name: 'fsrs-service',
        data: {
          action: 'submitReview',
          data: { userId, cardId, rating, timeSpent }
        }
      });

      if (!result.result?.success) {
        throw new Error(result.result?.error || '提交复习失败');
      }
    } catch (error) {
      console.error('提交复习失败:', error);
      throw error;
    }
  },

  /**
   * 保存学习记录（兼容现有代码） - 将转换为使用FSRS云函数的submitReview
   */
  async saveStudyRecord(record: Omit<StudyRecord, '_id'>): Promise<void> {
    try {
      // 将旧的记录格式转换为FSRS格式
      const rating = record.status === 'mastered' ? 4 : 
                    record.failures > 0 ? 1 : 3; // 简化的评分映射
      
      const cardId = `card_${record.uid}_${record.wordId}`;
      await this.submitReview(record.uid, cardId, rating);
    } catch (error) {
      console.error('保存学习记录失败:', error);
      throw error;
    }
  },

  /**
   * 获取用户学习统计 - 使用FSRS云函数
   */
  async getUserStudyStats(uid: string, wordbookId?: string): Promise<{
    totalWords: number;
    studiedWords: number;
    newWords: number;
    reviewWords: number;
    masteredWords: number;
  }> {
    try {
      if (!wordbookId) {
        // 如果没有指定词书，返回默认统计
        return {
          totalWords: 0,
          studiedWords: 0,
          newWords: 0,
          reviewWords: 0,
          masteredWords: 0
        };
      }

      const result = await app.callFunction({
        name: 'fsrs-service',
        data: {
          action: 'getStudyStats',
          data: { userId: uid, wordbookId }
        }
      });

      if (result.result?.success && result.result?.data) {
        const stats = result.result.data;
        return {
          totalWords: stats.totalReviews || 0,
          studiedWords: Math.round(stats.totalReviews * stats.accuracy / 100) || 0,
          newWords: 0, // FSRS云函数暂不提供此统计
          reviewWords: stats.totalReviews || 0,
          masteredWords: 0 // 需要根据FSRS算法计算
        };
      } else {
        throw new Error(result.result?.error || '获取学习统计失败');
      }
    } catch (error) {
      console.error('获取学习统计失败:', error);
      return {
        totalWords: 0,
        studiedWords: 0,
        newWords: 0,
        reviewWords: 0,
        masteredWords: 0
      };
    }
  },

  /**
   * 获取用户学习记录（兼容现有代码）
   */
  async getUserStudyRecords(uid: string, wordbookId?: string): Promise<StudyRecord[]> {
    try {
      // 由于FSRS云函数的数据结构不同，这里返回空数组
      // 如需要详细记录，应该扩展FSRS云函数
      console.warn('getUserStudyRecords已废弃，请使用getDueCards或getUserStudyStats');
      return [];
    } catch (error) {
      console.error('获取学习记录失败:', error);
      return [];
    }
  }
};

export default wordbookService; 