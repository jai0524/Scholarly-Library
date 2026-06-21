import { useNavigate } from 'react-router-dom'

export function ViewToggle({ patronTo, librarianTo }) {
  const navigate = useNavigate()
  return (
    <div
      className="hidden sm:flex items-center p-1 rounded-full gap-0.5"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <button
        type="button"
        className="px-4 py-1.5 rounded-full font-label-sm text-label-sm text-on-surface-variant hover:text-white transition-colors"
        onClick={() => navigate(patronTo)}
      >
        Patron View
      </button>
      <button
        type="button"
        className="px-4 py-1.5 rounded-full font-label-sm text-label-sm bg-secondary text-on-secondary shadow-sm"
        onClick={() => navigate(librarianTo)}
      >
        Librarian View
      </button>
    </div>
  )
}

export default function AdminPageHeader({
  icon,
  title,
  subtitle,
  backTo,
  actions,
  zIndex = 'z-40',
}) {
  const navigate = useNavigate()

  return (
    <header
      className={`md:sticky md:top-[88px] ${zIndex} w-full`}
      style={{
        background: 'linear-gradient(to right, rgba(233,193,118,0.08) 0%, rgba(10,9,20,0.78) 30%, rgba(13,12,26,0.78) 100%)',
        borderLeft: '3px solid #e9c176',
        borderBottom: '1px solid rgba(233,193,118,0.12)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
    >
      <div className="flex items-center justify-between px-gutter py-3">
        {/* Left: hamburger + back + icon + title */}
        <div className="flex items-center gap-2 min-w-0">
          {backTo && (
            <button
              type="button"
              className="p-2 rounded-full hover:bg-white/5 active:scale-95 transition-all shrink-0"
              onClick={() => navigate(backTo)}
              aria-label="Go back"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ color: '#e9c176' }}>
                arrow_back
              </span>
            </button>
          )}

          {icon && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(233,193,118,0.10)',
                border: '1px solid rgba(233,193,118,0.22)',
              }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: '#e9c176' }}>
                {icon}
              </span>
            </div>
          )}

          <div className="min-w-0 ml-1">
            <h1
              className="font-bold text-[15px] leading-tight truncate"
              style={{ color: '#f0e8d8' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="hidden sm:block text-[11px] leading-tight truncate mt-0.5 text-on-surface-variant">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
