/**
 * 学习追踪云函数
 * 管理学习进度、复习安排和SM2算法
 */
const cloudbase = require('@cloudbase/node-sdk');

// 初始化CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  console.log('Learning tracker function called:', JSON.stringify(event, null, 2));

  try {
    const { action, ...data } = event;

    switch (action) {
      case 'schedule_review':
        return await scheduleReview(data);
      
      case 'get_due_reviews':
        return await getDueReviews(data);
      
      case 'update_performance':
        return await updatePerformance(data);
      
      case 'get_learning_stats':
        return await getLearningStats(data);
      
      default:
        return {
          success: false,
          error: `Unknown action: ${action}`
        };
    }
  } catch (error) {
    console.error('Learning tracker error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 安排复习
 */
async function scheduleReview(data) {
  const { itemId, itemType, nextReview, difficulty, performance } = data;

  try {
    // 查找现有记录
    const existing = await db.collection('learning_schedule')
      .where({ itemId })
      .limit(1)
      .get();

    const reviewData = {
      itemId,
      itemType,
      nextReview: new Date(nextReview),
      difficulty,
      performance,
      updatedAt: new Date()
    };

    if (existing.data && existing.data.length > 0) {
      // 更新现有记录
      await db.collection('learning_schedule')
        .doc(existing.data[0]._id)
        .update(reviewData);
    } else {
      // 创建新记录
      await db.collection('learning_schedule').add({
        ...reviewData,
        createdAt: new Date(),
        reviewCount: 1
      });
    }

    return {
      success: true,
      message: 'Review scheduled successfully'
    };
  } catch (error) {
    throw new Error('Failed to schedule review: ' + error.message);
  }
}

/**
 * 获取到期复习项目
 */
async function getDueReviews(data = {}) {
  const { userId, limit = 20 } = data;

  try {
    const now = new Date();
    const query = db.collection('learning_schedule')
      .where({
        nextReview: db.command.lte(now)
      })
      .orderBy('nextReview', 'asc')
      .limit(limit);

    if (userId) {
      query.where({ userId });
    }

    const result = await query.get();

    return {
      success: true,
      dueReviews: result.data || [],
      count: result.data?.length || 0
    };
  } catch (error) {
    throw new Error('Failed to get due reviews: ' + error.message);
  }
}

/**
 * 更新学习表现
 */
async function updatePerformance(data) {
  const { itemId, performance, responseTime } = data;

  try {
    const now = new Date();
    
    // 更新学习记录
    const existing = await db.collection('learning_schedule')
      .where({ itemId })
      .limit(1)
      .get();

    if (existing.data && existing.data.length > 0) {
      const record = existing.data[0];
      
      // 使用SM2算法更新间隔
      const newInterval = calculateSM2Interval(
        record.difficulty || 3,
        performance,
        record.reviewCount || 1
      );
      
      const nextReview = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

      await db.collection('learning_schedule')
        .doc(record._id)
        .update({
          performance,
          responseTime,
          nextReview,
          reviewCount: db.command.inc(1),
          lastReview: now,
          updatedAt: now
        });

      return {
        success: true,
        nextReview: nextReview.toISOString(),
        intervalDays: newInterval
      };
    } else {
      throw new Error('Learning record not found');
    }
  } catch (error) {
    throw new Error('Failed to update performance: ' + error.message);
  }
}

/**
 * 获取学习统计
 */
async function getLearningStats(data = {}) {
  const { userId, period = 'week' } = data;

  try {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const query = db.collection('learning_schedule')
      .where({
        updatedAt: db.command.gte(startDate)
      });

    if (userId) {
      query.where({ userId });
    }

    const result = await query.get();
    const records = result.data || [];

    // 计算统计数据
    const stats = {
      totalItems: records.length,
      reviewsCompleted: records.filter(r => r.lastReview && r.lastReview >= startDate).length,
      averagePerformance: records.length > 0 
        ? records.reduce((sum, r) => sum + (r.performance || 0), 0) / records.length 
        : 0,
      dueToday: records.filter(r => r.nextReview <= now).length,
      period
    };

    return {
      success: true,
      stats
    };
  } catch (error) {
    throw new Error('Failed to get learning stats: ' + error.message);
  }
}

/**
 * 计算下次复习间隔（基于SM2算法）
 */
function calculateSM2Interval(difficulty, performance, reviewCount) {
  // SM2算法的简化实现
  let EF = 2.5; // 初始易记因子
  
  // 根据历史表现调整EF
  if (reviewCount > 1) {
    // 假设performance是0-4的评分，转换为质量评分
    const quality = Math.max(0, Math.min(5, Math.round(performance)));
    EF = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    EF = Math.max(1.3, EF);
  }
  
  let interval;
  if (reviewCount === 1) {
    interval = 1;
  } else if (reviewCount === 2) {
    interval = 6;
  } else {
    // 对于后续复习，interval = 上次间隔 × EF
    const previousInterval = Math.max(1, Math.round(6 * Math.pow(EF, reviewCount - 2)));
    interval = Math.round(previousInterval * EF);
  }
  
  // 根据难度微调
  const difficultyAdjustment = Math.max(0.7, Math.min(1.3, (6 - difficulty) / 5));
  interval = Math.round(interval * difficultyAdjustment);
  
  return Math.max(1, Math.min(365, interval)); // 间隔在1-365天之间
}