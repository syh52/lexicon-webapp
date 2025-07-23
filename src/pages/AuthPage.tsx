import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../components/ui';
import { Eye, EyeOff, ArrowLeft, User, Mail, Lock } from 'lucide-react';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const { 
    isLoggedIn, 
    login, 
    register, 
    isLoading: authLoading 
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 根据路径确定默认模式
  const isRegisterPath = location.pathname === '/register';
  const [authMode, setAuthMode] = useState<AuthMode>(isRegisterPath ? 'register' : 'login');
  
  // 当路径变化时同步 authMode
  useEffect(() => {
    const currentMode = location.pathname === '/register' ? 'register' : 'login';
    setAuthMode(currentMode);
  }, [location.pathname]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [rememberMe, setRememberMe] = useState(false);

  // 组件挂载时重置所有状态并加载记住的用户名
  useEffect(() => {
    const savedEmail = localStorage.getItem('lexicon_remembered_email');
    const savedRememberMe = localStorage.getItem('lexicon_remember_me') === 'true';
    
    setFormData({
      username: '',
      email: savedEmail || '',
      password: '',
      confirmPassword: ''
    });
    setRememberMe(savedRememberMe);
    setError('');
    setSuccess('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordStrength(0);
  }, []); 

  // 当模式切换时清空表单和消息
  useEffect(() => {
    const savedEmail = localStorage.getItem('lexicon_remembered_email');
    const savedRememberMe = localStorage.getItem('lexicon_remember_me') === 'true';
    
    setFormData({
      username: '',
      email: authMode === 'login' && savedRememberMe ? savedEmail || '' : '',
      password: '',
      confirmPassword: ''
    });
    setRememberMe(authMode === 'login' ? savedRememberMe : false);
    setError('');
    setSuccess('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordStrength(0);
  }, [authMode]);

  // 如果已登录，重定向到首页
  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  // 验证邮箱格式
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // 检查密码强度
  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^A-Za-z0-9]/)) strength++;
    return strength;
  };

  // 处理表单数据变化
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'password' && typeof value === 'string') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  // 处理记住我复选框变化
  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    if (!checked) {
      // 如果取消记住我，立即清除保存的邮箱
      localStorage.removeItem('lexicon_remembered_email');
      localStorage.removeItem('lexicon_remember_me');
    }
  };

  // 登录处理
  const handleLogin = async (e: React.FormEvent) => {
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
    
    if (!validateEmail(formData.email)) {
      setError('请输入有效的邮箱地址');
      setLoading(false);
      return;
    }

    if (!formData.password.trim()) {
      setError('请输入密码');
      setLoading(false);
      return;
    }

    try {
      await login(formData.email, formData.password);
      
      // 处理记住我功能
      if (rememberMe) {
        localStorage.setItem('lexicon_remembered_email', formData.email);
        localStorage.setItem('lexicon_remember_me', 'true');
      } else {
        localStorage.removeItem('lexicon_remembered_email');
        localStorage.removeItem('lexicon_remember_me');
      }
      
      setSuccess('登录成功！正在跳转...');
      navigate('/', { replace: true });
    } catch (error: any) {
      setError(error.message || '登录失败，请检查邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  // 注册处理
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // 表单验证
    if (!formData.username.trim()) {
      setError('请输入用户名');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('请输入邮箱地址');
      setLoading(false);
      return;
    }
    
    if (!validateEmail(formData.email)) {
      setError('请输入有效的邮箱地址');
      setLoading(false);
      return;
    }

    if (!formData.password.trim()) {
      setError('请输入密码');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('密码长度至少为8位');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    try {
      await register(formData.email, formData.password, formData.username);
      setSuccess('注册成功！正在跳转...');
      navigate('/', { replace: true });
    } catch (error: any) {
      setError(error.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取密码强度样式
  const getPasswordStrengthStyle = () => {
    if (passwordStrength === 0) return { width: '0%', backgroundColor: '#ef4444' };
    if (passwordStrength <= 2) return { width: '25%', backgroundColor: '#ef4444' };
    if (passwordStrength === 3) return { width: '50%', backgroundColor: '#f59e0b' };
    if (passwordStrength === 4) return { width: '75%', backgroundColor: '#3b82f6' };
    return { width: '100%', backgroundColor: '#10b981' };
  };

  // 获取密码强度文本
  const getPasswordStrengthText = () => {
    if (formData.password === '') return '';
    if (passwordStrength <= 2) return '密码强度：弱';
    if (passwordStrength === 3) return '密码强度：一般';
    if (passwordStrength === 4) return '密码强度：良好';
    return '密码强度：强';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex flex-col">
      {/* Mobile Container */}
      <div className="max-w-md mx-auto w-full min-h-screen bg-gray-900 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pt-12">
          <button 
            onClick={() => navigate('/')} 
            className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-all duration-200"
          >
            <ArrowLeft className="h-5 w-5 text-gray-300" />
          </button>
          <div className="w-10 h-10"></div>
        </div>

        {/* Main Content */}
        <main className="px-6 pb-8 -mt-4">
          {/* Logo and Welcome */}
          <div className="text-center mb-8 opacity-0 animate-fade-in-up">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path>
                <path d="M8.5 8.5v.01"></path>
                <path d="M16 15.5v.01"></path>
                <path d="M12 12v.01"></path>
              </svg>
            </div>
            <h2 className="text-2xl text-white tracking-tight mb-2 font-medium">
              {authMode === 'register' ? '创建账户' : 'Lexicon'}
            </h2>
            <p className="text-base text-gray-400">
              {authMode === 'register' 
                ? '加入 Lexicon，开始你的学习之旅' 
                : '欢迎回来，继续你的学习之旅'
              }
            </p>
          </div>

          {/* 错误和成功消息 */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm text-center">{success}</p>
            </div>
          )}

          {/* 登录表单 */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5 opacity-0 animate-fade-in-up animate-delay-200">
              {/* 邮箱输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">邮箱地址</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:bg-white/8 transition-all"
                    placeholder="输入你的邮箱"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* 密码输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full pl-10 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:bg-white/8 transition-all"
                    placeholder="输入你的密码"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 记住我和忘记密码 */}
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={rememberMe}
                    onChange={(e) => handleRememberMeChange(e.target.checked)}
                  />
                  <div className="relative">
                    <div className={`w-5 h-5 border rounded transition-all duration-200 ${
                      rememberMe 
                        ? 'bg-purple-500 border-purple-500' 
                        : 'bg-gray-700 border-gray-600'
                    }`}>
                      {rememberMe && (
                        <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="ml-2 text-sm text-gray-300">记住我</span>
                </label>
                <button type="button" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                  忘记密码？
                </button>
              </div>

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={loading || authLoading || !formData.email || !formData.password}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-4 rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || authLoading ? '登录中...' : '登录'}
              </button>
            </form>
          )}

          {/* 注册表单 */}
          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5 opacity-0 animate-fade-in-up animate-delay-200">
              {/* 用户名输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">用户名</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="w-full pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:bg-white/8 transition-all"
                    placeholder="输入你的用户名"
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* 邮箱输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">邮箱地址</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:bg-white/8 transition-all"
                    placeholder="输入你的邮箱"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* 密码输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full pl-10 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:bg-white/8 transition-all"
                    placeholder="设置你的密码"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* 密码强度指示器 */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-300 rounded-full"
                        style={getPasswordStrengthStyle()}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{getPasswordStrengthText()}</p>
                  </div>
                )}
              </div>

              {/* 确认密码输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full pl-10 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:bg-white/8 transition-all"
                    placeholder="再次输入密码"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* 密码匹配提示 */}
                {formData.confirmPassword && (
                  <p className={`text-xs mt-1 ${formData.password === formData.confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                    {formData.password === formData.confirmPassword ? '密码匹配' : '密码不匹配'}
                  </p>
                )}
              </div>

              {/* 注册按钮 */}
              <button
                type="submit"
                disabled={loading || authLoading || !formData.username || !formData.email || !formData.password || !formData.confirmPassword}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-4 rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || authLoading ? '创建中...' : '创建账户'}
              </button>
            </form>
          )}

          {/* 切换模式 */}
          <div className="text-center mt-8 opacity-0 animate-fade-in-up animate-delay-600">
            <p className="text-gray-400">
              {authMode === 'login' ? '还没有账户？' : '已有账户？'}
              <button 
                onClick={() => {
                  const newMode = authMode === 'login' ? 'register' : 'login';
                  navigate(`/${newMode}`, { replace: true });
                }}
                className="text-purple-400 hover:text-purple-300 transition-colors font-medium ml-1"
              >
                {authMode === 'login' ? '立即注册' : '立即登录'}
              </button>
            </p>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .animate-delay-200 {
          animation-delay: 0.2s;
        }
        .animate-delay-400 {
          animation-delay: 0.4s;
        }
        .animate-delay-600 {
          animation-delay: 0.6s;
        }
      `}</style>
    </div>
  );
}