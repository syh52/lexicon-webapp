/**
 * SM-2间隔重复算法云函数服务
 * 提供SM-2算法相关的云端处理功能
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const _ = db.command;

// SM-2算法常量
const MIN_EF = 1.3;
const INITIAL_EF = 2.5;

// 质量评分映射
const QUALITY_MAPPING = {
  'know': 5,     // 完全记住，无任何困难
  'hint': 3,     // 回忆正确，但过程较艰难
  'unknown': 1   // 回忆错误，看到答案后记起曾学过
};

// SM-2卡片状态
const SM2_CARD_STATUS = {
  New: 'new',
  Learning: 'learning',
  Review: 'review',
  Mastered: 'mastered'
};

/**
 * SM-2算法核心处理函数
 */
function processReview(card, choice, currentDate = new Date()) {
  const quality = QUALITY_MAPPING[choice];
  const updatedCard = { ...card };
  
  // 更新最后复习时间
  updatedCard.lastReview = new Date(currentDate);
  updatedCard.updatedAt = new Date(currentDate);

  if (quality >= 3) {
    // 回忆成功
    handleSuccessfulReview(updatedCard, quality, currentDate);
  } else {
    // 回忆失败
    handleFailedReview(updatedCard, currentDate);
  }

  // 更新卡片状态
  updateCardStatus(updatedCard);
  
  return updatedCard;
}

/**
 * 处理成功复习
 */
function handleSuccessfulReview(card, quality, currentDate) {
  // 增加复习次数
  card.repetitions++;

  // 更新EF值
  card.EF = calculateNewEF(card.EF, quality);

  // 计算下次复习间隔
  if (card.repetitions === 1) {
    card.interval = 1; // 第一次复习间隔1天
  } else if (card.repetitions === 2) {
    card.interval = 6; // 第二次复习间隔6天
  } else {
    // 后续复习：interval = 上次间隔 × EF
    card.interval = Math.round(card.interval * card.EF);
  }

  // 设置下次复习时间
  card.nextReview = new Date(currentDate.getTime() + card.interval * 24 * 60 * 60 * 1000);
}

/**
 * 处理失败复习
 */
function handleFailedReview(card, currentDate) {
  // 重置复习次数和间隔
  card.repetitions = 0;
  card.interval = 1;
  
  // 明天重新复习
  card.nextReview = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * 计算新的EF值
 */
function calculateNewEF(currentEF, quality) {
  const newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(MIN_EF, newEF);
}

/**
 * 更新卡片状态
 */
function updateCardStatus(card) {
  if (card.repetitions === 0) {
    card.status = SM2_CARD_STATUS.New;
  } else if (card.repetitions >= 1 && card.repetitions < 3) {
    card.status = SM2_CARD_STATUS.Learning;
  } else if (card.repetitions >= 3 && card.repetitions < 6) {
    card.status = SM2_CARD_STATUS.Review;
  } else {
    card.status = SM2_CARD_STATUS.Mastered;
  }
}

/**
 * 检查是否需要复习
 */
function isDue(card, currentDate = new Date()) {
  return currentDate >= new Date(card.nextReview);
}

/**
 * 获取卡片掌握程度
 */
function getMasteryLevel(card) {
  const statusWeight = {
    [SM2_CARD_STATUS.New]: 0,
    [SM2_CARD_STATUS.Learning]: 25,
    [SM2_CARD_STATUS.Review]: 60,
    [SM2_CARD_STATUS.Mastered]: 100
  };
  
  const baseLevel = statusWeight[card.status] || 0;
  const efBonus = Math.min(20, (card.EF - MIN_EF) / (4.0 - MIN_EF) * 20);
  
  return Math.min(100, Math.round(baseLevel + efBonus));
}

/**
 * 创建新的SM-2卡片
 */
function createSM2Card(wordId, currentDate = new Date()) {
  return {
    wordId,
    repetitions: 0,
    EF: INITIAL_EF,
    interval: 0,
    nextReview: new Date(currentDate),
    status: SM2_CARD_STATUS.New,
    createdAt: new Date(currentDate),
    updatedAt: new Date(currentDate)
  };
}

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  
  try {
    switch (action) {
      case 'processReview':
        return await handleProcessReview(data);
      
      case 'getDueCards':
        return await handleGetDueCards(data);
      
      case 'getUserStats':
        return await handleGetUserStats(data);
      
      case 'batchUpdateCards':
        return await handleBatchUpdateCards(data);
      
      case 'createUserCards':
        return await handleCreateUserCards(data);
      
      case 'getStudySession':
        return await handleGetStudySession(data);
      
      default:
        throw new Error(`未知操作: ${action}`);
    }
  } catch (error) {
    console.error(`SM-2服务错误 [${action}]:`, error);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
};

/**
 * 处理复习提交
 */
async function handleProcessReview(data) {
  const { userId, wordId, wordbookId, choice, card } = data;
  
  if (!userId || !wordId || !wordbookId || !choice) {
    throw new Error('缺少必要参数: userId, wordId, wordbookId, choice');
  }
  
  const currentDate = new Date();
  
  // 处理SM-2算法
  const updatedCard = processReview(card || createSM2Card(wordId, currentDate), choice, currentDate);
  
  // 保存到数据库
  const studyRecord = {
    uid: userId,
    wordId,
    wordbookId,
    stage: getStageFromStatus(updatedCard.status),
    nextReview: updatedCard.nextReview,
    failures: Math.max(0, updatedCard.repetitions === 0 ? 1 : 0),
    successes: updatedCard.repetitions,
    lastReview: updatedCard.lastReview,
    status: getStatusFromSM2Status(updatedCard.status),
    // SM-2扩展字段
    sm2Card: updatedCard,
    repetitions: updatedCard.repetitions,
    EF: updatedCard.EF,
    interval: updatedCard.interval,
    algorithm: 'sm2',
    createdAt: updatedCard.createdAt,
    updatedAt: updatedCard.updatedAt
  };
  
  // 查找现有记录
  const existingQuery = await db.collection('study_records')
    .where({
      uid: userId,
      wordId,
      wordbookId
    })
    .limit(1)
    .get();
  
  if (existingQuery.data && existingQuery.data.length > 0) {
    // 更新现有记录
    await db.collection('study_records')
      .doc(existingQuery.data[0]._id)
      .update(studyRecord);
  } else {
    // 创建新记录
    await db.collection('study_records').add(studyRecord);
  }
  
  return {
    success: true,
    data: {
      updatedCard,
      masteryLevel: getMasteryLevel(updatedCard),
      nextDue: updatedCard.nextReview
    }
  };
}

/**
 * 获取到期卡片
 */
async function handleGetDueCards(data) {
  const { userId, wordbookId, limit = 50, currentDate } = data;
  
  if (!userId || !wordbookId) {
    throw new Error('缺少必要参数: userId, wordbookId');
  }
  
  const now = currentDate ? new Date(currentDate) : new Date();
  
  // 查询用户的学习记录
  const query = db.collection('study_records')
    .where({
      uid: userId,
      wordbookId,
      nextReview: _.lte(now)
    })
    .orderBy('nextReview', 'asc')
    .limit(limit);
  
  const result = await query.get();
  
  const dueCards = result.data.map(record => {
    // 如果有SM-2卡片数据，直接使用
    if (record.sm2Card) {
      return record.sm2Card;
    }
    
    // 否则从传统记录构建SM-2卡片
    return createSM2CardFromRecord(record);
  });
  
  return {
    success: true,
    data: dueCards,
    count: dueCards.length
  };
}

/**
 * 获取用户学习统计
 */
async function handleGetUserStats(data) {
  const { userId, wordbookId } = data;
  
  if (!userId || !wordbookId) {
    throw new Error('缺少必要参数: userId, wordbookId');
  }
  
  // 查询所有学习记录
  const result = await db.collection('study_records')
    .where({
      uid: userId,
      wordbookId
    })
    .get();
  
  const records = result.data;
  
  // 计算统计信息
  const stats = {
    totalCards: records.length,
    newCards: 0,
    learningCards: 0,
    reviewCards: 0,
    masteredCards: 0,
    averageEF: 0,
    averageMastery: 0,
    dueToday: 0
  };
  
  const now = new Date();
  let totalEF = 0;
  let totalMastery = 0;
  
  records.forEach(record => {
    const card = record.sm2Card || createSM2CardFromRecord(record);
    
    // 按状态分类
    switch (card.status) {
      case SM2_CARD_STATUS.New:
        stats.newCards++;
        break;
      case SM2_CARD_STATUS.Learning:
        stats.learningCards++;
        break;
      case SM2_CARD_STATUS.Review:
        stats.reviewCards++;
        break;
      case SM2_CARD_STATUS.Mastered:
        stats.masteredCards++;
        break;
    }
    
    // 计算平均值
    totalEF += card.EF;
    totalMastery += getMasteryLevel(card);
    
    // 统计今日到期
    if (isDue(card, now)) {
      stats.dueToday++;
    }
  });
  
  if (records.length > 0) {
    stats.averageEF = totalEF / records.length;
    stats.averageMastery = totalMastery / records.length;
  }
  
  return {
    success: true,
    data: stats
  };
}

/**
 * 批量更新卡片
 */
async function handleBatchUpdateCards(data) {
  const { userId, wordbookId, updates } = data;
  
  if (!userId || !wordbookId || !Array.isArray(updates)) {
    throw new Error('缺少必要参数: userId, wordbookId, updates');
  }
  
  const results = [];
  const promises = [];
  
  for (const update of updates) {
    const { wordId, choice, card } = update;
    
    if (!wordId || !choice) {
      continue;
    }
    
    // 处理SM-2算法
    const updatedCard = processReview(card || createSM2Card(wordId), choice);
    
    // 构建学习记录
    const studyRecord = {
      uid: userId,
      wordId,
      wordbookId,
      stage: getStageFromStatus(updatedCard.status),
      nextReview: updatedCard.nextReview,
      failures: Math.max(0, updatedCard.repetitions === 0 ? 1 : 0),
      successes: updatedCard.repetitions,
      lastReview: updatedCard.lastReview,
      status: getStatusFromSM2Status(updatedCard.status),
      sm2Card: updatedCard,
      repetitions: updatedCard.repetitions,
      EF: updatedCard.EF,
      interval: updatedCard.interval,
      algorithm: 'sm2',
      createdAt: updatedCard.createdAt,
      updatedAt: updatedCard.updatedAt
    };
    
    // 添加到并发操作队列
    promises.push(
      db.collection('study_records').add(studyRecord)
    );
    
    results.push({
      wordId,
      updatedCard,
      masteryLevel: getMasteryLevel(updatedCard)
    });
  }
  
  // 执行并发操作
  try {
    await Promise.all(promises);
    
    return {
      success: true,
      data: results,
      count: results.length
    };
  } catch (error) {
    console.error('批量操作失败:', error);
    throw new Error(`批量更新失败: ${error.message}`);
  }
}

/**
 * 为用户创建新卡片
 */
async function handleCreateUserCards(data) {
  const { userId, wordbookId, wordIds } = data;
  
  if (!userId || !wordbookId || !Array.isArray(wordIds)) {
    throw new Error('缺少必要参数: userId, wordbookId, wordIds');
  }
  
  const currentDate = new Date();
  const cards = [];
  
  for (const wordId of wordIds) {
    const card = createSM2Card(wordId, currentDate);
    const studyRecord = {
      uid: userId,
      wordId,
      wordbookId,
      stage: 0,
      nextReview: card.nextReview,
      failures: 0,
      successes: 0,
      status: 'new',
      sm2Card: card,
      repetitions: 0,
      EF: INITIAL_EF,
      interval: 0,
      algorithm: 'sm2',
      createdAt: currentDate,
      updatedAt: currentDate
    };
    
    await db.collection('study_records').add(studyRecord);
    cards.push(card);
  }
  
  return {
    success: true,
    data: cards,
    count: cards.length
  };
}

/**
 * 获取学习会话
 */
async function handleGetStudySession(data) {
  const { userId, wordbookId, maxCards = 50 } = data;
  
  if (!userId || !wordbookId) {
    throw new Error('缺少必要参数: userId, wordbookId');
  }
  
  // 获取到期卡片
  const dueCardsResult = await handleGetDueCards({ userId, wordbookId, limit: maxCards });
  
  if (!dueCardsResult.success) {
    throw new Error('获取到期卡片失败');
  }
  
  const dueCards = dueCardsResult.data;
  
  // 创建学习会话统计
  const sessionStats = {
    total: dueCards.length,
    completed: 0,
    remaining: dueCards.length,
    completionRate: 0,
    choiceStats: {
      know: 0,
      hint: 0,
      unknown: 0
    },
    isCompleted: dueCards.length === 0
  };
  
  return {
    success: true,
    data: {
      cards: dueCards,
      stats: sessionStats
    }
  };
}

// 辅助函数

/**
 * 从SM-2状态获取stage数值
 */
function getStageFromStatus(status) {
  switch (status) {
    case SM2_CARD_STATUS.New: return 0;
    case SM2_CARD_STATUS.Learning: return 1;
    case SM2_CARD_STATUS.Review: return 3;
    case SM2_CARD_STATUS.Mastered: return 6;
    default: return 0;
  }
}

/**
 * 从SM-2状态获取传统status
 */
function getStatusFromSM2Status(status) {
  switch (status) {
    case SM2_CARD_STATUS.New: return 'new';
    case SM2_CARD_STATUS.Learning: return 'learning';
    case SM2_CARD_STATUS.Review: return 'review';
    case SM2_CARD_STATUS.Mastered: return 'graduated';
    default: return 'new';
  }
}

/**
 * 从传统记录创建SM-2卡片
 */
function createSM2CardFromRecord(record) {
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
    status: mapStatusToSM2Status(record.status),
    createdAt: record.createdAt || new Date(),
    updatedAt: record.updatedAt || new Date()
  };
}

/**
 * 状态映射：传统status -> SM2CardStatus
 */
function mapStatusToSM2Status(status) {
  switch (status) {
    case 'new': return SM2_CARD_STATUS.New;
    case 'learning': return SM2_CARD_STATUS.Learning;
    case 'review': return SM2_CARD_STATUS.Review;
    case 'graduated': return SM2_CARD_STATUS.Mastered;
    default: return SM2_CARD_STATUS.New;
  }
}