import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Play, BarChart3 } from 'lucide-react';
import cloudbase from '@/utils/cloudbase';

interface Wordbook {
  _id: string;
  name: string;
  cover: string;
  totalCount: number;
  description: string;
  progress?: number;
}

export default function WordbooksPage() {
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadWordbooks();
  }, []);

  const loadWordbooks = async () => {
    try {
      const db = cloudbase.app.database();
      const result = await db.collection('wordbooks').get();
      
      if (result.data) {
        setWordbooks(result.data);
      }
    } catch (error) {
      console.error('加载词书失败:', error);
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
          <span className="text-gray-400">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">词书库</h1>
        <p className="text-gray-400">选择你的学习词书，开始背单词之旅</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wordbooks.map((wordbook) => (
          <Card key={wordbook._id} className="glass-dark border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 group">
            <CardHeader className="p-0">
              <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                <img
                  src={wordbook.cover}
                  alt={wordbook.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {wordbook.name}
                  </h3>
                  <p className="text-gray-300 text-sm">
                    {wordbook.totalCount} 个单词
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                {wordbook.description}
              </p>
              
              {wordbook.progress !== undefined && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">学习进度</span>
                    <span className="text-sm text-blue-400">{wordbook.progress}%</span>
                  </div>
                  <Progress value={wordbook.progress} className="h-2" />
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  onClick={() => handleStartStudy(wordbook._id)}
                  className="flex-1"
                  variant="primary"
                >
                  <Play className="w-4 h-4 mr-2" />
                  开始学习
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="px-3"
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {wordbooks.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            暂无词书
          </h3>
          <p className="text-gray-500">
            词书正在准备中，请稍后再试
          </p>
        </div>
      )}
    </div>
  );
}