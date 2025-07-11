import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, BarChart3, User } from 'lucide-react';

const navigationItems = [
  { name: '首页', href: '/', icon: Home },
  { name: '词书', href: '/wordbooks', icon: BookOpen },
  { name: '统计', href: '/stats', icon: BarChart3 },
  { name: '我的', href: '/profile', icon: User },
];

export default function MobileNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-t border-gray-800/50">
      <div className="max-w-sm mx-auto px-4 py-2">
        <div className="flex items-center justify-around">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href;
            
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.href)}
                className={`flex flex-col items-center space-y-1 py-2 px-3 rounded-lg transition-colors ${
                  isActive
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                <span className={`text-xs ${isActive ? 'text-blue-400' : 'text-gray-400'}`}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}