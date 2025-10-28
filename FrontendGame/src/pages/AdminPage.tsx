import { Link } from 'react-router-dom'
import { Home, Users, BarChart3, Settings } from 'lucide-react'

export default function AdminPage() {
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
            <div className="text-3xl font-bold text-green-400 mb-2">1,234</div>
            <p className="text-gray-400 text-sm">Jugadores registrados</p>
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
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 px-4">ID</th>
                  <th className="text-left py-3 px-4">Nombre</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Nivel Máximo</th>
                  <th className="text-left py-3 px-4">Registro</th>
                  <th className="text-left py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700 hover:bg-gray-800/50">
                  <td className="py-3 px-4">#001</td>
                  <td className="py-3 px-4">Juan Pérez</td>
                  <td className="py-3 px-4">juan@example.com</td>
                  <td className="py-3 px-4">
                    <span className="bg-green-600 px-2 py-1 rounded text-sm">Nivel 15</span>
                  </td>
                  <td className="py-3 px-4">2024-01-15</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm">
                        Ver
                      </button>
                      <button className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm">
                        Suspender
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-center text-gray-400">
            <p>Panel de administración en desarrollo</p>
            <p className="text-sm mt-2">Funcionalidades completas disponibles próximamente</p>
          </div>
        </div>
      </div>
    </div>
  )
}
