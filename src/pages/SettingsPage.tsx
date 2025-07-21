import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserSettings, userSettingsService, PRESET_CONFIGS } from '../services/userSettingsService';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadUserSettings();
    }
  }, [user]);

  const loadUserSettings = async () => {
    try {
      setIsLoading(true);
      const userSettings = await userSettingsService.getUserSettings(user!.uid);
      setSettings(userSettings);
    } catch (error) {
      console.error('加载用户设置失败:', error);
      setMessage({ type: 'error', text: '加载设置失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;

    try {
      setIsSaving(true);
      const updatedSettings = await userSettingsService.updateUserSettings(user.uid, newSettings);
      setSettings(updatedSettings);
      setMessage({ type: 'success', text: '设置已保存' });
      
      // 3秒后清除消息
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('保存设置失败:', error);
      setMessage({ type: 'error', text: '保存设置失败' });
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = async (presetName: keyof typeof PRESET_CONFIGS) => {
    if (!user) return;

    try {
      setIsSaving(true);
      const updatedSettings = await userSettingsService.applyPresetConfig(user.uid, presetName);
      setSettings(updatedSettings);
      setMessage({ type: 'success', text: `已应用${PRESET_CONFIGS[presetName].description}` });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('应用预设失败:', error);
      setMessage({ type: 'error', text: '应用预设失败' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateDailyTarget = (dailyNewWords: number, dailyReviewWords: number) => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      dailyNewWords,
      dailyReviewWords,
      dailyTarget: dailyNewWords + dailyReviewWords
    };
    
    setSettings(newSettings);
    saveSettings({ dailyNewWords, dailyReviewWords });
  };

  const updateSettingValue = (key: keyof UserSettings, value: any) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings({ [key]: value });
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">加载设置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">学习设置</h1>
            <p className="text-gray-400">个性化你的学习体验</p>
          </div>

          {/* 消息提示 */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {message.text}
            </div>
          )}

          {/* 每日学习目标 */}
          <Card className="mb-8 p-6 bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold mb-4">每日学习目标</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  每日新单词数量: {settings.dailyNewWords}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={settings.dailyNewWords}
                  onChange={(e) => updateDailyTarget(parseInt(e.target.value), settings.dailyReviewWords)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  每日复习单词数量: {settings.dailyReviewWords}
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={settings.dailyReviewWords}
                  onChange={(e) => updateDailyTarget(settings.dailyNewWords, parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>0</span>
                  <span>200</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">每日总目标</span>
                <span className="text-2xl font-bold text-purple-400">{settings.dailyTarget}</span>
              </div>
            </div>
          </Card>

          {/* 预设配置 */}
          <Card className="mb-8 p-6 bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold mb-4">快速配置</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(PRESET_CONFIGS).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key as keyof typeof PRESET_CONFIGS)}
                  disabled={isSaving}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    settings.studyMode === key
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-center">
                    <h3 className="font-semibold mb-1">{config.studyMode.charAt(0).toUpperCase() + config.studyMode.slice(1)}</h3>
                    <p className="text-sm text-gray-400 mb-2">{config.description}</p>
                    <div className="text-xs text-gray-500">
                      新词 {config.dailyNewWords} · 复习 {config.dailyReviewWords}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* 学习偏好 */}
          <Card className="mb-8 p-6 bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold mb-4">学习偏好</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">语音播放</label>
                  <p className="text-sm text-gray-400">自动播放单词发音</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableVoice}
                    onChange={(e) => updateSettingValue('enableVoice', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">自动下一题</label>
                  <p className="text-sm text-gray-400">回答后自动跳转下一个单词</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoNext}
                    onChange={(e) => updateSettingValue('autoNext', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </Card>

          {/* 学习提醒 */}
          <Card className="mb-8 p-6 bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold mb-4">学习提醒</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">启用提醒</label>
                  <p className="text-sm text-gray-400">每日学习提醒</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableReminder}
                    onChange={(e) => updateSettingValue('enableReminder', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {settings.enableReminder && (
                <div>
                  <label className="block text-sm font-medium mb-2">提醒时间</label>
                  <input
                    type="time"
                    value={settings.reminderTime}
                    onChange={(e) => updateSettingValue('reminderTime', e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* 当前状态显示 */}
          <Card className="p-6 bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold mb-4">当前设置概览</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{settings.dailyNewWords}</div>
                <div className="text-sm text-gray-400">新单词/天</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{settings.dailyReviewWords}</div>
                <div className="text-sm text-gray-400">复习词/天</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{settings.dailyTarget}</div>
                <div className="text-sm text-gray-400">总目标</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 capitalize">{settings.studyMode}</div>
                <div className="text-sm text-gray-400">学习模式</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}