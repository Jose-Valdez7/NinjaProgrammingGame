import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../store/GameStore'
import { GameEngine } from '../game/GameEngine'
import { LevelGenerator } from '../game/LevelGenerator'
import { CommandParser } from '../game/CommandParser'
import { GameLevel } from '../types/game'
import { Play, RotateCcw, Home, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import hackerVideo from '@/assets/images/characters/video-hacker.mp4'
import snakeGameOverVideo from '@/assets/images/gameoverscreens/Serpiente.mp4'

export default function GamePage() {
  const { gameState, currentUser, dispatch } = useGameStore()
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const gameEngineRef = useRef<GameEngine | null>(null)
  const levelGeneratorRef = useRef(new LevelGenerator())
  const commandParserRef = useRef(new CommandParser())
  const timerRef = useRef<number | null>(null)

  const [commands, setCommands] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [error, setError] = useState('')
  const [currentLevel, setCurrentLevel] = useState(1)
  const [level, setLevel] = useState<any>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    stopTimer()
    setElapsedTime(0)
    timerRef.current = window.setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)
  }, [stopTimer])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }

  useEffect(() => {
    return () => {
      stopTimer()
    }
  }, [stopTimer])

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

    if (levelNumber >= 6) {
      startTimer()
    } else {
      stopTimer()
      setElapsedTime(0)
    }
  }, [commands, dispatch, startTimer, stopTimer])

  // 🧩 Validar y expandir comandos
  const validateAndParseCommands = () => {
    const parser = commandParserRef.current
    const validation = parser.validateCommands(commands)
    if (!validation.isValid) throw new Error(validation.error || 'Comandos inválidos')
    const parsed = parser.parseCommands(commands)
    return parser.expandCommands(parsed)
  }

  // Actualizar guía dinámica según lo escrito
  useEffect(() => {
    const engine = gameEngineRef.current
    const currentLevelData = level as GameLevel | null

    if (!engine || !currentLevelData || !currentLevelData.hasGuideLines) return

    const trimmed = commands.trim()
    const hasCommands = Boolean(trimmed)

    engine.setGuideVisibility(hasCommands)

    if (!hasCommands) {
      engine.previewGuideForCommands([])
      return
    }

    const parser = commandParserRef.current
    const parsed = parser.parseCommands(trimmed)
    const expanded = parser.expandCommands(parsed)

    engine.previewGuideForCommands(expanded)
  }, [commands, level])

  // ⚡ Ejecutar comandos
  const executeCommands = async () => {
    if (!gameEngineRef.current || !commands.trim() || !level) return

    try {
      const expandedCommands = validateAndParseCommands()
      setIsPlaying(true)
      setError('')

      let currentPos = { ...level.startPosition }
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
            setShowSnakeGameOver(true)
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

            stopTimer()
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

  const showTimer = level && level.level >= 6

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
            <div className="bg-ninja-purple rounded-lg p-6 border border-blue-500/30 relative">
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
            {/* Hacker Cat - Arriba de todo */}
            <div className="flex justify-center">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                {/* Halo brillante */}
                <div className="absolute inset-0 rounded-xl blur-xl opacity-70"
                     style={{ background: 'radial-gradient(closest-side, rgba(56,189,248,0.6), rgba(168,85,247,0.35), transparent 70%)' }} />
                {/* Video */}
                <video
                  src={hackerVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 m-auto w-40 h-40 sm:w-48 sm:h-48 drop-shadow-[0_6px_16px_rgba(0,0,0,0.7)] select-none border-2 border-white/70 rounded-xl transition-transform duration-300 hover:scale-105 object-cover"
                  aria-label="Gato hacker"
                />
              </div>
            </div>

            {/* Level Info */}
            <div className="bg-ninja-purple rounded-lg p-4 border border-blue-500/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Información del Nivel</h3>
                {showTimer && (
                  <div className="flex items-center gap-2 bg-blue-900/60 border border-blue-400/40 px-3 py-1 rounded-full shadow-md shadow-blue-500/20">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <div className="text-sm font-semibold tracking-wide text-blue-200">
                      {formatTime(elapsedTime)}
                    </div>
                  </div>
                )}
              </div>

              {level && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-amber-300">
                    <span role="img" aria-label="energy">⚡</span>
                    <span>Energía requerida: <span className="font-semibold text-white">{levelInfo.energyRequired}</span></span>
                  </div>
                  {levelInfo.timeLimit && (
                    <div className="flex items-center gap-2 text-blue-200">
                      <span role="img" aria-label="time-limit">⏱️</span>
                      <span>Tiempo límite: <span className="font-semibold text-white">{levelInfo.timeLimit}s</span></span>
                    </div>
                  )}
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

      {/* Game Over Screen - Serpiente */}
      {showSnakeGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative w-full h-full max-w-4xl max-h-[90vh] flex items-center justify-center">
            <video
              src={snakeGameOverVideo}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain rounded-lg"
              onEnded={() => {
                setShowSnakeGameOver(false)
                resetLevel()
              }}
            />
            <button
              onClick={() => {
                setShowSnakeGameOver(false)
                resetLevel()
              }}
              className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
