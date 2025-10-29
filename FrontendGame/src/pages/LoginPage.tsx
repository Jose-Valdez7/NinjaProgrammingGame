import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogIn, Home } from 'lucide-react'
import { apiUrl, authStorage } from '../config/env'
import { useGameStore } from '../store/GameStore'

export default function LoginPage() {
  const { dispatch } = useGameStore()
  const [email, setEmail] = useState('')
  const [cedula, setCedula] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const res = await fetch(apiUrl('api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, cedula }),
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
      if (data?.user) {
        authStorage.setCurrentUser(data.user)
        dispatch({ type: 'SET_USER', payload: data.user })
      }
      
      // Redirigir al juego después del login exitoso
      window.location.href = '/game'
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ninja-dark via-ninja-purple to-ninja-blue flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-8 border border-blue-500/30">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Iniciar Sesión</h1>
            <p className="text-gray-300">Accede a tu cuenta ninja</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ninja-input w-full"
                required
              />
            </div>

            <div>
              <label htmlFor="cedula" className="block text-sm font-medium text-gray-300 mb-2">
                Cédula
              </label>
              <input
                type="text"
                id="cedula"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="ninja-input w-full"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              className="ninja-button w-full flex items-center justify-center gap-2 disabled:opacity-60"
              disabled={loading}
            >
              <LogIn size={20} />
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300">
                Regístrate aquí
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link 
              to="/" 
              className="text-gray-400 hover:text-gray-300 inline-flex items-center gap-2"
            >
              <Home size={16} />
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
