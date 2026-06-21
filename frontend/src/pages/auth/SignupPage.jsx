import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import { navBtn, P } from '../../routes/appPaths'

export default function SignupPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const formId = useId()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    setError(null)
    if (!name.trim()) { setError('Please enter your full name.'); return }
    const trimmedEmail = email.trim()
    if (!trimmedEmail) { setError('Please enter your email address.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setError('Please enter a valid email address.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const data = await api.post('/auth/signup', { name: name.trim(), email: trimmedEmail, password })
      login({ id: data.user._id, email: data.user.email, role: data.user.role, token: data.token })
      navigate(data.user.role === 'admin' || data.user.role === 'superadmin' ? P.adminAnalytics : P.userDashboard, { replace: true })
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex items-center justify-center p-gutter relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-surface-container-low opacity-50" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-secondary-container rounded-full blur-3xl opacity-20" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary-container rounded-full blur-3xl opacity-10" />

      <main className="relative z-10 w-full max-w-[1000px] bg-surface-container-lowest grid grid-cols-1 md:grid-cols-2 shadow-xl rounded-xl overflow-hidden min-h-[600px]">
        {/* Hero panel */}
        <div className="hidden md:flex flex-col justify-between p-margin-desktop bg-login-hero text-white">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[32px]">local_library</span>
            <span className="font-title-md text-title-md font-bold tracking-tight">Scholarly Library</span>
          </div>
          <div>
            <h2 className="font-headline-lg text-headline-lg mb-4">Your gateway to knowledge starts here.</h2>
            <p className="font-body-lg text-body-lg opacity-90">
              Create your patron account to borrow books, save materials, and track your reading across our entire collection.
            </p>
          </div>
          <div className="font-label-sm text-label-sm opacity-70">
            &copy; My Library System v0.0.1
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center p-gutter md:p-margin-desktop bg-surface-container-lowest">
          <div className="md:hidden flex items-center gap-2 mb-gutter justify-center">
            <span className="material-symbols-outlined text-secondary text-[28px]">local_library</span>
            <span className="font-title-md text-title-md font-bold text-secondary">Scholarly Library</span>
          </div>

          <header className="mb-6 text-center md:text-left">
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Create Account</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Sign up as a library patron to get started.</p>
          </header>

          {error && (
            <p className="mb-4 rounded-lg bg-error-container px-3 py-2 font-label-sm text-on-error-container" role="alert">
              {error}
            </p>
          )}

          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); handleSignup() }}
          >
            {/* Full Name */}
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor={`${formId}-name`}>
                Full Name
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors">person</span>
                <input
                  id={`${formId}-name`}
                  type="text"
                  autoComplete="name"
                  placeholder="Enter Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor={`${formId}-email`}>
                Institutional Email
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors">mail</span>
                <input
                  id={`${formId}-email`}
                  type="email"
                  autoComplete="email"
                  placeholder="Enter Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor={`${formId}-password`}>
                Password
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors">lock</span>
                <input
                  id={`${formId}-password`}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-surface-container border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor={`${formId}-confirm`}>
                Confirm Password
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors">lock_reset</span>
                <input
                  id={`${formId}-confirm`}
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-surface-container border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`${navBtn} w-full py-4 bg-secondary text-on-secondary font-title-md text-title-md rounded-lg shadow-lg 
              hover:opacity-90 active:scale-[0.98] transition-all 
              flex justify-center items-center gap-2 disabled:opacity-60` }
            >
              <span>{loading ? 'Creating…' : 'Create Account'}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>

          <footer className="mt-8 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Already have an account?{' '}
              <button
                type="button"
                className={`${navBtn} text-secondary font-bold hover:underline ml-1`}
                onClick={() => navigate(P.login)}
              >
                Sign In
              </button>
            </p>
          </footer>

          <div className="mt-6 pt-6 border-t border-outline-variant/30 flex items-center justify-center gap-4 text-outline">
            <button type="button" className={`${navBtn} flex items-center gap-1 hover:text-on-surface`} onClick={() => navigate(P.login)}>
              <span className="material-symbols-outlined text-[18px]">help</span>
              <span className="font-label-sm text-label-sm">Support</span>
            </button>
          </div>
        </div>
      </main>

      <div className="fixed bottom-gutter right-gutter hidden lg:block opacity-20 pointer-events-none">
        <span className="material-symbols-outlined text-[120px] text-secondary">menu_book</span>
      </div>
    </div>
  )
}
