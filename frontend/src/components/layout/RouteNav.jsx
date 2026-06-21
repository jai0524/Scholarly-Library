import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../contexts/ProfileContext'
import { P } from '../../routes/appPaths'

/* RouteNav always sits on a deep-dark gradient background,
   so we use explicit white/gold colours — not theme-aware vars. */




const linkClass = (isActive) =>
  [
    'cursor-pointer rounded-lg border-0 bg-transparent px-2.5 py-1 font-inherit text-label-sm transition-all active:scale-95',
    isActive
      ? 'bg-[rgba(233,193,118,0.15)] text-[#e9c176] font-bold'
      : 'text-white/70 hover:text-white hover:bg-white/8',
  ].join(' ')

const PATRON_ITEMS = [
  { to: P.userDashboard, label: 'Home',    end: true },
  { to: P.userCatalog,   label: 'Collection',  end: true },
  { to: P.userActivity,  label: 'History', end: true },
  { to: P.userProfile,   label: 'Account', end: true },
]

const LIBRARIAN_ITEMS = [
  { to: P.adminAnalytics,    label: 'Analytics',   end: true },
  { to: P.adminBorrows,      label: 'Item Request',     end: true },
  { to: P.adminUsers,        label: 'Users',     end: true },
  { to: P.adminMaterials,    label: 'Items List', end: true },
  { to: P.adminMaterialsAdd, label: 'Add Items',   end: true },
]

function navGroupsForUser(isAuthenticated, role) {
  const groups = []
  if (!isAuthenticated) {
    groups.push({ label: 'Account', items: [{ to: P.login, label: 'Log in', end: true }] })
    return groups
  }
  groups.push({ label: 'Student', items: PATRON_ITEMS })
  if (role === 'admin' || role === 'superadmin') {
    groups.push({ label: role === 'superadmin' ? 'Super Admin' : 'Librarian', items: LIBRARIAN_ITEMS })
  }
  return groups
}

export default function RouteNav() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { isAuthenticated, role, logout } = useAuth()
  const groups = navGroupsForUser(isAuthenticated, role)
  const {profileName} = useProfile();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed top-0 z-[100] px-3 py-2 w-full"
      style={{
        background:   'linear-gradient(135deg, #06060e 0%, #0e0c18 45%, #100e1c 100%)',
        borderBottom: '1px solid rgba(233,193,118,0.10)',
        boxShadow:    '0 2px 20px rgba(0,0,0,0.50)',
      }}
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-1.5">

        {/* Row 1 — brand + logout */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 border-0 bg-transparent font-inherit text-left"
            onClick={() =>
              navigate(
                isAuthenticated
                  ? (role === 'admin' || role === 'superadmin') ? P.adminAnalytics : P.userDashboard
                  : P.login,
              )
            }
          >
            <span style={{ color: '#e9c176',  }}>
              <img  style={{height:'30px'}} src="/favicon.svg" alt="logo" />
              </span>
            <span className="font-bold text-white text-[15px] tracking-tight">Scholarly Library</span>
          </button>

          <div className='flex flex-row gap-2  '>
            
          <p className='text-white-500'>{profileName}</p>

          {isAuthenticated && (
            
            <button
              type="button"
              className="cursor-pointer rounded-lg border text-[12px] font-semibold px-3 py-1 transition-all active:scale-95"
              style={{ borderColor: 'rgba(233,193,118,0.25)', color: '#e9c176', background: 'rgba(233,193,118,0.06)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(233,193,118,0.14)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(233,193,118,0.06)'}
              onClick={() => { logout(); navigate(P.login, { replace: true }) }}
            >
              Log out
            </button>
          )}
          </div>
        </div>

        {/* Row 2 — nav groups */}
        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
          {groups.map((g) => (
            <div key={g.label} className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(233,193,118,0.45)' }}>
                {g.label}
              </span>
              <span className="hidden sm:inline text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <div className="flex flex-wrap gap-0.5">
                {g.items.map((item) => {
                  const isActive = matchPath({ path: item.to, end: item.end ?? false }, location.pathname) != null
                  return (
                    <button
                      key={item.to}
                      type="button"
                      className={linkClass(isActive)}
                      onClick={() => navigate(item.to)}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </nav>
  )
}
