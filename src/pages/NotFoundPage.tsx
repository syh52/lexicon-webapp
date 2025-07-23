import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, BookOpen } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoWordbooks = () => {
    navigate('/wordbooks');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* 404 Icon */}
        <div className="relative">
          <div className="text-8xl font-bold text-gray-800 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-16 h-16 text-purple-500/50" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-white">
            页面未找到
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            抱歉，您访问的页面不存在或已被删除。
            请检查URL是否正确，或者返回首页继续浏览。
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoHome}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>返回首页</span>
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoBack}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回上页</span>
            </button>
            
            <button
              onClick={handleGoWordbooks}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>词书列表</span>
            </button>
          </div>
        </div>

        {/* Additional Help */}
        <div className="pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            如果您认为这是一个错误，请联系技术支持
          </p>
        </div>
      </div>
    </div>
  );
}