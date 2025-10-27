import { Link } from 'react-router-dom'
import { Home, Trophy, Clock, Code } from 'lucide-react'

export default function RankingPage() {
  // Mock data - replace with API call
  const rankings = [
    { id: 1, user: 'Juan Pérez', level: 15, time: 45, commands: 23, score: 950 },
    { id: 2, user: 'María García', level: 12, time: 38, commands: 19, score: 920 },
    { id: 3, user: 'Carlos López', level: 10, time: 42, commands: 25, score: 880 },
  ]

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
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-ninja-purple rounded-lg p-6 border border-blue-500/30">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="text-yellow-400" size={32} />
            <h2 className="text-2xl font-bold">Mejores Ninjas</h2>
          </div>

          <div className="overflow-x-auto">
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
                {rankings.map((rank, index) => (
                  <tr key={rank.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {index === 0 && <span className="text-yellow-400">🥇</span>}
                        {index === 1 && <span className="text-gray-300">🥈</span>}
                        {index === 2 && <span className="text-orange-400">🥉</span>}
                        <span className="font-bold">#{index + 1}</span>
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

        <div className="mt-6 text-center">
          <Link to="/game" className="ninja-button inline-flex items-center gap-2">
            <Trophy size={20} />
            Jugar Ahora
          </Link>
        </div>
      </div>
    </div>
  )
}
