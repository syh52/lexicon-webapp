/**
 * 批量保存学习记录云函数
 * 高性能批量插入/更新学习记录，避免大量API调用
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
});

const db = app.database();

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  const { records, wordbookId, uid } = event;
  
  try {
    // 参数验证
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('records 必须是非空数组');
    }
    
    if (!wordbookId || !uid) {
      throw new Error('缺少必要参数: wordbookId, uid');
    }
    
    console.log(`开始批量保存 ${records.length} 条学习记录`, {
      用户ID: uid,
      词书ID: wordbookId
    });
    
    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];
    
    // 🚀 使用并发操作提高性能 (适配 @cloudbase/node-sdk v2.x)
    const existingRecordsMap = new Map();
    
    // 1. 批量查询现有记录
    const wordIds = records.map(record => record.wordId);
    const existingQuery = await db.collection('study_records')
      .where({
        uid,
        wordbookId,
        wordId: db.command.in(wordIds)
      })
      .get();
    
    // 建立现有记录映射
    existingQuery.data.forEach(record => {
      existingRecordsMap.set(record.wordId, record._id);
    });
    
    console.log(`找到 ${existingQuery.data.length} 条现有记录`);
    
    // 2. 准备批量操作数组
    const operations = [];
    
    for (const record of records) {
      try {
        // 设置时间戳
        const now = new Date();
        const studyRecord = {
          ...record,
          updatedAt: now
        };
        
        const existingId = existingRecordsMap.get(record.wordId);
        
        if (existingId) {
          // 更新现有记录
          operations.push(
            db.collection('study_records').doc(existingId).update(studyRecord)
          );
          updatedCount++;
        } else {
          // 创建新记录
          studyRecord.createdAt = studyRecord.createdAt || now;
          operations.push(
            db.collection('study_records').add(studyRecord)
          );
          createdCount++;
        }
        
      } catch (recordError) {
        console.error(`处理记录失败:`, record.wordId, recordError);
        errors.push({
          wordId: record.wordId,
          error: recordError.message
        });
      }
    }
    
    // 3. 并发执行所有操作
    const startTime = Date.now();
    await Promise.all(operations);
    const batchTime = Date.now() - startTime;
    
    const result = {
      success: true,
      savedCount: createdCount + updatedCount,
      createdCount,
      updatedCount,
      errorCount: errors.length,
      batchTime,
      message: `批量保存完成: 新建 ${createdCount} 条，更新 ${updatedCount} 条`
    };
    
    if (errors.length > 0) {
      result.errors = errors;
      result.message += `，失败 ${errors.length} 条`;
    }
    
    console.log('✅ 批量保存完成:', result);
    return result;
    
  } catch (error) {
    console.error('批量保存学习记录失败:', error);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
};