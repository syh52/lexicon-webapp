import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Target, Clock, Save, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import wordbookService, { Wordbook } from '../services/wordbookService';
import { getApp } from '../utils/cloudbase';
import { BACKGROUNDS, TEXT_COLORS } from '../constants/design';

interface StudySettings {
  selectedWordbookId: string;
  dailyNewWords: number;
  dailyReviewWords: number;
  studyMode: 'standard' | 'intensive' | 'relaxed';
  enableVoice: boolean;
  autoNext: boolean;
  enableReminder: boolean;
  reminderTime: string;
}

const DEFAULT_SETTINGS: StudySettings = {
  selectedWordbookId: '',
  dailyNewWords: 10,
  dailyReviewWords: 15,
  studyMode: 'standard',
  enableVoice: true,
  autoNext: false,
  enableReminder: true,
  reminderTime: '09:00'
};

export default function StudySettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [settings, setSettings] = useState<StudySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 并行获取词书和用户设置
      const [wordbooksData, userSettings] = await Promise.all([
        wordbookService.getWordbooks(),
        loadUserSettings()
      ]);

      setWordbooks(wordbooksData);
      
      if (userSettings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...userSettings,
          selectedWordbookId: userSettings.selectedWordbookId || (wordbooksData[0]?._id || '')
        });
      } else if (wordbooksData.length > 0) {
        setSettings(prev => ({
          ...prev,
          selectedWordbookId: wordbooksData[0]._id
        }));
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      setError('加载数据失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserSettings = async () => {
    try {
      const app = await getApp();
      const result = await app.callFunction({
        name: 'user-settings',
        data: { 
          action: 'get',
          userId: user!.uid
        }
      });

      if (result.result?.success && result.result?.data) {
        return result.result.data;
      }
      return null;
    } catch (error) {
      console.warn('获取用户设置失败，使用默认设置:', error);
      return null;
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);

      if (!settings.selectedWordbookId) {
        setError('请选择一个词书');
        return;
      }

      // 保存用户设置
      const app = await getApp();
      const result = await app.callFunction({
        name: 'user-settings',
        data: {
          action: 'update',
          userId: user!.uid,
          settings: {
            selectedWordbookId: settings.selectedWordbookId,
            dailyNewWords: settings.dailyNewWords,
            dailyReviewWords: settings.dailyReviewWords,
            dailyTarget: settings.dailyNewWords + settings.dailyReviewWords,
            studyMode: settings.studyMode,
            enableVoice: settings.enableVoice,
            autoNext: settings.autoNext,
            enableReminder: settings.enableReminder,
            reminderTime: settings.reminderTime
          }
        }
      });

      if (result.result?.success) {
        setMessage({ type: 'success', text: '学习计划保存成功！' });
        
        // 延迟导航，让用户看到成功消息
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1500);
      } else {
        throw new Error(result.result?.error || '保存失败');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      setError('保存设置失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const selectedWordbook = wordbooks.find(w => w._id === settings.selectedWordbookId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className={`text-xl ${TEXT_COLORS.PRIMARY}`}>加载设置...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* 消息提示 */}
      {message && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-white ${
          message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center mb-8">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors mr-4"
          >
            <ArrowLeft className={`w-6 h-6 ${TEXT_COLORS.PRIMARY}`} />
          </button>
          <div>
            <h1 className={`text-2xl sm:text-3xl font-semibold ${TEXT_COLORS.PRIMARY}`}>
              学习计划设置
            </h1>
            <p className={`${TEXT_COLORS.MUTED} mt-1`}>
              配置你的个性化学习计划
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* 词书选择 */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center mb-4">
              <BookOpen className="w-5 h-5 text-purple-400 mr-2" />
              <h3 className={`text-lg font-semibold ${TEXT_COLORS.PRIMARY}`}>
                选择词书
              </h3>
            </div>
            
            {wordbooks.length === 0 ? (
              <div className="text-center py-8">
                <p className={`${TEXT_COLORS.MUTED} mb-4`}>暂无可用词书</p>
                <button
                  onClick={() => navigate('/upload')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  上传词书
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {wordbooks.map((wordbook) => (
                  <div
                    key={wordbook._id}
                    onClick={() => setSettings(prev => ({ ...prev, selectedWordbookId: wordbook._id }))}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      settings.selectedWordbookId === wordbook._id
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className={`font-medium ${TEXT_COLORS.PRIMARY}`}>
                          {wordbook.name}
                        </h4>
                        <p className={`text-sm ${TEXT_COLORS.MUTED} mt-1`}>
                          {wordbook.description} • {wordbook.totalCount} 个词
                        </p>
                      </div>
                      {settings.selectedWordbookId === wordbook._id && (
                        <Check className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 学习目标设置 */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center mb-4">
              <Target className="w-5 h-5 text-blue-400 mr-2" />
              <h3 className={`text-lg font-semibold ${TEXT_COLORS.PRIMARY}`}>
                每日学习目标
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${TEXT_COLORS.SECONDARY} mb-2`}>
                  每日新词数量
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.dailyNewWords}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      dailyNewWords: Math.max(1, Math.min(50, parseInt(e.target.value) || 1))
                    }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    词/天
                  </div>
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${TEXT_COLORS.SECONDARY} mb-2`}>
                  每日复习数量
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.dailyReviewWords}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      dailyReviewWords: Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                    }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    词/天
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className={`text-sm ${TEXT_COLORS.SECONDARY}`}>
                预计每日学习时间：约 {Math.ceil((settings.dailyNewWords + settings.dailyReviewWords) * 0.5)} 分钟
              </p>
            </div>
          </div>

          {/* 学习模式 */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center mb-4">
              <Clock className="w-5 h-5 text-orange-400 mr-2" />
              <h3 className={`text-lg font-semibold ${TEXT_COLORS.PRIMARY}`}>
                学习模式
              </h3>
            </div>
            
            <div className="grid gap-3">
              {[
                {
                  id: 'standard',
                  name: '标准模式',
                  description: '平衡学习强度和效果，适合大多数用户',
                  color: 'blue'
                },
                {
                  id: 'intensive',
                  name: '强化模式',
                  description: '增加复习频率，快速掌握词汇',
                  color: 'red'
                },
                {
                  id: 'relaxed',
                  name: '轻松模式',
                  description: '降低学习压力，循序渐进',
                  color: 'green'
                }
              ].map((mode) => (
                <div
                  key={mode.id}
                  onClick={() => setSettings(prev => ({ ...prev, studyMode: mode.id as any }))}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    settings.studyMode === mode.id
                      ? `border-${mode.color}-500 bg-${mode.color}-500/10`
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`font-medium ${TEXT_COLORS.PRIMARY}`}>
                        {mode.name}
                      </h4>
                      <p className={`text-sm ${TEXT_COLORS.MUTED} mt-1`}>
                        {mode.description}
                      </p>
                    </div>
                    {settings.studyMode === mode.id && (
                      <Check className={`w-5 h-5 text-${mode.color}-400`} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 高级设置 */}
          <div className="glass-card rounded-3xl p-6">
            <h3 className={`text-lg font-semibold ${TEXT_COLORS.PRIMARY} mb-4`}>
              高级设置
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-medium ${TEXT_COLORS.PRIMARY}`}>语音播放</h4>
                  <p className={`text-sm ${TEXT_COLORS.MUTED}`}>自动播放单词发音</p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, enableVoice: !prev.enableVoice }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.enableVoice ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${
                    settings.enableVoice ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-medium ${TEXT_COLORS.PRIMARY}`}>自动进入下一题</h4>
                  <p className={`text-sm ${TEXT_COLORS.MUTED}`}>选择答案后自动进入下一个单词</p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, autoNext: !prev.autoNext }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.autoNext ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${
                    settings.autoNext ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="sticky bottom-4">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving || !settings.selectedWordbookId}
              className="w-full gradient-primary text-white py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  保存学习计划
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}