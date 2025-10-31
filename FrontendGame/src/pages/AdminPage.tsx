import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Users, BarChart3, Settings, Shield } from 'lucide-react'
import { apiUrl, getAuthHeaders, authStorage } from '../config/env'
 

export default function AdminPage() {
  type AdminUser = { id: string | number; firstName?: string; lastName?: string; email?: string }
  type PaginationMeta = { totalItems: number; totalPages: number; currentPage: number }
  const navigate = useNavigate()
  
  const [users, setUsers] = useState<AdminUser[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')

  const fetchUsers = async (p = 1) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`api/users?page=${p}&limit=${limit}`), {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // No autorizado: pedir credenciales admin
          setShowAdminModal(true)
        }
        const text = await res.text()
        throw new Error(text || `Error ${res.status}`)
      }
      const data: unknown = await res.json()
      const parsed = data as { items?: AdminUser[]; meta?: PaginationMeta }
      const items = parsed.items
      const metaObj = parsed.meta
      setUsers(Array.isArray(items) ? items : [])
      setMeta(metaObj ?? null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error cargando usuarios'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Si no hay token o el usuario no es ADMIN, mostrar modal y no intentar cargar
    const token = authStorage.getAccessToken()
    const user = authStorage.getCurrentUser() as { role?: string } | null
    if (!token || !user || user.role !== 'ADMIN') {
      setShowAdminModal(true)
      return
    }

    fetchUsers(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminError('')
    setAdminLoading(true)

    try {
      // Intentar varios endpoints posibles para admin login
      let res: Response | null = null

      // Opción 1: Endpoint específico de admin
      const endpoints = [
        'api/auth/admin/login',
        'api/admin/login',
        'api/auth/login-admin'
      ]

      for (const endpoint of endpoints) {
        try {
          res = await fetch(apiUrl(endpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password: adminPassword }),
          })

          // Si no es 404, este endpoint existe
          if (res.status !== 404) {
            break
          }
        } catch {
          // Continuar con el siguiente endpoint
          continue
        }
      }

      // Si todos los endpoints fallaron con 404, usar login regular con password como cedula
      // (algunos backends permiten esto para admin)
      if (!res || res.status === 404) {
        // Intentar con el endpoint regular pero enviando password en el campo cedula
        res = await fetch(apiUrl('api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: adminEmail, cedula: adminPassword }),
        })
      }

      if (!res.ok) {
        const text = await res.text()
        let errorMsg = text || 'Credenciales de administrador inválidas'
        
        // Intentar parsear como JSON para obtener mensaje más claro
        try {
          const errorJson = JSON.parse(text)
          errorMsg = errorJson.message || errorJson.error || errorMsg
        } catch {
          // Si no es JSON, usar el texto tal cual
        }
        
        throw new Error(errorMsg)
      }

      const json: unknown = await res.json()
      const parsed = json as { data?: { accessToken?: string; refreshToken?: string; user?: unknown } }
      const accessToken = parsed.data?.accessToken
      const refreshToken = parsed.data?.refreshToken
      const adminUser = parsed.data?.user as unknown
      if (!accessToken || !adminUser) throw new Error('Respuesta de admin inválida')

      // Limpiar credenciales de usuario y establecer las de admin
      authStorage.clearAll()
      authStorage.setAccessToken(accessToken)
      if (refreshToken) authStorage.setRefreshToken(refreshToken)
      authStorage.setCurrentUser(adminUser)

      setShowAdminModal(false)
      setAdminEmail('')
      setAdminPassword('')

      // Refrescar datos ahora con token admin
      fetchUsers(page)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión como admin'
      setAdminError(msg)
    } finally {
      setAdminLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ninja-dark text-white">
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

      {showAdminModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-ninja-purple border border-blue-500/30 rounded-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-yellow-400" size={20} />
              <h3 className="text-lg font-semibold">Acceso de Administrador</h3>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  className="ninja-input w-full"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Contraseña</label>
                <input
                  type="text"
                  className="ninja-input w-full"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>

              {adminError && (
                <div className="text-red-400 text-sm">{adminError}</div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded border border-gray-600 hover:bg-gray-800"
                  onClick={() => navigate(-1)}
                  disabled={adminLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ninja-button px-4 py-2 disabled:opacity-60"
                  disabled={adminLoading}
                >
                  {adminLoading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
