import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../store/GameStore'
import { GameEngine } from '../game/GameEngine'
import { LevelGenerator } from '../game/LevelGenerator'
import { CommandParser } from '../game/CommandParser'
import { Play, RotateCcw, Home, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function GamePage() {
  const { gameState, currentUser, dispatch } = useGameStore()
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const gameEngineRef = useRef<GameEngine | null>(null)
  const levelGeneratorRef = useRef(new LevelGenerator())
  const commandParserRef = useRef(new CommandParser())

  const [commands, setCommands] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [error, setError] = useState('')
  const [currentLevel, setCurrentLevel] = useState(1)
  const [level, setLevel] = useState<any>(null)

  // 🧩 Inicializar motor Pixi y cargar primer nivel
  useLayoutEffect(() => {
    const container = canvasContainerRef.current
    if (!container || gameEngineRef.current) return

    const initializeGame = async () => {
      try {
        const width = container.clientWidth || 480
        const height = container.clientHeight || 480
        gameEngineRef.current = new GameEngine(container, { width, height })
        await loadLevel(currentLevel)
      } catch (e) {
        console.error('Error initializing GameEngine:', e)
        setError('Error al inicializar el motor gráfico. Recarga la página.')
      }
    }

    initializeGame()

    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.destroy()
        gameEngineRef.current = null
      }
    }
  }, [])

  // 🧭 Protección de niveles
  useEffect(() => {
    if (currentLevel >= 2 && !currentUser) {
      window.location.href = '/login'
    }
  }, [currentLevel, currentUser])

  // 🧱 Cargar nivel
  const loadLevel = useCallback(async (levelNumber: number) => {
    const levelGen = levelGeneratorRef.current
    const newLevel = levelGen.generateLevel(levelNumber)
    setLevel(newLevel)
    await gameEngineRef.current?.loadLevel(newLevel)
    gameEngineRef.current?.setGuideVisibility(Boolean(commands.trim()))
    gameEngineRef.current?.debugDump()
    dispatch({ type: 'SET_LEVEL', payload: newLevel })
    dispatch({ type: 'RESET_LEVEL' })
    setCommands('')
    setError('')
    setCurrentLevel(levelNumber)
  }, [commands, dispatch])

  // 🧩 Validar y expandir comandos
  const validateAndParseCommands = () => {
    const parser = commandParserRef.current
    const validation = parser.validateCommands(commands)
    if (!validation.isValid) throw new Error(validation.error || 'Comandos inválidos')
    const parsed = parser.parseCommands(commands)
    return parser.expandCommands(parsed)
  }

  // Mostrar/ocultar guía según haya comandos
  useEffect(() => {
    gameEngineRef.current?.setGuideVisibility(Boolean(commands.trim()))
  }, [commands])

  // ⚡ Ejecutar comandos
  const executeCommands = async () => {
    if (!gameEngineRef.current || !commands.trim() || !level) return

    try {
      const expandedCommands = validateAndParseCommands()
      setIsPlaying(true)
      setError('')

      let currentPos = { x: 0, y: 14 }
      let isEnergized = false
      let energyCollected = 0

      for (const command of expandedCommands) {
        for (let step = 0; step < command.steps; step++) {
          const newPos = { ...currentPos }

          switch (command.direction) {
            case 'D': newPos.x += 1; break
            case 'I': newPos.x -= 1; break
            case 'S': newPos.y -= 1; break
            case 'B': newPos.y += 1; break
          }

          // 📏 Límites del mapa
          if (newPos.x < 0 || newPos.x >= 15 || newPos.y < 0 || newPos.y >= 15) {
            setError('¡El ninja se salió del mapa!')
            setIsPlaying(false)
            return
          }

          await gameEngineRef.current.animateNinjaMovement(
            currentPos.x, currentPos.y, newPos.x, newPos.y
          )
          currentPos = newPos

          const cell = level.grid[newPos.y][newPos.x]

          if (cell.type === 'void') {
            await gameEngineRef.current.animateFailure('void')
            setError('¡Caíste al vacío! Intenta de nuevo.')
            setIsPlaying(false)
            resetLevel()
            return
          }

          if (cell.type === 'snake') {
            await gameEngineRef.current.animateFailure('snake')
            setError('¡Te mordió una serpiente! Intenta de nuevo.')
            setIsPlaying(false)
            resetLevel()
            return
          }

          if (cell.type === 'energy') {
            energyCollected++
            isEnergized = true
            gameEngineRef.current.animateEnergyCollection()
          }

          if (cell.type === 'door') {
            if (!isEnergized) {
              setError('¡Necesitas energía para pasar por la puerta!')
              setIsPlaying(false)
              return
            }

            await gameEngineRef.current.animateVictory()
            setError('')
            if (currentUser) {
              // TODO: guardar progreso en backend
            }

            // Si no hay usuario autenticado, mostrar pantalla de login/registro
            if (!currentUser) {
              setTimeout(() => {
                window.location.href = '/login?next=/game'
              }, 1200)
              setIsPlaying(false)
              return
            }

            if (currentLevel < 15) {
              setTimeout(() => loadLevel(currentLevel + 1), 2000)
            } else {
              setError('🎉 ¡Felicidades! Completaste todos los niveles.')
            }

            setIsPlaying(false)
            return
          }

          // Delay mínimo para suavizar animación
          await new Promise(resolve => setTimeout(resolve, 80))
        }
      }

      setIsPlaying(false)
    } catch (err: any) {
      setError(err.message || 'Error ejecutando comandos')
      setIsPlaying(false)
    }
  }

  // 🔁 Reiniciar nivel
  const resetLevel = useCallback(() => loadLevel(currentLevel), [currentLevel, loadLevel])

  const levelInfo = level ? {
    energyRequired: level.requiredEnergy,
    timeLimit: level.timeLimit,
    hasGuideLines: level.hasGuideLines,
    allowsLoops: level.allowsLoops
  } : {}

  return (
    <div className="min-h-screen bg-ninja-dark text-white">
      {/* Header */}
      <div className="bg-ninja-purple border-b border-blue-500/30 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-blue-400 hover:text-blue-300">
              <Home size={20} />
              Inicio
            </Link>
            <h1 className="text-xl font-bold">Ninja Energy Quest</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm">
              Nivel: <span className="font-bold text-blue-400">{currentLevel}/15</span>
            </div>
            {currentUser && (
              <div className="text-sm">
                Jugador: <span className="font-bold text-green-400">{currentUser.firstName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-ninja-purple rounded-lg p-6 border border-blue-500/30">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Nivel {currentLevel}</h2>
                <button
                  onClick={resetLevel}
                  className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded flex items-center gap-1 text-sm"
                >
                  <RotateCcw size={16} />
                  Reiniciar
                </button>
              </div>

              <div className="flex justify-center">
                <div
                  ref={canvasContainerRef}
                  className="border border-gray-600 rounded-lg"
                  style={{ width: '720px', height: '720px' }}
                />
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="space-y-6">
            {/* Level Info */}
            <div className="bg-ninja-purple rounded-lg p-4 border border-blue-500/30">
              <h3 className="font-semibold mb-3">Información del Nivel</h3>
              {level && (
                <div className="space-y-2 text-sm">
                  <div>⚡ Energía requerida: {levelInfo.energyRequired}</div>
                  {levelInfo.timeLimit && <div>⏱️ Tiempo límite: {levelInfo.timeLimit}s</div>}
                  {levelInfo.hasGuideLines && <div className="text-yellow-400">💡 Líneas guía disponibles</div>}
                  {levelInfo.allowsLoops && <div className="text-purple-400">🔄 Loops permitidos</div>}
                </div>
              )}
            </div>

            {/* Commands */}
            <div className="bg-ninja-purple rounded-lg p-4 border border-blue-500/30">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Comandos</h3>
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <HelpCircle size={20} />
                </button>
              </div>

              <textarea
                value={commands}
                onChange={(e) => setCommands(e.target.value)}
                placeholder="Ej: D3,S2,I1"
                className="ninja-input w-full h-24 resize-none"
                disabled={isPlaying}
              />

              {error && <div className="mt-2 text-red-400 text-sm">{error}</div>}

              <button
                onClick={executeCommands}
                disabled={isPlaying || !commands.trim()}
                className="ninja-button w-full mt-3 flex items-center justify-center gap-2"
              >
                <Play size={20} />
                {isPlaying ? 'Ejecutando...' : 'Ejecutar'}
              </button>
            </div>

            {/* Help */}
            {showHelp && (
              <div className="bg-ninja-purple rounded-lg p-4 border border-blue-500/30">
                <h3 className="font-semibold mb-3">Ayuda</h3>
                <div className="text-sm space-y-2">
                  <div><strong>D[n]:</strong> Derecha n pasos</div>
                  <div><strong>I[n]:</strong> Izquierda n pasos</div>
                  <div><strong>S[n]:</strong> Subir n pasos</div>
                  <div><strong>B[n]:</strong> Bajar n pasos</div>
                  {levelInfo.allowsLoops && (
                    <div className="mt-3">
                      <strong>Loops:</strong><br />
                      <code>(D1,S1)x3</code> - Repite 3 veces
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="bg-ninja-purple rounded-lg p-4 border border-blue-500/30">
              <h3 className="font-semibold mb-3">Leyenda</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded"></div><span>Seguro</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-400 rounded"></div><span>Energía</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-black rounded border border-gray-600"></div><span>Vacío</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-600 rounded"></div><span>Serpiente</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-600 rounded"></div><span>Puerta</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-indigo-600 rounded-full"></div><span>Ninja</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
