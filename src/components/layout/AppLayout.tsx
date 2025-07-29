import React from 'react';
import { useLocation } from 'react-router-dom';
import MobileHeader from './MobileHeader';
import PerspectiveProvider from '../shared/PerspectiveProvider';
import { BACKGROUNDS } from '../../constants/design';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;
  const noMobileLayoutPaths = ['/login', '/register']; // Paths where mobile layout should not be shown
  const fullScreenPaths = ['/chat']; // Paths that need full screen layout
  const isHomePage = pathname === '/'; // 检查是否为首页
  const isFullScreen = fullScreenPaths.includes(pathname); // 检查是否为全屏页面

  const showMobileLayout = !noMobileLayoutPaths.includes(pathname) && !isFullScreen;

  if (!showMobileLayout) {
    // For login/register pages, use a simple centered layout
    if (noMobileLayoutPaths.includes(pathname)) {
      return (
        <div className={`${BACKGROUNDS.FULLSCREEN} flex items-center justify-center p-4`}>
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      );
    }
    
    // For full screen pages like chat, use minimal layout
    if (isFullScreen) {
      return <>{children}</>;
    }
  }

  return (
    <PerspectiveProvider>
      {/* Main Content Container - 桌面端使用更宽的布局 */}
      <div className={`w-full ${BACKGROUNDS.PRIMARY} min-h-screen relative overflow-hidden perspective-1000`}>
        {/* Simplified Status Bar - Empty spacer */}
        <div className="h-[34px] relative z-50"></div>
        
        {/* Header */}
        <MobileHeader />
        
        {/* Main Content - 桌面端使用更合适的内边距 */}
        <main className="flex-grow px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 overflow-y-auto scrollbar-thin relative z-10 pb-6">
          {children}
        </main>
      </div>
    </PerspectiveProvider>
  );
}