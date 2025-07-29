const cloudbase = require('@cloudbase/node-sdk');
const bcrypt = require('bcryptjs');

// 初始化 CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  const { action, userId, userInfo, displayName, email, password, type, adminKey, targetUserId, newRole, cloudbaseUserId, appUserId } = event;
  const { userRecord } = context;
  
  // 详细日志记录
  console.log('🔍 UserInfo函数调用:', {
    action,
    userId,
    hasUserInfo: !!userInfo,
    contextUserInfo: context.userInfo?.uid,
    userRecord: userRecord?.uid,
    timestamp: new Date().toISOString()
  });
  
  // 获取当前用户ID - CloudBase v2 Web应用认证
  // context.userInfo?.uid 包含CloudBase原生认证的用户ID
  const currentUserId = userId || context.userInfo?.uid || userRecord?.uid;
  
  console.log('🔑 用户ID获取结果:', {
    currentUserId,
    source: userId ? 'event.userId' : context.userInfo?.uid ? 'context.userInfo.uid' : userRecord?.uid ? 'userRecord.uid' : 'none'
  });
  
  if (!currentUserId && !['get', 'getOrCreate', 'create', 'getUserMapping', 'establishMapping'].includes(action)) {
    console.error('❌ 用户未登录，拒绝访问:', { action, currentUserId });
    return {
      code: -1,
      error: '用户未登录'
    };
  }
  
  try {
    switch (action) {
      case 'get':
        return await getUserInfo(currentUserId);
      
      case 'getOrCreate':
        // 获取或创建用户信息（用于登录时）
        return await getOrCreateUserInfo(currentUserId, { displayName });
      
      case 'create':
        // 创建用户信息（用于注册时）
        return await createUserInfo(currentUserId, userInfo || { displayName });
      
      case 'update':
        // 更新用户信息
        return await updateUserInfo(currentUserId, userInfo);
      
      case 'promoteWithKey':
        // 使用密钥提升用户权限
        return await promoteUserWithKey(currentUserId, adminKey);
      
      case 'promoteUser':
        // 管理员提升其他用户权限
        return await promoteUserByAdmin(currentUserId, targetUserId, newRole);
      
      case 'listUsers':
        // 获取用户列表（管理员功能）
        return await listUsers(currentUserId);
        
      case 'getUserMapping':
        // 获取用户ID映射
        return await getUserMapping(cloudbaseUserId);
        
      case 'establishMapping':
        // 建立用户ID映射
        return await establishMapping(cloudbaseUserId, appUserId);
        
      default:
        return {
          code: -1,
          error: '未知操作类型'
        };
    }
  } catch (error) {
    console.error('UserInfo function error:', error);
    return {
      code: -1,
      error: error.message || '服务器内部错误'
    };
  }
};

// 获取用户信息
async function getUserInfo(userId) {
  try {
    console.log('🔍 获取用户信息:', userId);
    
    const userResult = await db.collection('users')
      .where({ uid: userId })
      .get();
    
    console.log('📁 查询结果:', {
      found: userResult.data.length > 0,
      count: userResult.data.length,
      userId
    });

    if (userResult.data.length === 0) {
      // 用户信息不存在，返回默认信息
      console.log('⚠️ 用户不存在，返回默认信息:', userId);
      return {
        code: 0,
        data: {
          uid: userId,
          displayName: '新用户',
          email: '', // 添加空邮箱字段
          avatar: `/user-avatar.png`,
          level: 1,
          totalWords: 0,
          studiedWords: 0,
          correctRate: 0,
          streakDays: 0,
          lastStudyDate: null,
          // 权限相关字段
          role: 'user',
          permissions: ['basic_learning'],
          isNewUser: true
        }
      };
    }

    const user = userResult.data[0];
    console.log('✅ 用户信息获取成功:', user.uid);
    return {
      code: 0,
      data: {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email || '', // 确保返回邮箱字段
        avatar: user.avatar,
        level: user.level,
        totalWords: user.totalWords,
        studiedWords: user.studiedWords,
        correctRate: user.correctRate,
        streakDays: user.streakDays,
        lastStudyDate: user.lastStudyDate,
        // 权限相关字段
        role: user.role || 'user',
        permissions: user.permissions || ['basic_learning'],
        isNewUser: false
      }
    };
  } catch (error) {
    console.error('❌ 获取用户信息失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    return {
      code: -1,
      error: '获取用户信息失败：' + error.message
    };
  }
}

// 创建用户信息
async function createUserInfo(userId, userInfo = {}) {
  try {
    console.log('🔄 开始创建用户:', { userId, userInfo });
    
    // 检查用户是否已存在
    const existingUser = await db.collection('users')
      .where({ uid: userId })
      .get();

    if (existingUser.data.length > 0) {
      console.log('⚠️ 用户已存在:', userId);
      return {
        code: -1,
        error: '用户信息已存在'
      };
    }

    // 创建新用户信息
    const userData = {
      uid: userId,
      displayName: userInfo.displayName || '新用户',
      email: userInfo.email || '', // 添加邮箱字段
      avatar: userInfo.avatar || `/user-avatar.png`,
      level: 1,
      totalWords: 0,
      studiedWords: 0,
      correctRate: 0,
      streakDays: 0,
      lastStudyDate: null,
      // 权限系统相关字段
      role: 'user', // 默认为普通用户
      permissions: ['basic_learning'], // 基础学习权限
      adminKeyUsed: null,
      promotedBy: null,
      promotedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('💾 准备插入用户数据:', userData);

    const result = await db.collection('users').add(userData);
    
    console.log('📊 数据库插入结果:', result);

    if (result.id) {
      console.log('✅ 用户创建成功:', { userId, insertId: result.id });
      return {
        code: 0,
        data: {
          ...userData,
          _id: result.id
        }
      };
    } else {
      console.error('❌ 插入失败，无id返回:', result);
      return {
        code: -1,
        error: '创建用户信息失败：无法获取插入ID'
      };
    }
  } catch (error) {
    console.error('❌ 创建用户信息失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    return {
      code: -1,
      error: '创建用户信息失败：' + error.message
    };
  }
}

// 获取或创建用户信息
async function getOrCreateUserInfo(userId, userInfo = {}) {
  try {
    console.log('🔍 开始获取或创建用户:', { userId, userInfo });
    
    // 先尝试获取用户信息
    const userResult = await db.collection('users')
      .where({ uid: userId })
      .get();
    
    console.log('📁 用户查询结果:', {
      found: userResult.data.length > 0,
      count: userResult.data.length,
      userId
    });

    if (userResult.data.length > 0) {
      // 用户存在，检查是否需要更新邮箱信息
      const user = userResult.data[0];
      
      // 如果传入了邮箱信息且用户当前没有邮箱，则更新
      if (userInfo.email && !user.email) {
        console.log('📧 更新用户邮箱信息:', userInfo.email);
        await db.collection('users')
          .doc(user._id)
          .update({
            email: userInfo.email,
            updatedAt: new Date()
          });
        user.email = userInfo.email;
      }
      
      console.log('✅ 用户已存在，返回信息:', user.uid);
      return {
        code: 0,
        data: {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email || '', // 确保返回邮箱字段
          avatar: user.avatar,
          level: user.level,
          totalWords: user.totalWords,
          studiedWords: user.studiedWords,
          correctRate: user.correctRate,
          streakDays: user.streakDays,
          lastStudyDate: user.lastStudyDate,
          // 权限相关字段
          role: user.role || 'user',
          permissions: user.permissions || ['basic_learning'],
          isNewUser: false
        }
      };
    } else {
      // 用户不存在，创建新用户
      console.log('🆕 用户不存在，开始创建:', userId);
      const createResult = await createUserInfo(userId, userInfo);
      
      if (createResult.success) {
        console.log('✅ 用户创建成功:', createResult.data.uid);
        // 为新用户添加标记
        createResult.data.isNewUser = true;
      } else {
        console.error('❌ 用户创建失败:', createResult.error);
      }
      
      return createResult;
    }
  } catch (error) {
    console.error('❌ 获取或创建用户信息失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    return {
      code: -1,
      error: '获取或创建用户信息失败：' + error.message
    };
  }
}

// 更新用户信息
async function updateUserInfo(userId, userInfo) {
  try {
    if (!userInfo || Object.keys(userInfo).length === 0) {
      return {
        code: -1,
        error: '更新信息不能为空'
      };
    }

    // 查找用户
    const userResult = await db.collection('users')
      .where({ uid: userId })
      .get();

    if (userResult.data.length === 0) {
      // 用户不存在，先创建
      return await createUserInfo(userId, userInfo);
    }

    const user = userResult.data[0];
    
    // 准备更新数据
    const updateData = {
      ...userInfo,
      updatedAt: new Date()
    };

    // 移除不允许更新的字段
    delete updateData.uid;
    delete updateData._id;
    delete updateData.createdAt;

    // 更新用户信息
    const result = await db.collection('users')
      .doc(user._id)
      .update(updateData);

    if (result.stats.updated > 0) {
      // 返回更新后的用户信息
      const updatedUser = await db.collection('users')
        .doc(user._id)
        .get();
        
      return {
        code: 0,
        data: updatedUser.data[0]
      };
    } else {
      return {
        code: -1,
        error: '更新失败'
      };
    }
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return {
      code: -1,
      error: '更新用户信息失败：' + error.message
    };
  }
}

// 根据标识符更新用户信息
async function updateUserInfoByIdentifier(identifier, userInfo, type = 'email') {
  try {
    if (!userInfo || Object.keys(userInfo).length === 0) {
      return {
        code: -1,
        error: '更新信息不能为空'
      };
    }

    // 根据类型查找用户
    const queryField = type === 'username' ? 'username' : 'email';
    const userResult = await db.collection('users')
      .where({ [queryField]: identifier })
      .get();

    if (userResult.data.length === 0) {
      return {
        code: -1,
        error: '用户不存在'
      };
    }

    const user = userResult.data[0];
    
    // 准备更新数据
    const updateData = {
      ...userInfo,
      updatedAt: new Date()
    };

    // 移除不允许更新的字段
    delete updateData.uid;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.email;
    delete updateData.username;

    // 更新用户信息
    const result = await db.collection('users')
      .doc(user._id)
      .update(updateData);

    if (result.stats.updated > 0) {
      // 返回更新后的用户信息
      const updatedUser = await db.collection('users')
        .doc(user._id)
        .get();
        
      return {
        code: 0,
        data: updatedUser.data[0]
      };
    } else {
      return {
        code: -1,
        error: '更新失败'
      };
    }
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return {
      code: -1,
      error: '更新用户信息失败：' + error.message
    };
  }
}



// 使用密钥提升用户权限
async function promoteUserWithKey(userId, adminKey) {
  try {
    if (!adminKey) {
      return {
        code: -1,
        error: '管理员密钥不能为空'
      };
    }

    // 硬编码的超级管理员密钥（实际项目中应该从环境变量获取）
    const SUPER_ADMIN_KEY = 'LEXICON_SUPER_ADMIN_2025';
    
    // 检查是否为超级管理员密钥
    let targetRole = null;
    let keyType = null;
    
    if (adminKey === SUPER_ADMIN_KEY) {
      targetRole = 'super_admin';
      keyType = 'super_admin_key';
    } else {
      // 检查是否为管理员密钥（从数据库查询）
      const keyResult = await db.collection('admin_keys')
        .where({ 
          keyHash: await bcrypt.hash(adminKey, 10),
          isActive: true 
        })
        .get();
        
      if (keyResult.data.length > 0) {
        const keyDoc = keyResult.data[0];
        targetRole = keyDoc.type === 'admin' ? 'admin' : null;
        keyType = 'admin_key';
        
        // 更新密钥使用记录
        await db.collection('admin_keys')
          .doc(keyDoc._id)
          .update({
            usedCount: keyDoc.usedCount + 1,
            lastUsedAt: new Date()
          });
      }
    }
    
    if (!targetRole) {
      return {
        code: -1,
        error: '无效的管理员密钥'
      };
    }

    // 获取用户信息，如果不存在则创建
    const userResult = await db.collection('users')
      .where({ uid: userId })
      .get();

    let user;
    if (userResult.data.length === 0) {
      // 用户不存在，创建新用户
      console.log('用户不存在，创建新用户:', userId);
      const newUserData = {
        uid: userId,
        displayName: '匿名用户',
        avatar: `/user-avatar.png`,
        level: 1,
        totalWords: 0,
        studiedWords: 0,
        correctRate: 0,
        streakDays: 0,
        lastStudyDate: null,
        role: 'user',
        permissions: ['basic_learning'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const createResult = await db.collection('users').add(newUserData);
      if (!createResult.id) {
        return {
          code: -1,
          error: '创建用户失败'
        };
      }
      
      user = { ...newUserData, _id: createResult.id };
    } else {
      user = userResult.data[0];
    }
    
    // 设置权限
    let permissions = [];
    if (targetRole === 'super_admin') {
      permissions = ['basic_learning', 'batch_upload', 'user_management', 'admin_key_generation', 'system_settings'];
    } else if (targetRole === 'admin') {
      permissions = ['basic_learning', 'batch_upload', 'user_view'];
    }

    // 更新用户权限
    console.log('准备更新用户权限，用户ID:', user._id, '目标角色:', targetRole);
    const updateResult = await db.collection('users')
      .doc(user._id)
      .update({
        role: targetRole,
        permissions: permissions,
        adminKeyUsed: keyType,
        promotedBy: targetRole === 'super_admin' ? 'system' : 'admin_key',
        promotedAt: new Date(),
        updatedAt: new Date()
      });
    
    console.log('更新结果:', JSON.stringify(updateResult, null, 2));

    if (updateResult && updateResult.updated > 0) {
      // 记录操作日志
      await db.collection('admin_logs').add({
        data: {
          userId: userId,
          action: 'role_promotion',
          oldRole: user.role || 'user',
          newRole: targetRole,
          keyType: keyType,
          timestamp: new Date()
        }
      });
      
      return {
        code: 0,
        data: {
          message: `成功提升为${targetRole === 'super_admin' ? '超级管理员' : '管理员'}`,
          role: targetRole,
          permissions: permissions
        }
      };
    } else {
      return {
        code: -1,
        error: '权限提升失败'
      };
    }
  } catch (error) {
    console.error('权限提升失败:', error);
    return {
      code: -1,
      error: '权限提升失败：' + error.message
    };
  }
}

// 管理员提升其他用户权限
async function promoteUserByAdmin(adminUserId, targetUserId, newRole) {
  try {
    // 检查操作者权限
    const adminResult = await db.collection('users')
      .where({ uid: adminUserId })
      .get();

    if (adminResult.data.length === 0) {
      return {
        code: -1,
        error: '操作者不存在'
      };
    }

    const admin = adminResult.data[0];
    if (admin.role !== 'super_admin') {
      return {
        code: -1,
        error: '只有超级管理员可以提升其他用户权限'
      };
    }

    // 检查目标用户
    const targetResult = await db.collection('users')
      .where({ uid: targetUserId })
      .get();

    if (targetResult.data.length === 0) {
      return {
        code: -1,
        error: '目标用户不存在'
      };
    }

    const targetUser = targetResult.data[0];
    
    // 设置权限
    let permissions = [];
    if (newRole === 'admin') {
      permissions = ['basic_learning', 'batch_upload', 'user_view'];
    } else if (newRole === 'user') {
      permissions = ['basic_learning'];
    } else {
      return {
        code: -1,
        error: '无效的角色类型'
      };
    }

    // 更新目标用户权限
    const updateResult = await db.collection('users')
      .doc(targetUser._id)
      .update({
        role: newRole,
        permissions: permissions,
        promotedBy: adminUserId,
        promotedAt: new Date(),
        updatedAt: new Date()
      });

    if (updateResult && updateResult.updated > 0) {
      // 记录操作日志
      await db.collection('admin_logs').add({
        data: {
          adminId: adminUserId,
          targetUserId: targetUserId,
          action: 'role_change',
          oldRole: targetUser.role || 'user',
          newRole: newRole,
          timestamp: new Date()
        }
      });
      
      return {
        code: 0,
        data: {
          message: `成功将用户权限修改为${newRole === 'admin' ? '管理员' : '普通用户'}`,
          targetUser: {
            uid: targetUser.uid,
            displayName: targetUser.displayName,
            role: newRole,
            permissions: permissions
          }
        }
      };
    } else {
      return {
        code: -1,
        error: '权限修改失败'
      };
    }
  } catch (error) {
    console.error('权限修改失败:', error);
    return {
      code: -1,
      error: '权限修改失败：' + error.message
    };
  }
}

// 获取用户列表（管理员功能）
async function listUsers(adminUserId) {
  try {
    // 检查操作者权限
    const adminResult = await db.collection('users')
      .where({ uid: adminUserId })
      .get();

    if (adminResult.data.length === 0) {
      return {
        code: -1,
        error: '操作者不存在'
      };
    }

    const admin = adminResult.data[0];
    if (!admin.role || !['admin', 'super_admin'].includes(admin.role)) {
      return {
        code: -1,
        error: '权限不足，需要管理员权限'
      };
    }

    // 获取用户列表
    const usersResult = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const users = usersResult.data.map(user => ({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email || '',
      username: user.username || '',
      avatar: user.avatar,
      role: user.role || 'user',
      permissions: user.permissions || ['basic_learning'],
      level: user.level,
      totalWords: user.totalWords,
      studiedWords: user.studiedWords,
      createdAt: user.createdAt,
      lastStudyDate: user.lastStudyDate,
      promotedBy: user.promotedBy,
      promotedAt: user.promotedAt
    }));

    return {
      code: 0,
      data: {
        users: users,
        total: users.length
      }
    };
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return {
      code: -1,
      error: '获取用户列表失败：' + error.message
    };
  }
}

// 获取用户ID映射
async function getUserMapping(cloudbaseUserId) {
  try {
    if (!cloudbaseUserId) {
      return {
        code: -1,
        error: 'CloudBase用户ID不能为空'
      };
    }

    // 查询映射关系
    const mappingResult = await db.collection('user_id_mapping')
      .where({ cloudbase_uid: cloudbaseUserId })
      .get();

    if (mappingResult.data.length === 0) {
      return {
        code: -1,
        error: '未找到用户ID映射关系'
      };
    }

    const mapping = mappingResult.data[0];
    return {
      code: 0,
      data: {
        cloudbaseUserId: mapping.cloudbase_uid,
        appUserId: mapping.app_uid,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt
      }
    };
  } catch (error) {
    console.error('获取用户ID映射失败:', error);
    return {
      code: -1,
      error: '获取用户ID映射失败：' + error.message
    };
  }
}

// 建立用户ID映射
async function establishMapping(cloudbaseUserId, appUserId) {
  try {
    if (!cloudbaseUserId || !appUserId) {
      return {
        code: -1,
        error: 'CloudBase用户ID和应用用户ID都不能为空'
      };
    }

    // 检查是否已存在映射关系
    const existingMapping = await db.collection('user_id_mapping')
      .where({ cloudbase_uid: cloudbaseUserId })
      .get();

    if (existingMapping.data.length > 0) {
      // 映射已存在，检查是否需要更新
      const existing = existingMapping.data[0];
      if (existing.app_uid === appUserId) {
        return {
          code: 0,
          data: {
            message: '用户ID映射已存在',
            cloudbaseUserId: existing.cloudbase_uid,
            appUserId: existing.app_uid
          }
        };
      } else {
        // 更新映射关系
        const updateResult = await db.collection('user_id_mapping')
          .doc(existing._id)
          .update({
            app_uid: appUserId,
            updatedAt: new Date()
          });

        if (updateResult.updated > 0) {
          return {
            code: 0,
            data: {
              message: '用户ID映射已更新',
              cloudbaseUserId: cloudbaseUserId,
              appUserId: appUserId
            }
          };
        } else {
          return {
            code: -1,
            error: '更新用户ID映射失败'
          };
        }
      }
    } else {
      // 创建新的映射关系
      const mappingData = {
        cloudbase_uid: cloudbaseUserId,
        app_uid: appUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('user_id_mapping').add(mappingData);

      if (result.id) {
        console.log('用户ID映射创建成功:', { cloudbaseUserId, appUserId });
        return {
          code: 0,
          data: {
            message: '用户ID映射创建成功',
            cloudbaseUserId: cloudbaseUserId,
            appUserId: appUserId,
            mappingId: result.id
          }
        };
      } else {
        return {
          code: -1,
          error: '创建用户ID映射失败'
        };
      }
    }
  } catch (error) {
    console.error('建立用户ID映射失败:', error);
    return {
      code: -1,
      error: '建立用户ID映射失败：' + error.message
    };
  }
}