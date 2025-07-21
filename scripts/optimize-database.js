import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloudbase.init({
  env: 'cloud1-7g7oatv381500c81', // 您的环境ID
  secretId: process.env.CLOUDBASE_SECRET_ID,
  secretKey: process.env.CLOUDBASE_SECRET_KEY,
});

const db = app.database();

/**
 * 数据库优化脚本
 * 为主要集合添加索引，提高查询性能
 */

const optimizeDatabase = async () => {
  console.log('🚀 开始优化数据库性能...');
  
  try {
    // 1. words 集合索引优化
    console.log('\n📝 优化 words 集合...');
    await optimizeWordsCollection();
    
    // 2. wordbooks 集合索引优化
    console.log('\n📚 优化 wordbooks 集合...');
    await optimizeWordbooksCollection();
    
    // 3. study_records 集合索引优化
    console.log('\n📊 优化 study_records 集合...');
    await optimizeStudyRecordsCollection();
    
    // 4. daily_study_plans 集合索引优化
    console.log('\n📅 优化 daily_study_plans 集合...');
    await optimizeDailyStudyPlansCollection();
    
    // 5. user_settings 集合索引优化
    console.log('\n⚙️ 优化 user_settings 集合...');
    await optimizeUserSettingsCollection();
    
    // 6. users 集合索引优化
    console.log('\n👤 优化 users 集合...');
    await optimizeUsersCollection();
    
    console.log('\n✅ 数据库优化完成！');
    
  } catch (error) {
    console.error('❌ 数据库优化失败:', error);
  }
};

// 优化 words 集合
async function optimizeWordsCollection() {
  const collection = db.collection('words');
  
  try {
    // 创建复合索引：word + level (用于按级别查询单词)
    await collection.createIndex({
      keys: { word: 1, level: 1 },
      name: 'word_level_index'
    });
    console.log('✅ 创建 words.word_level_index 索引');
    
    // 创建索引：frequency (用于按频率排序)
    await collection.createIndex({
      keys: { frequency: -1 },
      name: 'frequency_index'
    });
    console.log('✅ 创建 words.frequency_index 索引');
    
    // 创建索引：tags (用于按标签查询)
    await collection.createIndex({
      keys: { tags: 1 },
      name: 'tags_index'
    });
    console.log('✅ 创建 words.tags_index 索引');
    
    // 创建索引：createdAt (用于按创建时间排序)
    await collection.createIndex({
      keys: { createdAt: -1 },
      name: 'created_at_index'
    });
    console.log('✅ 创建 words.created_at_index 索引');
    
  } catch (error) {
    console.error('❌ words 集合优化失败:', error);
  }
}

// 优化 wordbooks 集合
async function optimizeWordbooksCollection() {
  const collection = db.collection('wordbooks');
  
  try {
    // 创建索引：createdBy (用于查询用户的词书)
    await collection.createIndex({
      keys: { createdBy: 1 },
      name: 'created_by_index'
    });
    console.log('✅ 创建 wordbooks.created_by_index 索引');
    
    // 创建复合索引：isPublic + level (用于查询公共词书)
    await collection.createIndex({
      keys: { isPublic: 1, level: 1 },
      name: 'public_level_index'
    });
    console.log('✅ 创建 wordbooks.public_level_index 索引');
    
    // 创建索引：category (用于按分类查询)
    await collection.createIndex({
      keys: { category: 1 },
      name: 'category_index'
    });
    console.log('✅ 创建 wordbooks.category_index 索引');
    
    // 创建索引：tags (用于按标签查询)
    await collection.createIndex({
      keys: { tags: 1 },
      name: 'tags_index'
    });
    console.log('✅ 创建 wordbooks.tags_index 索引');
    
  } catch (error) {
    console.error('❌ wordbooks 集合优化失败:', error);
  }
}

// 优化 study_records 集合
async function optimizeStudyRecordsCollection() {
  const collection = db.collection('study_records');
  
  try {
    // 创建复合索引：uid + wordbookId (用于查询用户的学习记录)
    await collection.createIndex({
      keys: { uid: 1, wordbookId: 1 },
      name: 'uid_wordbook_index'
    });
    console.log('✅ 创建 study_records.uid_wordbook_index 索引');
    
    // 创建复合索引：uid + wordId (用于查询特定单词的学习记录)
    await collection.createIndex({
      keys: { uid: 1, wordId: 1 },
      name: 'uid_word_index'
    });
    console.log('✅ 创建 study_records.uid_word_index 索引');
    
    // 创建索引：nextReview (用于查询需要复习的单词)
    await collection.createIndex({
      keys: { nextReview: 1 },
      name: 'next_review_index'
    });
    console.log('✅ 创建 study_records.next_review_index 索引');
    
    // 创建复合索引：uid + status (用于查询不同状态的学习记录)
    await collection.createIndex({
      keys: { uid: 1, status: 1 },
      name: 'uid_status_index'
    });
    console.log('✅ 创建 study_records.uid_status_index 索引');
    
    // 创建索引：lastReview (用于按最后复习时间排序)
    await collection.createIndex({
      keys: { lastReview: -1 },
      name: 'last_review_index'
    });
    console.log('✅ 创建 study_records.last_review_index 索引');
    
  } catch (error) {
    console.error('❌ study_records 集合优化失败:', error);
  }
}

// 优化 daily_study_plans 集合
async function optimizeDailyStudyPlansCollection() {
  const collection = db.collection('daily_study_plans');
  
  try {
    // 创建复合索引：uid + wordbookId + date (用于查询特定日期的学习计划)
    await collection.createIndex({
      keys: { uid: 1, wordbookId: 1, date: 1 },
      name: 'uid_wordbook_date_index'
    });
    console.log('✅ 创建 daily_study_plans.uid_wordbook_date_index 索引');
    
    // 创建复合索引：uid + date (用于查询用户的学习计划)
    await collection.createIndex({
      keys: { uid: 1, date: -1 },
      name: 'uid_date_index'
    });
    console.log('✅ 创建 daily_study_plans.uid_date_index 索引');
    
    // 创建索引：isCompleted (用于查询已完成的学习计划)
    await collection.createIndex({
      keys: { isCompleted: 1 },
      name: 'completed_index'
    });
    console.log('✅ 创建 daily_study_plans.completed_index 索引');
    
  } catch (error) {
    console.error('❌ daily_study_plans 集合优化失败:', error);
  }
}

// 优化 user_settings 集合
async function optimizeUserSettingsCollection() {
  const collection = db.collection('user_settings');
  
  try {
    // 创建唯一索引：uid (每个用户只能有一个设置记录)
    await collection.createIndex({
      keys: { uid: 1 },
      name: 'uid_unique_index',
      unique: true
    });
    console.log('✅ 创建 user_settings.uid_unique_index 索引');
    
    // 创建索引：updatedAt (用于按更新时间排序)
    await collection.createIndex({
      keys: { updatedAt: -1 },
      name: 'updated_at_index'
    });
    console.log('✅ 创建 user_settings.updated_at_index 索引');
    
  } catch (error) {
    console.error('❌ user_settings 集合优化失败:', error);
  }
}

// 优化 users 集合
async function optimizeUsersCollection() {
  const collection = db.collection('users');
  
  try {
    // 创建唯一索引：email (邮箱唯一)
    await collection.createIndex({
      keys: { email: 1 },
      name: 'email_unique_index',
      unique: true
    });
    console.log('✅ 创建 users.email_unique_index 索引');
    
    // 创建唯一索引：username (用户名唯一)
    await collection.createIndex({
      keys: { username: 1 },
      name: 'username_unique_index',
      unique: true
    });
    console.log('✅ 创建 users.username_unique_index 索引');
    
    // 创建索引：createdAt (用于按注册时间排序)
    await collection.createIndex({
      keys: { createdAt: -1 },
      name: 'created_at_index'
    });
    console.log('✅ 创建 users.created_at_index 索引');
    
    // 创建索引：lastLoginAt (用于按最后登录时间排序)
    await collection.createIndex({
      keys: { lastLoginAt: -1 },
      name: 'last_login_index'
    });
    console.log('✅ 创建 users.last_login_index 索引');
    
  } catch (error) {
    console.error('❌ users 集合优化失败:', error);
  }
}

// 查询优化建议
const generateOptimizationReport = async () => {
  console.log('\n📊 生成数据库优化报告...');
  
  try {
    // 统计各集合的文档数量
    const collections = ['words', 'wordbooks', 'study_records', 'daily_study_plans', 'user_settings', 'users'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const count = await collection.count();
      console.log(`📋 ${collectionName}: ${count.total} 条记录`);
    }
    
    // 提供查询优化建议
    console.log('\n💡 查询优化建议:');
    console.log('1. 使用复合索引进行多字段查询');
    console.log('2. 避免使用 $regex 进行全文搜索，考虑使用全文搜索引擎');
    console.log('3. 使用 limit() 限制返回结果数量');
    console.log('4. 使用 skip() 时配合索引使用');
    console.log('5. 定期清理过期的学习记录和计划');
    
  } catch (error) {
    console.error('❌ 生成优化报告失败:', error);
  }
};

// 清理过期数据
const cleanupExpiredData = async () => {
  console.log('\n🧹 清理过期数据...');
  
  try {
    // 清理30天前的学习计划
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const planResult = await db.collection('daily_study_plans')
      .where({
        createdAt: db.command.lt(thirtyDaysAgo),
        isCompleted: true
      })
      .remove();
    
    console.log(`🗑️ 清理了 ${planResult.deleted} 条过期学习计划`);
    
  } catch (error) {
    console.error('❌ 清理过期数据失败:', error);
  }
};

// 主函数
const main = async () => {
  await optimizeDatabase();
  await generateOptimizationReport();
  await cleanupExpiredData();
  
  console.log('\n🎉 数据库优化任务完成！');
  process.exit(0);
};

// 运行优化脚本
main().catch(console.error);