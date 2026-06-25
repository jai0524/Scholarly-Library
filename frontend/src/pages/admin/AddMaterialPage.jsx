import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { P } from '../../routes/appPaths'
import AdminPageHeader from '../../components/navigation/AdminPageHeader'

const SESSION_KEY = 'scholarly-library-session'
function getToken() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY))?.token ?? null } catch { return null }
}

const BASE = import.meta.env.VITE_API_URL || 'https://scholarly-library-5mxm.onrender.com/api'

const FILE_ICONS = {
  pdf: 'picture_as_pdf', doc: 'description', docx: 'description',
  ppt: 'slideshow', pptx: 'slideshow', xls: 'table_chart', xlsx: 'table_chart',
  txt: 'article', zip: 'folder_zip', rar: 'folder_zip',
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', gif: 'image',
}
function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase()
  return FILE_ICONS[ext] || 'insert_drive_file'
}
function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AddMaterialPage() {
  const navigate = useNavigate()


  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [kind, setKind] = useState('')
  const [categoryLabel, setCategoryLabel] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [totalCopies, setTotalCopies] = useState(1)

  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const uploadFile = useCallback(async (file) => {
    setUploading(true)
    setUploadError(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const token = getToken()
      const res = await fetch(`${BASE}/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Upload failed (${res.status})`)
      setUploadedFile({ name: file.name, size: file.size, fileUrl: data.fileUrl })
    } catch (err) {
      setUploadError(err.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleFilePick = (e) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) { setError('Title is required.'); return }
    if (!kind) { setError('Material type is required. Please select Book, Notes, or PYQ.'); return }
    if (!uploadedFile) { setError('A material file is required. Please upload a PDF, DOC, or other file.'); return }
    const copies = kind === 'book' ? Math.max(1, Number(totalCopies) || 1) : 1
    setLoading(true)
    try {
      await api.post('/materials', {
        title: title.trim(),
        author: author.trim(),
        kind,
        categoryLabel: categoryLabel.trim(),
        description: description.trim(),
        coverUrl: coverUrl.trim(),
        fileUrl: uploadedFile?.fileUrl ?? '',
        totalCopies: copies,
        availableCopies: copies,
      })
      navigate(P.adminMaterials)
    } catch (err) {
      setError(err.message || 'Failed to add material.')
      setLoading(false)
    }
  }

  const coverValid = coverUrl.trim().startsWith('http')

  const inputCls = 'w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary transition-all font-body-md text-body-md'
  const labelCls = 'block text-label-sm font-label-sm text-on-surface-variant mb-2'

  return (
    <>
      <main className="flex flex-col min-h-screen">
        <AdminPageHeader
          icon="add_circle"
          title="Add New Material"
          subtitle="Add to your library collection"
          backTo={P.adminMaterials}
          zIndex="z-50"
        />

        <div className="p-margin-mobile md:p-margin-desktop max-w-container-max-width mx-auto w-full">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">

            {/* Left column: metadata */}
            <div className="lg:col-span-8 bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant space-y-8">
              {error && (
                <div className="px-4 py-3 rounded-xl bg-error-container text-on-error-container font-label-sm text-label-sm">
                  {error}
                </div>
              )}

              <section>
                <h3 className="font-title-md text-title-md text-secondary mb-6 border-b border-surface-variant pb-2">Material Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className={labelCls} htmlFor="title">
                      Material Title <span className="text-error">*</span>
                    </label>
                    <input id="title" className={inputCls} placeholder="e.g. Introduction to Quantum Physics" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="author">Author / Contributor</label>
                    <input id="author" className={inputCls} placeholder="e.g. Richard Feynman" type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="kind">Material Type <span className="text-error">*</span></label>
                    <select id="kind" className={`${inputCls} appearance-none`} value={kind} onChange={(e) => setKind(e.target.value)}>
                      <option value="" disabled> Select material type</option>
                      <option value="book">📚 Book</option>
                      <option value="notes">📓 Notes</option>
                      <option value="pyq">📃 PYQ (Previous Year Questions)</option>
                    </select>
                  </div>
                  {kind === 'book' && (
                    <div>
                      <label className={labelCls} htmlFor="totalCopies">Number of Copies <span className="text-error">*</span></label>
                      <input id="totalCopies" className={inputCls} placeholder="e.g. 5" type="number" min="1" value={totalCopies} onChange={(e) => setTotalCopies(e.target.value)} />
                    </div>
                  )}
                  <div>
                    <label className={labelCls} htmlFor="category">Category / Department</label>
                    <input id="category" className={inputCls} placeholder="e.g. Physics Department" type="text" value={categoryLabel} onChange={(e) => setCategoryLabel(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls} htmlFor="description">Description</label>
                    <textarea id="description" className={`${inputCls} resize-none`} placeholder="Brief description of the material" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-title-md text-title-md text-secondary mb-2 border-b border-surface-variant pb-2">Study Material File <span className="text-error">*</span></h3>
                <p className="font-body-md text-on-surface-variant text-sm mb-4">
                  Upload the actual content file (PDF, DOCX, PPT, etc.) that students will read or download.
                </p>

                {uploadedFile ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-tertiary-container border border-outline-variant">
                    <span className="material-symbols-outlined text-on-tertiary-container text-[28px] shrink-0">{fileIcon(uploadedFile.name)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md font-bold text-on-tertiary-container truncate">{uploadedFile.name}</p>
                      <p className="text-xs text-on-tertiary-container/70">{fmtSize(uploadedFile.size)} Â· Uploaded successfully</p>
                    </div>
                    <button type="button" className="p-1.5 rounded-full hover:bg-black/10 text-on-tertiary-container transition-colors shrink-0" onClick={() => setUploadedFile(null)} aria-label="Remove file">
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                ) : (
                  <div
                    className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${dragOver ? 'border-secondary bg-secondary-container/20' : 'border-outline-variant hover:border-secondary hover:bg-surface-container-low'}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-[40px] text-secondary animate-pulse">cloud_upload</span>
                        <p className="font-body-md text-on-surface-variant">Uploading file</p>
                      </div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[40px] text-outline mb-2">cloud_upload</span>
                        <p className="font-body-md text-on-surface-variant mb-1">Drag &amp; drop a file here, or click to browse</p>
                        <p className="text-xs text-outline mt-2">PDF, DOC, DOCX, PPT, PPTX, XLS, TXT, ZIP â€" max 50 MB</p>
                      </>
                    )}
                  </div>
                )}

                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.jpg,.jpeg,.png,.webp" />

                {uploadError && (
                  <p className="mt-2 text-sm text-error">{uploadError}</p>
                )}
              </section>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 border-t border-outline-variant">
                <button type="button" className="w-full sm:w-auto px-8 py-3 rounded-lg border border-secondary text-secondary font-bold hover:bg-surface-container-high transition-colors active:scale-95" onClick={() => navigate(P.adminMaterials)} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="w-full sm:w-auto px-10 py-3 rounded-lg bg-secondary text-on-secondary font-bold hover:opacity-90 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60" disabled={loading}>
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  {loading ? 'Adding to Library' : 'Add to Library'}
                </button>
              </div>
            </div>

            {/* Right column: cover */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant">
                <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4 text-center">Cover Image</h3>
                <div className="relative aspect-[3/4] w-full bg-surface-container-highest rounded-lg overflow-hidden flex items-center justify-center mb-4">
                  {coverValid ? (
                    <img alt="Cover preview" className="absolute inset-0 w-full h-full object-contain" src={coverUrl} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    <div className="flex flex-col items-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl mb-2 opacity-40">image</span>
                      <p className="text-xs px-8 text-center opacity-60">Paste a cover image URL below to preview</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelCls} htmlFor="cover-url">Cover Image URL</label>
                  <input id="cover-url" className={inputCls} placeholder="https://example.com/cover.jpg" type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
                  <p className="text-xs text-outline mt-2">Paste a publicly accessible image URL (JPG, PNG, WEBP)</p>
                </div>
              </div>

              <div className="bg-secondary-container p-6 rounded-xl border border-secondary-fixed-dim">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-on-secondary-container">lightbulb</span>
                  <div>
                    <h4 className="font-bold text-on-secondary-container text-body-md mb-1">Librarian Tip</h4>
                    <p className="text-xs text-on-secondary-container leading-relaxed">
                      After adding, the material is immediately visible in the student catalog and can be borrowed. Set the correct number of copies so the system tracks availability accurately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <footer className="mt-auto py-8 text-center text-on-surface-variant text-xs">
          Â© 2024 Scholarly Library Management System. All rights reserved.
        </footer>
      </main>
    </>
  )
}
