import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import RequireAuth from './components/auth/RequireAuth'
import { lazyRoutes } from './utils/lazyLoader'
import AppLayout from './components/layout/AppLayout'
import { StagewiseToolbar } from '@stagewise/toolbar-react'
import ReactPlugin from '@stagewise-plugins/react'
import './App.css'

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
              <Route path="/login" element={<lazyRoutes.AuthPage />} />
              <Route path="/register" element={<lazyRoutes.AuthPage />} />
              <Route path="/" element={<lazyRoutes.HomePage />} />
              <Route path="/wordbooks" element={
                <RequireAuth>
                  <lazyRoutes.WordbooksPage />
                </RequireAuth>
              } />
              <Route path="/study/:wordbookId" element={
                <RequireAuth>
                  <lazyRoutes.StudyPage />
                </RequireAuth>
              } />
              <Route path="/stats" element={
                <RequireAuth>
                  <lazyRoutes.StatsPage />
                </RequireAuth>
              } />
              <Route path="/profile" element={
                <RequireAuth>
                  <lazyRoutes.ProfilePage />
                </RequireAuth>
              } />
              <Route path="/upload" element={
                <RequireAuth requireAdmin={true}>
                  <lazyRoutes.UploadPage />
                </RequireAuth>
              } />
              <Route path="/admin" element={
                <RequireAuth requireAdmin={true}>
                  <lazyRoutes.AdminPage />
                </RequireAuth>
              } />
              <Route path="/voice-assistant" element={
                <RequireAuth>
                  <lazyRoutes.VoiceAssistantPage />
                </RequireAuth>
              } />
              <Route path="/test" element={<lazyRoutes.TestPage />} />
              <Route path="*" element={<lazyRoutes.NotFoundPage />} />
            </Routes>
          </AppLayout>
        </Router>
      </AuthProvider>
      <StagewiseToolbar 
        config={{
          plugins: [ReactPlugin]
        }}
      />
    </ErrorBoundary>
  )
}

export default App
