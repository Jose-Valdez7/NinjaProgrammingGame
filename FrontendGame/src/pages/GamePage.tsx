import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../store/GameStore'
import { GameEngine } from '../game/GameEngine'
import { LevelGenerator } from '../game/LevelGenerator'
import { CommandParser } from '../game/CommandParser'
import { GameLevel } from '../types/game'
import { Play, RotateCcw, Home, HelpCircle, ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import hackerVideo from '@/assets/images/characters/video-hacker.mp4'
import snakeGameOverVideo from '@/assets/images/gameoverscreens/Serpiente.mp4'
import { getAuthHeaders, apiUrl, authStorage } from '@/config/env'

const safeTileImg = new URL('../assets/images/backgrounds/secure1.png', import.meta.url).href
const energyTileImg = new URL('../assets/energy/energy1.png', import.meta.url).href
const voidTileImg = new URL('../assets/void/void1.png', import.meta.url).href
const snakeTileImg = new URL('../assets/snake/Snake1.png', import.meta.url).href
const doorTileImg = new URL('../assets/door/door1.png', import.meta.url).href

export default function GamePage() {
  const { currentUser, dispatch } = useGameStore()
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
  const [showSnakeGameOver, setShowSnakeGameOver] = useState(false)
  const [energyRemaining, setEnergyRemaining] = useState(0)
  const [maxLevelCompleted, setMaxLevelCompleted] = useState<number>(0)
  const [completedLevels, setCompletedLevels] = useState<number[]>([])
  const [showCompletedModal, setShowCompletedModal] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('forceGameReload') === 'true') {
      sessionStorage.removeItem('forceGameReload')
      window.location.reload()
    }
  }, [])

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

  const handleSessionExpired = useCallback(() => {
    stopTimer()
    setIsPlaying(false)
    authStorage.clearAll()
    dispatch({ type: 'SET_USER', payload: null })
    setSessionExpired(true)
    setCompletedLevels([])
    setMaxLevelCompleted(0)
    setShowCompletedModal(false)
    setError('Tu sesión expiró. Por favor, vuelve a iniciar sesión.')
  }, [dispatch, stopTimer])

  useEffect(() => {
    const fetchProgress = async () => {
      if (!currentUser) {
        setMaxLevelCompleted(0)
        setCompletedLevels([])
        return
      }

      if (sessionExpired) {
        setSessionExpired(false)
        setError('')
      }

      try {
        const response = await fetch(apiUrl('api/user/progress'), {
          headers: getAuthHeaders(),
        })

        if (response.status === 401 || response.status === 403) {
          handleSessionExpired()
          return
        }

        if (!response.ok) {
          throw new Error('No se pudo obtener el progreso')
        }

        const data = await response.json()
        const maxLevel = Number(data?.maxLevelCompleted ?? 0)
        setMaxLevelCompleted(maxLevel)
        setCompletedLevels(maxLevel > 0 ? Array.from({ length: maxLevel }, (_, i) => i + 1) : [])
      } catch (err) {
        console.warn('Error cargando progreso del usuario:', err)
      }
    }

    void fetchProgress()
  }, [currentUser, handleSessionExpired, sessionExpired])

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
    setEnergyRemaining(newLevel.requiredEnergy || 0)
    setCommands('')
    setShowHelp(false)
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

  // 🔁 Reiniciar nivel
  const resetLevel = useCallback(() => loadLevel(currentLevel), [currentLevel, loadLevel])

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
      setEnergyRemaining(level.requiredEnergy || 0)
      let remainingEnergy = level.requiredEnergy || 0
      const expandedCommands = validateAndParseCommands()
      setIsPlaying(true)
      setError('')

      let currentPos = { ...level.startPosition }
      let isEnergized = level.requiredEnergy === 0
      const collectedEnergyCells = new Set<string>()

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
            const cellKey = `${newPos.x},${newPos.y}`
            if (!collectedEnergyCells.has(cellKey)) {
              collectedEnergyCells.add(cellKey)
              remainingEnergy = Math.max(0, remainingEnergy - 1)
              setEnergyRemaining(remainingEnergy)
            }
            isEnergized = true
            gameEngineRef.current.animateEnergyCollection()
          }

          if (cell.type === 'door') {
            if (remainingEnergy > 0) {
              setError(`¡Aún necesitas recolectar ${remainingEnergy} energías para abrir la puerta!`)
              setIsPlaying(false)
              return
            }

            if (!isEnergized && (level.requiredEnergy || 0) > 0) {
              setError('¡Necesitas energía para pasar por la puerta!')
              setIsPlaying(false)
              return
            }

            stopTimer()
            await gameEngineRef.current.animateVictory()
            setError('')

            if (currentUser) {
              const response = await fetch(apiUrl('api/user/progress'), {
                method: 'POST',
                headers: {
                  ...getAuthHeaders(),
                },
                body: JSON.stringify({
                  level: currentLevel,
                  commandsUsed: level.commandsUsed ?? 0,
                  timeTaken: elapsedTime,
                  energized: isEnergized,
                  success: true,
                }),
              })

              if (response.ok) {
                setCompletedLevels(prev => {
                  if (prev.includes(currentLevel)) return prev
                  return [...prev, currentLevel].sort((a, b) => a - b)
                })
                setMaxLevelCompleted(prev => Math.max(prev, currentLevel))
              } else if (response.status === 401 || response.status === 403) {
                handleSessionExpired()
                return
              } else {
                console.warn('No se pudo registrar el avance del usuario')
              }
            } else {
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

  const levelInfo = level ? {
    energyRequired: energyRemaining,
    totalEnergy: level.requiredEnergy,
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

      {sessionExpired && (
        <div className="bg-red-600/80 text-white text-center py-2 px-4">
          Tu sesión expiró. Se limpió la información guardada, vuelve a iniciar sesión para continuar jugando.
        </div>
      )}

      {showCompletedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCompletedModal(false)}
          />
          <div className="relative z-10 w-full max-w-md mx-4 bg-black/60 border border-white/10 rounded-xl p-6 font-stick">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Niveles completados</h2>
              <button
                onClick={() => setShowCompletedModal(false)}
                className="text-white/80 hover:text-white transition-colors px-3 py-1 rounded"
              >
                Cerrar
              </button>
            </div>

            {completedLevels.length === 0 ? (
              <p className="text-sm text-gray-300">Aún no has completado ningún nivel.</p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {completedLevels.map(levelNumber => (
                  <button
                    key={levelNumber}
                    onClick={() => {
                      setShowCompletedModal(false)
                      void loadLevel(levelNumber)
                    }}
                    className={`
                      w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm
                      bg-gray-700 text-white border border-white/20 hover:bg-gray-600 transition-colors duration-200
                    `}
                  >
                    {levelNumber}
                  </button>
                ))}
              </div>
            )}

            {completedLevels.length > 0 && (
              <p className="text-sm text-gray-200 mt-4">
                Has completado hasta el nivel {maxLevelCompleted}.
              </p>
            )}

            <p className="text-xs text-gray-300 mt-4">
              Selecciona un nivel completado para volver a practicarlo. Solo están disponibles los niveles que ya superaste.
            </p>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-ninja-purple rounded-lg p-6 border border-blue-500/30 relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Nivel {currentLevel}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCompletedModal(true)}
                    disabled={!currentUser || completedLevels.length === 0}
                    className={`px-3 py-1 rounded flex items-center gap-1 text-sm border border-blue-400/40
                      ${!currentUser || completedLevels.length === 0
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-60'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/30'}
                    `}
                  >
                    <ListChecks size={16} />
                    Niveles
                  </button>

                  <button
                    onClick={resetLevel}
                    className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded flex items-center gap-1 text-sm"
                  >
                    <RotateCcw size={16} />
                    Reiniciar
                  </button>
                </div>
              </div>

              <div className="flex justify-center">
                <div
                  ref={canvasContainerRef}
                  className="border-2 border-gray-400 rounded-lg overflow-hidden"
                  style={{ width: '718px', height: '718px' }}
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
                    <span>
                      Energía restante: <span className="font-semibold text-white">{levelInfo.energyRequired}</span>
                      {typeof levelInfo.totalEnergy === 'number' && (
                        <span className="text-sm text-amber-200"> / {levelInfo.totalEnergy}</span>
                      )}
                    </span>
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
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <img src={safeTileImg} alt="Seguro" className="w-6 h-6 rounded-sm border border-blue-500/30" />
                  <span>Seguro</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src={energyTileImg} alt="Energía" className="w-6 h-6 rounded-sm border border-blue-500/30" />
                  <span>Energía</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src={voidTileImg} alt="Vacío" className="w-6 h-6 rounded-sm border border-blue-500/30 bg-black object-cover" />
                  <span>Vacío</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src={snakeTileImg} alt="Serpiente" className="w-6 h-6 rounded-sm border border-blue-500/30" />
                  <span>Serpiente</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src={doorTileImg} alt="Puerta" className="w-6 h-6 rounded-sm border border-blue-500/30" />
                  <span>Puerta</span>
                </div>
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
