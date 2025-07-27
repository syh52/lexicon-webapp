/**
 * 用户数据迁移云函数
 * 修复用户ID映射问题，确保数据一致性
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  const { action, dryRun = true, batchSize = 100 } = event;
  
  // 只允许超级管理员执行数据迁移
  const currentUserId = context.userInfo?.uid;
  if (!currentUserId) {
    return {
      success: false,
      error: '需要登录才能执行数据迁移'
    };
  }
  
  // 检查用户权限
  const userResult = await db.collection('users')
    .where({ uid: currentUserId })
    .get();
    
  if (userResult.data.length === 0 || userResult.data[0].role !== 'super_admin') {
    return {
      success: false,
      error: '只有超级管理员可以执行数据迁移'
    };
  }
  
  console.log('🔧 开始用户数据迁移', { action, dryRun, batchSize });
  
  try {
    switch (action) {
      case 'analyzeData':
        return await analyzeDataInconsistency(dryRun);
        
      case 'buildMappings':
        return await buildUserMappings(dryRun, batchSize);
        
      case 'migrateLearningData':
        return await migrateLearningData(dryRun, batchSize);
        
      case 'verifyMigration':
        return await verifyMigration();
        
      default:
        return {
          success: false,
          error: '未知的迁移操作'
        };
    }
  } catch (error) {
    console.error('数据迁移失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 分析数据不一致性
async function analyzeDataInconsistency(dryRun = true) {
  console.log('🔍 分析数据不一致性...');
  
  const analysis = {
    users: {},
    learningRecords: {},
    mappingStatus: {},
    inconsistencies: []
  };
  
  try {
    // 1. 分析用户集合
    const usersResult = await db.collection('users').get();
    const users = usersResult.data || [];
    
    analysis.users = {
      total: users.length,
      withEmail: users.filter(u => u.email).length,
      anonymous: users.filter(u => !u.email).length,
      uidPatterns: {
        appGenerated: users.filter(u => u.uid?.startsWith('user_')).length,
        cloudbaseStyle: users.filter(u => u.uid && !u.uid.startsWith('user_')).length
      }
    };
    
    // 2. 分析学习记录
    const studyRecordsResult = await db.collection('study_records').get();
    const studyRecords = studyRecordsResult.data || [];
    
    const uniqueUserIds = [...new Set(studyRecords.map(r => r.uid))];
    analysis.learningRecords = {
      total: studyRecords.length,
      uniqueUsers: uniqueUserIds.length,
      orphaned: 0 // 计算没有对应用户记录的学习数据
    };
    
    // 检查孤立的学习记录
    for (const userId of uniqueUserIds) {
      const userExists = users.some(u => u.uid === userId);
      if (!userExists) {
        analysis.learningRecords.orphaned++;
        analysis.inconsistencies.push({
          type: 'orphaned_learning_data',
          userId: userId,
          description: `学习记录中的用户ID ${userId} 在users集合中不存在`
        });
      }
    }
    
    // 3. 分析映射状态
    const mappingsResult = await db.collection('user_id_mapping').get();
    const mappings = mappingsResult.data || [];
    
    analysis.mappingStatus = {
      total: mappings.length,
      usersWithMapping: mappings.length,
      usersNeedMapping: users.length - mappings.length
    };
    
    // 检查缺失的映射
    for (const user of users) {
      const hasMapping = mappings.some(m => m.app_uid === user.uid);
      if (!hasMapping) {
        analysis.inconsistencies.push({
          type: 'missing_mapping',
          userId: user.uid,
          email: user.email,
          description: `用户 ${user.uid} 缺少ID映射关系`
        });
      }
    }
    
    console.log('📊 数据分析完成:', analysis);
    
    return {
      success: true,
      data: analysis,
      message: `分析完成。发现 ${analysis.inconsistencies.length} 个数据不一致问题`
    };
    
  } catch (error) {
    console.error('数据分析失败:', error);
    return {
      success: false,
      error: '数据分析失败: ' + error.message
    };
  }
}

// 建立用户ID映射关系
async function buildUserMappings(dryRun = true, batchSize = 100) {
  console.log('🔗 建立用户ID映射关系...', { dryRun, batchSize });
  
  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };
  
  try {
    // 获取所有用户
    const usersResult = await db.collection('users').get();
    const users = usersResult.data || [];
    
    // 获取现有映射
    const mappingsResult = await db.collection('user_id_mapping').get();
    const existingMappings = mappingsResult.data || [];
    const mappingsByAppUid = {};
    existingMappings.forEach(m => {
      mappingsByAppUid[m.app_uid] = m;
    });
    
    // 批量处理用户
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      for (const user of batch) {
        try {
          results.processed++;
          
          // 检查是否已有映射
          if (mappingsByAppUid[user.uid]) {
            results.skipped++;
            continue;
          }
          
          // 为应用生成的用户ID创建映射
          if (user.uid.startsWith('user_')) {
            // 这是应用层生成的ID，需要与CloudBase ID建立映射
            // 暂时使用应用ID作为CloudBase ID（后续可能需要调整）
            const mappingData = {
              app_uid: user.uid,
              cloudbase_uid: user.uid, // 临时方案
              mapping_type: 'app_generated',
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            if (!dryRun) {
              await db.collection('user_id_mapping').add(mappingData);
            }
            
            results.created++;
            console.log(`✅ 为用户 ${user.uid} 创建映射`);
          } else {
            // 这可能是CloudBase ID，也创建映射
            const mappingData = {
              app_uid: user.uid,
              cloudbase_uid: user.uid,
              mapping_type: 'cloudbase_native',
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            if (!dryRun) {
              await db.collection('user_id_mapping').add(mappingData);
            }
            
            results.created++;
            console.log(`✅ 为CloudBase用户 ${user.uid} 创建映射`);
          }
          
        } catch (error) {
          results.errors.push({
            userId: user.uid,
            error: error.message
          });
          console.error(`❌ 处理用户 ${user.uid} 失败:`, error);
        }
      }
    }
    
    return {
      success: true,
      data: results,
      message: `${dryRun ? '模拟' : '实际'}处理完成。处理 ${results.processed} 个用户，创建 ${results.created} 个映射`
    };
    
  } catch (error) {
    console.error('建立映射失败:', error);
    return {
      success: false,
      error: '建立映射失败: ' + error.message
    };
  }
}

// 迁移学习数据
async function migrateLearningData(dryRun = true, batchSize = 100) {
  console.log('📚 迁移学习数据...', { dryRun, batchSize });
  
  const results = {
    studyRecords: { processed: 0, migrated: 0, errors: 0 },
    dailyPlans: { processed: 0, migrated: 0, errors: 0 },
    userSettings: { processed: 0, migrated: 0, errors: 0 }
  };
  
  try {
    // 获取所有映射关系
    const mappingsResult = await db.collection('user_id_mapping').get();
    const mappings = mappingsResult.data || [];
    const mappingByAppUid = {};
    mappings.forEach(m => {
      mappingByAppUid[m.app_uid] = m.cloudbase_uid;
    });
    
    // 1. 迁移学习记录
    const studyRecordsResult = await db.collection('study_records').get();
    const studyRecords = studyRecordsResult.data || [];
    
    for (const record of studyRecords) {
      try {
        results.studyRecords.processed++;
        
        const newUserId = mappingByAppUid[record.uid];
        if (newUserId && newUserId !== record.uid) {
          if (!dryRun) {
            await db.collection('study_records')
              .doc(record._id)
              .update({
                uid: newUserId,
                migratedAt: new Date()
              });
          }
          results.studyRecords.migrated++;
        }
      } catch (error) {
        results.studyRecords.errors++;
        console.error('迁移学习记录失败:', error);
      }
    }
    
    // 2. 迁移每日计划
    const dailyPlansResult = await db.collection('daily_study_plans').get();
    const dailyPlans = dailyPlansResult.data || [];
    
    for (const plan of dailyPlans) {
      try {
        results.dailyPlans.processed++;
        
        const newUserId = mappingByAppUid[plan.userId];
        if (newUserId && newUserId !== plan.userId) {
          if (!dryRun) {
            await db.collection('daily_study_plans')
              .doc(plan._id)
              .update({
                userId: newUserId,
                migratedAt: new Date()
              });
          }
          results.dailyPlans.migrated++;
        }
      } catch (error) {
        results.dailyPlans.errors++;
        console.error('迁移每日计划失败:', error);
      }
    }
    
    // 3. 迁移用户设置
    const userSettingsResult = await db.collection('user_settings').get();
    const userSettings = userSettingsResult.data || [];
    
    for (const setting of userSettings) {
      try {
        results.userSettings.processed++;
        
        const newUserId = mappingByAppUid[setting.userId];
        if (newUserId && newUserId !== setting.userId) {
          if (!dryRun) {
            await db.collection('user_settings')
              .doc(setting._id)
              .update({
                userId: newUserId,
                migratedAt: new Date()
              });
          }
          results.userSettings.migrated++;
        }
      } catch (error) {
        results.userSettings.errors++;
        console.error('迁移用户设置失败:', error);
      }
    }
    
    return {
      success: true,
      data: results,
      message: `${dryRun ? '模拟' : '实际'}迁移完成`
    };
    
  } catch (error) {
    console.error('学习数据迁移失败:', error);
    return {
      success: false,
      error: '学习数据迁移失败: ' + error.message
    };
  }
}

// 验证迁移结果
async function verifyMigration() {
  console.log('✅ 验证迁移结果...');
  
  const verification = {
    mappingCoverage: {},
    dataConsistency: {},
    orphanedData: {},
    issues: []
  };
  
  try {
    // 1. 验证映射覆盖率
    const usersResult = await db.collection('users').get();
    const mappingsResult = await db.collection('user_id_mapping').get();
    
    const users = usersResult.data || [];
    const mappings = mappingsResult.data || [];
    
    const userIds = new Set(users.map(u => u.uid));
    const mappedUserIds = new Set(mappings.map(m => m.app_uid));
    
    verification.mappingCoverage = {
      totalUsers: users.length,
      mappedUsers: mappings.length,
      coverageRate: users.length > 0 ? (mappings.length / users.length * 100).toFixed(2) + '%' : '0%',
      unmappedUsers: users.filter(u => !mappedUserIds.has(u.uid)).map(u => u.uid)
    };
    
    // 2. 验证数据一致性
    const studyRecordsResult = await db.collection('study_records').get();
    const studyRecords = studyRecordsResult.data || [];
    
    const studyRecordUserIds = new Set(studyRecords.map(r => r.uid));
    const orphanedLearningData = [...studyRecordUserIds].filter(uid => !userIds.has(uid));
    
    verification.dataConsistency = {
      totalLearningRecords: studyRecords.length,
      uniqueUserIds: studyRecordUserIds.size,
      orphanedRecords: orphanedLearningData.length
    };
    
    if (orphanedLearningData.length > 0) {
      verification.issues.push({
        type: 'orphaned_learning_data',
        count: orphanedLearningData.length,
        userIds: orphanedLearningData
      });
    }
    
    // 3. 验证映射有效性
    for (const mapping of mappings) {
      if (!userIds.has(mapping.app_uid)) {
        verification.issues.push({
          type: 'invalid_mapping',
          mappingId: mapping._id,
          appUserId: mapping.app_uid,
          description: '映射指向不存在的用户'
        });
      }
    }
    
    return {
      success: true,
      data: verification,
      message: `验证完成。发现 ${verification.issues.length} 个问题`
    };
    
  } catch (error) {
    console.error('验证迁移结果失败:', error);
    return {
      success: false,
      error: '验证迁移结果失败: ' + error.message
    };
  }
}