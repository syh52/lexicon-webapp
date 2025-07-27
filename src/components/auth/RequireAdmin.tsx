import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface RequireAdminProps {
  children: React.ReactNode;
  permission?: string;
  role?: 'admin' | 'super_admin';
  fallback?: React.ReactNode;
}

export const RequireAdmin: React.FC<RequireAdminProps> = ({ 
  children, 
  permission,
  role,
  fallback 
}) => {
  const { user, hasPermission, hasRole, isAdmin, isSuperAdmin } = useAuth();

  // 检查权限
  const hasRequiredPermission = () => {
    if (!user) return false;
    
    // 如果指定了具体权限，检查权限
    if (permission && !hasPermission(permission)) {
      return false;
    }
    
    // 如果指定了角色，检查角色
    if (role && !hasRole(role)) {
      return false;
    }
    
    // 如果没有指定具体要求，至少需要管理员权限
    if (!permission && !role && !isAdmin) {
      return false;
    }
    
    return true;
  };

  if (!hasRequiredPermission()) {
    // 如果提供了自定义fallback，使用它
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // 默认的权限不足界面
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg 
                className="w-8 h-8 text-red-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 15v2m0 0v2m0-2h2m-2 0H10m9-7a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              权限不足
            </h2>
            <p className="text-gray-600 mb-4">
              抱歉，您需要{role === 'super_admin' ? '超级管理员' : '管理员'}权限才能访问此功能。
            </p>
            {permission && (
              <p className="text-sm text-gray-500 mb-4">
                需要权限：<code className="bg-gray-100 px-2 py-1 rounded">{permission}</code>
              </p>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              当前用户角色：
              <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                {user?.role === 'super_admin' ? '超级管理员' : 
                 user?.role === 'admin' ? '管理员' : '普通用户'}
              </span>
            </div>
            
            <Button 
              onClick={() => window.history.back()} 
              variant="outline"
              className="w-full"
            >
              返回上一页
            </Button>
            
            <Button 
              onClick={() => window.location.href = '#/'} 
              className="w-full"
            >
              返回首页
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

// 权限检查 Hook
export const useRequireAdmin = (permission?: string, role?: 'admin' | 'super_admin') => {
  const { user, hasPermission, hasRole, isAdmin } = useAuth();

  const hasRequiredPermission = () => {
    if (!user) return false;
    
    if (permission && !hasPermission(permission)) {
      return false;
    }
    
    if (role && !hasRole(role)) {
      return false;
    }
    
    if (!permission && !role && !isAdmin) {
      return false;
    }
    
    return true;
  };

  return {
    hasRequiredPermission: hasRequiredPermission(),
    user,
    userRole: user?.role,
    userPermissions: user?.permissions
  };
};

// 快速权限检查组件
export const AdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RequireAdmin role="admin">{children}</RequireAdmin>
);

export const SuperAdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RequireAdmin role="super_admin">{children}</RequireAdmin>
);

export const BatchUploadOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RequireAdmin permission="batch_upload">{children}</RequireAdmin>
);