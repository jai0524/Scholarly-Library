import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useActivity } from '../../contexts/ActivityContext'
import { P } from '../../routes/appPaths'
import AdminPageHeader, { ViewToggle } from '../../components/navigation/AdminPageHeader'

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'returned', label: 'Returned' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
]

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-secondary-container text-on-secondary-container',
    approved: 'bg-tertiary-container text-on-tertiary-container',
    returned: 'bg-surface-container-high text-on-surface-variant',
    cancelled: 'bg-error-container text-on-error-container',
    rejected: 'bg-error-container text-on-error-container',
  }
  const labels = {
    pending: 'Pending',
    approved: 'Approved',
    returned: 'Returned',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
  }
  return (
    <span className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-bold capitalize ${styles[status] ?? 'bg-surface-container text-on-surface-variant'}`}>
      {labels[status] ?? status}
    </span>
  )
}

function fmt(dateStr) {
  if (!dateStr) return 'â€"'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminBorrowsPage() {
  const navigate = useNavigate()

  const { role } = useAuth()
  const { addActivity } = useActivity()
  const isSuperAdmin = role === 'superadmin'
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [requests, setRequests] = useState([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState({})
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [overridingId, setOverridingId] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)

  const LIMIT = 20
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debouncedSearch])

  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 3000)
    return () => clearTimeout(t)
  }, [toastMsg])

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: LIMIT })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (debouncedSearch) params.set('q', debouncedSearch)

      const [data, ...statusCounts] = await Promise.all([
        api.get(`/borrow?${params}`),
        ...['pending', 'approved', 'returned', 'rejected', 'cancelled'].map((s) =>
          api.get(`/borrow?status=${s}&limit=1`).then((d) => ({ status: s, count: d.total }))
        ),
      ])

      setRequests(data.requests)
      setTotal(data.total)
      const newCounts = {}
      statusCounts.forEach(({ status, count }) => { newCounts[status] = count })
      setCounts(newCounts)
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, debouncedSearch])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleStatusChange = (key) => {
    setStatusFilter(key)
    setPage(1)
  }

  const handleApprove = async (id) => {
    setApprovingId(id)
    try {
      await api.patch(`/borrow/${id}/approve`, {})
      setToastMsg('Borrow request approved.')
      const req = requests.find((r) => r._id === id)
      addActivity({
        id: `act-approve-${id}-${Date.now()}`,
        kind: 'approve',
        title: `Approved: ${req?.material?.title ?? 'Borrow Request'}`,
        detail: `Approved for ${req?.user?.name ?? 'member'}.`,
        timestamp: Date.now(),
        icon: 'check_circle',
        iconBg: 'bg-tertiary-fixed',
        iconColor: 'text-on-tertiary-fixed-variant',
      })
      fetchRequests()
    } catch (err) {
      setToastMsg(err.message || 'Failed to approve request.')
    } finally {
      setApprovingId(null)
    }
  }

  const handleReject = async (id) => {
    setRejectingId(id)
    try {
      await api.patch(`/borrow/${id}/reject`, {})
      setToastMsg('Request rejected.')
      const req = requests.find((r) => r._id === id)
      addActivity({
        id: `act-reject-${id}-${Date.now()}`,
        kind: 'reject',
        title: `Rejected: ${req?.material?.title ?? 'Borrow Request'}`,
        detail: `Request from ${req?.user?.name ?? 'member'} rejected.`,
        timestamp: Date.now(),
        icon: 'cancel',
        iconBg: 'bg-error-container',
        iconColor: 'text-on-error-container',
      })
      fetchRequests()
    } catch (err) {
      setToastMsg(err.message || 'Failed to reject request.')
    } finally {
      setRejectingId(null)
    }
  }

  const handleOverride = async (id, action) => {
    setOverridingId(id)
    try {
      await api.patch(`/borrow/${id}/override`, { action })
      setToastMsg(action === 'approve' ? 'Override: approved.' : 'Override: rejected â€" copy restored.')
      const req = requests.find((r) => r._id === id)
      addActivity({
        id: `act-override-${id}-${Date.now()}`,
        kind: action === 'approve' ? 'approve' : 'reject',
        title: `Override ${action === 'approve' ? 'Approved' : 'Rejected'}: ${req?.material?.title ?? 'Borrow Request'}`,
        detail: `Override for ${req?.user?.name ?? 'member'} by superadmin.`,
        timestamp: Date.now(),
        icon: 'shield',
        iconBg: action === 'approve' ? 'bg-tertiary-fixed' : 'bg-error-container',
        iconColor: action === 'approve' ? 'text-on-tertiary-fixed-variant' : 'text-on-error-container',
      })
      fetchRequests()
    } catch (err) {
      setToastMsg(err.message || 'Override failed.')
    } finally {
      setOverridingId(null)
    }
  }

  return (
    <>
      <main className="min-h-screen">
        <AdminPageHeader
          icon="local_library"
          title="Borrow Requests"
          subtitle="Manage member borrow requests"
          backTo={P.adminAnalytics}
          zIndex="z-50"
          actions={<ViewToggle patronTo={P.userDashboard} librarianTo={P.adminBorrows} />}
        />

        <div className="max-w-[1280px] mx-auto px-gutter py-8 space-y-6">
          {/* Search bar */}
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors">search</span>
            <input
              className="w-full pl-12 pr-10 py-3 bg-surface-container-lowest border border-outline-variant focus:border-secondary focus:ring-0 rounded-xl font-body-md text-body-md transition-all outline-none"
              placeholder="Search by member name, email, or material title..."
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-outline hover:text-on-surface hover:bg-surface-container-high active:scale-90"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(({ key, label }) => {
              const count = key === 'all' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[key]
              return (
                <button
                  key={key}
                  type="button"
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-full font-label-sm text-label-sm transition-all ${
                    statusFilter === key
                      ? 'bg-secondary text-on-secondary font-bold shadow-sm'
                      : 'bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                  onClick={() => handleStatusChange(key)}
                >
                  {label}
                  {count != null && count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                      statusFilter === key ? 'bg-on-secondary/20 text-on-secondary' : 'bg-secondary-container text-on-secondary-container'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
            <span className="ml-auto font-label-sm text-label-sm text-on-surface-variant self-center">
              {loading ? '' : `${total} shown`}
            </span>
          </div>

          {/* Table */}
          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Member</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Material</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Requested</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center font-body-md text-on-surface-variant">
                        Loading requests
                      </td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center font-body-md text-on-surface-variant">
                        No {statusFilter !== 'all' ? statusFilter : ''} requests found.
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req._id} className="hover:bg-surface-container transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-body-md font-bold text-on-surface">{req.user?.name ?? 'â€"'}</p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant">{req.user?.email ?? ''}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-body-md text-on-surface">{req.material?.title ?? 'â€"'}</p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant capitalize">{req.material?.kind ?? ''}</p>
                        </td>
                        <td className="px-6 py-4 font-body-md text-on-surface-variant">{fmt(req.requestedAt ?? req.createdAt)}</td>
                        <td className="px-6 py-4 font-body-md text-on-surface-variant">{fmt(req.dueDate)}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={req.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {req.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  disabled={rejectingId === req._id || approvingId === req._id}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-error-container text-on-error-container rounded-full font-label-sm text-label-sm font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                                  onClick={() => handleReject(req._id)}
                                >
                                  <span className="material-symbols-outlined text-sm">cancel</span>
                                  {rejectingId === req._id ? 'Rejecting' : 'Reject'}
                                </button>
                                <button
                                  type="button"
                                  disabled={approvingId === req._id || rejectingId === req._id}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-tertiary-container text-on-tertiary-container rounded-full font-label-sm text-label-sm font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                                  onClick={() => handleApprove(req._id)}
                                >
                                  <span className="material-symbols-outlined text-sm">check_circle</span>
                                  {approvingId === req._id ? 'Approving' : 'Approve'}
                                </button>
                              </>
                            )}
                            {isSuperAdmin && req.status === 'approved' && (
                              <button
                                type="button"
                                disabled={overridingId === req._id}
                                title="Override: revoke approval and restore copy"
                                className="flex items-center gap-1.5 px-3 py-2 bg-error-container text-on-error-container rounded-full font-label-sm text-label-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 border-2 border-error/40"
                                onClick={() => handleOverride(req._id, 'reject')}
                              >
                                <span className="material-symbols-outlined text-sm">shield</span>
                                {overridingId === req._id ? '' : 'Revoke'}
                              </button>
                            )}
                            {isSuperAdmin && req.status === 'rejected' && (
                              <button
                                type="button"
                                disabled={overridingId === req._id}
                                title="Override: approve despite rejection"
                                className="flex items-center gap-1.5 px-3 py-2 bg-tertiary-container text-on-tertiary-container rounded-full font-label-sm text-label-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 border-2 border-tertiary/40"
                                onClick={() => handleOverride(req._id, 'approve')}
                              >
                                <span className="material-symbols-outlined text-sm">shield</span>
                                {overridingId === req._id ? '' : 'Override Approve'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between">
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {total === 0 ? '0 requests' : `Showing ${(page - 1) * LIMIT + 1}â€"${Math.min(page * LIMIT, total)} of ${total}`}
              </p>
              <div className="flex gap-2">
                <button type="button" className="w-10 h-10 flex items-center justify-center border border-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((pg) => (
                  <button key={pg} type="button" className={`w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant ${page === pg ? 'bg-secondary text-on-secondary border-secondary font-bold' : 'hover:bg-surface-container'}`} onClick={() => setPage(pg)}>
                    {pg}
                  </button>
                ))}
                <button type="button" className="w-10 h-10 flex items-center justify-center border border-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {toastMsg && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-on-surface text-surface px-6 py-3 rounded-full shadow-2xl font-label-sm text-label-sm whitespace-nowrap">
          {toastMsg}
        </div>
      )}
    </>
  )
}
