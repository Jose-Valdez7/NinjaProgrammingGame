import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Home, Users, BarChart3, Settings } from 'lucide-react'
import { apiUrl, getAuthHeaders } from '../config/env'

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async (p = 1) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`api/users?page=${p}&limit=${limit}`), {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Error ${res.status}`)
      }
      const data = await res.json()
      // data esperado: { items, meta }
      setUsers(Array.isArray(data?.items) ? data.items : [])
      setMeta(data?.meta ?? null)
    } catch (e: any) {
      setError(e?.message || 'Error cargando usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return (
    <div className="min-h-screen bg-ninja-dark text-white">
      <div className="bg-ninja-purple border-b border-blue-500/30 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-blue-400 hover:text-blue-300">
              <Home size={20} />
              Inicio
            </Link>
            <h1 className="text-xl font-bold">Panel de Administración</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-ninja-purple rounded-lg p-6 border border-blue-500/30">
            <div className="flex items-center gap-3 mb-4">
              <Users className="text-blue-400" size={32} />
              <h3 className="text-xl font-semibold">Usuarios</h3>
            </div>
            <div className="text-3xl font-bold text-green-400 mb-2">{meta?.totalItems ?? '-'}</div>
            <p className="text-gray-400 text-sm">Usuarios Registrados</p>
          </div>

          <div className="bg-ninja-purple rounded-lg p-6 border border-blue-500/30">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="text-purple-400" size={32} />
              <h3 className="text-xl font-semibold">Partidas</h3>
            </div>
            <div className="text-3xl font-bold text-green-400 mb-2">5,678 </div>
            <p className="text-gray-400 text-sm">Partidas completadas</p>
          </div>

          <div className="bg-ninja-purple rounded-lg p-6 border border-blue-500/30">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="text-yellow-400" size={32} />
              <h3 className="text-xl font-semibold">Niveles</h3>
            </div>
            <div className="text-3xl font-bold text-green-400 mb-2">15</div>
            <p className="text-gray-400 text-sm">Niveles disponibles</p>
          </div>
        </div>

        <div className="bg-ninja-purple rounded-lg p-6 border border-blue-500/30">
          <h2 className="text-2xl font-bold mb-6">Gestión de Usuarios</h2>

          {loading && (
            <div className="text-center py-6 text-gray-400">Cargando usuarios...</div>
          )}
          {error && !loading && (
            <div className="text-center py-6 text-red-400">{error}</div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 px-4">ID</th>
                  <th className="text-left py-3 px-4">Nombre</th>
                  <th className="text-left py-3 px-4">Email</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                    <td className="py-3 px-4">#{u.id}</td>
                    <td className="py-3 px-4">{`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '-'}</td>
                    <td className="py-3 px-4">{u.email ?? '-'}</td>
                  </tr>
                ))}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-400">Sin usuarios</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-300">
              Página {meta?.currentPage ?? page} de {meta?.totalPages ?? 1} • Total: {meta?.totalItems ?? 0}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 rounded border border-gray-600 hover:bg-gray-800 disabled:opacity-50"
                disabled={loading || (meta ? page <= 1 : page <= 1)}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                className="px-3 py-2 rounded border border-gray-600 hover:bg-gray-800 disabled:opacity-50"
                disabled={loading || (meta ? page >= (meta.totalPages ?? 1) : false)}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
