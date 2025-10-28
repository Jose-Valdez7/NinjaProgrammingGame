import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Home, Trophy, Clock, Code, LogOut } from 'lucide-react'
import { apiUrl, getAuthHeaders, authStorage } from '../config/env'

export default function RankingPage() {
  const [rankings, setRankings] = useState<any[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginCedula, setLoginCedula] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const fetchRankings = async (p = 1) => {
    try {
      const res = await fetch(apiUrl(`api/rankings?page=${p}&limit=${limit}`), {
        headers: getAuthHeaders(),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Error ${res.status}`)
      }

      const data = await res.json()
      // data esperado: { items, meta }
      const mapped = (Array.isArray(data?.items) ? data.items : []).map((r: any, idx: number) => {
        const globalPosition = (page - 1) * limit + idx + 1
        return {
          key: `${r.userId}-${r.level}-${globalPosition}`,
          userId: r.userId,
          user: `${r.firstName} ${r.lastName}`.trim(),
          level: r.level,
          time: r.timeTaken,
          commands: r.commandsUsed,
          score: r.score,
          position: globalPosition,
        }
      })
      setRankings(mapped)
      setMeta(data?.meta ?? null)
    } catch (e: any) {
      setError(e?.message || 'Error cargando el ranking')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Mostrar modal si no hay token
    const token = authStorage.getAccessToken()
    if (!token) setShowLogin(true)

    fetchRankings(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoggingIn(true)
    try {
      const res = await fetch(apiUrl('api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, cedula: loginCedula }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Credenciales inválidas')
      }

      const json = await res.json()
      const data = json?.data || {}
      const accessToken = data?.accessToken
      const refreshToken = data?.refreshToken
      if (!accessToken) throw new Error('Respuesta de login inválida')

      authStorage.setAccessToken(accessToken)
      if (refreshToken) authStorage.setRefreshToken(refreshToken)
      if (data?.user) authStorage.setCurrentUser(data.user)

      setShowLogin(false)
      setLoading(true)
      await fetchRankings(page)
    } catch (err: any) {
      setLoginError(err?.message || 'Error al iniciar sesión')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      const refreshToken = authStorage.getRefreshToken()
      // Llamada al logout en backend (mejor esfuerzo)
      if (refreshToken) {
        await fetch(apiUrl('api/auth/logout'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
      }
    } catch (_) {
      // Ignorar errores de logout
    } finally {
      authStorage.clearAll()
      setShowLogin(true)
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-ninja-dark text-white">
      <div className="bg-ninja-purple border-b border-blue-500/30 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-blue-400 hover:text-blue-300">
              <Home size={20} />
              Inicio
            </Link>
            <h1 className="text-xl font-bold">Ranking Global</h1>
          </div>
          <div className="flex items-center gap-3">
            {authStorage.getAccessToken() && (
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded border border-blue-500/40 hover:bg-blue-600/20 flex items-center gap-2 text-sm"
                disabled={loggingOut}
              >
                <LogOut size={16} />
                {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-ninja-purple rounded-lg p-6 border border-blue-500/30">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="text-yellow-400" size={32} />
            <h2 className="text-2xl font-bold">Mejores Ninjas</h2>
          </div>

          <div className="overflow-x-auto">
            {loading && (
              <div className="text-center py-8 text-gray-400">Cargando ranking...</div>
            )}
            {error && !loading && (
              <div className="text-center py-8 text-red-400">{error}</div>
            )}
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 px-4">Posición</th>
                  <th className="text-left py-3 px-4">Jugador</th>
                  <th className="text-left py-3 px-4">Nivel</th>
                  <th className="text-left py-3 px-4">Tiempo</th>
                  <th className="text-left py-3 px-4">Comandos</th>
                  <th className="text-left py-3 px-4">Puntuación</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((rank) => (
                  <tr key={rank.key ?? rank.position} className="border-b border-gray-700 hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {rank.position === 1 && <span className="text-yellow-400">🥇</span>}
                        {rank.position === 2 && <span className="text-gray-300">🥈</span>}
                        {rank.position === 3 && <span className="text-orange-400">🥉</span>}
                        <span className="font-bold">#{rank.position}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">{rank.user}</td>
                    <td className="py-3 px-4">
                      <span className="bg-blue-600 px-2 py-1 rounded text-sm">
                        Nivel {rank.level}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        {rank.time}s
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Code size={16} />
                        {rank.commands}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-green-400 font-bold">{rank.score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rankings.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No hay datos de ranking disponibles
            </div>
          )}
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

        <div className="mt-6 text-center">
          <Link to="/game" className="ninja-button inline-flex items-center gap-2">
            <Trophy size={20} />
            Jugar Ahora
          </Link>
        </div>
      </div>

      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative bg-ninja-purple border border-blue-500/30 rounded-lg w-full max-w-md mx-4 p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold">Iniciar sesión</h3>
              <p className="text-gray-300 text-sm">Accede para una mejor experiencia</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm text-gray-300 mb-2">Email</label>
                <input
                  id="login-email"
                  type="email"
                  className="ninja-input w-full"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="login-cedula" className="block text-sm text-gray-300 mb-2">Cédula</label>
                <input
                  id="login-cedula"
                  type="text"
                  className="ninja-input w-full"
                  value={loginCedula}
                  onChange={(e) => setLoginCedula(e.target.value)}
                  required
                />
              </div>

              {loginError && (
                <div className="text-red-400 text-sm text-center">{loginError}</div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="ninja-button flex-1 disabled:opacity-60"
                  disabled={loggingIn}
                >
                  {loggingIn ? 'Ingresando...' : 'Ingresar'}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded border border-gray-600 text-gray-200 hover:bg-gray-800"
                  onClick={() => setShowLogin(false)}
                >
                  Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
