import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'

export function useUsers({ role = '', page = 1, limit = 20, q = '' } = {}) {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page, limit })
      if (role) params.set('role', role)
      if (q) params.set('q', q)
      const data = await api.get(`/users?${params}`)
      setUsers(data.users)
      setTotal(data.total)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [role, page, limit, q])

  useEffect(() => { fetchData() }, [fetchData])
  return { users, total, loading, error, refetch: fetchData }
}
