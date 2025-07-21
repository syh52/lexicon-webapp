import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, MessageCircle, CheckCircle, User, Upload, Settings, Zap } from "lucide-react";
import WelcomeHeroCard from '../components/WelcomeHeroCard';

// 这是原项目中最满意的首页设计示例
// 展示了Glass Morphism风格和现代化的交互设计

export default function HomePage() {
  const { user, isLoggedIn, isLoading, anonymousLogin } = useAuth();
  const navigate = useNavigate();

  const handleDailyCheckIn = () => {
    };

  const navigateToLogin = () => {
    navigate('/login');
  };

  const handleAnonymousLogin = async () => {
    try {
      await anonymousLogin();
      } catch (error) {
      console.error('匿名登录失败:', error);
    }
  };

  const navigateToVocabulary = () => {
    navigate('/wordbooks');
  };

  const navigateToDialogues = () => {
    navigate('/chat');
  };

  const navigateToQuizzes = () => {
    };

  const navigateToUpload = () => {
    navigate('/upload');
  };

  const navigateToManage = () => {
    navigate('/profile');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-inter text-xl text-white">Lexicon 加载中...</p>
      </div>
    );
  }

  // 如果加载完成但没有内容，显示一个fallback
  if (!isLoading && !user && !isLoggedIn) {
    }
  
  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10 py-4 sm:py-6">
      {/* Featured Hero Section - 使用可复用的WelcomeHeroCard组件 */}
      <WelcomeHeroCard
        subtitle="欢迎来到LEXICON"
        title="Ye are the salt of the earth: but if the salt have lost his savour, wherewith shall it be salted?"
        description="你们是世上的盐。盐若失了味，怎能叫它再咸呢？ —— 《马太福音》5:13"
        buttonText={!isLoggedIn ? "开始学习之旅" : "今日签到获取积分"}
        onButtonClick={!isLoggedIn ? navigateToLogin : handleDailyCheckIn}
        enableAnimation={true}
        animationDelay={200}
      />

      {/* Core Modules */}
      <div>
        <div className="flex justify-between items-center mb-6 sm:mb-8 animate-blur-in animate-delay-300">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-inter font-semibold text-white tracking-tight">核心模块</h3>
          <button className="text-sm sm:text-base text-purple-400 font-medium cursor-pointer hover:text-purple-300 transition-colors">查看全部</button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-4 sm:mb-6 animate-blur-in animate-delay-400">
          {/* Vocabulary Learning */}
          <div 
            onClick={navigateToVocabulary}
            className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 perspective-element transform transition-all duration-200 ease-out hover:scale-105 cursor-pointer active:scale-95 btn-enhanced"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-purple-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
              <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-purple-400" />
            </div>
            <h4 className="text-sm sm:text-base md:text-lg font-inter font-semibold text-white mb-2 sm:mb-3 tracking-tight">词汇学习</h4>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">Vocabulary</p>
          </div>

          {/* Scenario Dialogue */}
          <div 
            onClick={navigateToDialogues}
            className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 perspective-element transform transition-all duration-200 ease-out hover:scale-105 cursor-pointer active:scale-95 btn-enhanced"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-blue-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
              <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-400" />
            </div>
            <h4 className="text-sm sm:text-base md:text-lg font-inter font-semibold text-white mb-2 sm:mb-3 tracking-tight">情景对话</h4>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">Dialogues</p>
          </div>

          {/* Testing Module */}
          <div 
            onClick={navigateToQuizzes}
            className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 perspective-element transform transition-all duration-200 ease-out hover:scale-105 cursor-pointer active:scale-95 btn-enhanced"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-green-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
              <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-400" />
            </div>
            <h4 className="text-sm sm:text-base md:text-lg font-inter font-semibold text-white mb-2 sm:mb-3 tracking-tight">智能测验</h4>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">Quizzes</p>
          </div>

          {/* Upload Module - Available for all authenticated users */}
          {isLoggedIn && (
            <div 
              onClick={navigateToUpload}
              className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 perspective-element transform transition-all duration-200 ease-out hover:scale-105 cursor-pointer active:scale-95 btn-enhanced"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-orange-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <Upload className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-orange-400" />
              </div>
              <h4 className="text-sm sm:text-base md:text-lg font-inter font-semibold text-white mb-2 sm:mb-3 tracking-tight">批量上传</h4>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">Upload</p>
            </div>
          )}

          {/* Management Module - Available for all authenticated users */}
          {isLoggedIn && (
            <div 
              onClick={navigateToManage}
              className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 perspective-element transform transition-all duration-200 ease-out hover:scale-105 cursor-pointer active:scale-95 btn-enhanced border-purple-500/30"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-purple-600/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <Settings className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-purple-400" />
              </div>
              <h4 className="text-sm sm:text-base md:text-lg font-inter font-semibold text-white mb-2 sm:mb-3 tracking-tight">管理功能</h4>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">Management</p>
            </div>
          )}
        </div>
      </div>

      {/* Learning Progress */}
      {isLoggedIn && (
        <div className="perspective-element transform transition-transform duration-200 ease-out animate-blur-in animate-delay-600">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-inter font-semibold text-white mb-6 sm:mb-8 tracking-tight">学习进度</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-center cursor-pointer hover:bg-white/[0.12] transition-all duration-200">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 bg-purple-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center mr-4 sm:mr-6">
                <Zap className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm sm:text-base font-medium text-white mb-1 sm:mb-2">Level {user?.level || 1}</h4>
                <div className="text-xs sm:text-sm text-gray-400">进度: 68% • 还需3天完成</div>
              </div>
              <div className="text-lg sm:text-xl md:text-2xl font-medium text-purple-400">68%</div>
            </div>
            
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-center cursor-pointer hover:bg-white/[0.12] transition-all duration-200">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 bg-blue-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center mr-4 sm:mr-6">
                <MessageCircle className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm sm:text-base font-medium text-white mb-1 sm:mb-2">会议对话练习</h4>
                <div className="text-xs sm:text-sm text-gray-400">今日完成2个场景 • 表现优秀</div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-700/50 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Prompt for Non-authenticated Users */}
       {!isLoggedIn && (
        <div className="perspective-element transform transition-transform duration-200 ease-out animate-blur-in animate-delay-600">
          <div className="glass-card rounded-xl sm:rounded-2xl p-8 sm:p-10 md:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <User className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-inter font-semibold text-white mb-3 sm:mb-4">开始你的学习之旅</h3>
            <p className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8 md:mb-10 leading-relaxed max-w-md mx-auto">登录后即可查看学习进度，解锁更多功能</p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
              <button 
                onClick={navigateToLogin}
                className="w-full sm:w-auto sm:px-12 gradient-primary text-white py-3.5 px-6 rounded-2xl text-sm sm:text-base font-medium modern-focus cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
              >
                立即登录
              </button>
              <button 
                onClick={handleAnonymousLogin}
                className="w-full sm:w-auto sm:px-12 glass-card-strong text-white py-3.5 px-6 rounded-2xl text-sm sm:text-base font-medium modern-focus cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg border border-white/20"
              >
                游客体验
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}