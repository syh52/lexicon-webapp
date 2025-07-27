const cloudbase = require('@cloudbase/node-sdk');
const bcrypt = require('bcryptjs');

// 初始化 CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  const { action, userId, userInfo, displayName, email, password, type, adminKey, targetUserId, newRole } = event;
  const { userRecord } = context;
  
  // 获取当前用户ID - CloudBase v2 Web应用认证
  const currentUserId = userId || context.userInfo?.uid;
  
  if (!currentUserId && !['get', 'register', 'login'].includes(action)) {
    return {
      success: false,
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
      
      case 'register':
        // 用户注册（独立注册流程）
        return await registerUser(email, password, displayName, type);
      
      case 'login':
        // 用户登录验证
        return await loginUser(email, password);
      
      case 'promoteWithKey':
        // 使用密钥提升用户权限
        return await promoteUserWithKey(currentUserId, adminKey);
      
      case 'promoteUser':
        // 管理员提升其他用户权限
        return await promoteUserByAdmin(currentUserId, targetUserId, newRole);
      
      case 'listUsers':
        // 获取用户列表（管理员功能）
        return await listUsers(currentUserId);
        
      default:
        return {
          success: false,
          error: '未知操作类型'
        };
    }
  } catch (error) {
    console.error('UserInfo function error:', error);
    return {
      success: false,
      error: error.message || '服务器内部错误'
    };
  }
};

// 获取用户信息
async function getUserInfo(userId) {
  try {
    const userResult = await db.collection('users')
      .where({ uid: userId })
      .get();

    if (userResult.data.length === 0) {
      // 用户信息不存在，返回默认信息
      return {
        success: true,
        data: {
          uid: userId,
          displayName: '新用户',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
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
    return {
      success: true,
      data: {
        uid: user.uid,
        displayName: user.displayName,
        avatar: user.avatar,
        level: user.level,
        totalWords: user.totalWords,
        studiedWords: user.studiedWords,
        correctRate: user.correctRate,
        streakDays: user.streakDays,
        lastStudyDate: user.lastStudyDate,
        isNewUser: false
      }
    };
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return {
      success: false,
      error: '获取用户信息失败：' + error.message
    };
  }
}

// 创建用户信息
async function createUserInfo(userId, userInfo = {}) {
  try {
    // 检查用户是否已存在
    const existingUser = await db.collection('users')
      .where({ uid: userId })
      .get();

    if (existingUser.data.length > 0) {
      return {
        success: false,
        error: '用户信息已存在'
      };
    }

    // 创建新用户信息
    const userData = {
      uid: userId,
      displayName: userInfo.displayName || '新用户',
      avatar: userInfo.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
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

    const result = await db.collection('users').add(userData);

    if (result.id) {
      return {
        success: true,
        data: {
          ...userData,
          _id: result.id
        }
      };
    } else {
      console.error('插入失败，无id返回:', result);
      return {
        success: false,
        error: '创建用户信息失败：无法获取插入ID'
      };
    }
  } catch (error) {
    console.error('创建用户信息失败:', error);
    return {
      success: false,
      error: '创建用户信息失败：' + error.message
    };
  }
}

// 获取或创建用户信息
async function getOrCreateUserInfo(userId, userInfo = {}) {
  try {
    // 先尝试获取用户信息
    const userResult = await db.collection('users')
      .where({ uid: userId })
      .get();

    if (userResult.data.length > 0) {
      // 用户存在，返回用户信息
      const user = userResult.data[0];
      return {
        success: true,
        data: {
          uid: user.uid,
          displayName: user.displayName,
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
      return await createUserInfo(userId, userInfo);
    }
  } catch (error) {
    console.error('获取或创建用户信息失败:', error);
    return {
      success: false,
      error: '获取或创建用户信息失败：' + error.message
    };
  }
}

// 更新用户信息
async function updateUserInfo(userId, userInfo) {
  try {
    if (!userInfo || Object.keys(userInfo).length === 0) {
      return {
        success: false,
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
      .update({
        data: updateData
      });

    if (result.stats.updated > 0) {
      // 返回更新后的用户信息
      const updatedUser = await db.collection('users')
        .doc(user._id)
        .get();
        
      return {
        success: true,
        data: updatedUser.data[0]
      };
    } else {
      return {
        success: false,
        error: '更新失败'
      };
    }
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return {
      success: false,
      error: '更新用户信息失败：' + error.message
    };
  }
}

// 根据标识符更新用户信息
async function updateUserInfoByIdentifier(identifier, userInfo, type = 'email') {
  try {
    if (!userInfo || Object.keys(userInfo).length === 0) {
      return {
        success: false,
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
        success: false,
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
      .update({
        data: updateData
      });

    if (result.stats.updated > 0) {
      // 返回更新后的用户信息
      const updatedUser = await db.collection('users')
        .doc(user._id)
        .get();
        
      return {
        success: true,
        data: updatedUser.data[0]
      };
    } else {
      return {
        success: false,
        error: '更新失败'
      };
    }
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return {
      success: false,
      error: '更新用户信息失败：' + error.message
    };
  }
}

// 用户登录验证
async function loginUser(identifier, password) {
  try {
    if (!identifier || !password) {
      return {
        success: false,
        error: '用户名和密码不能为空'
      };
    }

    // 判断是邮箱还是用户名
    const isEmail = identifier.includes('@');
    const queryField = isEmail ? 'email' : 'username';

    // 查找用户
    const userResult = await db.collection('users')
      .where({ [queryField]: identifier })
      .get();

    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      };
    }

    const user = userResult.data[0];

    // 验证密码（使用bcrypt验证加密密码）
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        error: '密码错误'
      };
    }

    // 登录成功，返回用户信息
    return {
      success: true,
      data: {
        uid: user.uid,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        level: user.level,
        totalWords: user.totalWords,
        studiedWords: user.studiedWords,
        correctRate: user.correctRate,
        streakDays: user.streakDays,
        lastStudyDate: user.lastStudyDate,
        // 权限相关字段
        role: user.role || 'user',
        permissions: user.permissions || ['basic_learning']
      }
    };
  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      error: '登录失败：' + error.message
    };
  }
}

// 用户注册
async function registerUser(identifier, password, displayName, type = 'email') {
  try {
    if (!identifier || !password) {
      return {
        success: false,
        error: '用户名和密码不能为空'
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: '密码长度至少6位'
      };
    }

    // 验证用户名格式（如果是用户名类型）
    if (type === 'username') {
      const usernameRegex = /^[a-zA-Z0-9_]{2,20}$/;
      if (!usernameRegex.test(identifier)) {
        return {
          success: false,
          error: '用户名只能包含字母、数字、下划线，长度2-20位'
        };
      }
    } else {
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        return {
          success: false,
          error: '邮箱格式不正确'
        };
      }
    }

    // 检查用户是否已存在
    const queryField = type === 'username' ? 'username' : 'email';
    const existingUser = await db.collection('users')
      .where({ [queryField]: identifier })
      .get();

    if (existingUser.data.length > 0) {
      return {
        success: false,
        error: type === 'username' ? '用户名已存在' : '邮箱已注册'
      };
    }

    // 生成用户ID
    const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // 加密密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建用户数据
    const userData = {
      uid: uid,
      [queryField]: identifier,
      password: hashedPassword, // 使用bcrypt加密存储密码
      displayName: displayName || (type === 'username' ? identifier : identifier.split('@')[0]),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${identifier}`,
      level: 1,
      totalWords: 0,
      studiedWords: 0,
      correctRate: 0,
      streakDays: 0,
      lastStudyDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 如果是邮箱注册，也要设置username字段为空或默认值
    if (type === 'email') {
      userData.username = identifier.split('@')[0]; // 使用邮箱前缀作为用户名
    } else {
      userData.email = ''; // 如果是用户名注册，邮箱字段为空
    }

    console.log('准备写入数据库，用户数据:', JSON.stringify(userData, null, 2));
    
    const result = await db.collection('users').add(userData);

    console.log('数据库写入结果:', JSON.stringify(result, null, 2));

    if (result.id) {
      console.log('注册成功，用户ID:', result.id);
      return {
        success: true,
        data: {
          uid: userData.uid,
          username: userData.username,
          displayName: userData.displayName,
          avatar: userData.avatar,
          level: userData.level,
          totalWords: userData.totalWords,
          studiedWords: userData.studiedWords,
          correctRate: userData.correctRate,
          streakDays: userData.streakDays,
          lastStudyDate: userData.lastStudyDate,
          // 权限相关字段
          role: userData.role,
          permissions: userData.permissions
        }
      };
    } else {
      console.error('注册失败，无插入ID');
      return {
        success: false,
        error: '注册失败'
      };
    }
  } catch (error) {
    console.error('注册失败:', error);
    return {
      success: false,
      error: '注册失败：' + error.message
    };
  }
}

// 使用密钥提升用户权限
async function promoteUserWithKey(userId, adminKey) {
  try {
    if (!adminKey) {
      return {
        success: false,
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
            data: {
              usedCount: keyDoc.usedCount + 1,
              lastUsedAt: new Date()
            }
          });
      }
    }
    
    if (!targetRole) {
      return {
        success: false,
        error: '无效的管理员密钥'
      };
    }

    // 获取用户信息
    const userResult = await db.collection('users')
      .where({ uid: userId })
      .get();

    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      };
    }

    const user = userResult.data[0];
    
    // 设置权限
    let permissions = [];
    if (targetRole === 'super_admin') {
      permissions = ['basic_learning', 'batch_upload', 'user_management', 'admin_key_generation', 'system_settings'];
    } else if (targetRole === 'admin') {
      permissions = ['basic_learning', 'batch_upload', 'user_view'];
    }

    // 更新用户权限
    const updateResult = await db.collection('users')
      .doc(user._id)
      .update({
        data: {
          role: targetRole,
          permissions: permissions,
          adminKeyUsed: keyType,
          promotedBy: targetRole === 'super_admin' ? 'system' : 'admin_key',
          promotedAt: new Date(),
          updatedAt: new Date()
        }
      });

    if (updateResult.stats.updated > 0) {
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
        success: true,
        data: {
          message: `成功提升为${targetRole === 'super_admin' ? '超级管理员' : '管理员'}`,
          role: targetRole,
          permissions: permissions
        }
      };
    } else {
      return {
        success: false,
        error: '权限提升失败'
      };
    }
  } catch (error) {
    console.error('权限提升失败:', error);
    return {
      success: false,
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
        success: false,
        error: '操作者不存在'
      };
    }

    const admin = adminResult.data[0];
    if (admin.role !== 'super_admin') {
      return {
        success: false,
        error: '只有超级管理员可以提升其他用户权限'
      };
    }

    // 检查目标用户
    const targetResult = await db.collection('users')
      .where({ uid: targetUserId })
      .get();

    if (targetResult.data.length === 0) {
      return {
        success: false,
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
        success: false,
        error: '无效的角色类型'
      };
    }

    // 更新目标用户权限
    const updateResult = await db.collection('users')
      .doc(targetUser._id)
      .update({
        data: {
          role: newRole,
          permissions: permissions,
          promotedBy: adminUserId,
          promotedAt: new Date(),
          updatedAt: new Date()
        }
      });

    if (updateResult.stats.updated > 0) {
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
        success: true,
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
        success: false,
        error: '权限修改失败'
      };
    }
  } catch (error) {
    console.error('权限修改失败:', error);
    return {
      success: false,
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
        success: false,
        error: '操作者不存在'
      };
    }

    const admin = adminResult.data[0];
    if (!admin.role || !['admin', 'super_admin'].includes(admin.role)) {
      return {
        success: false,
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
      success: true,
      data: {
        users: users,
        total: users.length
      }
    };
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return {
      success: false,
      error: '获取用户列表失败：' + error.message
    };
  }
}