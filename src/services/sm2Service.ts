/**
 * SM-2算法服务层
 * 提供统一的SM-2学习记录管理API
 * 处理数据格式转换和兼容性
 */

import { app, ensureLogin, getCurrentUserId } from '../utils/cloudbase';
import { 
  SM2Card, 
  SM2CardStatus, 
  StudyChoice, 
  StudyRecord, 
  StudyProgress 
} from '../types';
import {
  SM2Scheduler,
  DailyStudySession,
  createSM2Card,
  processSM2Review,
  isSM2CardDue,
  getSM2MasteryLevel
} from '../utils/sm2Algorithm';

export interface SM2ServiceConfig {
  enableCloudSync: boolean;
  batchSize: number;
  retryAttempts: number;
}

const DEFAULT_CONFIG: SM2ServiceConfig = {
  enableCloudSync: true,
  batchSize: 50,
  retryAttempts: 3
};

/**
 * SM-2算法服务类
 */
export class SM2Service {
  private scheduler = new SM2Scheduler();
  private config: SM2ServiceConfig;

  constructor(config: Partial<SM2ServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 将StudyRecord转换为SM2Card
   */
  convertToSM2Card(record: StudyRecord): SM2Card {
    // 如果记录中已有SM2Card数据，直接使用
    if (record.sm2Card) {
      return record.sm2Card;
    }

    // 从StudyRecord字段构建SM2Card
    if (record.repetitions !== undefined && record.EF !== undefined) {
      return {
        wordId: record.wordId,
        repetitions: record.repetitions,
        EF: record.EF,
        interval: record.interval || 0,
        nextReview: record.nextReview,
        lastReview: record.lastReview,
        status: this.mapStatusToSM2Status(record.status),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      };
    }

    // 从旧的算法数据推导SM2Card
    return this.migrateFromLegacyRecord(record);
  }

  /**
   * 将SM2Card转换为StudyRecord
   */
  convertToStudyRecord(card: SM2Card, uid: string, wordbookId: string): StudyRecord {
    return {
      uid,
      wordId: card.wordId,
      wordbookId,
      stage: this.mapSM2StatusToStage(card.status),
      nextReview: card.nextReview,
      failures: Math.max(0, card.repetitions === 0 ? 1 : 0), // 根据repetitions推导
      successes: card.repetitions,
      lastReview: card.lastReview,
      status: this.mapSM2StatusToStatus(card.status),
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      // SM-2扩展字段
      sm2Card: card,
      repetitions: card.repetitions,
      EF: card.EF,
      interval: card.interval,
      algorithm: 'sm2'
    };
  }

  /**
   * 获取用户的SM2学习记录
   * 修复版本：使用正确的用户ID进行数据查询
   */
  async getUserSM2Records(uid: string, wordbookId: string): Promise<SM2Card[]> {
    try {
      await ensureLogin();
      
      // 🔧 关键修复：使用智能用户ID获取功能，确保数据关联正确
      const dataUserId = await getCurrentUserId('data'); // 用于数据访问
      const queryUserId = dataUserId || uid; // 回退到传入的uid
      
      console.log('🔍 SM2服务查询学习记录:', {
        原始uid: uid,
        数据查询用户ID: queryUserId,
        词书ID: wordbookId
      });
      
      // 从云数据库获取学习记录
      const db = app.database();
      const result = await db.collection('study_records')
        .where({
          uid: queryUserId,
          wordbookId
        })
        .get();

      const records = (result.data || []) as StudyRecord[];
      
      console.log(`📚 找到 ${records.length} 条学习记录`);
      
      // 转换为SM2Card格式
      return records.map(record => this.convertToSM2Card(record));
      
    } catch (error) {
      console.error('获取SM2学习记录失败:', error);
      throw new Error(`获取学习记录失败: ${error.message}`);
    }
  }

  /**
   * 保存SM2学习记录
   * 修复版本：使用正确的用户ID进行数据保存
   */
  async saveSM2Record(card: SM2Card, uid: string, wordbookId: string): Promise<void> {
    try {
      await ensureLogin();
      
      // 🔧 关键修复：使用智能用户ID获取功能，确保数据关联正确
      const dataUserId = await getCurrentUserId('data'); // 用于数据访问
      const saveUserId = dataUserId || uid; // 回退到传入的uid
      
      const studyRecord = this.convertToStudyRecord(card, saveUserId, wordbookId);
      const db = app.database();
      
      console.log('💾 SM2服务保存学习记录:', {
        原始uid: uid,
        保存用户ID: saveUserId,
        词书ID: wordbookId,
        单词ID: card.wordId
      });
      
      // 查找现有记录
      const existingResult = await db.collection('study_records')
        .where({
          uid: saveUserId,
          wordId: card.wordId,
          wordbookId
        })
        .get();

      if (existingResult.data && existingResult.data.length > 0) {
        // 更新现有记录
        await db.collection('study_records')
          .doc(existingResult.data[0]._id)
          .update({
            ...studyRecord,
            updatedAt: new Date()
          });
        console.log('✅ 更新学习记录成功');
      } else {
        // 创建新记录
        await db.collection('study_records').add(studyRecord);
        console.log('✅ 创建新学习记录成功');
      }
      
    } catch (error) {
      console.error('保存SM2学习记录失败:', error);
      throw new Error(`保存学习记录失败: ${error.message}`);
    }
  }

  /**
   * 批量保存SM2学习记录
   */
  async batchSaveSM2Records(
    cards: SM2Card[], 
    uid: string, 
    wordbookId: string
  ): Promise<void> {
    try {
      const batches = this.chunkArray(cards, this.config.batchSize);
      
      for (const batch of batches) {
        await Promise.all(
          batch.map(card => this.saveSM2Record(card, uid, wordbookId))
        );
      }
      
    } catch (error) {
      console.error('批量保存SM2记录失败:', error);
      throw error;
    }
  }

  /**
   * 处理学习选择，更新SM2卡片
   */
  async processStudyChoice(
    card: SM2Card,
    choice: StudyChoice,
    uid: string,
    wordbookId: string,
    currentDate: Date = new Date()
  ): Promise<SM2Card> {
    try {
      // 使用SM-2算法处理选择
      const updatedCard = this.scheduler.processReview(card, choice, currentDate);
      
      // 保存更新后的记录
      if (this.config.enableCloudSync) {
        await this.saveSM2Record(updatedCard, uid, wordbookId);
      }
      
      return updatedCard;
      
    } catch (error) {
      console.error('处理学习选择失败:', error);
      throw new Error(`处理学习选择失败: ${error.message}`);
    }
  }

  /**
   * 获取到期需要复习的卡片
   */
  async getDueCards(
    uid: string, 
    wordbookId: string, 
    limit?: number,
    currentDate: Date = new Date()
  ): Promise<SM2Card[]> {
    try {
      const allCards = await this.getUserSM2Records(uid, wordbookId);
      
      // 筛选到期的卡片
      const dueCards = allCards.filter(card => 
        isSM2CardDue(card, currentDate)
      );
      
      // 按优先级排序：新卡片 > 过期时间长的 > 普通到期
      const sortedCards = dueCards.sort((a, b) => {
        if (a.status === SM2CardStatus.New && b.status !== SM2CardStatus.New) return -1;
        if (a.status !== SM2CardStatus.New && b.status === SM2CardStatus.New) return 1;
        
        // 按过期时间排序（过期越久优先级越高）
        const aOverdue = currentDate.getTime() - a.nextReview.getTime();
        const bOverdue = currentDate.getTime() - b.nextReview.getTime();
        return bOverdue - aOverdue;
      });
      
      return limit ? sortedCards.slice(0, limit) : sortedCards;
      
    } catch (error) {
      console.error('获取到期卡片失败:', error);
      throw new Error(`获取到期卡片失败: ${error.message}`);
    }
  }

  /**
   * 创建每日学习会话
   */
  async createDailySession(
    uid: string,
    wordbookId: string,
    maxCards: number = 50,
    currentDate: Date = new Date()
  ): Promise<DailyStudySession> {
    try {
      let dueCards = await this.getDueCards(uid, wordbookId, maxCards, currentDate);
      
      // 如果没有到期卡片，说明是新用户或新词书，需要创建初始卡片
      if (dueCards.length === 0) {
        console.log('没有找到到期卡片，为新用户创建初始学习卡片');
        dueCards = await this.createInitialCardsForNewUser(uid, wordbookId, maxCards, currentDate);
      }
      
      return new DailyStudySession(dueCards);
      
    } catch (error) {
      console.error('创建每日学习会话失败:', error);
      throw new Error(`创建学习会话失败: ${error.message}`);
    }
  }

  /**
   * 为新用户创建初始学习卡片
   * 修复版本：使用正确的用户ID进行数据关联
   */
  private async createInitialCardsForNewUser(
    uid: string,
    wordbookId: string,
    maxCards: number,
    currentDate: Date = new Date()
  ): Promise<SM2Card[]> {
    try {
      // 🔧 关键修复：使用智能用户ID获取功能
      const dataUserId = await getCurrentUserId('data');
      const actualUserId = dataUserId || uid;
      
      // 获取词书中的所有单词
      const wordsResult = await app.callFunction({
        name: 'getWordsByWordbook',
        data: { wordbookId, limit: maxCards || 1000 }
      });

      if (!wordsResult.result?.success || !wordsResult.result?.data) {
        console.warn('无法获取词书单词数据');
        return [];
      }

      const words = wordsResult.result.data;
      const initialCards: SM2Card[] = [];

      // 为每个单词创建新的SM-2卡片（但先不保存到数据库）
      for (const word of words.slice(0, maxCards)) {
        const newCard = createSM2Card(word._id, currentDate);
        initialCards.push(newCard);
      }

      // 批量保存到数据库（避免过多的数据库写入操作）
      if (this.config.enableCloudSync && initialCards.length > 0) {
        try {
          await this.batchSaveSM2Records(initialCards, actualUserId, wordbookId);
        } catch (error) {
          console.warn('批量保存初始卡片失败，但继续返回卡片用于学习:', error);
        }
      }

      console.log(`为用户 ${actualUserId} 创建了 ${initialCards.length} 张初始学习卡片`);
      return initialCards;

    } catch (error) {
      console.error('创建初始学习卡片失败:', error);
      return [];
    }
  }

  /**
   * 获取学习统计
   */
  async getUserStudyStats(uid: string, wordbookId: string) {
    try {
      const cards = await this.getUserSM2Records(uid, wordbookId);
      
      const stats = {
        totalCards: cards.length,
        newCards: cards.filter(c => c.status === SM2CardStatus.New).length,
        learningCards: cards.filter(c => c.status === SM2CardStatus.Learning).length,
        reviewCards: cards.filter(c => c.status === SM2CardStatus.Review).length,
        masteredCards: cards.filter(c => c.status === SM2CardStatus.Mastered).length,
        averageEF: cards.length > 0 ? 
          cards.reduce((sum, c) => sum + c.EF, 0) / cards.length : 0,
        averageMastery: cards.length > 0 ? 
          cards.reduce((sum, c) => sum + getSM2MasteryLevel(c), 0) / cards.length : 0
      };
      
      return stats;
      
    } catch (error) {
      console.error('获取学习统计失败:', error);
      throw new Error(`获取学习统计失败: ${error.message}`);
    }
  }

  // 私有辅助方法

  /**
   * 从旧版记录迁移到SM2格式
   */
  private migrateFromLegacyRecord(record: StudyRecord): SM2Card {
    // 基于stage和status推导SM2参数
    const repetitions = Math.max(0, record.successes || record.stage || 0);
    const failures = record.failures || 0;
    
    // 根据成功失败比例估算EF
    const successRate = repetitions > 0 ? repetitions / (repetitions + failures) : 0;
    const estimatedEF = 1.3 + (successRate * 1.7); // 1.3 - 3.0范围
    
    // 根据stage估算interval
    const intervals = [0, 1, 6, 13, 30, 60, 120];
    const interval = intervals[Math.min(record.stage || 0, intervals.length - 1)] || 0;
    
    return {
      wordId: record.wordId,
      repetitions,
      EF: estimatedEF,
      interval,
      nextReview: record.nextReview,
      lastReview: record.lastReview,
      status: this.mapStatusToSM2Status(record.status),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  /**
   * 状态映射：StudyRecord.status -> SM2CardStatus
   */
  private mapStatusToSM2Status(status: string): SM2CardStatus {
    switch (status) {
      case 'new': return SM2CardStatus.New;
      case 'learning': return SM2CardStatus.Learning;
      case 'review': return SM2CardStatus.Review;
      case 'graduated': return SM2CardStatus.Mastered;
      default: return SM2CardStatus.New;
    }
  }

  /**
   * 状态映射：SM2CardStatus -> StudyRecord.status
   */
  private mapSM2StatusToStatus(status: SM2CardStatus): 'new' | 'learning' | 'review' | 'graduated' {
    switch (status) {
      case SM2CardStatus.New: return 'new';
      case SM2CardStatus.Learning: return 'learning';
      case SM2CardStatus.Review: return 'review';
      case SM2CardStatus.Mastered: return 'graduated';
      default: return 'new';
    }
  }

  /**
   * SM2状态映射到stage数值
   */
  private mapSM2StatusToStage(status: SM2CardStatus): number {
    switch (status) {
      case SM2CardStatus.New: return 0;
      case SM2CardStatus.Learning: return 1;
      case SM2CardStatus.Review: return 3;
      case SM2CardStatus.Mastered: return 6;
      default: return 0;
    }
  }

  /**
   * 数组分块工具
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// 默认服务实例
export const defaultSM2Service = new SM2Service();

// 便捷函数导出
export async function getUserSM2Cards(uid: string, wordbookId: string): Promise<SM2Card[]> {
  return defaultSM2Service.getUserSM2Records(uid, wordbookId);
}

export async function processUserChoice(
  card: SM2Card,
  choice: StudyChoice,
  uid: string,
  wordbookId: string
): Promise<SM2Card> {
  return defaultSM2Service.processStudyChoice(card, choice, uid, wordbookId);
}

export async function getDueCardsForToday(
  uid: string,
  wordbookId: string,
  limit?: number
): Promise<SM2Card[]> {
  return defaultSM2Service.getDueCards(uid, wordbookId, limit);
}

export async function createStudySession(
  uid: string,
  wordbookId: string,
  maxCards?: number
): Promise<DailyStudySession> {
  return defaultSM2Service.createDailySession(uid, wordbookId, maxCards);
}