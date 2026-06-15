import { createContext, useContext, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../contexts/ProfileContext'
import { LibrarianSidebarNav } from '../navigation/LibrarianSidebarNav'
import { navBtn, P } from '../../routes/appPaths'

const AdminLayoutCtx = createContext(() => {})
export const useAdminMobileNav = () => useContext(AdminLayoutCtx)

const BOTTOM_NAV = [
  { to: P.adminAnalytics, label: 'Overview',  icon: 'analytics',     end: true  },
  { to: P.adminMaterials, label: 'Books',      icon: 'library_books', end: false },
  { to: P.adminBorrows,   label: 'Borrows',    icon: 'local_library', end: true  },
  { to: P.adminUsers,     label: 'Members',    icon: 'group',         end: false },
]

function getInitialSidebarOpen() {
  try {
    const stored = localStorage.getItem('admin-sidebar-open')
    return stored === null ? true : stored === 'true'
  } catch {
    return true
  }
}

export default function AdminLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, role } = useAuth()
  const { profileName, profilePicture } = useProfile()
  const [mobileNav, setMobileNav] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen)

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev
      try { localStorage.setItem('admin-sidebar-open', String(next)) } catch {}
      return next
    })
  }

  const sidebarInner = (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-outline-variant flex items-center gap-2.5 shrink-0">
        <span className="material-symbols-outlined text-primary">local_library</span>
        <span className="font-title-md text-title-md font-bold text-primary">Scholarly</span>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wider">
          Admin
        </span>
      </div>

      {/* Profile */}
      <button
        type="button"
        className="px-5 py-4 flex items-center gap-3 w-full text-left hover:bg-surface-container transition-colors border-0 bg-transparent cursor-pointer border-b border-outline-variant shrink-0"
        onClick={() => { navigate(P.userProfile); setMobileNav(false) }}
      >
        <div className="w-9 h-9 rounded-full overflow-hidden bg-primary-container shrink-0">
          <img alt="Profile" className="w-full h-full object-cover" src={profilePicture} />
        </div>
        <div className="min-w-0">
          <p className="font-label-md text-label-md font-bold text-primary truncate">{profileName}</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant capitalize">{role}</p>
        </div>
      </button>

      {/* Nav */}
      <LibrarianSidebarNav
        variant="spacious"
        onItemClick={() => setMobileNav(false)}
        className="flex-1 overflow-y-auto space-y-1 pr-4 py-4"
      />

      {/* Footer */}
      <div className="px-5 py-4 border-t border-outline-variant shrink-0">
        <button
          type="button"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-error hover:bg-error-container/50 transition-colors border-0 bg-transparent cursor-pointer font-label-sm text-label-sm"
          onClick={() => { logout(); navigate(P.login, { replace: true }) }}
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Log out
        </button>
        <p className="text-[10px] text-outline px-3 pt-1">My Library System v0.0.1</p>
      </div>
    </div>
  )

  return (
    <AdminLayoutCtx.Provider value={() => setMobileNav(true)}>

      {/* ── Mobile top app bar ── */}
      <header className="md:hidden sticky top-0 z-40 bg-surface-container border-b border-outline-variant shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={`${navBtn} p-2 rounded-full hover:bg-surface-container-high active:scale-95`}
              onClick={() => setMobileNav(true)}
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[22px]">menu</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">local_library</span>
              <span className="font-bold text-title-md text-primary leading-none">Scholarly</span>
            </div>
          </div>
          <button
            type="button"
            className={`${navBtn} w-9 h-9 rounded-full overflow-hidden ring-2 ring-outline-variant active:scale-95`}
            onClick={() => navigate(P.userProfile)}
            aria-label="Profile"
          >
            <img src={profilePicture} alt={profileName ?? 'Profile'} className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden md:flex flex-col fixed top-[88px] bottom-0 left-0 bg-surface-container-low border-r border-outline-variant z-40 overflow-hidden transition-[width] duration-300 ease-in-out ${sidebarOpen ? 'w-72' : 'w-0'}`}
      >
        {sidebarInner}
      </aside>

      {/* ── Desktop sidebar toggle tab ── */}
      <button
        type="button"
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        onClick={toggleSidebar}
        className={`hidden md:flex items-center justify-center fixed top-[104px] z-50 h-10 w-5 rounded-r-lg border border-l-0 border-outline-variant bg-surface-container-low text-on-surface-variant shadow-sm hover:bg-surface-container hover:text-primary transition-all duration-300 ease-in-out ${sidebarOpen ? 'left-72' : 'left-0'}`}
      >
        <span className="material-symbols-outlined text-[16px]">
          {sidebarOpen ? 'chevron_left' : 'chevron_right'}
        </span>
      </button>

      {/* ── Mobile drawer overlay ── */}
      {mobileNav && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[110] bg-black/40 md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileNav(false)}
          />
          <aside className="fixed left-0 top-0 z-[120] flex h-full w-[min(100%,18rem)] flex-col border-r border-outline-variant bg-surface-container-low shadow-xl md:hidden">
            <div className="flex items-center justify-end border-b border-outline-variant/80 px-3 py-2 shrink-0">
              <button
                type="button"
                className="border-0 bg-transparent cursor-pointer p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high"
                onClick={() => setMobileNav(false)}
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {sidebarInner}
          </aside>
        </>
      )}

      {/* ── Main content ── */}
      <div
        className={`min-h-screen bg-surface text-on-surface transition-[margin-left] duration-300 ease-in-out pb-20 md:pb-0 md:pt-[88px] ${sidebarOpen ? 'md:ml-72' : 'md:ml-0'}`}
      >
        {children}
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav
        aria-label="Bottom navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-outline-variant shadow-lg"
      >
        <div className="flex justify-around items-center px-2 py-1">
          {BOTTOM_NAV.map((item) => {
            const isActive = matchPath({ path: item.to, end: item.end }, location.pathname) != null
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className={`${navBtn} flex flex-col items-center gap-0.5 py-2 px-3 rounded-2xl transition-all active:scale-90 min-w-[56px] ${
                  isActive ? 'text-secondary' : 'text-on-surface-variant'
                }`}
              >
                <span
                  className={`relative flex items-center justify-center w-12 h-6 rounded-full transition-all ${
                    isActive ? 'bg-secondary-container' : ''
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                </span>
                <span className={`text-[10px] font-bold leading-none ${isActive ? 'text-secondary' : ''}`}>
                  {item.label}
                </span>
              </button>
            )
          })}

          {/* More — opens the full drawer */}
          <button
            type="button"
            onClick={() => setMobileNav(true)}
            className={`${navBtn} flex flex-col items-center gap-0.5 py-2 px-3 rounded-2xl transition-all active:scale-90 min-w-[56px] text-on-surface-variant`}
          >
            <span className="relative flex items-center justify-center w-12 h-6 rounded-full transition-all">
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </span>
            <span className="text-[10px] font-bold leading-none">More</span>
          </button>
        </div>
      </nav>

    </AdminLayoutCtx.Provider>
  )
}
