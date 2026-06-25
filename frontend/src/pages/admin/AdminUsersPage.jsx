import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUsers } from '../../hooks/useUsers'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import { P } from '../../routes/appPaths'
import AdminPageHeader, { ViewToggle } from '../../components/navigation/AdminPageHeader'

export default function AdminUsersPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [sortNewest, setSortNewest] = useState(true)
  const [userListPage, setUserListPage] = useState(1)
  const [toastMsg, setToastMsg] = useState(null)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [suspendTarget, setSuspendTarget] = useState(null)
  const [suspendLoading, setSuspendLoading] = useState(false)
  const [resetTarget, setResetTarget]   = useState(null)
  const [resetPwd, setResetPwd]         = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetDone, setResetDone]       = useState(false)

  const { role: myRole, session } = useAuth()
  const { users, total, loading, refetch } = useUsers({ page: userListPage, limit: 20, q: debouncedSearch })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setUserListPage(1) }, [debouncedSearch])

  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 3000)
    return () => clearTimeout(t)
  }, [toastMsg])

  const filteredUsers = users
    .filter((u) => {
      if (roleFilter === 'students' && u.role !== 'user') return false
      if (roleFilter === 'librarians' && u.role !== 'admin' && u.role !== 'superadmin') return false
      return true
    })
    .sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime()
      const bTime = new Date(b.createdAt).getTime()
      return sortNewest ? bTime - aTime : aTime - bTime
    })

  const studentCount = users.filter((u) => u.role === 'user').length

  const generatePassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  const openResetModal = (u) => {
    setResetTarget(u)
    setResetPwd(generatePassword())
    setResetDone(false)
  }

  const confirmReset = async () => {
    if (!resetTarget) return
    if (resetPwd.length < 6) { setToastMsg('Password must be at least 6 characters.'); return }
    setResetLoading(true)
    try {
      await api.patch(`/users/${resetTarget._id}/reset-password`, { newPassword: resetPwd })
      setResetDone(true)
    } catch (err) {
      setToastMsg(err.message || 'Failed to reset password.')
      setResetTarget(null)
    } finally {
      setResetLoading(false)
    }
  }

  function canResetPassword(u) {
    if (u.email === session?.email) return false
    if (u.role === 'superadmin') return false
    if (myRole === 'superadmin') return u.role === 'user' || u.role === 'admin'
    if (myRole === 'admin') return u.role === 'user'
    return false
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    setDeleteLoading(true)
    try {
      await api.del(`/users/${deleteTargetId}`)
      setDeleteTargetId(null)
      setToastMsg('User deleted successfully.')
      refetch()
    } catch (err) {
      setToastMsg(err.message || 'Failed to delete user.')
      setDeleteTargetId(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const confirmSuspend = async () => {
    if (!suspendTarget) return
    setSuspendLoading(true)
    try {
      const action = suspendTarget.suspended ? 'reactivate' : 'suspend'
      await api.patch(`/users/${suspendTarget.id}/${action}`, {})
      setToastMsg(`${suspendTarget.name} has been ${suspendTarget.suspended ? 'reactivated' : 'suspended'}.`)
      setSuspendTarget(null)
      refetch()
    } catch (err) {
      setToastMsg(err.message || 'Action failed.')
      setSuspendTarget(null)
    } finally {
      setSuspendLoading(false)
    }
  }

  function canSuspend(u) {
    if (u.email === session?.email) return false
    if (myRole === 'superadmin') return u.role !== 'superadmin'
    if (myRole === 'admin') return u.role === 'user'
    return false
  }

  function getRoleLabel(role) {
    if (role === 'superadmin') return 'Super Admin'
    if (role === 'admin') return 'Librarian'
    return 'Student'
  }

  function getInitials(name) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <>
      <main className="min-h-screen">
        <AdminPageHeader
          icon="group"
          title="Members"
          subtitle="Manage library members"
          backTo={P.adminAnalytics}
          zIndex="z-50"
          actions={
            <>
              <ViewToggle patronTo={P.userDashboard} librarianTo={P.adminUsers} />
              <button type="button" className="flex items-center gap-1.5 bg-secondary text-on-secondary px-5 py-2 rounded-full font-label-sm text-label-sm hover:opacity-90 active:scale-95 transition-all shadow-md" onClick={() => navigate(P.adminUserNew)}>
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Add User</span>
              </button>
            </>
          }
        />

        <div className="max-w-[1280px] mx-auto px-gutter py-8 space-y-8">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary-container rounded-lg">
                  <span className="material-symbols-outlined text-on-primary-container">groups</span>
                </div>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Total Users</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1">{loading ? '' : total}</h3>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-secondary-container rounded-lg">
                  <span className="material-symbols-outlined text-on-secondary-container">bolt</span>
                </div>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Active Today</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1">{loading ? '' : studentCount}</h3>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-surface-container-highest rounded-lg">
                  <span className="material-symbols-outlined text-on-surface-variant">school</span>
                </div>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Students</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1">{loading ? '' : studentCount}</h3>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-error-container rounded-lg">
                  <span className="material-symbols-outlined text-error">person_off</span>
                </div>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Suspended</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1">{loading ? '' : users.filter((u) => u.suspended).length}</h3>
            </div>
          </section>

          <section className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant shadow-sm flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                className="w-full pl-12 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary-fixed-dim focus:border-secondary-fixed-dim outline-none transition-all font-body-md text-body-md"
                placeholder="Search by name or email..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex items-center gap-2 px-6 py-3 bg-surface-container border border-outline-variant rounded-xl font-label-sm text-label-sm hover:bg-surface-container-high transition-colors"
                onClick={() => setRoleFilter((r) => (r === 'all' ? 'students' : r === 'students' ? 'librarians' : 'all'))}
              >
                <span className="material-symbols-outlined text-sm">filter_list</span>
                <span>Role: {roleFilter === 'all' ? 'All' : roleFilter === 'students' ? 'Students' : 'Librarians'}</span>
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-6 py-3 bg-surface-container border border-outline-variant rounded-xl font-label-sm text-label-sm hover:bg-surface-container-high transition-colors"
                onClick={() => setSortNewest((v) => !v)}
              >
                <span className="material-symbols-outlined text-sm">sort</span>
                <span>Sort: {sortNewest ? 'Newest' : 'Oldest'}</span>
              </button>
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">User Details</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center font-body-md text-on-surface-variant">
                        Loading users
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center font-body-md text-on-surface-variant">
                        No users match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-surface-container transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center overflow-hidden shrink-0">
                              {u.picture ? (
                                <img alt="User" className="w-full h-full object-cover" src={u.picture} />
                              ) : (
                                <span className="font-bold text-on-secondary-container text-label-sm">{getInitials(u.name)}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-body-md text-body-md font-bold text-on-surface">{u.name}</p>
                              <p className="font-label-sm text-label-sm text-on-surface-variant">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-body-md text-body-md text-on-surface-variant">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'â€"'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full font-label-sm text-label-sm ${u.role === 'admin' || u.role === 'superadmin' ? 'bg-secondary-container text-on-secondary-container font-bold' : 'bg-primary-fixed text-on-primary-fixed-variant'}`}>
                            {getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {u.suspended ? (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-error" />
                              <span className="font-label-sm text-label-sm text-error font-semibold">Suspended</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="font-label-sm text-label-sm text-on-surface">Active</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors" title="Edit Profile" onClick={() => navigate(P.adminUserEdit(u._id))}>
                              <span className="material-symbols-outlined text-on-surface-variant">edit</span>
                            </button>
                            {canResetPassword(u) && (
                              <button type="button" className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors" title="Reset Password" onClick={() => openResetModal(u)}>
                                <span className="material-symbols-outlined text-on-surface-variant">lock_reset</span>
                              </button>
                            )}
                            {canSuspend(u) && (
                              <button
                                type="button"
                                className={`p-2 rounded-lg transition-colors ${u.suspended ? 'hover:bg-secondary-container text-secondary' : 'hover:bg-error-container text-error'}`}
                                title={u.suspended ? 'Reactivate User' : 'Suspend User'}
                                onClick={() => setSuspendTarget({ id: u._id, name: u.name, suspended: u.suspended })}
                              >
                                <span className="material-symbols-outlined">{u.suspended ? 'person_check' : 'person_off'}</span>
                              </button>
                            )}
                            <button type="button" className="p-2 hover:bg-error-container rounded-lg transition-colors" title="Delete User" onClick={() => setDeleteTargetId(u._id)}>
                              <span className="material-symbols-outlined text-error">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between">
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Showing {filteredUsers.length === 0 ? 0 : (userListPage - 1) * 20 + 1} to {Math.min(userListPage * 20, total)} of {total} users
              </p>
              <div className="flex gap-2">
                <button type="button" className="w-10 h-10 flex items-center justify-center border border-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-50" disabled={userListPage <= 1} onClick={() => setUserListPage((p) => Math.max(1, p - 1))}>
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((pg) => (
                  <button key={pg} type="button" className={`w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant ${userListPage === pg ? 'bg-secondary text-on-secondary border-secondary font-bold' : 'hover:bg-surface-container'}`} onClick={() => setUserListPage(pg)}>
                    {pg}
                  </button>
                ))}
                <button type="button" className="w-10 h-10 flex items-center justify-center border border-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-50" disabled={userListPage >= totalPages} onClick={() => setUserListPage((p) => Math.min(totalPages, p + 1))}>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {suspendTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-outline-variant">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${suspendTarget.suspended ? 'bg-secondary-container' : 'bg-error-container'}`}>
                <span className={`material-symbols-outlined ${suspendTarget.suspended ? 'text-secondary' : 'text-error'}`}>
                  {suspendTarget.suspended ? 'person_check' : 'person_off'}
                </span>
              </div>
              <h3 className="font-title-md text-title-md text-on-surface font-bold">
                {suspendTarget.suspended ? 'Reactivate User' : 'Suspend User'}
              </h3>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              {suspendTarget.suspended
                ? `Reactivate ${suspendTarget.name}? They will be able to log in and use the library again.`
                : `Suspend ${suspendTarget.name}? They will be immediately blocked from logging in.`}
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" className="px-6 py-2.5 rounded-full font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-all" onClick={() => setSuspendTarget(null)} disabled={suspendLoading}>
                Cancel
              </button>
              <button
                type="button"
                className={`px-6 py-2.5 rounded-full font-bold font-label-sm text-label-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 ${suspendTarget.suspended ? 'bg-secondary text-on-secondary' : 'bg-error text-on-error'}`}
                onClick={confirmSuspend}
                disabled={suspendLoading}
              >
                {suspendLoading ? '' : suspendTarget.suspended ? 'Reactivate' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-outline-variant">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-error">delete</span>
              </div>
              <h3 className="font-title-md text-title-md text-on-surface font-bold">Delete User</h3>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              This action is permanent and cannot be undone. Are you sure you want to delete this user?
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" className="px-6 py-2.5 rounded-full font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-all" onClick={() => setDeleteTargetId(null)} disabled={deleteLoading}>
                Cancel
              </button>
              <button type="button" className="px-6 py-2.5 rounded-full bg-error text-on-error font-bold font-label-sm text-label-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60" onClick={confirmDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ───────────────────────── */}
      {resetTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-surface rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-outline-variant">

            {!resetDone ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary">lock_reset</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-title-md text-on-surface leading-tight">Reset Password</h3>
                    <p className="text-label-sm text-on-surface-variant truncate">{resetTarget.name} · {resetTarget.email}</p>
                  </div>
                </div>

                {/* Role badge */}
                <div className="mb-5 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-label-sm font-label-sm font-bold ${resetTarget.role === 'admin' ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary-fixed text-on-primary-fixed-variant'}`}>
                    {resetTarget.role === 'admin' ? 'Librarian' : 'Student'}
                  </span>
                  {myRole === 'superadmin' && resetTarget.role === 'admin' && (
                    <span className="text-label-sm text-on-surface-variant">(superadmin override)</span>
                  )}
                </div>

                {/* Password input */}
                <div className="mb-4">
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">New Password</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={resetPwd}
                      onChange={(e) => setResetPwd(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl border border-outline-variant bg-surface-container focus:border-secondary focus:outline-none font-body-md font-mono tracking-wider"
                      placeholder="Enter new password"
                      autoFocus
                    />
                    <button
                      type="button"
                      title="Generate random password"
                      onClick={() => setResetPwd(generatePassword())}
                      className="px-3 py-3 rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant text-[20px]">shuffle</span>
                    </button>
                  </div>
                  {resetPwd.length > 0 && resetPwd.length < 6 && (
                    <p className="text-error text-label-sm font-label-sm mt-1">Minimum 6 characters</p>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-label-sm hover:bg-surface-container transition-colors"
                    onClick={() => setResetTarget(null)}
                    disabled={resetLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={resetLoading || resetPwd.length < 6}
                    onClick={confirmReset}
                    className="flex-1 px-4 py-3 rounded-xl bg-secondary text-on-secondary font-bold font-label-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {resetLoading ? 'Resetting…' : 'Reset Password'}
                  </button>
                </div>
              </>
            ) : (
              /* Success state — show the new password */
              <>
                <div className="flex flex-col items-center text-center gap-3 mb-6">
                  <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px] text-secondary">check_circle</span>
                  </div>
                  <h3 className="font-bold text-title-md text-on-surface">Password Reset!</h3>
                  <p className="text-body-md text-on-surface-variant">
                    Share this temporary password with <span className="font-bold text-on-surface">{resetTarget.name}</span>. Ask them to change it after logging in.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-surface-container border border-secondary/40 mb-6">
                  <span className="font-mono font-bold text-[16px] tracking-widest text-on-surface select-all">{resetPwd}</span>
                  <button
                    type="button"
                    title="Copy password"
                    onClick={() => { navigator.clipboard?.writeText(resetPwd); setToastMsg('Password copied!') }}
                    className="p-1.5 rounded-lg hover:bg-surface-container-high active:scale-90 transition-all"
                  >
                    <span className="material-symbols-outlined text-secondary text-[20px]">content_copy</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="w-full px-4 py-3 rounded-xl bg-on-surface text-surface font-bold font-label-sm hover:opacity-90 active:scale-95 transition-all"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-on-surface text-surface px-6 py-3 rounded-full shadow-2xl font-label-sm text-label-sm whitespace-nowrap">
          {toastMsg}
        </div>
      )}

      <button type="button" className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-secondary text-on-secondary rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-transform" onClick={() => navigate(P.adminUserNew)}>
        <span className="material-symbols-outlined">person_add</span>
      </button>
    </>
  )
}
