import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, Menu, Bell, Search } from 'lucide-react';

export default function MobileHeader() {
  const location = useLocation();
  const pathname = location.pathname;

  const getHeaderTitle = () => {
    switch (pathname) {
      case '/':
        return 'Lexicon';
      case '/wordbooks':
        return '词书';
      case '/study':
        return '学习';
      case '/stats':
        return '统计';
      case '/profile':
        return '个人中心';
      default:
        return 'Lexicon';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-md border-b border-gray-800/50">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center space-x-3">
          {pathname !== '/' && (
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-full hover:bg-gray-800/50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-300" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-white">
            {getHeaderTitle()}
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full hover:bg-gray-800/50 transition-colors">
            <Search className="w-5 h-5 text-gray-300" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-800/50 transition-colors">
            <Bell className="w-5 h-5 text-gray-300" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-800/50 transition-colors">
            <Menu className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>
    </header>
  );
}