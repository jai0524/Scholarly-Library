import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMaterial, useMaterials } from '../../hooks/useMaterials'
import { useActivity } from '../../contexts/ActivityContext'
import { useAuth } from '../../contexts/AuthContext'
import { useUserLibrary } from '../../contexts/UserLibraryContext'
import { api } from '../../services/api'
import { navBtn, P } from '../../routes/appPaths'

const KIND_LABEL = { book: 'Textbook', notes: 'Notes', pyq: 'PYQs' }
const KIND_COLOR = {
  book: 'bg-primary text-on-primary',
  notes: 'bg-secondary-container text-on-secondary-container',
  pyq: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
}
const KIND_ICON = { book: 'book', notes: 'description', pyq: 'history_edu' }

function fmtDate(dateStr) {
  if (!dateStr) return 'â€”'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function MaterialDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const { addActivity } = useActivity()
  const isAdmin = role === 'admin' || role === 'superadmin'
  const canDownload = isAdmin
  const { savedIds, toggleSaved } = useUserLibrary()
  const saved = savedIds.has(id)

  const { material, loading, error } = useMaterial(id)
  const { materials: similarRaw } = useMaterials({ kind: material?.kind, limit: 5 })
  const similar = similarRaw.filter((m) => m._id !== id).slice(0, 4)

  // Borrow state â€” only relevant for books
  const [borrowRequest, setBorrowRequest] = useState(null)
  const [borrowLoading, setBorrowLoading] = useState(false)
  const [borrowError, setBorrowError] = useState(null)

  useEffect(() => {
    if (!material || material.kind !== 'book') return
    api.get(`/borrow/my?materialId=${id}`)
      .then((list) => {
        const active = list.find((r) => ['pending', 'approved'].includes(r.status)) ?? list[0] ?? null
        setBorrowRequest(active)
      })
      .catch(() => {})
  }, [id, material])

  const handleBorrow = async () => {
    setBorrowLoading(true)
    setBorrowError(null)
    try {
      const req = await api.post('/borrow', { materialId: id })
      setBorrowRequest(req)
      addActivity(
        { id: `act-${Date.now()}`, kind: 'borrow', title: `Borrow Requested: ${material.title}`, detail: 'Pending librarian approval.', timestamp: Date.now(), icon: 'local_library', iconBg: 'bg-secondary-container', iconColor: 'text-on-secondary-container' },
        { title: 'Borrow Requested', message: `"${material.title}" â€” pending approval.`, icon: 'local_library', iconBg: 'bg-secondary-container', iconColor: 'text-on-secondary-container' }
      )
    } catch (err) {
      setBorrowError(err.message || 'Failed to request borrow.')
    } finally {
      setBorrowLoading(false)
    }
  }

  const handleCancelBorrow = async () => {
    if (!borrowRequest) return
    setBorrowLoading(true)
    setBorrowError(null)
    try {
      const updated = await api.patch(`/borrow/${borrowRequest._id}/cancel`, {})
      setBorrowRequest(updated)
    } catch (err) {
      setBorrowError(err.message || 'Failed to cancel.')
    } finally {
      setBorrowLoading(false)
    }
  }

  const handleReturn = async () => {
    if (!borrowRequest) return
    setBorrowLoading(true)
    setBorrowError(null)
    try {
      const updated = await api.patch(`/borrow/${borrowRequest._id}/return`, {})
      setBorrowRequest(updated)
      addActivity(
        { id: `act-${Date.now()}`, kind: 'return', title: `Returned: ${material.title}`, detail: `Returned on ${fmtDate(new Date())}.`, timestamp: Date.now(), icon: 'assignment_return', iconBg: 'bg-tertiary-container', iconColor: 'text-on-tertiary-container' },
        { title: 'Book Returned', message: `"${material.title}" marked as returned.`, icon: 'assignment_return', iconBg: 'bg-tertiary-container', iconColor: 'text-on-tertiary-container' }
      )
    } catch (err) {
      setBorrowError(err.message || 'Failed to mark return.')
    } finally {
      setBorrowLoading(false)
    }
  }

  const handlePreview = () => {
    window.open(material.fileUrl, '_blank', 'noopener,noreferrer')
  }

  const handleDownload = async () => {
    try {
      const res = await fetch(material.fileUrl, { mode: 'cors' })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${material.title || 'resource'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      window.open(material.fileUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleToggleSave = () => {
    if (!material) return
    const now = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const wasSaved = savedIds.has(id)
    toggleSaved(id)
    if (wasSaved) {
      addActivity(
        { id: `act-${Date.now()}`, kind: 'cancel', title: `Removed: ${material.title}`, detail: `Removed from shelf on ${now}.`, timestamp: Date.now(), icon: 'bookmark_remove', iconBg: 'bg-surface-container-highest', iconColor: 'text-on-surface-variant' },
        { title: 'Removed from Shelf', message: `"${material.title}" was removed from your shelf.`, icon: 'bookmark_remove', iconBg: 'bg-surface-container-highest', iconColor: 'text-on-surface-variant' }
      )
    } else {
      addActivity(
        { id: `act-${Date.now()}`, kind: 'borrow', title: `Saved: ${material.title}`, detail: `Added to your shelf on ${now}.`, timestamp: Date.now(), icon: 'bookmark_added', iconBg: 'bg-secondary-container', iconColor: 'text-on-secondary-container' },
        { title: 'Saved to Shelf', message: `"${material.title}" has been saved to your shelf.`, icon: 'bookmark_added', iconBg: 'bg-secondary-container', iconColor: 'text-on-secondary-container' }
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface dark:bg-on-background text-on-surface flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-[64px] text-outline animate-pulse">book</span>
        <p className="font-body-md text-on-surface-variant">Loading material</p>
      </div>
    )
  }

  if (error || !material) {
    return (
      <div className="min-h-screen bg-surface dark:bg-on-background text-on-surface flex flex-col items-center justify-center gap-4 p-8">
        <span className="material-symbols-outlined text-[64px] text-outline">search_off</span>
        <h2 className="font-headline-lg text-headline-lg">Material not found</h2>
        <p className="text-on-surface-variant font-body-md text-center">{error || 'This material may have been removed or the link is invalid.'}</p>
        <button type="button" className={`${navBtn} px-6 py-3 bg-primary text-on-primary rounded-full font-bold hover:opacity-90 active:scale-95 transition-all`} onClick={() => navigate(P.userCatalog)}>Back to Catalog</button>
      </div>
    )
  }

  return (
    <div className="bg-surface dark:bg-on-background text-on-surface font-body-md selection:bg-secondary-container min-h-screen">
      {!isAdmin && (
        <header className="flex items-center gap-3 px-gutter py-base w-full sticky top-0 md:top-[88px] z-40 bg-surface-container dark:bg-surface-container-high shadow-sm">
          <button type="button" className="p-2 hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full transition-colors active:scale-95 shrink-0" onClick={() => navigate(-1)} aria-label="Go back">
            <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim">arrow_back</span>
          </button>
          <h1 className="font-title-md text-title-md font-bold line-clamp-1 flex-1">{material.title}</h1>
          <button type="button" className="p-2 hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full transition-colors active:scale-95 shrink-0" onClick={() => toggleSaved(id)} aria-label={saved ? 'Remove from shelf' : 'Save to shelf'}>
            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}>bookmark</span>
          </button>
        </header>
      )}

      <main className="max-w-[1280px] mx-auto px-margin-mobile md:px-gutter py-8 pb-24">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          <div className="w-full md:w-56 shrink-0 mx-auto md:mx-0" style={{ maxWidth: '224px' }}>
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-surface-container shadow-lg">
              {material.coverUrl ? (
                <img src={material.coverUrl} alt={material.title} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container to-surface-container-high dark:from-surface-container-high dark:to-surface-variant gap-3">
                  <span className="material-symbols-outlined text-[72px] text-outline-variant">{KIND_ICON[material.kind]}</span>
                  <span className="text-label-sm text-outline font-label-sm px-4 text-center">{material.categoryLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-label-sm font-label-sm ${KIND_COLOR[material.kind]}`}>{KIND_LABEL[material.kind]}</span>
              <span className="px-3 py-1 rounded-full bg-surface-container dark:bg-surface-container-high text-on-surface-variant text-label-sm font-label-sm">{material.categoryLabel}</span>
              {saved && (
                <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
                  Saved
                </span>
              )}
            </div>

            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2 leading-snug">{material.title}</h2>
            <p className="font-body-lg text-on-surface-variant mb-5">{material.author}</p>

            {material.rating ? (
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map((star) => (
                    <span key={star} className="material-symbols-outlined text-secondary text-[20px]" style={{ fontVariationSettings: star <= Math.round(material.rating) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                  ))}
                </div>
                <span className="font-bold text-secondary">{material.rating.toFixed(1)}</span>
                <span className="text-on-surface-variant font-body-md">/ 5.0</span>
              </div>
            ) : null}

            {material.description ? (
              <div className="mb-8 p-5 rounded-xl bg-surface-container dark:bg-surface-container-high border border-outline-variant/50">
                <h3 className="font-title-md text-title-md font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-secondary">info</span>
                  About this material
                </h3>
                <p className="font-body-lg text-on-surface-variant leading-relaxed">{material.description}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button type="button" className={['flex items-center gap-2 px-7 py-3 rounded-full font-bold text-body-md transition-all active:scale-95 border', saved ? 'bg-secondary-container border-secondary text-on-secondary-container' : 'border-secondary text-secondary hover:bg-secondary-container'].join(' ')} onClick={handleToggleSave}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}>bookmark</span>
                {saved ? 'Saved to Shelf' : 'Save to Shelf'}
              </button>
              {canDownload ? (
                <button
                  type="button"
                  className="flex items-center gap-2 px-5 py-3 rounded-full font-bold text-body-md transition-all active:scale-95 border border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                  onClick={() => navigate(P.adminMaterialSavedHistory(id))}
                >
                  <span className="material-symbols-outlined">group</span>
                  All Save History
                </button>
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-2 px-5 py-3 rounded-full font-bold text-body-md transition-all active:scale-95 border border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                  onClick={() => navigate(P.userMaterialSaveHistory(id))}
                >
                  <span className="material-symbols-outlined">history</span>
                  My Save History
                </button>
              )}
              {material.fileUrl && (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-body-md transition-all active:scale-95 bg-primary text-on-primary hover:opacity-90"
                    onClick={handlePreview}
                  >
                    <span className="material-symbols-outlined">open_in_new</span>
                    Preview
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-body-md transition-all active:scale-95 border border-primary text-primary hover:bg-primary/10"
                    onClick={handleDownload}
                  >
                    <span className="material-symbols-outlined">download</span>
                    Download
                  </button>
                </>
              )}
            </div>

            {/* Borrow section â€” books only, non-admin users */}
            {material.kind === 'book' && !isAdmin && (
              <div className="mt-6 p-5 rounded-xl border border-outline-variant bg-surface-container">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">local_library</span>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">Physical Borrow</h3>
                </div>

                {borrowError && (
                  <p className="mb-3 text-label-sm font-label-sm text-error bg-error-container px-3 py-2 rounded-lg">{borrowError}</p>
                )}

                {/* No active request â€” show availability + borrow button */}
                {(!borrowRequest || ['returned', 'cancelled', 'rejected'].includes(borrowRequest.status)) && (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-body-md text-on-surface-variant">
                        {material.availableCopies > 0
                          ? <><span className="text-green-700 font-bold">{material.availableCopies}</span> {material.availableCopies === 1 ? 'copy' : 'copies'} available</>
                          : <span className="text-secondary font-bold">No copies available â€” join waitlist</span>}
                      </p>
                      {borrowRequest?.status === 'rejected' && (
                        <p className="text-label-sm text-error mt-1">Your previous request was rejected. You may request again.</p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={borrowLoading}
                      className={`${navBtn} flex items-center gap-2 px-6 py-3 rounded-full font-bold text-body-md transition-all active:scale-95 bg-primary text-on-primary hover:opacity-90 disabled:opacity-50`}
                      onClick={handleBorrow}
                    >
                      <span className="material-symbols-outlined">{material.availableCopies > 0 ? 'local_library' : 'hourglass_empty'}</span>
                      {borrowLoading ? 'Requesting' : material.availableCopies > 0 ? 'Request Borrow' : 'Join Waitlist'}
                    </button>
                  </div>
                )}

                {/* Pending approval */}
                {borrowRequest?.status === 'pending' && (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-label-sm font-bold">Pending Approval</span>
                      <p className="font-body-sm text-on-surface-variant">Waiting for librarian to approve your request.</p>
                    </div>
                    <button
                      type="button"
                      disabled={borrowLoading}
                      className={`${navBtn} flex items-center gap-2 px-5 py-2.5 rounded-full text-label-sm font-label-sm font-bold border border-error text-error hover:bg-error-container transition-colors disabled:opacity-50`}
                      onClick={handleCancelBorrow}
                    >
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                      {borrowLoading ? 'Cancelling' : 'Cancel Request'}
                    </button>
                  </div>
                )}

                {/* Approved â€” show due date + return */}
                {borrowRequest?.status === 'approved' && (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-label-sm font-label-sm font-bold">Approved</span>
                      <p className="font-body-md text-on-surface mt-2">
                        Due: <span className="font-bold text-primary">{fmtDate(borrowRequest.dueDate)}</span>
                      </p>
                      <p className="text-label-sm text-on-surface-variant">Collect the book from the library counter.</p>
                    </div>
                    <button
                      type="button"
                      disabled={borrowLoading}
                      className={`${navBtn} flex items-center gap-2 px-6 py-3 rounded-full font-bold text-body-md transition-all active:scale-95 bg-tertiary-container text-on-tertiary-container hover:opacity-90 disabled:opacity-50`}
                      onClick={handleReturn}
                    >
                      <span className="material-symbols-outlined">assignment_return</span>
                      {borrowLoading ? 'Processing' : 'Mark as Returned'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Admin sees borrow stats for books */}
            {material.kind === 'book' && isAdmin && (
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="px-5 py-3 rounded-xl bg-surface-container border border-outline-variant flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">inventory_2</span>
                  <div>
                    <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Available</p>
                    <p className="font-bold text-on-surface">{material.availableCopies} / {material.totalCopies}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className={`${navBtn} px-5 py-3 rounded-xl bg-secondary-container text-on-secondary-container border border-outline-variant flex items-center gap-2 hover:opacity-80 transition-opacity`}
                  onClick={() => navigate(P.adminBorrows)}
                >
                  <span className="material-symbols-outlined">local_library</span>
                  <span className="font-bold text-label-sm">Manage Borrows</span>
                </button>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-outline-variant flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-0.5">Added by</p>
                <p className="font-body-md text-on-surface">{/* material.addedBy?.name*/ "Librarian" ?? 'â€”'}</p>
              </div>
              <div>
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-0.5">Type</p>
                <p className="font-body-md text-on-surface">{KIND_LABEL[material.kind]}</p>
              </div>
              <div>
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-0.5">Category</p>
                <p className="font-body-md text-on-surface">{material.categoryLabel || 'â€”'}</p>
              </div>
            </div>
          </div>
        </div>

        {similar.length > 0 ? (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline-lg text-headline-lg">More {KIND_LABEL[material.kind]}s</h3>
              <button type="button" className={`${navBtn} text-primary font-bold flex items-center gap-1 hover:underline`} onClick={() => navigate(P.userCatalog)}>
                View catalog <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-gutter">
              {similar.map((m) => (
                <article key={m._id} className="group bg-surface-container-lowest dark:bg-surface-container rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-secondary cursor-pointer" onClick={() => navigate(P.userMaterialDetail(m._id))} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(P.userMaterialDetail(m._id))} aria-label={`View ${m.title}`}>
                  <div className="aspect-[3/4] overflow-hidden relative bg-surface-container dark:bg-surface-container-high">
                    {m.coverUrl ? (
                      <img className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" src={m.coverUrl} alt={m.title} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-container to-surface-container-high dark:from-surface-container-high dark:to-surface-variant">
                        <span className="material-symbols-outlined text-[48px] text-outline-variant">{KIND_ICON[m.kind]}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-body-md font-bold line-clamp-2 mb-0.5">{m.title}</h4>
                    <p className="text-label-sm text-on-surface-variant line-clamp-1">{m.author}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <nav
        aria-label="Bottom navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-outline-variant shadow-lg"
      >
        <div className="flex justify-around items-center px-2 py-1">
          {[
            { icon: 'home',            label: 'Home',    href: P.userDashboard, active: false },
            { icon: 'search',          label: 'Browse',  href: P.userCatalog,   active: true  },
            { icon: 'history',         label: 'History', href: P.userActivity,  active: false },
            { icon: 'manage_accounts', label: 'Account', href: P.userProfile,   active: false },
          ].map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => navigate(item.href)}
              className={`${navBtn} flex flex-col items-center gap-0.5 py-2 px-3 rounded-2xl transition-all active:scale-90 min-w-[64px] ${
                item.active ? 'text-secondary' : 'text-on-surface-variant'
              }`}
            >
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
    </div>
  )
}
