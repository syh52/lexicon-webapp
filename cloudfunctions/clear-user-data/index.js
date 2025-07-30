/**
 * 清除用户学习数据云函数
 * 开发测试专用：清除指定用户的所有学习记录和记忆数据
 * ⚠️ 仅管理员可调用，谨慎使用！
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
});

const db = app.database();

// 管理员密钥验证
const ADMIN_SECRET = 'LEXICON_SUPER_ADMIN_2025';

/**
 * 检查管理员权限
 */
function validateAdminAccess(adminKey, context) {
  // 验证管理员密钥
  if (adminKey !== ADMIN_SECRET) {
    throw new Error('❌ 无效的管理员密钥');
  }
  
  console.log('✅ 管理员权限验证通过', {
    函数调用者: context?.FUNCTION_NAME || 'unknown',
    调用时间: new Date().toISOString()
  });
  
  return true;
}

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  const { action, adminKey, ...params } = event;
  
  try {
    // 管理员权限验证
    validateAdminAccess(adminKey, context);
    
    console.log(`🔧 执行用户数据清除操作: ${action}`, params);
    
    switch (action) {
      case 'clear_user_study_records':
        return await clearUserStudyRecords(params);
      
      case 'clear_user_daily_plans':
        return await clearUserDailyPlans(params);
      
      case 'clear_all_user_data':
        return await clearAllUserData(params);
      
      case 'get_user_data_stats':
        return await getUserDataStats(params);
      
      case 'list_all_users':
        return await listAllUsersWithData();
      
      default:
        throw new Error(`未知操作: ${action}`);
    }
    
  } catch (error) {
    console.error('❌ 用户数据清除操作失败:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * 清除指定用户的学习记录
 */
async function clearUserStudyRecords(params) {
  const { uid, wordbookId } = params;
  
  if (!uid) {
    throw new Error('用户ID不能为空');
  }
  
  let query = db.collection('study_records').where({ uid });
  
  // 如果指定了词书ID，只清除该词书的记录
  if (wordbookId) {
    query = query.where({ wordbookId });
  }
  
  console.log(`🗑️ 开始清除用户学习记录`, { uid, wordbookId: wordbookId || 'all' });
  
  // 获取要删除的记录数量
  const countResult = await query.count();
  const totalRecords = countResult.total;
  
  if (totalRecords === 0) {
    return {
      success: true,
      message: '没有找到需要清除的学习记录',
      deletedCount: 0,
      uid,
      wordbookId,
      timestamp: new Date().toISOString()
    };
  }
  
  // 分批删除（CloudBase限制单次删除数量）
  let deletedCount = 0;
  const batchSize = 100;
  
  while (deletedCount < totalRecords) {
    const batchQuery = db.collection('study_records')
      .where({ uid })
      .limit(batchSize);
    
    if (wordbookId) {
      batchQuery.where({ wordbookId });
    }
    
    const batchResult = await batchQuery.get();
    
    if (!batchResult.data || batchResult.data.length === 0) {
      break;
    }
    
    // 批量删除
    const deletePromises = batchResult.data.map(record => 
      db.collection('study_records').doc(record._id).remove()
    );
    
    await Promise.all(deletePromises);
    deletedCount += batchResult.data.length;
    
    console.log(`📊 已删除 ${deletedCount}/${totalRecords} 条学习记录`);
  }
  
  return {
    success: true,
    message: `成功清除 ${deletedCount} 条学习记录`,
    deletedCount,
    uid,
    wordbookId,
    timestamp: new Date().toISOString()
  };
}

/**
 * 清除指定用户的每日计划
 */
async function clearUserDailyPlans(params) {
  const { uid, dateRange } = params;
  
  if (!uid) {
    throw new Error('用户ID不能为空');
  }
  
  let query = db.collection('daily_study_plans').where({ uid });
  
  // 如果指定了日期范围
  if (dateRange && dateRange.start) {
    query = query.where({
      date: db.command.gte(dateRange.start)
    });
    
    if (dateRange.end) {
      query = query.where({
        date: db.command.lte(dateRange.end)
      });
    }
  }
  
  console.log(`🗑️ 开始清除用户每日计划`, { uid, dateRange });
  
  const countResult = await query.count();
  const totalPlans = countResult.total;
  
  if (totalPlans === 0) {
    return {
      success: true,
      message: '没有找到需要清除的每日计划',
      deletedCount: 0,
      uid,
      timestamp: new Date().toISOString()
    };
  }
  
  // 分批删除
  let deletedCount = 0;
  const batchSize = 50;
  
  while (deletedCount < totalPlans) {
    const batchResult = await db.collection('daily_study_plans')
      .where({ uid })
      .limit(batchSize)
      .get();
    
    if (!batchResult.data || batchResult.data.length === 0) {
      break;
    }
    
    const deletePromises = batchResult.data.map(plan => 
      db.collection('daily_study_plans').doc(plan._id).remove()
    );
    
    await Promise.all(deletePromises);
    deletedCount += batchResult.data.length;
  }
  
  return {
    success: true,
    message: `成功清除 ${deletedCount} 条每日计划`,
    deletedCount,
    uid,
    timestamp: new Date().toISOString()
  };
}

/**
 * 清除指定用户的所有数据
 */
async function clearAllUserData(params) {
  const { uid, confirm } = params;
  
  if (!uid) {
    throw new Error('用户ID不能为空');
  }
  
  if (confirm !== 'YES_DELETE_ALL_DATA') {
    throw new Error('请确认删除操作：confirm 参数必须为 "YES_DELETE_ALL_DATA"');
  }
  
  console.log(`⚠️ 开始清除用户的所有数据`, { uid });
  
  const results = {
    studyRecords: 0,
    dailyPlans: 0,
    userSettings: 0
  };
  
  // 1. 清除学习记录
  try {
    const studyResult = await clearUserStudyRecords({ uid });
    results.studyRecords = studyResult.deletedCount;
  } catch (error) {
    console.warn('清除学习记录时出错:', error);
  }
  
  // 2. 清除每日计划
  try {
    const planResult = await clearUserDailyPlans({ uid });
    results.dailyPlans = planResult.deletedCount;
  } catch (error) {
    console.warn('清除每日计划时出错:', error);
  }
  
  // 3. 清除用户设置
  try {
    const settingsResult = await db.collection('user_settings')
      .where({ uid })
      .get();
    
    if (settingsResult.data && settingsResult.data.length > 0) {
      const deletePromises = settingsResult.data.map(setting => 
        db.collection('user_settings').doc(setting._id).remove()
      );
      await Promise.all(deletePromises);
      results.userSettings = settingsResult.data.length;
    }
  } catch (error) {
    console.warn('清除用户设置时出错:', error);
  }
  
  const totalDeleted = results.studyRecords + results.dailyPlans + results.userSettings;
  
  return {
    success: true,
    message: `成功清除用户的所有数据，共 ${totalDeleted} 条记录`,
    details: results,
    uid,
    timestamp: new Date().toISOString()
  };
}

/**
 * 获取用户数据统计
 */
async function getUserDataStats(params) {
  const { uid } = params;
  
  if (!uid) {
    throw new Error('用户ID不能为空');
  }
  
  const stats = {};
  
  try {
    // 学习记录统计
    const studyRecordsCount = await db.collection('study_records')
      .where({ uid })
      .count();
    stats.studyRecords = studyRecordsCount.total;
    
    // 每日计划统计
    const dailyPlansCount = await db.collection('daily_study_plans')
      .where({ uid })
      .count();
    stats.dailyPlans = dailyPlansCount.total;
    
    // 用户设置统计
    const userSettingsCount = await db.collection('user_settings')
      .where({ uid })
      .count();
    stats.userSettings = userSettingsCount.total;
    
    // 获取最近的学习记录
    const recentStudy = await db.collection('study_records')
      .where({ uid })
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();
    
    stats.lastStudyTime = recentStudy.data && recentStudy.data.length > 0 
      ? recentStudy.data[0].updatedAt 
      : null;
    
    return {
      success: true,
      uid,
      stats,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('获取用户数据统计失败:', error);
    throw error;
  }
}

/**
 * 列出所有有学习数据的用户
 */
async function listAllUsersWithData() {
  try {
    console.log('📊 开始统计所有用户的学习数据...');
    
    // 获取所有有学习记录的用户
    const studyUsers = await db.collection('study_records')
      .field({ uid: true })
      .get();
    
    // 统计每个用户的数据量
    const userStats = new Map();
    
    for (const record of studyUsers.data) {
      const uid = record.uid;
      if (!userStats.has(uid)) {
        userStats.set(uid, {
          uid,
          studyRecords: 0,
          dailyPlans: 0,
          userSettings: 0
        });
      }
      userStats.get(uid).studyRecords++;
    }
    
    // 获取每日计划数据
    const planUsers = await db.collection('daily_study_plans')
      .field({ uid: true })
      .get();
    
    for (const plan of planUsers.data) {
      const uid = plan.uid;
      if (!userStats.has(uid)) {
        userStats.set(uid, {
          uid,
          studyRecords: 0,
          dailyPlans: 0,
          userSettings: 0
        });
      }
      userStats.get(uid).dailyPlans++;
    }
    
    const allUsers = Array.from(userStats.values());
    
    return {
      success: true,
      message: `找到 ${allUsers.length} 个用户的学习数据`,
      users: allUsers,
      totalUsers: allUsers.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('列出用户数据失败:', error);
    throw error;
  }
}