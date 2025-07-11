import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import WordbooksPage from './pages/WordbooksPage'
import StatsPage from './pages/StatsPage'
import ProfilePage from './pages/ProfilePage'
import AppLayout from './components/layout/AppLayout'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/vocabulary" element={<WordbooksPage />} />
            <Route path="/wordbooks" element={<WordbooksPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/chat" element={<div className="p-8 text-white text-center">智能对话功能开发中...</div>} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </AppLayout>
      </Router>
    </AuthProvider>
  )
}

export default App
