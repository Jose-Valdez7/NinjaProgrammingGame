import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, Home } from 'lucide-react'
import { apiUrl, authStorage } from '../config/env'
import { useGameStore } from '../store/GameStore'

export default function RegisterPage() {
  const { dispatch } = useGameStore()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cedula: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(apiUrl('api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Error al registrar usuario')
      }

      const json = await res.json()
      const data = json?.data || {}
      const accessToken = data?.accessToken
      const refreshToken = data?.refreshToken
      if (!accessToken) throw new Error('Respuesta de registro inválida')

      authStorage.setAccessToken(accessToken)
      if (refreshToken) authStorage.setRefreshToken(refreshToken)
      if (data?.user) {
        authStorage.setCurrentUser(data.user)
        dispatch({ type: 'SET_USER', payload: data.user })
      }
      
      // Redirigir al juego después del registro exitoso
      window.location.href = '/game'
    } catch (err: any) {
      setError(err?.message || 'Error al registrar usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ninja-dark via-ninja-purple to-ninja-blue flex items-center justify-center py-8">
      <div className="max-w-md w-full mx-4">
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-8 border border-blue-500/30">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Registro</h1>
            <p className="text-gray-300">Únete a la aventura ninja</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="ninja-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Apellido
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="ninja-input w-full"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="ninja-input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="ninja-input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cédula
              </label>
              <input
                type="text"
                name="cedula"
                value={formData.cedula}
                onChange={handleChange}
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
              <UserPlus size={20} />
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300">
                Inicia sesión aquí
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
