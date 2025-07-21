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
   * 获取所有词书
   */
  async getWordbooks(): Promise<Wordbook[]> {
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      const db = app.database();
      const { data } = await db.collection('wordbooks').get();
      return data || [];
    } catch (error) {
      console.error('获取词书失败:', error);
      throw error;
    }
  },

  /**
   * 获取指定词书的单词
   */
  async getWordsByWordbook(wordbookId: string): Promise<Word[]> {
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      const db = app.database();
      const { data } = await db.collection('words')
        .where({ wordbookId })
        .get();
      return data || [];
    } catch (error) {
      console.error('获取单词失败:', error);
      throw error;
    }
  },

  /**
   * 获取用户学习记录
   */
  async getUserStudyRecords(uid: string, wordbookId?: string): Promise<StudyRecord[]> {
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      const db = app.database();
      let query = db.collection('reviews').where({ uid });
      
      if (wordbookId) {
        query = query.where({ wordbookId });
      }
      
      const { data } = await query.get();
      return data || [];
    } catch (error) {
      console.error('获取学习记录失败:', error);
      throw error;
    }
  },

  /**
   * 保存或更新学习记录
   */
  async saveStudyRecord(record: Omit<StudyRecord, '_id'>): Promise<void> {
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      const db = app.database();
      const { uid, wordId, wordbookId } = record;
      
      // 检查是否已存在记录
      const { data: existingRecords } = await db.collection('reviews')
        .where({ uid, wordId, wordbookId })
        .get();
      
      if (existingRecords && existingRecords.length > 0) {
        // 更新现有记录
        const existingRecord = existingRecords[0];
        await db.collection('reviews')
          .doc(existingRecord._id)
          .update({
            ...record,
            updatedAt: new Date()
          });
        } else {
        // 创建新记录
        await db.collection('reviews').add({
          ...record,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        }
    } catch (error) {
      console.error('保存学习记录失败:', error);
      throw error;
    }
  },

  /**
   * 获取用户学习统计
   */
  async getUserStudyStats(uid: string): Promise<{
    totalWords: number;
    studiedWords: number;
    newWords: number;
    reviewWords: number;
    masteredWords: number;
  }> {
    try {
      const db = app.database();
      const { data } = await db.collection('reviews')
        .where({ uid })
        .get();
      
      const records = data || [];
      
      const stats = {
        totalWords: records.length,
        studiedWords: records.filter(r => r.status !== 'new').length,
        newWords: records.filter(r => r.status === 'new').length,
        reviewWords: records.filter(r => r.status === 'review').length,
        masteredWords: records.filter(r => r.reps >= 3 && r.stability > 30).length
      };
      
      return stats;
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
  }
};

export default wordbookService; 