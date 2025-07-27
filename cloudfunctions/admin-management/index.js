const cloudbase = require('@cloudbase/node-sdk');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// 初始化 CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  const { action, adminUserId, keyType, maxUses, expiresInDays, keyId } = event;
  
  // 获取当前CloudBase用户ID
  const cloudbaseUserId = adminUserId || context.userInfo?.uid;
  
  if (!cloudbaseUserId) {
    return {
      success: false,
      error: '用户未登录'
    };
  }

  // 🔧 用户ID映射：将CloudBase用户ID映射为应用层用户ID
  let currentUserId = cloudbaseUserId;
  try {
    // 先查询ID映射表
    const mappingResult = await db.collection('user_id_mapping')
      .where({ cloudbaseUserId: cloudbaseUserId })
      .get();
    
    if (mappingResult.data.length > 0) {
      currentUserId = mappingResult.data[0].appUserId;
      console.log('🎯 admin-management: 使用映射后的应用层用户ID:', currentUserId);
    } else {
      console.log('🔄 admin-management: 未找到用户映射，使用CloudBase ID:', cloudbaseUserId);
      currentUserId = cloudbaseUserId;
    }
  } catch (mappingError) {
    console.warn('⚠️ admin-management: 查询用户映射失败，使用CloudBase ID:', mappingError.message);
    currentUserId = cloudbaseUserId;
  }
  
  try {
    switch (action) {
      case 'generateKey':
        // 生成管理员密钥
        return await generateAdminKey(currentUserId, keyType, maxUses, expiresInDays);
      
      case 'listKeys':
        // 获取管理员密钥列表
        return await listAdminKeys(currentUserId);
      
      case 'deactivateKey':
        // 停用管理员密钥
        return await deactivateAdminKey(currentUserId, keyId);
      
      case 'getKeyStats':
        // 获取密钥使用统计
        return await getKeyStats(currentUserId);
        
      default:
        return {
          success: false,
          error: '未知操作类型'
        };
    }
  } catch (error) {
    console.error('AdminManagement function error:', error);
    return {
      success: false,
      error: error.message || '服务器内部错误'
    };
  }
};

// 生成管理员密钥
async function generateAdminKey(adminUserId, keyType = 'admin', maxUses = 10, expiresInDays = 30) {
  try {
    // 检查操作者权限
    const adminResult = await db.collection('users')
      .where({ uid: adminUserId })
      .get();

    if (adminResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      };
    }

    const admin = adminResult.data[0];
    if (admin.role !== 'super_admin') {
      return {
        success: false,
        error: '只有超级管理员可以生成管理员密钥'
      };
    }

    // 验证密钥类型
    if (!['admin', 'super_admin'].includes(keyType)) {
      return {
        success: false,
        error: '无效的密钥类型'
      };
    }

    // 生成随机密钥
    const keyPrefix = keyType === 'admin' ? 'ADMIN' : keyType === 'super_admin' ? 'SUPER' : 'USER';
    const randomString = crypto.randomBytes(16).toString('hex').toUpperCase();
    const plainKey = `LEXICON_${keyPrefix}_${randomString}`;
    
    // 加密存储密钥
    const saltRounds = 10;
    const keyHash = await bcrypt.hash(plainKey, saltRounds);
    
    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // 创建密钥记录
    const keyData = {
      keyId: 'key_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      keyHash: keyHash,
      type: keyType,
      createdBy: adminUserId,
      createdAt: new Date(),
      expiresAt: expiresAt,
      maxUses: maxUses,
      usedCount: 0,
      isActive: true,
      lastUsedAt: null,
      description: `${keyType === 'admin' ? '管理员' : '用户'}密钥 - 由 ${admin.displayName} 生成`
    };

    const result = await db.collection('admin_keys').add(keyData);

    if (result.id) {
      // 记录操作日志
      await db.collection('admin_logs').add({
        data: {
          adminId: adminUserId,
          action: 'key_generation',
          keyType: keyType,
          keyId: keyData.keyId,
          timestamp: new Date()
        }
      });

      return {
        success: true,
        data: {
          message: '管理员密钥生成成功',
          keyId: keyData.keyId,
          plainKey: plainKey, // 明文密钥，只在生成时返回一次
          keyInfo: {
            type: keyType,
            maxUses: maxUses,
            expiresAt: expiresAt,
            createdAt: keyData.createdAt
          }
        }
      };
    } else {
      return {
        success: false,
        error: '密钥生成失败'
      };
    }
  } catch (error) {
    console.error('生成管理员密钥失败:', error);
    return {
      success: false,
      error: '生成管理员密钥失败：' + error.message
    };
  }
}

// 获取管理员密钥列表
async function listAdminKeys(adminUserId) {
  try {
    // 检查操作者权限
    const adminResult = await db.collection('users')
      .where({ uid: adminUserId })
      .get();

    if (adminResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      };
    }

    const admin = adminResult.data[0];
    if (admin.role !== 'super_admin') {
      return {
        success: false,
        error: '只有超级管理员可以查看密钥列表'
      };
    }

    // 获取密钥列表
    const keysResult = await db.collection('admin_keys')
      .where({ createdBy: adminUserId })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const keys = keysResult.data.map(key => ({
      keyId: key.keyId,
      type: key.type,
      description: key.description,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      maxUses: key.maxUses,
      usedCount: key.usedCount,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      // 状态判断
      isExpired: new Date() > new Date(key.expiresAt),
      isExhausted: key.usedCount >= key.maxUses
    }));

    return {
      success: true,
      data: {
        keys: keys,
        total: keys.length,
        activeCount: keys.filter(k => k.isActive && !k.isExpired && !k.isExhausted).length
      }
    };
  } catch (error) {
    console.error('获取密钥列表失败:', error);
    return {
      success: false,
      error: '获取密钥列表失败：' + error.message
    };
  }
}

// 停用管理员密钥
async function deactivateAdminKey(adminUserId, keyId) {
  try {
    // 检查操作者权限
    const adminResult = await db.collection('users')
      .where({ uid: adminUserId })
      .get();

    if (adminResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      };
    }

    const admin = adminResult.data[0];
    if (admin.role !== 'super_admin') {
      return {
        success: false,
        error: '只有超级管理员可以停用密钥'
      };
    }

    // 查找密钥
    const keyResult = await db.collection('admin_keys')
      .where({ 
        keyId: keyId,
        createdBy: adminUserId 
      })
      .get();

    if (keyResult.data.length === 0) {
      return {
        success: false,
        error: '密钥不存在或无权限操作'
      };
    }

    const keyDoc = keyResult.data[0];

    // 停用密钥
    const updateResult = await db.collection('admin_keys')
      .doc(keyDoc._id)
      .update({
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedBy: adminUserId
        }
      });

    if (updateResult.stats.updated > 0) {
      // 记录操作日志
      await db.collection('admin_logs').add({
        data: {
          adminId: adminUserId,
          action: 'key_deactivation',
          keyId: keyId,
          timestamp: new Date()
        }
      });

      return {
        success: true,
        data: {
          message: '密钥已成功停用',
          keyId: keyId
        }
      };
    } else {
      return {
        success: false,
        error: '密钥停用失败'
      };
    }
  } catch (error) {
    console.error('停用密钥失败:', error);
    return {
      success: false,
      error: '停用密钥失败：' + error.message
    };
  }
}

// 获取密钥使用统计
async function getKeyStats(adminUserId) {
  try {
    // 检查操作者权限
    const adminResult = await db.collection('users')
      .where({ uid: adminUserId })
      .get();

    if (adminResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      };
    }

    const admin = adminResult.data[0];
    if (admin.role !== 'super_admin') {
      return {
        success: false,
        error: '只有超级管理员可以查看统计信息'
      };
    }

    // 获取所有密钥统计
    const keysResult = await db.collection('admin_keys')
      .where({ createdBy: adminUserId })
      .get();

    const keys = keysResult.data;
    const now = new Date();

    const stats = {
      total: keys.length,
      active: keys.filter(k => k.isActive).length,
      expired: keys.filter(k => new Date(k.expiresAt) < now).length,
      exhausted: keys.filter(k => k.usedCount >= k.maxUses).length,
      totalUses: keys.reduce((sum, k) => sum + k.usedCount, 0),
      recentActivity: keys
        .filter(k => k.lastUsedAt && new Date(k.lastUsedAt) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
        .length
    };

    // 获取最近的使用记录
    const logsResult = await db.collection('admin_logs')
      .where({ 
        adminId: adminUserId,
        action: 'key_generation'
      })
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();

    return {
      success: true,
      data: {
        stats: stats,
        recentGenerations: logsResult.data
      }
    };
  } catch (error) {
    console.error('获取统计信息失败:', error);
    return {
      success: false,
      error: '获取统计信息失败：' + error.message
    };
  }
}