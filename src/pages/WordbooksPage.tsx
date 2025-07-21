import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Play, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
// @ts-ignore
import { app } from '../utils/cloudbase.js';

interface Wordbook {
  _id: string;
  name: string;
  description: string;
  cover: string;
  totalCount: number;
  progress?: number;
  createdAt: string;
  updatedAt: string;
}

export default function WordbooksPage() {
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadWordbooks();
  }, []);

  // 监听用户状态变化，确保登录状态变化时重新加载数据
  useEffect(() => {
    if (user) {
      loadWordbooks();
    }
  }, [user]);

  // 监听页面可见性变化，当页面重新获得焦点时刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadWordbooks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const loadWordbooks = async () => {
    try {
      setLoading(true);
      setError(null);
      // 如果用户未登录，直接返回空数组
      if (!user) {
        setWordbooks([]);
        return;
      }
      
      // 调用云函数获取真实数据
      const result = await app.callFunction({
        name: 'getWordbooks',
        data: {}
      });
      
      if (result.result?.success && result.result?.data?.wordbooks) {
        const rawWordbooks = result.result.data.wordbooks;
        const rawWords = result.result.data.words || [];
        
        // 计算每个词书的学习进度
        const wordbooksWithProgress = rawWordbooks.map((wordbook: any) => {
          const wordbookWords = rawWords.filter((word: any) => word.wordbookId === wordbook._id);
          let progress = 0;
          
          // 这里可以根据用户学习记录计算进度
          // 暂时设置为0，后续可以添加学习记录功能
          
          return {
            _id: wordbook._id,
            name: wordbook.name,
            description: wordbook.description,
            cover: wordbook.cover,
            totalCount: wordbookWords.length,
            progress,
            createdAt: wordbook.createdAt,
            updatedAt: wordbook.updatedAt
          };
        });
        
        setWordbooks(wordbooksWithProgress);
      } else {
        const errorMsg = result.result?.error || '获取词书数据失败';
        console.error('云函数返回错误:', errorMsg);
        setError(errorMsg);
        setWordbooks([]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '加载词书失败';
      console.error('加载词书失败:', error);
      setError(errorMsg);
      setWordbooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartStudy = (wordbookId: string) => {
    navigate(`/study/${wordbookId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-white">正在加载词书...</span>
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-white">加载失败</h3>
          <p className="mt-1 text-sm text-gray-400">{error}</p>
          <Button 
            onClick={loadWordbooks}
            className="mt-4 bg-blue-600 hover:bg-blue-700"
          >
            重试
          </Button>
        </div>
      </div>
    );
  }

  if (wordbooks.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-white">暂无词书</h3>
          <p className="mt-1 text-sm text-gray-400">管理员尚未添加词书内容</p>
          <Button 
            onClick={loadWordbooks}
            className="mt-4 bg-blue-600 hover:bg-blue-700"
          >
            刷新
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">词书管理</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <BookOpen className="h-4 w-4" />
          <span>共 {wordbooks.length} 本词书</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wordbooks.map((wordbook) => (
          <Card key={wordbook._id} className="glass-card hover:scale-105 transition-transform duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-white truncate">
                  {wordbook.name}
                </CardTitle>
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <BookOpen className="h-3 w-3" />
                  <span>{wordbook.totalCount}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative h-32 rounded-xl overflow-hidden">
                  <img 
                    src={wordbook.cover} 
                    alt={wordbook.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-2xl font-bold">{wordbook.totalCount}</div>
                      <div className="text-sm">个单词</div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-300 line-clamp-2">
                  {wordbook.description}
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">学习进度</span>
                    <span className="text-white">{wordbook.progress}%</span>
                  </div>
                  <Progress value={wordbook.progress || 0} className="h-2" />
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => handleStartStudy(wordbook._id)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    开始学习
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-gray-400 border-gray-600 hover:bg-gray-800"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}