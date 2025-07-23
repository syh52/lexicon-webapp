import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallbackPath?: string;
}

/**
 * 路由保护组件
 * 用于保护需要登录的路由，未登录用户将被重定向到登录页
 * @param children - 受保护的子组件
 * @param requireAdmin - 是否需要管理员权限
 * @param fallbackPath - 未通过验证时的重定向路径，默认为登录页
 */
const RequireAuth: React.FC<RequireAuthProps> = ({ 
  children, 
  requireAdmin = false,
  fallbackPath = '/login'
}) => {
  const { user, isLoading, isLoggedIn } = useAuth();
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

  // 未登录用户重定向到登录页，并保存当前路径用于登录后跳转
  if (!isLoggedIn || !user) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // 需要管理员权限但用户不是管理员
  if (requireAdmin && !user.isAdmin) {
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

  // 匿名用户访问需要完整账号的功能时提示
  if (user.isAnonymous && requireAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-semibold text-white mb-4">需要注册账号</h2>
          <p className="text-gray-400 mb-6">
            游客模式无法使用此功能，请注册账号获得完整体验
          </p>
          <div className="space-x-4">
            <Navigate to="/register" replace />
          </div>
        </div>
      </div>
    );
  }

  // 通过所有验证，渲染子组件
  return <>{children}</>;
};

export default RequireAuth;