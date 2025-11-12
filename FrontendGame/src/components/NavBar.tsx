import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, LogOut, Home, Trophy } from 'lucide-react'
import { apiUrl, authStorage, getAuthHeaders } from '../config/env'
import { useGameStore } from '../store/GameStore'
import { normalizeLoginError } from '../utils/errorMessages'
import { flushOfflineProgress, type OfflineProgressEntry } from '../utils/offlineProgress'

export default function NavBar() {
  const navigate = useNavigate()
  const { currentUser, dispatch } = useGameStore()
  const [showAuth, setShowAuth] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')

  // Login state
  const [email, setEmail] = useState('')
  const [cedula, setCedula] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Register state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const isLoggedIn = Boolean(currentUser)

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  const isValidCedula = (value: string) => /^\d{10}$/.test(value)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!isValidEmail(email)) {
      setError('Correo incorrecto')
      setLoading(false)
      return
    }

    if (!isValidCedula(cedula)) {
      setError('Cédula incorrecta')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(apiUrl('api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, cedula }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(normalizeLoginError(text))
      }
      const json = await res.json()
      const data = json?.data || {}
      const accessToken = data?.accessToken
      const refreshToken = data?.refreshToken
      if (!accessToken) throw new Error('Respuesta de login inválida')
      authStorage.setAccessToken(accessToken)
      if (refreshToken) authStorage.setRefreshToken(refreshToken)
      if (data?.user) {
        authStorage.setCurrentUser(data.user)
        dispatch({ type: 'SET_USER', payload: data.user })
      }
      // Enviar progreso offline si existe
      await flushOfflineProgress(async (entry: OfflineProgressEntry) => {
        return fetch(apiUrl('api/user/progress'), {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            level: entry.level,
            timeTaken: entry.timeTaken,
            commandsUsed: entry.moves,
            energized: true,
            success: true,
          }),
        })
      })

      setShowAuth(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      setError(normalizeLoginError(message))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = { firstName, lastName, email, phone: phone || undefined, cedula, role: 'USER' }
      const res = await fetch(apiUrl('api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text()
        let errorMsg = text || 'Error al registrar usuario'
        try {
          const errorJson = JSON.parse(text)
          if (Array.isArray(errorJson.message)) errorMsg = errorJson.message.join(', ')
          else if (errorJson.message) errorMsg = errorJson.message
          else if (errorJson.error) errorMsg = errorJson.error
        } catch {}
        throw new Error(errorMsg)
      }
      const json = await res.json()
      const data = json?.data || {}
      const accessToken = data?.accessToken
      const refreshToken = data?.refreshToken
      const user = data?.user
      if (accessToken) {
        authStorage.setAccessToken(accessToken)
        if (refreshToken) authStorage.setRefreshToken(refreshToken)
        if (user) {
          authStorage.setCurrentUser(user)
          dispatch({ type: 'SET_USER', payload: user })
        }
        // Enviar progreso offline si existe (si registro hace login automático)
        await flushOfflineProgress(async (entry: OfflineProgressEntry) => {
          return fetch(apiUrl('api/user/progress'), {
            method: 'POST',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              level: entry.level,
              timeTaken: entry.timeTaken,
              commandsUsed: entry.moves,
              energized: true,
              success: true,
            }),
          })
        })

        setShowAuth(false)
      } else {
        // Registro sin login automático
        setMode('login')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar usuario'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    // Obtener el refreshToken antes de limpiar
    const refreshToken = authStorage.getRefreshToken()
    
    // Hacer logout en el servidor
    try {
      if (refreshToken) {
        await fetch(apiUrl('api/auth/logout'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
      }
    } catch {}
    
    // Mostrar spinner por 3 segundos y luego limpiar y navegar
    setTimeout(() => {
      // Limpiar la sesión local
      authStorage.clearAll()
      dispatch({ type: 'SET_USER', payload: null })
      setIsLoggingOut(false)
      // Navegar a la página principal (homepage)
      navigate('/', { replace: true })
    }, 3000)
  }

  return (
    <>
      {isLoggingOut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xl font-semibold text-white">Cerrando sesión...</p>
          </div>
        </div>
      )}
      <div className="bg-ninja-purple border-b border-blue-500/30 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-blue-400 hover:text-blue-300">
              <Home size={20} />
              Inicio
            </button>
            <button onClick={() => navigate('/ranking')} className="flex items-center gap-2 text-blue-400 hover:text-blue-300">
              <Trophy size={20} />
              Ranking
            </button>
          </div>
          <div className="flex items-center gap-3">
            {!isLoggedIn ? (
              <button
                onClick={() => { setMode('login'); setShowAuth(true) }}
                className="px-3 py-2 rounded border border-blue-500/40 hover:bg-blue-600/20 flex items-center gap-2 text-sm"
              >
                <LogIn size={16} /> Iniciar sesión
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded border border-blue-500/40 hover:bg-blue-600/20 flex items-center gap-2 text-sm"
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            )}
          </div>
        </div>
      </div>

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAuth(false)} />
          <div className="relative bg-ninja-purple border border-blue-500/30 rounded-lg w-full max-w-md mx-4 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">{mode === 'login' ? 'Iniciar Sesión' : 'Registro'}</h3>
              <div className="flex gap-2 text-sm">
                <button
                  onClick={() => { setMode('login'); setError(null) }}
                  className={`px-3 py-1 rounded ${mode==='login' ? 'bg-blue-600' : 'bg-gray-700'}`}
                >Login</button>
                <button
                  onClick={() => { setMode('register'); setError(null) }}
                  className={`px-3 py-1 rounded ${mode==='register' ? 'bg-blue-600' : 'bg-gray-700'}`}
                >Registro</button>
              </div>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Email</label>
                  <input type="email" className="ninja-input w-full" value={email} onChange={e=>setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Cédula</label>
                  <input type="text" className="ninja-input w-full" value={cedula} onChange={e=>setCedula(e.target.value)} required />
                </div>
                {error && <div className="text-red-400 text-sm text-center">{error}</div>}
                <button type="submit" className="ninja-button w-full disabled:opacity-60" disabled={loading}>
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Nombre</label>
                    <input type="text" className="ninja-input w-full" value={firstName} onChange={e=>setFirstName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Apellido</label>
                    <input type="text" className="ninja-input w-full" value={lastName} onChange={e=>setLastName(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Email</label>
                  <input type="email" className="ninja-input w-full" value={email} onChange={e=>setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Teléfono</label>
                  <input type="tel" className="ninja-input w-full" value={phone} onChange={e=>setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Cédula</label>
                  <input type="text" className="ninja-input w-full" value={cedula} onChange={e=>setCedula(e.target.value)} required />
                </div>
                {error && <div className="text-red-400 text-sm text-center">{error}</div>}
                <button type="submit" className="ninja-button w-full disabled:opacity-60" disabled={loading}>
                  {loading ? 'Registrando...' : 'Registrarse'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}


