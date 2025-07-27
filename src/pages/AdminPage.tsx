import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RequireAdmin } from '../components/auth/RequireAdmin';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { getApp, ensureLogin } from '../utils/cloudbase';

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
  const { user, isSuperAdmin, promoteWithKey } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'keys' | 'promote'>('dashboard');
  const [loading, setLoading] = useState(false);
  
  // 权限提升相关状态
  const [adminKey, setAdminKey] = useState('');
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteMessage, setPromoteMessage] = useState('');
  
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

  // 加载数据
  useEffect(() => {
    if (activeTab === 'keys' && isSuperAdmin) {
      loadAdminKeys();
      loadKeyStats();
    } else if (activeTab === 'users' && isSuperAdmin) {
      loadUsers();
    }
  }, [activeTab, isSuperAdmin]);

  // 加载密钥列表
  const loadAdminKeys = async () => {
    try {
      setLoading(true);
      await ensureLogin();
      const app = getApp();
      
      const result = await app.callFunction({
        name: 'admin-management',
        data: { action: 'listKeys' }
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
      const app = getApp();
      
      const result = await app.callFunction({
        name: 'admin-management',
        data: { action: 'getKeyStats' }
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
      const app = getApp();
      
      const result = await app.callFunction({
        name: 'userInfo',
        data: { action: 'listUsers' }
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

  // 生成管理员密钥
  const generateAdminKey = async () => {
    try {
      setLoading(true);
      await ensureLogin();
      const app = getApp();
      
      const result = await app.callFunction({
        name: 'admin-management',
        data: { 
          action: 'generateKey',
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
      const app = getApp();
      
      const result = await app.callFunction({
        name: 'admin-management',
        data: { 
          action: 'deactivateKey',
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

  // 渲染导航标签
  const renderTabs = () => (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {[
          { id: 'dashboard', name: '概览', icon: '📊' },
          { id: 'promote', name: '权限提升', icon: '🔑' },
          ...(isSuperAdmin ? [
            { id: 'users', name: '用户管理', icon: '👥' },
            { id: 'keys', name: '密钥管理', icon: '🗝️' }
          ] : [])
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );

  // 渲染概览页面
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-semibold">👤</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">当前角色</p>
              <p className="text-lg font-semibold text-gray-900">
                {user?.role === 'super_admin' ? '超级管理员' : 
                 user?.role === 'admin' ? '管理员' : '普通用户'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-semibold">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">可用权限</p>
              <p className="text-lg font-semibold text-gray-900">
                {user?.permissions?.length || 0} 项
              </p>
            </div>
          </div>
        </Card>

        {keyStats && (
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">🗝️</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">活跃密钥</p>
                <p className="text-lg font-semibold text-gray-900">
                  {keyStats.active} / {keyStats.total}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">权限详情</h3>
        <div className="space-y-2">
          {user?.permissions?.map((permission, index) => (
            <Badge key={index} variant="secondary" className="mr-2 mb-2">
              {permission === 'basic_learning' ? '基础学习' :
               permission === 'batch_upload' ? '批量上传' :
               permission === 'user_management' ? '用户管理' :
               permission === 'admin_key_generation' ? '密钥生成' :
               permission === 'system_settings' ? '系统设置' :
               permission}
            </Badge>
          )) || <p className="text-gray-500">暂无权限信息</p>}
        </div>
      </Card>
    </div>
  );

  // 渲染权限提升页面
  const renderPromotePage = () => (
    <div className="max-w-md mx-auto">
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">权限提升</h3>
        <p className="text-gray-600 mb-6">
          输入超级管理员密钥或管理员密钥来提升您的账户权限。
        </p>
        
        <div className="space-y-4">
          <Input
            type="password"
            placeholder="请输入管理员密钥"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            disabled={promoteLoading}
          />
          
          <Button
            onClick={handlePromoteWithKey}
            disabled={promoteLoading || !adminKey.trim()}
            className="w-full"
          >
            {promoteLoading ? '提升中...' : '提升权限'}
          </Button>
          
          {promoteMessage && (
            <div className={`p-3 rounded-md text-sm ${
              promoteMessage.includes('成功') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {promoteMessage}
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  return (
    <RequireAdmin>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">管理员控制面板</h1>
            <p className="mt-2 text-gray-600">
              管理系统用户、权限和配置
            </p>
          </div>

          {renderTabs()}

          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'promote' && renderPromotePage()}
          
          {/* 其他标签页内容会在后续任务中实现 */}
          {activeTab === 'users' && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">用户管理</h3>
              <p className="text-gray-600">用户管理功能即将推出...</p>
            </div>
          )}
          
          {activeTab === 'keys' && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">密钥管理</h3>
              <p className="text-gray-600">密钥管理功能即将推出...</p>
            </div>
          )}
        </div>
      </div>
    </RequireAdmin>
  );
};

export default AdminPage;