const BASE = import.meta.env.VITE_API_URL || 'https://scholarly-library-zgjw.onrender.com/api'

const SESSION_KEY = 'scholarly-library-session'

function getToken() {
  try {
    const data = JSON.parse(sessionStorage.getItem(SESSION_KEY))
    return data?.token ?? null
  } catch { return null }
}

export async function apiFetch(path, opts = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`)
  return data
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => apiFetch(path, { method: 'DELETE' }),
}
