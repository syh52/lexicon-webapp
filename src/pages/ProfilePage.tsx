import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  Crown
} from 'lucide-react';

export default function ProfilePage() {
  // 模拟用户数据
  const user = {
    name: '英语学习者',
    email: 'user@example.com',
    avatar: null,
    level: 15,
    exp: 2340,
    nextLevelExp: 3000,
    joinDate: '2024-01-15',
    totalWords: 1250,
    streak: 7
  };

  const expProgress = (user.exp / user.nextLevelExp) * 100;

  const menuItems = [
    { icon: Target, label: '学习目标设置', description: '调整每日学习目标' },
    { icon: Bell, label: '消息通知', description: '管理提醒和通知设置' },
    { icon: Settings, label: '账户设置', description: '修改个人信息和密码' },
    { icon: Shield, label: '隐私设置', description: '管理数据隐私和安全' },
    { icon: HelpCircle, label: '帮助与支持', description: '查看使用指南和联系客服' },
  ];

  const handleLogout = () => {
    // 实现退出登录逻辑
    console.log('用户退出登录');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">个人中心</h1>
        <p className="text-gray-400">管理你的学习账户和设置</p>
      </div>

      {/* 用户信息卡片 */}
      <Card className="glass-dark border-gray-700/50 mb-8">
        <CardContent className="p-6">
          <div className="flex items-start space-x-6">
            {/* 头像 */}
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-white" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1">
                <Crown className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* 用户信息 */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">{user.name}</h2>
              <p className="text-gray-400 mb-4">{user.email}</p>
              
              {/* 等级进度 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">等级 {user.level}</span>
                  <span className="text-sm text-blue-400">{user.exp}/{user.nextLevelExp} EXP</span>
                </div>
                <Progress value={expProgress} className="h-2" />
              </div>

              {/* 统计数据 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{user.totalWords}</div>
                  <div className="text-xs text-gray-400">学习单词</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{user.streak}</div>
                  <div className="text-xs text-gray-400">连续天数</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{user.level}</div>
                  <div className="text-xs text-gray-400">当前等级</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 学习统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="glass-dark border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">本月学习</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">385</div>
            <p className="text-xs text-gray-400">比上月增长 12%</p>
          </CardContent>
        </Card>

        <Card className="glass-dark border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">学习时长</CardTitle>
            <Calendar className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">45h</div>
            <p className="text-xs text-gray-400">本月累计时间</p>
          </CardContent>
        </Card>

        <Card className="glass-dark border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">正确率</CardTitle>
            <Target className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">85%</div>
            <p className="text-xs text-gray-400">比上月提升 3%</p>
          </CardContent>
        </Card>
      </div>

      {/* 设置菜单 */}
      <Card className="glass-dark border-gray-700/50 mb-8">
        <CardHeader>
          <CardTitle className="text-white">设置与管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-white font-medium">{item.label}</div>
                    <div className="text-sm text-gray-400">{item.description}</div>
                  </div>
                </div>
                <div className="text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <CardContent className="p-6">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
          >
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}