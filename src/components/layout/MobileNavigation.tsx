import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, MessageSquare, User } from 'lucide-react';

export default function MobileNavigation() {
  const location = useLocation();
  const pathname = location.pathname;

  const navItems = [
    {
      label: '首页',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      label: '词汇',
      href: '/wordbooks',
      icon: BookOpen,
      isActive: pathname.startsWith('/wordbooks'),
    },
    {
      label: '智能对话',
      href: '/chat',
      icon: MessageSquare,
      isActive: pathname.startsWith('/chat'),
    },
    {
      label: '我的',
      href: '/profile',
      icon: User,
      isActive: pathname.startsWith('/profile'),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center z-50">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl h-20 bg-gray-800/80 backdrop-blur-xl border-t border-white/20 flex items-center justify-around px-6">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Link key={item.href} to={item.href}>
              <div className="relative flex flex-col items-center p-2 cursor-pointer hover:bg-white/10 rounded-lg transition-all duration-200 active:scale-95 group">
                {item.isActive && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-purple-400 rounded-full transition-all duration-300"></div>
                )}
                <IconComponent 
                  className={`h-6 w-6 transition-all duration-300 ${
                    item.isActive 
                      ? 'text-purple-400 transform scale-110' 
                      : 'text-gray-500 group-hover:text-gray-300 group-hover:scale-105'
                  }`}
                />
                <span 
                  className={`text-xs font-medium mt-1 transition-all duration-300 ${
                    item.isActive 
                      ? 'text-purple-400 font-semibold' 
                      : 'text-gray-500 group-hover:text-gray-300'
                  }`}
                >
                  {item.label}
                </span>
                {item.isActive && (
                  <div className="absolute inset-0 bg-purple-400/10 rounded-lg blur-xl animate-pulse"></div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}