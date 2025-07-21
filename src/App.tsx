import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import WordbooksPage from './pages/WordbooksPage'
import StudyPage from './pages/StudyPage'
import StatsPage from './pages/StatsPage'
import ProfilePage from './pages/ProfilePage'
import UploadPage from './pages/UploadPage'
import SettingsPage from './pages/SettingsPage'
import AppLayout from './components/layout/AppLayout'
// import { StagewiseToolbar } from '@stagewise/toolbar-react'
// import ReactPlugin from '@stagewise-plugins/react'
import './App.css'

// 在开发环境引入配置验证
// if (process.env.NODE_ENV === 'development') {
//   import('./utils/debug').then(({ validateConfiguration }) => {
//     // 延迟执行配置验证
//     setTimeout(() => {
//       validateConfiguration().catch(console.error);
//     }, 3000);
//   }).catch(console.error);
// }

// 简单的错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('应用错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">应用加载失败</h2>
            <p className="text-gray-400 mb-4">请刷新页面重试</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppLayout>
            <Routes>
              <Route path="/login" element={<AuthPage />} />
              <Route path="/register" element={<AuthPage />} />
              <Route path="/" element={<HomePage />} />
              <Route path="/wordbooks" element={<WordbooksPage />} />
              <Route path="/study/:wordbookId" element={<StudyPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/chat" element={<div className="p-8 text-white text-center">智能对话功能开发中...</div>} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </AppLayout>
          {/* <StagewiseToolbar config={{ plugins: [ReactPlugin] }} /> */}
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
