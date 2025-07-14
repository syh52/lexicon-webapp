import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import WordbooksPage from './pages/WordbooksPage'
import StudyPage from './pages/StudyPage'
import StatsPage from './pages/StatsPage'
import ProfilePage from './pages/ProfilePage'
import AppLayout from './components/layout/AppLayout'
import { StagewiseToolbar } from '@stagewise/toolbar-react'
import ReactPlugin from '@stagewise-plugins/react'
import './App.css'

// 在开发环境引入配置验证
if (process.env.NODE_ENV === 'development') {
  import('./utils/cloudbase-test.js').then(({ validateConfiguration }) => {
    // 延迟执行配置验证
    setTimeout(() => {
      validateConfiguration().catch(console.error);
    }, 3000);
  }).catch(console.error);
}

function App() {
  return (
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
            <Route path="/chat" element={<div className="p-8 text-white text-center">智能对话功能开发中...</div>} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </AppLayout>
        <StagewiseToolbar config={{ plugins: [ReactPlugin] }} />
      </Router>
    </AuthProvider>
  )
}

export default App
