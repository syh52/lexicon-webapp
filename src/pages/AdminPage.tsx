import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RequireAdmin } from '../components/auth/RequireAdmin';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { getApp, ensureLogin } from '../utils/cloudbase';
import { 
  Users, 
  Key, 
  ShieldCheck, 
  BarChart3, 
  Settings, 
  Crown, 
  Lock,
  Unlock,
  Activity,
  UserCheck,
  Sparkles,
  ArrowUp,
  Eye,
  EyeOff,
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { BACKGROUNDS, TEXT_COLORS } from '../constants/design';

interface AdminKey {
  keyId: string;
  type: string;
  description: string;
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  lastUsedAt?: string;
  isExpired: boolean;
  isExhausted: boolean;
}

interface AdminStats {
  total: number;
  active: number;
  expired: number;
  exhausted: number;
  totalUses: number;
  recentActivity: number;
}

const AdminPage: React.FC = () => {
  const { user, isSuperAdmin, isAdmin, promoteWithKey } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'keys' | 'promote' | 'migration'>('dashboard');
  const [loading, setLoading] = useState(false);
  
  // 权限提升相关状态
  const [adminKey, setAdminKey] = useState('');
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteMessage, setPromoteMessage] = useState('');
  const [showKey, setShowKey] = useState(false);
  
  // 密钥管理相关状态
  const [adminKeys, setAdminKeys] = useState<AdminKey[]>([]);
  const [keyStats, setKeyStats] = useState<AdminStats | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{
    type: string;
    maxUses: number;
    expiresInDays: number;
  }>({
    type: 'admin',
    maxUses: 10,
    expiresInDays: 30
  });
  const [generatedKey, setGeneratedKey] = useState<string>('');
  
  // 用户管理相关状态
  const [users, setUsers] = useState<any[]>([]);
  
  // 数据迁移相关状态
  const [migrationData, setMigrationData] = useState<any>(null);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationResults, setMigrationResults] = useState<any>(null);

  // 加载数据
  useEffect(() => {
    if (activeTab === 'keys' && isSuperAdmin) {
      loadAdminKeys();
      loadKeyStats();
    } else if (activeTab === 'users' && isSuperAdmin) {
      loadUsers();
    } else if (activeTab === 'migration' && isSuperAdmin) {
      analyzeMigrationData();
    }
  }, [activeTab, isSuperAdmin]);

  // 加载密钥列表
  const loadAdminKeys = async () => {
    try {
      setLoading(true);
      await ensureLogin();
      const app = await getApp();
      
      const result = await app.callFunction({
        name: 'admin-management',
        data: { 
          action: 'listKeys',
          adminUserId: user?.uid  // 传递真实的用户ID
        }
      });
      
      if (result.result?.success) {
        setAdminKeys(result.result.data.keys);
      }
    } catch (error) {
      console.error('加载密钥列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载密钥统计
  const loadKeyStats = async () => {
    try {
      await ensureLogin();
      const app = await getApp();
      
      const result = await app.callFunction({
        name: 'admin-management',
        data: { 
          action: 'getKeyStats',
          adminUserId: user?.uid  // 传递真实的用户ID
        }
      });
      
      if (result.result?.success) {
        setKeyStats(result.result.data.stats);
      }
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  // 加载用户列表
  const loadUsers = async () => {
    try {
      setLoading(true);
      await ensureLogin();
      const app = await getApp();
      
      const result = await app.callFunction({
        name: 'userInfo',
        data: { 
          action: 'listUsers',
          userId: user?.uid  // 传递真实的用户ID
        }
      });
      
      if (result.result?.success) {
        setUsers(result.result.data.users);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 分析迁移数据
  const analyzeMigrationData = async () => {
    try {
      setMigrationLoading(true);
      await ensureLogin();
      const app = await getApp();
      
      const result = await app.callFunction({
        name: 'user-data-migration',
        data: { 
          action: 'analyzeData',
          dryRun: true
        }
      });
      
      if (result.result?.success) {
        setMigrationData(result.result.data);
      } else {
        throw new Error(result.result?.error || '分析数据失败');
      }
    } catch (error) {
      console.error('分析迁移数据失败:', error);
      setMigrationData({ error: error.message });
    } finally {
      setMigrationLoading(false);
    }
  };

  // 执行数据迁移
  const executeMigration = async (action: string, dryRun: boolean = true) => {
    try {
      setMigrationLoading(true);
      await ensureLogin();
      const app = await getApp();
      
      const result = await app.callFunction({
        name: 'user-data-migration',
        data: { 
          action,
          dryRun,
          batchSize: 50
        }
      });
      
      if (result.result?.success) {
        setMigrationResults(result.result);
        // 重新分析数据以更新状态
        if (!dryRun) {
          setTimeout(() => {
            analyzeMigrationData();
          }, 1000);
        }
      } else {
        throw new Error(result.result?.error || '迁移失败');
      }
    } catch (error) {
      console.error('执行迁移失败:', error);
      setMigrationResults({ error: error.message });
    } finally {
      setMigrationLoading(false);
    }
  };

  // 生成管理员密钥
  const generateAdminKey = async () => {
    try {
      setLoading(true);
      await ensureLogin();
      const app = await getApp();
      
      const result = await app.callFunction({
        name: 'admin-management',
        data: { 
          action: 'generateKey',
          adminUserId: user?.uid,  // 传递真实的用户ID
          keyType: newKeyData.type,
          maxUses: newKeyData.maxUses,
          expiresInDays: newKeyData.expiresInDays
        }
      });
      
      if (result.result?.success) {
        setGeneratedKey(result.result.data.plainKey);
        await loadAdminKeys();
        await loadKeyStats();
      } else {
        alert('生成密钥失败：' + result.result?.error);
      }
    } catch (error) {
      console.error('生成密钥失败:', error);
      alert('生成密钥失败');
    } finally {
      setLoading(false);
    }
  };

  // 停用密钥
  const deactivateKey = async (keyId: string) => {
    if (!confirm('确定要停用此密钥吗？此操作不可撤销。')) return;
    
    try {
      await ensureLogin();
      const app = await getApp();
      
      const result = await app.callFunction({
        name: 'admin-management',
        data: { 
          action: 'deactivateKey',
          adminUserId: user?.uid,  // 传递真实的用户ID
          keyId: keyId
        }
      });
      
      if (result.result?.success) {
        await loadAdminKeys();
        await loadKeyStats();
      } else {
        alert('停用密钥失败：' + result.result?.error);
      }
    } catch (error) {
      console.error('停用密钥失败:', error);
      alert('停用密钥失败');
    }
  };

  // 处理权限提升
  const handlePromoteWithKey = async () => {
    if (!adminKey.trim()) {
      setPromoteMessage('请输入管理员密钥');
      return;
    }

    try {
      setPromoteLoading(true);
      setPromoteMessage('');
      
      await promoteWithKey(adminKey);
      setPromoteMessage('权限提升成功！页面将在3秒后刷新...');
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error: any) {
      setPromoteMessage('权限提升失败：' + error.message);
    } finally {
      setPromoteLoading(false);
    }
  };

  // 获取权限中文名称
  const getPermissionName = (permission: string) => {
    const names: Record<string, string> = {
      'basic_learning': '基础学习',
      'batch_upload': '批量上传',
      'user_management': '用户管理',
      'admin_key_generation': '密钥生成',
      'system_settings': '系统设置'
    };
    return names[permission] || permission;
  };

  // 获取角色标识
  const getRoleInfo = () => {
    if (user?.role === 'super_admin') {
      return {
        name: '超级管理员',
        icon: Crown,
        color: 'from-purple-500 to-blue-500',
        badgeColor: 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300'
      };
    } else if (user?.role === 'admin') {
      return {
        name: '管理员',
        icon: ShieldCheck,
        color: 'from-orange-500 to-yellow-500',
        badgeColor: 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 text-orange-300'
      };
    }
    return {
      name: '普通用户',
      icon: UserCheck,
      color: 'from-gray-500 to-gray-600',
      badgeColor: 'bg-gray-500/20 text-gray-300'
    };
  };

  // 渲染导航标签
  const renderTabs = () => {
    const roleInfo = getRoleInfo();
    const tabs = [
      { id: 'dashboard', name: '概览', icon: BarChart3 },
      // 只有非超级管理员才显示权限提升选项卡
      ...(!isSuperAdmin ? [{ id: 'promote', name: '权限提升', icon: ArrowUp }] : []),
      ...(isSuperAdmin ? [
        { id: 'users', name: '用户管理', icon: Users },
        { id: 'keys', name: '密钥管理', icon: Key },
        { id: 'migration', name: '数据迁移', icon: Database }
      ] : [])
    ];

    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-1 mb-8">
        <nav className="flex space-x-1" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                role="tab"
                aria-selected={isActive}
                aria-label={`切换到${tab.name}标签`}
                className={`
                  flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-150
                  ${isActive 
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  };

  // 渲染概览页面
  const renderDashboard = () => {
    const roleInfo = getRoleInfo();
    const RoleIcon = roleInfo.icon;

    return (
      <div className="space-y-8">
        {/* 用户角色卡片 */}
        <div className={`bg-gradient-to-r ${roleInfo.color} p-6 rounded-xl text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <RoleIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  欢迎回来，{user?.displayName || '管理员'}
                </h2>
                <p className="text-white/80 text-sm">
                  当前角色：{roleInfo.name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold">
                {user?.permissions?.length || 0}
              </div>
              <div className="text-white/80 text-sm">可用权限</div>
            </div>
          </div>
        </div>

        {/* 统计卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">当前权限</p>
                <p className="text-2xl font-semibold text-white mt-1">
                  {user?.permissions?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          {keyStats && (
            <>
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">活跃密钥</p>
                    <p className="text-2xl font-semibold text-white mt-1">
                      {keyStats.active}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Key className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">总使用次数</p>
                    <p className="text-2xl font-semibold text-white mt-1">
                      {keyStats.totalUses}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 权限详情卡片 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-3 mb-6">
            <Settings className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-white tracking-tight">权限详情</h3>
          </div>
          
          {user?.permissions?.length ? (
            <div className="flex flex-wrap gap-3">
              {user.permissions.map((permission, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border border-purple-500/30"
                >
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  {getPermissionName(permission)}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">暂无可用权限</p>
              <p className="text-gray-500 text-sm mt-1">请联系超级管理员获取权限</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染权限提升页面
  const renderPromotePage = () => (
    <div className="max-w-md mx-auto">
      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700/50">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ArrowUp className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white tracking-tight mb-2">权限提升</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            输入管理员密钥来提升您的账户权限，获得更多系统功能访问权。
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              placeholder="请输入管理员密钥"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              disabled={promoteLoading}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 pr-12 focus:ring-purple-500 focus:border-purple-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
              aria-label={showKey ? "隐藏密钥" : "显示密钥"}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          <Button
            onClick={handlePromoteWithKey}
            disabled={promoteLoading || !adminKey.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium py-2.5 transition-all duration-150 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {promoteLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>提升中...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Unlock className="w-4 h-4" />
                <span>提升权限</span>
              </div>
            )}
          </Button>
          
          {promoteMessage && (
            <div className={`p-4 rounded-lg text-sm ${
              promoteMessage.includes('成功') 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              <div className="flex items-center space-x-2">
                {promoteMessage.includes('成功') ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>{promoteMessage}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 如果用户不是管理员，只显示权限提升页面
  if (!isAdmin) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-semibold text-white tracking-tight mb-3">
              权限提升
            </h1>
            <p className="text-gray-400 leading-relaxed max-w-md mx-auto">
              使用管理员密钥来获取系统管理权限，解锁更多功能
            </p>
          </div>

          {renderPromotePage()}
        </div>
      </div>
    );
  }

  // 管理员用户显示完整的管理面板
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-white tracking-tight">
                管理控制台
              </h1>
              <p className="text-gray-400 leading-relaxed">
                系统管理、用户权限与配置中心
              </p>
            </div>
          </div>
        </div>

        {renderTabs()}

        <main className="space-y-8">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'promote' && renderPromotePage()}
          
          {/* 用户管理页面 */}
          {activeTab === 'users' && (
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700/50">
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">用户管理</h3>
                <p className="text-gray-400">用户管理功能正在开发中...</p>
              </div>
            </div>
          )}
          
          {/* 密钥管理页面 */}
          {activeTab === 'keys' && (
            <div className="space-y-6">
              {/* 密钥统计卡片 */}
              {keyStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">总密钥数</p>
                        <p className="text-2xl font-semibold text-white mt-1">{keyStats.total}</p>
                      </div>
                      <Key className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">活跃密钥</p>
                        <p className="text-2xl font-semibold text-white mt-1">{keyStats.active}</p>
                      </div>
                      <Activity className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">已过期</p>
                        <p className="text-2xl font-semibold text-white mt-1">{keyStats.expired}</p>
                      </div>
                      <Lock className="w-8 h-8 text-red-400" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">总使用次数</p>
                        <p className="text-2xl font-semibold text-white mt-1">{keyStats.totalUses}</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-purple-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-white">管理员密钥列表</h2>
                <Button
                  onClick={() => setShowKeyModal(true)}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                >
                  <Key className="w-4 h-4 mr-2" />
                  生成新密钥
                </Button>
              </div>

              {/* 密钥列表 */}
              <div className="bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                  </div>
                ) : adminKeys.length === 0 ? (
                  <div className="text-center py-12">
                    <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">暂无密钥</h3>
                    <p className="text-gray-400">点击上方按钮生成第一个管理员密钥</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">密钥ID</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">类型</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">描述</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">使用情况</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">过期时间</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">状态</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {adminKeys.map((key) => (
                          <tr key={key.keyId} className="hover:bg-gray-700/30">
                            <td className="px-6 py-4 text-sm text-gray-300 font-mono">
                              {key.keyId.slice(0, 8)}...
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-300">
                              <Badge variant={key.type === 'admin' ? 'success' : 'default'}>
                                {key.type === 'admin' ? '管理员' : key.type}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-300">
                              {key.description}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-300">
                              {key.usedCount}/{key.maxUses}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-300">
                              {new Date(key.expiresAt).toLocaleDateString('zh-CN')}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {key.isExpired ? (
                                <Badge variant="danger">已过期</Badge>
                              ) : key.isExhausted ? (
                                <Badge variant="warning">已用完</Badge>
                              ) : key.isActive ? (
                                <Badge variant="success">活跃</Badge>
                              ) : (
                                <Badge variant="default">已停用</Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {key.isActive && !key.isExpired && !key.isExhausted && (
                                <Button
                                  onClick={() => deactivateKey(key.keyId)}
                                  variant="danger"
                                  size="sm"
                                  className="text-xs"
                                >
                                  停用
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 数据迁移页面 */}
          {activeTab === 'migration' && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">用户ID映射数据迁移</h2>
                    <p className="text-gray-400 mt-1">修复用户ID映射问题，确保数据一致性</p>
                  </div>
                  <Button
                    onClick={analyzeMigrationData}
                    disabled={migrationLoading}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                  >
                    {migrationLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    重新分析
                  </Button>
                </div>

                {/* 数据分析结果 */}
                {migrationData && !migrationData.error && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">用户总数</p>
                          <p className="text-xl font-semibold text-white">{migrationData.users.total}</p>
                        </div>
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                    
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">学习记录</p>
                          <p className="text-xl font-semibold text-white">{migrationData.learningRecords.total}</p>
                        </div>
                        <Database className="w-6 h-6 text-green-400" />
                      </div>
                    </div>
                    
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">ID映射</p>
                          <p className="text-xl font-semibold text-white">{migrationData.mappingStatus.total}</p>
                        </div>
                        <CheckCircle className="w-6 h-6 text-purple-400" />
                      </div>
                    </div>
                  </div>
                )}

                {/* 数据不一致性警告 */}
                {migrationData && migrationData.inconsistencies && migrationData.inconsistencies.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center mb-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                      <h3 className="text-red-400 font-medium">发现 {migrationData.inconsistencies.length} 个数据不一致问题</h3>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {migrationData.inconsistencies.slice(0, 5).map((issue, index) => (
                        <div key={index} className="text-sm text-red-300">
                          <span className="font-medium">{issue.type}:</span> {issue.description}
                        </div>
                      ))}
                      {migrationData.inconsistencies.length > 5 && (
                        <div className="text-sm text-red-400">...还有 {migrationData.inconsistencies.length - 5} 个问题</div>
                      )}
                    </div>
                  </div>
                )}

                {/* 迁移操作按钮 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => executeMigration('buildMappings', true)}
                    disabled={migrationLoading}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    模拟建立映射
                  </Button>
                  
                  <Button
                    onClick={() => executeMigration('buildMappings', false)}
                    disabled={migrationLoading}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    执行映射创建
                  </Button>
                  
                  <Button
                    onClick={() => executeMigration('verifyMigration')}
                    disabled={migrationLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    验证迁移结果
                  </Button>
                </div>

                {/* 迁移结果 */}
                {migrationResults && (
                  <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
                    <h4 className="text-white font-medium mb-3">迁移结果</h4>
                    {migrationResults.error ? (
                      <div className="text-red-400">
                        错误: {migrationResults.error}
                      </div>
                    ) : (
                      <div className="text-green-400">
                        <div>{migrationResults.message}</div>
                        {migrationResults.data && (
                          <pre className="mt-2 text-xs text-gray-300 bg-gray-800 p-2 rounded overflow-auto max-h-40">
                            {JSON.stringify(migrationResults.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 错误信息 */}
                {migrationData && migrationData.error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                      <div className="text-red-400">
                        分析失败: {migrationData.error}
                      </div>
                    </div>
                  </div>
                )}

                {/* 加载状态 */}
                {migrationLoading && !migrationData && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-400">正在分析数据...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* 生成密钥模态框 */}
        <Modal open={showKeyModal} onOpenChange={(open) => setShowKeyModal(open)}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">生成管理员密钥</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  密钥类型
                </label>
                <select
                  value={newKeyData.type}
                  onChange={(e) => setNewKeyData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="admin">管理员密钥</option>
                  <option value="super_admin">超级管理员密钥</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  最大使用次数
                </label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={newKeyData.maxUses}
                  onChange={(e) => setNewKeyData(prev => ({ ...prev, maxUses: parseInt(e.target.value) || 1 }))}
                  className="bg-gray-700 border-gray-600 text-white focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  有效期（天）
                </label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={newKeyData.expiresInDays}
                  onChange={(e) => setNewKeyData(prev => ({ ...prev, expiresInDays: parseInt(e.target.value) || 30 }))}
                  className="bg-gray-700 border-gray-600 text-white focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={() => setShowKeyModal(false)}
                variant="outline"
                disabled={loading}
              >
                取消
              </Button>
              <Button
                onClick={generateAdminKey}
                disabled={loading}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                {loading ? '生成中...' : '生成密钥'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* 显示生成的密钥模态框 */}
        <Modal open={!!generatedKey} onOpenChange={(open) => !open && setGeneratedKey('')}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">密钥生成成功</h3>
            
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-300 mb-2">请复制并保存以下密钥，关闭后将无法再次查看：</p>
              <div className="bg-gray-900 rounded p-3 font-mono text-sm text-green-400 break-all">
                {generatedKey}
              </div>
            </div>

            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <Lock className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-300">
                  <p className="font-medium">重要提醒：</p>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>请立即复制并安全保存此密钥</li>
                    <li>密钥关闭后无法再次查看</li>
                    <li>请勿在不安全的环境中分享</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                  alert('密钥已复制到剪贴板');
                }}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                复制密钥
              </Button>
              <Button
                onClick={() => {
                  setGeneratedKey('');
                  setShowKeyModal(false);
                }}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                确定
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default AdminPage;