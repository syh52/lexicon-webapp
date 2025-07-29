import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { KeyPromotionModal } from '../components/admin/KeyPromotionModal';
import { TEXT_COLORS } from '../constants/design';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  HelpCircle, 
  LogOut,
  BookOpen,
  Target,
  Calendar,
  Crown,
  Key,
  Users
} from 'lucide-react';

export default function ProfilePage() {
  const { user: authUser, logout, isLoggedIn, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  // 如果用户未登录，显示登录提示
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 sm:p-6">
        <Card className="w-full max-w-md glass-dark border-gray-700/50">
          <CardContent className="p-4 sm:p-6 text-center">
            <h2 className={`text-lg sm:text-xl font-bold mb-4 ${TEXT_COLORS.PRIMARY}`}>请先登录</h2>
            <p className={`text-sm sm:text-base mb-4 ${TEXT_COLORS.SECONDARY}`}>您需要登录才能查看个人资料</p>
            <Button onClick={() => navigate('/login')} className="w-full">
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 使用真实用户数据，提供合理的默认值
  const user = {
    name: authUser?.displayName || '新用户',
    email: authUser?.email || '未设置邮箱',
    avatar: authUser?.avatar || null,
    level: authUser?.level || 1,
    exp: (authUser?.level || 1) * 200 + (authUser?.studiedWords || 0) * 10, // 计算经验值
    nextLevelExp: ((authUser?.level || 1) + 1) * 300,
    joinDate: '2024-01-15', // 暂时使用默认值，后续可以从数据库获取
    totalWords: authUser?.totalWords || 0,
    streak: authUser?.streakDays || 0
  };

  const expProgress = (user.exp / user.nextLevelExp) * 100;

  const menuItems = [
    { icon: Target, label: '学习目标设置', description: '调整每日学习目标' },
    { icon: Bell, label: '消息通知', description: '管理提醒和通知设置' },
    { icon: Settings, label: '账户设置', description: '修改个人信息和密码' },
    ...(isAdmin ? [
      { icon: Users, label: '管理员面板', description: '系统管理和用户管理', action: () => navigate('/admin') }
    ] : [
      { icon: Key, label: '权限提升', description: '使用密钥获取管理员权限', action: () => setShowPromotionModal(true) }
    ]),
    { icon: Shield, label: '隐私设置', description: '管理数据隐私和安全' },
    { icon: HelpCircle, label: '帮助与支持', description: '查看使用指南和联系客服' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      // 退出登录后跳转到登录页面
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">个人中心</h1>
        <p className="text-sm sm:text-base text-gray-400">管理你的学习账户和设置</p>
      </div>

      {/* 用户信息卡片 */}
      <Card className="glass-dark border-gray-700/50 mb-6 sm:mb-8">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            {/* 头像 */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1">
                <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
            </div>

            {/* 用户信息 */}
            <div className="flex-1 text-center sm:text-left w-full">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{user.name}</h2>
              <p className="text-sm sm:text-base text-gray-400 mb-4 break-words">{user.email}</p>
              
              {/* 等级进度 */}
              <div className="mb-4 w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">等级 {user.level}</span>
                  <span className="text-xs sm:text-sm text-blue-400">{user.exp}/{user.nextLevelExp} EXP</span>
                </div>
                <Progress value={expProgress} className="h-2" />
              </div>

              {/* 权限信息 */}
              <div className="mb-4 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <span className="text-sm text-gray-400">账户权限</span>
                  {!isSuperAdmin && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowPromotionModal(true)}
                      className="text-xs border-purple-500/50 text-purple-400 hover:bg-purple-500/10 w-full sm:w-auto"
                    >
                      <Key className="w-3 h-3 mr-1" />
                      提升权限
                    </Button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Badge variant={isSuperAdmin ? "default" : isAdmin ? "secondary" : "outline"} className="w-fit">
                    {isSuperAdmin ? "超级管理员" : isAdmin ? "管理员" : "普通用户"}
                  </Badge>
                  {isAdmin && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => navigate('/admin')}
                      className="text-xs text-purple-400 hover:bg-purple-500/10 w-full sm:w-auto"
                    >
                      管理面板
                    </Button>
                  )}
                </div>
              </div>

              {/* 统计数据 */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-white">{user.totalWords}</div>
                  <div className="text-xs text-gray-400">学习单词</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-white">{user.streak}</div>
                  <div className="text-xs text-gray-400">连续天数</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-white">{user.level}</div>
                  <div className="text-xs text-gray-400">当前等级</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 学习统计 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 sm:mb-8">
        <Card className="glass-dark border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">本月学习</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold text-white">385</div>
            <p className="text-xs text-gray-400">比上月增长 12%</p>
          </CardContent>
        </Card>

        <Card className="glass-dark border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">学习时长</CardTitle>
            <Calendar className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold text-white">45h</div>
            <p className="text-xs text-gray-400">本月累计时间</p>
          </CardContent>
        </Card>

        <Card className="glass-dark border-gray-700/50 sm:col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">正确率</CardTitle>
            <Target className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold text-white">85%</div>
            <p className="text-xs text-gray-400">比上月提升 3%</p>
          </CardContent>
        </Card>
      </div>

      {/* 设置菜单 */}
      <Card className="glass-dark border-gray-700/50 mb-6 sm:mb-8">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-base sm:text-lg text-white">设置与管理</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.action || (() => {})}
                className="w-full flex items-center justify-between p-3 sm:p-4 rounded-lg hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm sm:text-base text-white font-medium truncate">{item.label}</div>
                    <div className="text-xs sm:text-sm text-gray-400 truncate">{item.description}</div>
                  </div>
                </div>
                <div className="text-gray-600 flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 退出登录 */}
      <Card className="glass-dark border-red-500/30">
        <CardContent className="p-4 sm:p-6">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 py-3 text-sm sm:text-base"
          >
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </CardContent>
      </Card>

      {/* 权限提升弹窗 */}
      <KeyPromotionModal
        isOpen={showPromotionModal}
        onClose={() => setShowPromotionModal(false)}
        onSuccess={() => {
          // 权限提升成功后刷新页面
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }}
      />
    </div>
  );
}