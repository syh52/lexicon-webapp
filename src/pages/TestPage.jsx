import React, { useState, useEffect } from 'react';
import cloudbase from '@cloudbase/js-sdk';

const TestPage = () => {
  const [tests, setTests] = useState({
    cloudbase: { status: 'pending', result: null },
    functions: { status: 'pending', result: null },
    audio: { status: 'pending', result: null }
  });

  const updateTestStatus = (testName, status, result = null) => {
    setTests(prev => ({
      ...prev,
      [testName]: { status, result }
    }));
  };

  // 测试CloudBase连接
  const testCloudBase = async () => {
    updateTestStatus('cloudbase', 'running');
    try {
      // 检查SDK版本
      const sdkInfo = {
        version: cloudbase.version || 'unknown',
        hasAuth: typeof cloudbase.auth === 'function'
      };

      const app = cloudbase.init({
        env: 'cloud1-7g7oatv381500c81',
        clientId: 'cloud1-7g7oatv381500c81'  // 添加clientId参数
      });

      // 尝试匿名登录
      const auth = app.auth({
        persistence: 'local'
      });
      
      // 先检查当前登录状态
      let loginState = await auth.getLoginState();
      
      if (!loginState || !loginState.isLoggedIn) {
        // 如果没有登录，尝试匿名登录
        await auth.signInAnonymously();
        loginState = await auth.getLoginState();
      }
      
      updateTestStatus('cloudbase', 'success', {
        env: 'cloud1-7g7oatv381500c81',
        sdkInfo,
        loginState: {
          isLoggedIn: loginState.isLoggedIn,
          loginType: loginState.loginType,
          uid: loginState.user?.uid
        }
      });
      
      return app;
    } catch (error) {
      console.error('CloudBase connection error:', error);
      updateTestStatus('cloudbase', 'error', error.message || error.toString());
      throw error;
    }
  };

  // 测试云函数
  const testFunctions = async () => {
    updateTestStatus('functions', 'running');
    try {
      const app = cloudbase.init({
        env: 'cloud1-7g7oatv381500c81',
        clientId: 'cloud1-7g7oatv381500c81'  // 添加clientId参数
      });
      
      const auth = app.auth({
        persistence: 'local'
      });
      
      await auth.signInAnonymously();
      
      // 测试AI对话函数
      const result = await app.callFunction({
        name: 'ai-chat',
        data: {
          messages: [
            { role: 'user', content: 'Hello, this is a test message.' }
          ],
          userLevel: 'intermediate',
          scenario: 'general'
        }
      });
      
      updateTestStatus('functions', 'success', result);
    } catch (error) {
      updateTestStatus('functions', 'error', error.message);
    }
  };

  // 测试音频权限
  const testAudio = async () => {
    updateTestStatus('audio', 'running');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      updateTestStatus('audio', 'success', {
        audioTracks: stream.getAudioTracks().length,
        active: stream.active
      });
      
      // 停止流
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      updateTestStatus('audio', 'error', error.message);
    }
  };

  // 运行所有测试
  const runAllTests = async () => {
    try {
      await testCloudBase();
      await testFunctions();
      await testAudio();
    } catch (error) {
      console.error('测试失败:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'running': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '⏳';
      default: return '⭕';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🧪 语音AI助手测试</h1>
          <p className="text-gray-300">系统功能完整性测试</p>
        </header>

        {/* 测试控制 */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">测试控制</h2>
            <button
              onClick={runAllTests}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              运行所有测试
            </button>
          </div>
        </div>

        {/* 测试结果 */}
        <div className="space-y-4">
          {/* CloudBase连接测试 */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                {getStatusIcon(tests.cloudbase.status)} CloudBase连接测试
              </h3>
              <button
                onClick={testCloudBase}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                单独测试
              </button>
            </div>
            <div className={`text-sm ${getStatusColor(tests.cloudbase.status)} mb-2`}>
              状态: {tests.cloudbase.status}
            </div>
            {tests.cloudbase.result && (
              <pre className="bg-gray-800 p-3 rounded text-gray-300 text-xs overflow-x-auto">
                {typeof tests.cloudbase.result === 'object' 
                  ? JSON.stringify(tests.cloudbase.result, null, 2)
                  : tests.cloudbase.result
                }
              </pre>
            )}
          </div>

          {/* 云函数测试 */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                {getStatusIcon(tests.functions.status)} 云函数调用测试
              </h3>
              <button
                onClick={testFunctions}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                单独测试
              </button>
            </div>
            <div className={`text-sm ${getStatusColor(tests.functions.status)} mb-2`}>
              状态: {tests.functions.status}
            </div>
            {tests.functions.result && (
              <pre className="bg-gray-800 p-3 rounded text-gray-300 text-xs overflow-x-auto">
                {typeof tests.functions.result === 'object' 
                  ? JSON.stringify(tests.functions.result, null, 2)
                  : tests.functions.result
                }
              </pre>
            )}
          </div>

          {/* 音频权限测试 */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                {getStatusIcon(tests.audio.status)} 音频权限测试
              </h3>
              <button
                onClick={testAudio}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                单独测试
              </button>
            </div>
            <div className={`text-sm ${getStatusColor(tests.audio.status)} mb-2`}>
              状态: {tests.audio.status}
            </div>
            {tests.audio.result && (
              <pre className="bg-gray-800 p-3 rounded text-gray-300 text-xs overflow-x-auto">
                {typeof tests.audio.result === 'object' 
                  ? JSON.stringify(tests.audio.result, null, 2)
                  : tests.audio.result
                }
              </pre>
            )}
          </div>
        </div>

        {/* 系统信息 */}
        <div className="glass-card rounded-2xl p-6 mt-6">
          <h3 className="text-lg font-medium text-white mb-4">系统信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">浏览器: </span>
              <span className="text-white">{navigator.userAgent.split(' ').pop()}</span>
            </div>
            <div>
              <span className="text-gray-400">支持WebRTC: </span>
              <span className="text-white">{'mediaDevices' in navigator ? '✅' : '❌'}</span>
            </div>
            <div>
              <span className="text-gray-400">支持WebSocket: </span>
              <span className="text-white">{'WebSocket' in window ? '✅' : '❌'}</span>
            </div>
            <div>
              <span className="text-gray-400">支持AudioContext: </span>
              <span className="text-white">{'AudioContext' in window || 'webkitAudioContext' in window ? '✅' : '❌'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;