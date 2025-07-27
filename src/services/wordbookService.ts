import { app, ensureLogin } from '../utils/cloudbase';
import { SM2Service } from './sm2Service';
import { SM2Card, StudyChoice, SM2CardStatus } from '../types';

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
  // SM-2服务实例
  _sm2Service: new SM2Service(),

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
   * 获取待复习的卡片 - 使用SM-2算法
   */
  async getDueCards(userId: string, wordbookId: string, limit?: number): Promise<SM2Card[]> {
    try {
      return await this._sm2Service.getDueCards(userId, wordbookId, limit);
    } catch (error) {
      console.error('获取待复习卡片失败:', error);
      throw error;
    }
  },

  /**
   * 提交复习结果 - 使用SM-2算法
   */
  async submitReview(userId: string, card: SM2Card, choice: StudyChoice, wordbookId: string): Promise<SM2Card> {
    try {
      return await this._sm2Service.processStudyChoice(card, choice, userId, wordbookId);
    } catch (error) {
      console.error('提交复习失败:', error);
      throw error;
    }
  },

  /**
   * 保存学习记录（兼容现有代码） - 使用SM-2算法
   */
  async saveStudyRecord(record: Omit<StudyRecord, '_id'>): Promise<void> {
    try {
      // 如果记录包含SM-2卡片数据，直接保存
      if (record.sm2Card) {
        await this._sm2Service.saveSM2Record(record.sm2Card, record.uid, record.wordbookId);
        return;
      }

      // 从旧格式创建SM-2卡片并保存
      const sm2Card = this._sm2Service.convertToSM2Card(record as any);
      await this._sm2Service.saveSM2Record(sm2Card, record.uid, record.wordbookId);
    } catch (error) {
      console.error('保存学习记录失败:', error);
      throw error;
    }
  },

  /**
   * 获取用户学习统计 - 使用SM-2算法
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

      const stats = await this._sm2Service.getUserStudyStats(uid, wordbookId);
      
      return {
        totalWords: stats.totalCards,
        studiedWords: stats.totalCards - stats.newCards,
        newWords: stats.newCards,
        reviewWords: stats.reviewCards,
        masteredWords: stats.masteredCards
      };
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
      if (!wordbookId) {
        return [];
      }
      
      // 获取SM-2卡片并转换为StudyRecord格式
      const sm2Cards = await this._sm2Service.getUserSM2Records(uid, wordbookId);
      return sm2Cards.map(card => this._sm2Service.convertToStudyRecord(card, uid, wordbookId));
    } catch (error) {
      console.error('获取学习记录失败:', error);
      return [];
    }
  },

  /**
   * 创建每日学习会话 - 新增SM-2功能
   */
  async createDailyStudySession(uid: string, wordbookId: string, maxCards: number = 50) {
    try {
      return await this._sm2Service.createDailySession(uid, wordbookId, maxCards);
    } catch (error) {
      console.error('创建每日学习会话失败:', error);
      throw error;
    }
  },

  /**
   * 获取SM-2学习统计 - 新增功能
   */
  async getSM2StudyStats(uid: string, wordbookId: string) {
    try {
      return await this._sm2Service.getUserStudyStats(uid, wordbookId);
    } catch (error) {
      console.error('获取SM-2学习统计失败:', error);
      throw error;
    }
  }
};

export default wordbookService; 