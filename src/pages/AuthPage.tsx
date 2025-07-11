import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User, Zap, BookOpen, Award, TrendingUp, Mail, Lock, ArrowRight } from 'lucide-react';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const { isLoggedIn, login, register, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 根据路径确定默认模式
  const isRegisterPath = location.pathname === '/register';
  const [authMode, setAuthMode] = useState<AuthMode>(isRegisterPath ? 'register' : 'login');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  // 当模式切换时清空表单和消息
  useEffect(() => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: ''
    });
    setError('');
    setSuccess('');
  }, [authMode]);

  // 如果已登录，重定向到首页
  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  const handleAnonymousLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login();
      navigate('/');
    } catch (error: any) {
      setError('登录失败，请重试');
      console.error('登录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // 表单验证
    if (!formData.email.trim()) {
      setError('请输入邮箱地址');
      setLoading(false);
      return;
    }

    if (!formData.password.trim()) {
      setError('请输入密码');
      setLoading(false);
      return;
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('邮箱格式不正确');
      setLoading(false);
      return;
    }

    try {
      if (authMode === 'register') {
        // 注册模式验证
        if (formData.password.length < 6) {
          setError('密码长度至少6位');
          setLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('两次输入的密码不一致');
          setLoading(false);
          return;
        }

        await register(formData.email, formData.password);
        setSuccess('注册成功！请使用邮箱和密码登录');
        
        // 注册成功后自动切换到登录模式
        setTimeout(() => {
          setAuthMode('login');
          setFormData({ email: formData.email, password: '', confirmPassword: '' });
        }, 1500);
      } else {
        // 登录模式
        await login(formData.email, formData.password);
        setSuccess('登录成功！正在跳转...');
        setTimeout(() => {
          navigate('/');
        }, 1000);
      }
    } catch (error: any) {
      setError(error.message || (authMode === 'register' ? '注册失败，请重试' : '登录失败，请检查邮箱和密码'));
      console.error('认证失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: BookOpen,
      title: '智能记忆',
      description: '基于FSRS算法的科学记忆方法'
    },
    {
      icon: Zap,
      title: '高效学习',
      description: '碎片化时间，随时随地背单词'
    },
    {
      icon: Award,
      title: '等级系统',
      description: '成就解锁，让学习更有趣'
    },
    {
      icon: TrendingUp,
      title: '数据统计',
      description: '详细的学习进度和记忆曲线'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* 左侧：产品介绍 */}
        <div className="space-y-6 text-white">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Lexicon
            </h1>
            <p className="text-xl text-gray-300">
              为吉祥航空安全员量身定制的英语学习平台
            </p>
            <p className="text-gray-400">
              利用科学的记忆算法，让英语学习更高效、更有趣
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                <feature.icon className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：认证卡片 */}
        <div className="w-full max-w-lg mx-auto">
          <Card className="glass-dark border-gray-700/50 overflow-hidden">
            <CardHeader className="space-y-4 text-center pb-4">
              {/* 模式切换标签 */}
              <div className="flex bg-gray-800/50 rounded-lg p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                    authMode === 'login'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  登录
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                    authMode === 'register'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  注册
                </button>
              </div>

              <div>
                <CardTitle className="text-2xl font-bold text-white mb-2">
                  {authMode === 'register' ? '创建账户' : '登录账户'}
                </CardTitle>
                <p className="text-gray-400 text-sm">
                  {authMode === 'register' 
                    ? '注册后可跨设备同步学习进度' 
                    : '使用邮箱登录继续学习'
                  }
                </p>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-8 pt-0">
              {/* 错误和成功消息 */}
              {error && (
                <div className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20 backdrop-blur-sm">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="text-green-400 text-sm text-center bg-green-500/10 p-3 rounded-lg border border-green-500/20 backdrop-blur-sm">
                  {success}
                </div>
              )}

              {/* 邮箱登录/注册表单 */}
              <form onSubmit={handleEmailAuth} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300 block">邮箱</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="email"
                      placeholder="输入邮箱地址"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-14"
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300 block">密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="password"
                      placeholder={authMode === 'register' ? '设置密码（至少6位）' : '输入密码'}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-14"
                      disabled={loading}
                      autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                    />
                  </div>
                </div>

                {authMode === 'register' && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300 block">确认密码</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        type="password"
                        placeholder="再次输入密码"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-14"
                        disabled={loading}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 h-14 transition-all duration-200"
                  disabled={loading || authLoading || !formData.email || !formData.password}
                >
                  {loading || authLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{authMode === 'register' ? '注册中...' : '登录中...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>{authMode === 'register' ? '立即注册' : '立即登录'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-600/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-900/80 px-3 text-gray-500">或者</span>
                </div>
              </div>

              {/* 匿名登录按钮 */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-gray-600/50 text-gray-300 hover:bg-gray-800/50 hover:border-gray-500 h-14 transition-all duration-200"
                onClick={handleAnonymousLogin}
                disabled={loading || authLoading}
              >
                <User className="w-4 h-4 mr-2" />
                游客模式快速体验
              </Button>

              {/* 功能特性 */}
              <div className="space-y-3 text-xs text-gray-500 border-t border-gray-700/50 pt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>支持邮箱登录和游客模式</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>数据自动保存到云端</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>支持多设备同步</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}