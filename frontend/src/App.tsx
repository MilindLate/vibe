// src/App.tsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './context/AuthContext';
import { Suspense, lazy } from 'react';
import Sidebar from './components/common/Sidebar';
import BottomNav from './components/common/BottomNav';
import Header from './components/common/Header';
import { Loading } from './components/common/Loading';

// Lazy-loaded pages
const VideoFeed = lazy(() => import('./components/feed/VideoFeed'));
const SearchPage = lazy(() => import('./components/search/SearchPage'));
const UploadPage = lazy(() => import('./components/upload/UploadPage'));
const ProfilePage = lazy(() => import('./components/profile/ProfilePage'));
const MessagesPage = lazy(() => import('./components/chat/MessagesPage'));
const NotificationsPage = lazy(() => import('./components/notifications/NotificationsPage'));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'));
const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const RegisterPage = lazy(() => import('./components/auth/RegisterPage'));

// Admin pages
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const DashboardPage = lazy(() => import('./components/admin/DashboardPage'));
const UsersPage = lazy(() => import('./components/admin/UsersPage'));
const VideosPage = lazy(() => import('./components/admin/VideosPage'));
const AnalyticsPage = lazy(() => import('./components/admin/AnalyticsPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

// Feed pages get NO header and NO bottom padding so they're truly full-screen
const FEED_PATHS = ['/', '/following'];

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isFeed = FEED_PATHS.includes(location.pathname);

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Desktop sidebar — always shown */}
      <aside className="hidden md:flex flex-col w-64 border-r border-vibe-border flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Main content column */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header — hidden on feed pages so video fills full height */}
        {!isFeed && <Header />}

        {/* Content area — on feed pages takes full remaining height */}
        <div className={`flex-1 min-h-0 ${isFeed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </nav>
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Suspense fallback={<Loading fullScreen />}>
      <Routes>
        {/* Auth pages — no layout */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />

        {/* Admin pages */}
        <Route path="/admin" element={<AdminRoute><DashboardPage /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="/admin/videos" element={<AdminRoute><VideosPage /></AdminRoute>} />
        <Route path="/admin/analytics" element={<AdminRoute><AnalyticsPage /></AdminRoute>} />

        {/* App pages — with layout */}
        <Route
          path="/*"
          element={
            <AppLayout>
              <Routes>
                <Route path="/" element={<VideoFeed type="foryou" />} />
                <Route path="/following" element={
                  <ProtectedRoute><VideoFeed type="following" /></ProtectedRoute>
                } />
                <Route path="/explore" element={<SearchPage />} />
                <Route path="/upload" element={
                  <ProtectedRoute><UploadPage /></ProtectedRoute>
                } />
                <Route path="/profile/:username" element={<ProfilePage />} />
                <Route path="/settings" element={
                  <ProtectedRoute><SettingsPage /></ProtectedRoute>
                } />
                <Route path="/messages" element={
                  <ProtectedRoute><MessagesPage /></ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute><NotificationsPage /></ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          }
        />
      </Routes>
    </Suspense>
  );
}
