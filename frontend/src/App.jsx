import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ui/ProtectedRoute'
import RouteNav from './components/layout/RouteNav'
import { ActivityProvider } from './contexts/ActivityContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProfileProvider } from './contexts/ProfileContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { UserLibraryProvider } from './contexts/UserLibraryContext'
import ActionToast from './components/ui/ActionToast'
import AdminLayout from './components/layout/AdminLayout'

const LoginPage              = lazy(() => import('./pages/auth/LoginPage'))
const SignupPage             = lazy(() => import('./pages/auth/SignupPage'))
const LandingPage            = lazy(() => import('./pages/LandingPage'))
const DashboardPage          = lazy(() => import('./pages/user/DashboardPage'))
const ActivityPage           = lazy(() => import('./pages/user/ActivityPage'))
const ProfilePage            = lazy(() => import('./pages/user/ProfilePage'))
const CatalogPage            = lazy(() => import('./pages/user/CatalogPage'))
const MaterialDetailPage     = lazy(() => import('./pages/user/MaterialDetailPage'))
const SaveHistoryPage        = lazy(() => import('./pages/user/SaveHistoryPage'))
const AdminAnalyticsPage     = lazy(() => import('./pages/admin/AdminAnalyticsPage'))
const AdminUsersPage         = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminUserFormPage      = lazy(() => import('./pages/admin/AdminUserFormPage'))
const AdminBorrowsPage       = lazy(() => import('./pages/admin/AdminBorrowsPage'))
const MaterialsPage          = lazy(() => import('./pages/admin/MaterialsPage'))
const MaterialsFilesPage     = lazy(() => import('./pages/admin/MaterialsFilesPage'))
const AddMaterialPage        = lazy(() => import('./pages/admin/AddMaterialPage'))
const UpdateMaterialPage     = lazy(() => import('./pages/admin/UpdateMaterialPage'))
const AdminSavedHistoryPage  = lazy(() => import('./pages/admin/AdminSavedHistoryPage'))
const AdminBorrowHistoryPage = lazy(() => import('./pages/admin/AdminBorrowHistoryPage'))

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f0f' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #2a2a2a', borderTop: '3px solid #e9c176', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AppNav() {
  const { pathname } = useLocation()
  if (['/','','/login','/signup'].includes(pathname)) return null
  return (
    <div className="hidden md:block">
      <RouteNav />
    </div>
  )
}

function UserRouteWrapper({ children }) {
  const { role } = useAuth()
  const isAdmin = role === 'admin' || role === 'superadmin'
  if (isAdmin) return <AdminLayout>{children}</AdminLayout>
  return children
}

function AdminPageWrapper({ children }) {
  return <AdminLayout>{children}</AdminLayout>
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <ThemeProvider>
        <ProfileProvider>
          <ActivityProvider>
          <UserLibraryProvider>
        <AppNav />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/user/dashboard"
              element={
                <ProtectedRoute>
                  <UserRouteWrapper><DashboardPage /></UserRouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/activity"
              element={
                <ProtectedRoute>
                  <UserRouteWrapper><ActivityPage /></UserRouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route path="/user/dashboard-files" element={<Navigate to="/user/dashboard" replace />} />
            <Route
              path="/user/catalog"
              element={
                <ProtectedRoute>
                  <UserRouteWrapper><CatalogPage /></UserRouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/materials/:id"
              element={
                <ProtectedRoute>
                  <UserRouteWrapper><MaterialDetailPage /></UserRouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/profile"
              element={
                <ProtectedRoute>
                  <UserRouteWrapper><ProfilePage /></UserRouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/save-history"
              element={
                <ProtectedRoute>
                  <UserRouteWrapper><SaveHistoryPage /></UserRouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPageWrapper><AdminAnalyticsPage /></AdminPageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/borrows"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPageWrapper><AdminBorrowsPage /></AdminPageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPageWrapper><AdminUsersPage /></AdminPageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/new"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPageWrapper><AdminUserFormPage /></AdminPageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/:id/edit"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPageWrapper><AdminUserFormPage /></AdminPageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/materials"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPageWrapper><MaterialsPage /></AdminPageWrapper>
                </ProtectedRoute>
              }
            />
            <Route path="/admin/materials/actions" element={<Navigate to="/admin/materials" replace />} />
            <Route
              path="/admin/materials/files"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPageWrapper><MaterialsFilesPage /></AdminPageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/materials/add"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPageWrapper><AddMaterialPage /></AdminPageWrapper>
                </ProtectedRoute>
              }
            />
            <Route path="/admin/materials/add-files" element={<Navigate to="/admin/materials/add" replace />} />
            <Route
              path="/admin/borrow-history"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPageWrapper><AdminBorrowHistoryPage /></AdminPageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/saved-history"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPageWrapper><AdminSavedHistoryPage /></AdminPageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/materials/:id/edit"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPageWrapper><UpdateMaterialPage /></AdminPageWrapper>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
        <ActionToast />
        </UserLibraryProvider>
          </ActivityProvider>
        </ProfileProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
