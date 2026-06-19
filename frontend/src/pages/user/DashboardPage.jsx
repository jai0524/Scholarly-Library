import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../contexts/ProfileContext'
import { useActivity } from '../../contexts/ActivityContext'
import { useUserLibrary } from '../../contexts/UserLibraryContext'
import { useMaterials } from '../../hooks/useMaterials'
import { navBtn, P } from '../../routes/appPaths'

const KIND_ICON  = { book: 'book', notes: 'description', pyq: 'history_edu' }
const KIND_LABEL = { book: 'Textbook', notes: 'Notes', pyq: 'PYQ' }

const CATEGORIES = [
  { key: 'all',   label: 'All Materials', icon: 'auto_stories', href: P.userCatalog },
  { key: 'book',  label: 'Books',          icon: 'book',         href: `${P.userCatalog}?kind=book` },
  { key: 'notes', label: 'Notes',          icon: 'description',  href: `${P.userCatalog}?kind=notes` },
  { key: 'pyq',   label: 'PYQs',           icon: 'history_edu',  href: `${P.userCatalog}?kind=pyq` },
]

const NAV_ITEMS = [
  { icon: 'home',            label: 'Home',        href: P.userDashboard,  active: true  },
  { icon: 'search',          label: 'Browse',      href: P.userCatalog,    active: false },
  { icon: 'history',         label: 'History',     href: P.userActivity,   active: false },
  { icon: 'manage_accounts', label: 'Account',     href: P.userProfile,    active: false },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { role, logout } = useAuth()
  const { profileName, profilePicture } = useProfile()
  const { activities } = useActivity()
  const { savedIds } = useUserLibrary()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const isAdmin = role === 'admin' || role === 'superadmin'

  const { materials: featured, loading: featuredLoading } = useMaterials({ limit: 8 })

  const borrowCount = activities.filter((a) => a.kind === 'borrow').length
  const savedCount  = savedIds.size
  const firstName   = profileName?.split(' ')[0] ?? 'there'

  const closeDrawer = () => setDrawerOpen(false)
  const go = (path) => { navigate(path); closeDrawer() }

  const handleSearch = () => {
    const q = searchQuery.trim()
    navigate(q ? `${P.userCatalog}?q=${encodeURIComponent(q)}` : P.userCatalog)
  }

  const drawerNavItems = [
    { icon: 'home',            label: 'Home',         href: P.userDashboard, active: true  },
    { icon: 'search',          label: 'Browse',       href: P.userCatalog,   active: false },
    { icon: 'history',         label: 'History',      href: P.userActivity,  active: false },
    { icon: 'bookmarks',       label: 'Saved',        href: P.userSaveHistory, active: false },
    { icon: 'manage_accounts', label: 'Account',      href: P.userProfile,   active: false },
    ...(role === 'librarian' ? [
      { icon: 'analytics',     label: 'Analytics',    href: P.adminAnalytics,  active: false },
      { icon: 'library_books', label: 'Collections',  href: P.adminMaterials,  active: false },
    ] : []),
  ]

  return (
    <div className="min-h-screen bg-surface text-on-surface">

      {/* ═══════════════════════════════════════════
          TOP APP BAR  (hidden for admin — AdminLayout provides its own)
      ═══════════════════════════════════════════ */}
      {!isAdmin && <header className="sticky top-0 md:top-[88px] z-40 bg-surface-container border-b border-outline-variant shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 sm:px-6 md:px-8 h-16">

          {/* Left — hamburger + brand */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={`${navBtn} md:hidden p-2 rounded-full hover:bg-surface-container-high active:scale-95`}
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[22px]">menu</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">local_library</span>
              <span className="font-bold text-title-md text-primary leading-none hidden xs:block">Scholarly</span>
            </div>
          </div>

          {/* Right — notifications + avatar */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`${navBtn} relative p-2 rounded-full hover:bg-surface-container-high active:scale-95`}
              onClick={() => navigate(P.userActivity)}
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[22px]">notifications</span>
              {activities.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
              )}
            </button>
            <button
              type="button"
              className={`${navBtn} w-9 h-9 rounded-full overflow-hidden ring-2 ring-outline-variant active:scale-95 ml-1`}
              onClick={() => navigate(P.userProfile)}
              aria-label="Profile"
            >
              <img
                src={profilePicture}
                alt={profileName ?? 'Profile'}
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </div>
      </header>}

      {/* ═══════════════════════════════════════════
          HERO — greeting + search + filters
      ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-surface-container-low dark:bg-surface-container-low">
        {/* Decorative ambient blobs */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full bg-secondary-container opacity-30 dark:opacity-10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-0 w-56 h-56 rounded-full bg-primary-container opacity-20 dark:opacity-10 blur-3xl" />

        <div className="relative max-w-3xl mx-auto mt-14 px-4 sm:px-6 md:px-8 pt-10 pb-12 text-center">
          {/* Greeting */}
          <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-widest mb-3">
            Welcome back
          </p>
          <h1 className="font-display-lg leading-tight font-bold text-on-surface mb-8">
            Hello,&nbsp;<span className="text-secondary">{firstName}</span>&nbsp;
            <span aria-hidden="true">👋</span>
          </h1>

          {/* Search bar */}
          <div className="relative group shadow-sm rounded-2xl">
            <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center">
              <span className="material-symbols-outlined text-outline group-focus-within:text-secondary transition-colors text-[22px]">
                search
              </span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search books, notes, past papers…"
              className="w-full pl-14 pr-[7.5rem] py-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container border-2 border-transparent focus:border-secondary outline-none text-body-lg placeholder:text-outline-variant transition-colors"
            />
            <button
              type="button"
              onClick={handleSearch}
              className={`${navBtn} absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-label-sm hover:opacity-90 active:scale-95`}
            >
              Search
            </button>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => navigate(cat.href)}
                className={`${navBtn} flex items-center gap-1.5 px-4 py-2 rounded-full border border-outline-variant bg-surface-container-lowest dark:bg-surface-container text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container hover:border-transparent active:scale-95 text-label-sm font-label-sm transition-all`}
              >
                <span className="material-symbols-outlined text-[15px]">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════ */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pb-28 md:pb-12 space-y-12 pt-8">

        {/* ── Stats Row ─────────────────────────────── */}
        <section aria-label="Quick stats">
          <div className="grid grid-cols-3 gap-3 md:gap-5">
            {[
              { icon: 'history',         label: 'Activities', value: activities.length, iconClass: 'text-primary' },
              { icon: 'local_library',   label: 'Borrows',    value: borrowCount,        iconClass: 'text-secondary' },
              { icon: 'bookmarks',       label: 'Saved',      value: savedCount,         iconClass: 'text-secondary' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-surface-container-lowest dark:bg-surface-container rounded-2xl p-4 md:p-6 flex flex-col items-center text-center gap-2 border border-outline-variant hover:border-secondary transition-colors"
              >
                <span className={`material-symbols-outlined text-[28px] md:text-[36px] ${stat.iconClass}`}>
                  {stat.icon}
                </span>
                <span className="font-bold text-[28px] md:text-[36px] leading-none text-on-surface">
                  {stat.value}
                </span>
                <span className="text-label-sm font-label-sm text-on-surface-variant">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Featured Materials ───────────────────── */}
        <section aria-label="Featured materials">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-widest mb-1">
                Library
              </p>
              <h2 className="font-headline-lg text-headline-lg text-on-surface leading-tight">
                Featured
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate(P.userCatalog)}
              className={`${navBtn} flex items-center gap-1 text-secondary font-bold text-label-sm hover:underline active:scale-95`}
            >
              View all
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>

          {/* Horizontal scroll on mobile  →  grid on md+ */}
          {featuredLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-surface-container-lowest rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-surface-container" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-surface-container rounded w-4/5" />
                    <div className="h-2.5 bg-surface-container rounded w-3/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-visible md:pb-0"
              style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
            >
              {featured.map((m) => (
                <article
                  key={m._id}
                  onClick={() => navigate(P.userMaterialDetail(m._id))}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(P.userMaterialDetail(m._id))}
                  role="button"
                  tabIndex={0}
                  className="flex-none w-[168px] sm:w-[200px] md:w-auto snap-start group bg-surface-container-lowest dark:bg-surface-container rounded-2xl overflow-hidden border border-outline-variant hover:border-secondary hover:shadow-lg cursor-pointer transition-all duration-300"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  {/* Cover */}
                  <div className="aspect-[3/4] relative overflow-hidden">
                    {m.coverUrl ? (
                      <img
                        src={m.coverUrl}
                        alt={m.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-container-high to-surface-container-highest dark:from-surface-container dark:to-surface-container-high">
                        <span className="material-symbols-outlined text-[48px] text-outline-variant">
                          {KIND_ICON[m.kind] ?? 'book'}
                        </span>
                      </div>
                    )}
                    {/* Kind badge overlay */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                        {KIND_LABEL[m.kind] ?? m.kind}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 md:p-4">
                    <h3 className="font-bold text-[13px] md:text-[14px] leading-snug line-clamp-2 mb-1 text-on-surface">
                      {m.title}
                    </h3>
                    <p className="text-[11px] md:text-[12px] text-on-surface-variant line-clamp-1">
                      {m.author}
                    </p>
                    {m.rating != null && (
                      <div className="flex items-center gap-0.5 mt-2 text-secondary">
                        <span
                          className="material-symbols-outlined text-[13px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >star</span>
                        <span className="text-[12px] font-bold">{m.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ── Quick Actions ────────────────────────── */}
        <section aria-label="Quick actions">
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-5">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {[
              {
                icon: 'search',
                label: 'Browse Catalog',
                sub: 'Find materials',
                href: P.userCatalog,
                accent: 'bg-secondary-container text-on-secondary-container dark:bg-surface-container-high dark:text-on-surface',
              },
              {
                icon: 'history',
                label: 'My History',
                sub: 'Recent activity',
                href: P.userSaveHistory,
                accent: 'bg-surface-container-high dark:bg-surface-container text-on-surface',
              },
              {
                icon: 'bookmarks',
                label: 'Saved Items',
                sub: `${savedCount} saved`,
                href: P.userSaveHistory,
                accent: 'bg-surface-container-high dark:bg-surface-container text-on-surface',
              },
              {
                icon: 'manage_accounts',
                label: 'My Profile',
                sub: 'Account settings',
                href: P.userProfile,
                accent: 'bg-surface-container-high dark:bg-surface-container text-on-surface',
              },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.href)}
                className={`${navBtn} ${action.accent} rounded-2xl p-5 flex flex-col gap-3 text-left border border-transparent hover:border-secondary hover:shadow-sm active:scale-[0.97] transition-all`}
              >
                <span className="material-symbols-outlined text-[28px]">{action.icon}</span>
                <div>
                  <p className="font-bold text-[14px] leading-snug">{action.label}</p>
                  <p className="text-[12px] text-on-surface-variant mt-0.5">{action.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Activity CTA Banner ──────────────────── */}
        <section
          aria-label="Activity summary"
          className="relative overflow-hidden rounded-3xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-secondary/20"
          style={{ background: 'linear-gradient(135deg, #12100a 0%, #221a00 50%, #14100a 100%)' }}
        >
          {/* Decorative gold glow circles */}
          <div className="pointer-events-none absolute -right-8 -top-8 w-44 h-44 rounded-full blur-3xl" style={{ background: 'rgba(233,193,118,0.08)' }} />
          <div className="pointer-events-none absolute right-6 -bottom-6 w-32 h-32 rounded-full blur-2xl" style={{ background: 'rgba(233,193,118,0.12)' }} />

          <div className="relative z-10">
            <p className="text-label-sm font-label-sm uppercase tracking-widest text-secondary mb-2">
              Your Activity
            </p>
            <h2 className="text-[48px] font-bold leading-none text-white">{activities.length}</h2>
            <p className="text-on-surface-variant mt-3 text-body-md max-w-xs leading-relaxed">
              {activities.length === 0
                ? 'Start exploring the catalog and request your first material.'
                : 'Total actions recorded — borrows, saves, and returns.'}
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(P.userCatalog)}
              className={`${navBtn} px-6 py-3 bg-secondary text-on-secondary rounded-full font-bold hover:brightness-110 active:scale-95`}
            >
              Browse Catalog
            </button>
            <button
              type="button"
              onClick={() => navigate(P.userSaveHistory)}
              className={`${navBtn} px-6 py-3 border border-secondary/40 text-secondary rounded-full font-bold hover:bg-secondary/10 active:scale-95`}
            >
              View History
            </button>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════
          MOBILE DRAWER + BOTTOM NAV  (user only — admin uses AdminLayout)
      ═══════════════════════════════════════════ */}
      {!isAdmin && <>

      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={closeDrawer}
        className={`fixed inset-0 z-[110] bg-black/40 md:hidden transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer panel */}
      <aside
        id="side-drawer"
        aria-label="Navigation menu"
        className={`fixed left-0 top-0 h-full w-72 z-[120] md:hidden flex flex-col
          bg-surface-container-low dark:bg-surface-dim border-r border-outline-variant shadow-2xl
          transition-transform duration-300 ease-in-out
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Profile header */}
        <button
          type="button"
          className={`${navBtn} flex items-center gap-4 px-6 pt-10 pb-6 w-full text-left hover:bg-surface-container transition-colors`}
          onClick={() => go(P.userProfile)}
        >
          <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-secondary/30 flex-shrink-0">
            <img src={profilePicture} alt={profileName ?? 'Profile'} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-on-surface truncate">{profileName}</p>
            <p className="text-label-sm text-on-surface-variant">Patron Access</p>
          </div>
        </button>

        <div className="h-px bg-outline-variant mx-6 mb-2" />

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {drawerNavItems.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => go(item.href)}
              className={`${navBtn} flex w-full items-center gap-4 px-4 py-3 rounded-r-full transition-all ${
                item.active
                  ? 'bg-secondary-container text-on-secondary-container font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={item.active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex flex-row justify-between px-6 py-4 border-t border-outline-variant">
          <span className="text-label-sm text-outline">My Library System v0.0.1</span>
          <button type="button" className={`${navBtn} flex items-center gap-2 border border-outline-variant text-on-surface-variant rounded-xl text-label-sm hover:bg-surface-container active:scale-95`} onClick={() => { logout(); navigate(P.login, { replace: true }) }}>
                  <span className="material-symbols-outlined text-[17px]">logout</span>
                  Logout
                </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════
          MOBILE BOTTOM NAV
      ═══════════════════════════════════════════ */}
      <nav
        aria-label="Bottom navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-outline-variant shadow-lg"
      >
        <div className="flex justify-around items-center px-2 py-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => navigate(item.href)}
              className={`${navBtn} flex flex-col items-center gap-0.5 py-2 px-3 rounded-2xl transition-all active:scale-90 min-w-[64px] ${
                item.active ? 'text-secondary' : 'text-on-surface-variant'
              }`}
            >
              {/* Pill indicator behind icon */}
              <span
                className={`relative flex items-center justify-center w-12 h-6 rounded-full transition-all ${
                  item.active ? 'bg-secondary-container' : ''
                }`}
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={item.active ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
              </span>
              <span className={`text-[10px] font-bold leading-none ${item.active ? 'text-secondary' : ''}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      </>}

    </div>
  )
}
