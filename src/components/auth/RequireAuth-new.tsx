import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext-new';

interface RequireAuthProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requiredPermission?: string;
  fallbackPath?: string;
}

/**
 * 路由保护组件 - 新版本
 * 基于新的认证系统，提供更精细的权限控制
 */
const RequireAuth: React.FC<RequireAuthProps> = ({ 
  children, 
  requireAdmin = false,
  requireSuperAdmin = false,
  requiredPermission,
  fallbackPath = '/login'
}) => {
  const { user, isLoading, isLoggedIn, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  // 正在检查登录状态时显示加载
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-400">检查登录状态...</p>
        </div>
      </div>
    );
  }

  // 对于不需要认证的页面，允许匿名访问
  if (!requireAdmin && !requireSuperAdmin && !requiredPermission) {
    return <>{children}</>;
  }

  // 需要认证但用户未登录
  if (!isLoggedIn || !user) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // 检查超级管理员权限
  if (requireSuperAdmin && !hasRole('super_admin')) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold text-white mb-4">权限不足</h2>
          <p className="text-gray-400 mb-6">
            此页面需要超级管理员权限才能访问
          </p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  // 检查管理员权限
  if (requireAdmin && !hasRole('admin')) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold text-white mb-4">权限不足</h2>
          <p className="text-gray-400 mb-6">
            此页面需要管理员权限才能访问
          </p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  // 检查特定权限
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold text-white mb-4">权限不足</h2>
          <p className="text-gray-400 mb-6">
            您没有执行此操作的权限：{requiredPermission}
          </p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  // 通过所有验证，渲染子组件
  return <>{children}</>;
};

export default RequireAuth;