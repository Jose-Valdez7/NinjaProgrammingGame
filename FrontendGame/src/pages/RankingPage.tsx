import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Trophy, Clock, Code } from 'lucide-react'
import { apiUrl } from '../config/env'

export default function RankingPage() {
  type Rank = { key?: string; userId: string; user: string; level: number; time: number; commands: number; score: number; position: number }
  type Meta = { totalItems: number; itemCount: number; perPage: number; totalPages: number; currentPage: number }
  const [rankings, setRankings] = useState<Rank[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRankings = async (p = 1) => {
    try {
      setError(null)
      setLoading(true)
      const url = apiUrl(`api/rankings?page=${p}&limit=${limit}`)
      console.log('🔍 Fetching rankings from:', url)
      
      // Agregar timeout de 30 segundos (las queries de ranking pueden tardar en Supabase)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      }).catch((fetchError) => {
        clearTimeout(timeoutId)
        // Capturar errores de red (CORS, conexión, etc.)
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo en http://localhost:3001')
        }
        if (fetchError.name === 'AbortError') {
          throw new Error('La solicitud tardó demasiado. Inténtalo más tarde.')
        }
        throw fetchError
      })
      
      clearTimeout(timeoutId)

      if (!res.ok) {
        const status = res.status
        if (status >= 500) throw new Error('No se pudo cargar el ranking. Inténtalo más tarde.')
        if (status === 404) throw new Error('No hay resultados por ahora')
        const text = await res.text().catch(() => '')
        throw new Error(text || `Error ${status}`)
      }

      const jsonData = await res.json().catch(() => null)
      if (!jsonData || typeof jsonData !== 'object') {
        console.warn('⚠️ Ranking response is not an object:', jsonData)
        setRankings([])
        setMeta({ totalItems: 0, itemCount: 0, perPage: limit, totalPages: 1, currentPage: p })
        return
      }
      
      // El backend puede devolver { items, meta } directamente o envuelto en { data: { items, meta } }
      const data = jsonData.data || jsonData
      console.log('📊 Ranking data received:', { jsonData, data, hasItems: !!data?.items, itemsLength: data?.items?.length })
      
      if (!data || typeof data !== 'object') {
        console.warn('⚠️ Ranking data is not valid:', data)
        setRankings([])
        setMeta({ totalItems: 0, itemCount: 0, perPage: limit, totalPages: 1, currentPage: p })
        return
      }
      
      // data esperado: { items, meta }
      const mapped = (Array.isArray(data?.items) ? data.items : []).map((r: unknown, idx: number) => {
        const row = r as { userId: string; level: number; firstName: string; lastName: string; timeTaken: number; commandsUsed: number; score: number }
        const globalPosition = (page - 1) * limit + idx + 1
        return {
          key: `${row.userId}-${row.level}-${globalPosition}`,
          userId: row.userId,
          user: `${row.firstName} ${row.lastName}`.trim(),
          level: row.level,
          time: row.timeTaken,
          commands: row.commandsUsed,
          score: row.score,
          position: globalPosition,
        }
      })
      setRankings(mapped)
      setMeta(data?.meta ?? null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar el ranking. Inténtalo más tarde.'
      setError(msg)
      setRankings([])
      console.error('Error fetching rankings:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRankings(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return (
    <div className="min-h-screen bg-ninja-dark text-white">
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
    </div>
  )
}
