import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Calendar, TrendingUp, BookOpen, Clock, Target, Flame } from 'lucide-react';

export default function StatsPage() {
  // 模拟数据，实际应从数据库获取
  const stats = {
    todayWords: 25,
    todayTarget: 50,
    totalWords: 1250,
    streak: 7,
    accuracy: 85,
    totalTime: 120, // 分钟
  };

  const recentActivity = [
    { date: '今天', words: 25, time: 45 },
    { date: '昨天', words: 50, time: 60 },
    { date: '前天', words: 35, time: 40 },
    { date: '3天前', words: 40, time: 55 },
    { date: '4天前', words: 30, time: 35 },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">学习统计</h1>
        <p className="text-gray-400">查看你的学习进度和成就</p>
      </div>

      {/* 今日概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="glass-dark border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">今日学习</CardTitle>
            <Target className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-2">
              {stats.todayWords}/{stats.todayTarget}
            </div>
            <Progress value={(stats.todayWords / stats.todayTarget) * 100} className="mb-2" />
            <p className="text-xs text-gray-400">
              还需学习 {stats.todayTarget - stats.todayWords} 个单词完成今日目标
            </p>
          </CardContent>
        </Card>

        <Card className="glass-dark border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">连续打卡</CardTitle>
            <Flame className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-2">{stats.streak} 天</div>
            <p className="text-xs text-gray-400">
              坚持学习，形成良好习惯
            </p>
          </CardContent>
        </Card>

        <Card className="glass-dark border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">总学习量</CardTitle>
            <BookOpen className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-2">{stats.totalWords}</div>
            <p className="text-xs text-gray-400">
              累计学习单词数
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="glass-dark border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
              学习表现
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">正确率</span>
              <div className="flex items-center space-x-2">
                <Progress value={stats.accuracy} className="w-20" />
                <span className="text-white font-semibold">{stats.accuracy}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">学习时长</span>
              <span className="text-white font-semibold">
                {Math.floor(stats.totalTime / 60)}h {stats.totalTime % 60}m
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">平均每日</span>
              <span className="text-white font-semibold">
                {Math.floor(stats.totalWords / 30)} 词/天
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-400" />
              最近活动
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-gray-400">{activity.date}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">{activity.words} 词</div>
                    <div className="text-xs text-gray-500">{activity.time}分钟</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 成就徽章 */}
      <Card className="glass-dark border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white">成就徽章</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
              <div className="text-2xl mb-2">🔥</div>
              <div className="text-sm font-semibold text-white">连续学习7天</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
              <div className="text-2xl mb-2">📚</div>
              <div className="text-sm font-semibold text-white">学习1000个单词</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
              <div className="text-2xl mb-2">🎯</div>
              <div className="text-sm font-semibold text-white">完成首个词书</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-700/30 border border-gray-600/30">
              <div className="text-2xl mb-2 opacity-50">⏰</div>
              <div className="text-sm text-gray-500">学习30分钟</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}