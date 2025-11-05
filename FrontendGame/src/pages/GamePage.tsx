import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'

import { useGameStore } from '../store/GameStore'
import { GameEngine } from '../game/GameEngine'
import { LevelGenerator } from '../game/LevelGenerator'
import { CommandParser } from '../game/CommandParser'
import type { GameLevel } from '../types/game'
import { Play, RotateCcw, Home, HelpCircle, ListChecks } from 'lucide-react'
import hackerVideo from '@/assets/images/characters/video-hacker.mp4'
import snakeGameOverVideo from '@/assets/images/gameoverscreens/Serpiente.mp4'
import voidGameOverVideo from '@/assets/images/gameoverscreens/Ninja-void.mp4'
import energyCutsceneVideo from '@/assets/images/gameoverscreens/ninja_energy.mp4'
import { getAuthHeaders, apiUrl, authStorage } from '@/config/env'
import { addOfflineProgress } from '@/utils/offlineProgress'

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
  const timeLimitExceededRef = useRef(false)
  const energyVideoResolveRef = useRef<(() => void) | null>(null)
  const hasShownEnergyCutsceneRef = useRef(false)

  const [commands, setCommands] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [error, setError] = useState('')
  const [currentLevel, setCurrentLevel] = useState(1)
  const [level, setLevel] = useState<GameLevel | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [movesCount, setMovesCount] = useState(0)
  const [showSnakeGameOver, setShowSnakeGameOver] = useState(false)
  const [showVoidGameOver, setShowVoidGameOver] = useState(false)
  const [energyRemaining, setEnergyRemaining] = useState(0)
  const [maxLevelCompleted, setMaxLevelCompleted] = useState<number>(0)
  const [completedLevels, setCompletedLevels] = useState<number[]>([])
  const [showCompletedModal, setShowCompletedModal] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [showEnergyCutscene, setShowEnergyCutscene] = useState(false)
  const [showFinalCelebration, setShowFinalCelebration] = useState(false)

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

  // 🧭 Protección de niveles (permitir 1-3 sin sesión, exigir desde 4)
  useEffect(() => {
    if (currentLevel >= 4 && !currentUser) {
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
    gameEngineRef.current?.setGuideVisibility(false)
    gameEngineRef.current?.previewGuideForCommands([])
    setShowEnergyCutscene(false)
    setShowFinalCelebration(false)
    hasShownEnergyCutsceneRef.current = false
    energyVideoResolveRef.current = null
    gameEngineRef.current?.debugDump()
    dispatch({ type: 'SET_LEVEL', payload: newLevel })
    dispatch({ type: 'RESET_LEVEL' })
    setCommands('')
    setError('')
    setCurrentLevel(levelNumber)

    timeLimitExceededRef.current = false
    setMovesCount(0)

    // Iniciar contador de tiempo en todos los niveles
    startTimer()
  }, [commands, dispatch, startTimer, stopTimer])

  // 🔁 Reiniciar nivel
  const resetLevel = useCallback(() => loadLevel(currentLevel), [currentLevel, loadLevel])

  // ⌨️ Registro de comandos con flechas (niveles 1-3)
  useEffect(() => {
    const shouldUseArrows = Boolean(level && level.level <= 3)
    if (!shouldUseArrows) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPlaying) return
      const map: Record<string, 'D' | 'I' | 'S' | 'B'> = {
        ArrowRight: 'D',
        ArrowLeft: 'I',
        ArrowUp: 'S',
        ArrowDown: 'B',
      }
      const dir = map[e.key]
      if (!dir) return
      e.preventDefault()

      setCommands(prev => {
        const trimmed = prev.trim()
        if (!trimmed) return `${dir}1`

        const parts = trimmed.split(',')
        const last = parts[parts.length - 1]
        const match = /^([DISB])(\d+)$/.exec(last)
        if (match && match[1] === dir) {
          const nextCount = String(Number(match[2]) + 1)
          parts[parts.length - 1] = `${dir}${nextCount}`
          return parts.join(',')
        }
        return `${trimmed.replace(/\s+/g, '')},${dir}1`
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [level, isPlaying])

  useEffect(() => {
    if (!level || level.level < 11) {
      timeLimitExceededRef.current = false
      return
    }

    const limit = level.timeLimit
    if (!limit) {
      timeLimitExceededRef.current = false
      return
    }

    if (elapsedTime >= limit && !timeLimitExceededRef.current) {
      const handleTimeout = async () => {
        timeLimitExceededRef.current = true
        stopTimer()
        setIsPlaying(false)
        await resetLevel()
        setError('Tiempo límite sobrepasado. ¡Vuelve a intentarlo!')
      }

      void handleTimeout()
    }
  }, [elapsedTime, level, resetLevel, stopTimer])

  // 🧩 Validar y preparar comandos
  const prepareCommands = () => {
    const parser = commandParserRef.current
    const trimmed = commands.trim()
    const validation = parser.validateCommands(trimmed)
    if (!validation.isValid) throw new Error(validation.error || 'Comandos inválidos')
    const parsed = parser.parseCommands(trimmed)
    const expanded = parser.expandCommands(parsed)
    const commandCount = level && level.level >= 11 ? parsed.length : 0

    return { expanded, commandCount }
  }

  const postProgress = useCallback(async (payload: {
    success: boolean
    commandsUsed: number
    energized: boolean
    timeTaken: number
    failureType?: 'void' | 'snake'
  }) => {
    if (!currentUser) return null

    try {
      const response = await fetch(apiUrl('api/user/progress'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: currentLevel,
          commandsUsed: payload.commandsUsed,
          timeTaken: payload.timeTaken,
          energized: payload.energized,
          success: payload.success,
          failureType: payload.failureType,
        }),
      })

      if (response.status === 401 || response.status === 403) {
        handleSessionExpired()
        return null
      }

      if (!response.ok) {
        console.warn('No se pudo registrar el progreso del usuario')
      }

      return response
    } catch (error) {
      console.warn('Error enviando progreso del usuario:', error)
      return null
    }
  }, [currentLevel, currentUser, handleSessionExpired])

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
      setMovesCount(0)
      return
    }

    const parser = commandParserRef.current
    const parsed = parser.parseCommands(trimmed)
    setMovesCount(parsed.length)
    const expanded = parser.expandCommands(parsed)

    engine.previewGuideForCommands(expanded)
  }, [commands, level])

  // ⚡ Ejecutar comandos
  const handleEnergyVideoClose = useCallback(() => {
    setShowEnergyCutscene(false)
    if (energyVideoResolveRef.current) {
      const resolve = energyVideoResolveRef.current
      energyVideoResolveRef.current = null
      resolve()
    }
  }, [])

  const triggerEnergyCutscene = useCallback(() => {
    if (hasShownEnergyCutsceneRef.current) {
      return Promise.resolve()
    }

    hasShownEnergyCutsceneRef.current = true

    return new Promise<void>((resolve) => {
      energyVideoResolveRef.current = () => {
        energyVideoResolveRef.current = null
        resolve()
      }
      setShowEnergyCutscene(true)
    })
  }, [])

  const executeCommands = async () => {
    if (!gameEngineRef.current || !commands.trim() || !level) return

    try {
      setEnergyRemaining(level.requiredEnergy || 0)
      let remainingEnergy = level.requiredEnergy || 0
      const { expanded: expandedCommands, commandCount } = prepareCommands()
      setIsPlaying(true)
      setError('')

      let currentPos = { ...level.startPosition }
      const gridHeight = level.grid.length
      const gridWidth = level.grid[0]?.length ?? 0
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
          if (newPos.x < 0 || newPos.x >= gridWidth || newPos.y < 0 || newPos.y >= gridHeight) {
            setError('¡Rebasaste los límites del mapa!')
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
            await postProgress({
              success: false,
              commandsUsed: commandCount,
              energized: isEnergized,
              timeTaken: elapsedTime,
              failureType: 'void',
            })
            setShowVoidGameOver(true)
            return
          }

          if (cell.type === 'snake') {
            await gameEngineRef.current.animateFailure('snake')
            setError('¡Te mordió una serpiente! Intenta de nuevo.')
            setIsPlaying(false)
            await postProgress({
              success: false,
              commandsUsed: commandCount,
              energized: isEnergized,
              timeTaken: elapsedTime,
              failureType: 'snake',
            })
            setShowSnakeGameOver(true)
            return
          }

          if (cell.type === 'energy') {
            const cellKey = `${newPos.x},${newPos.y}`
            let isNewEnergyCell = false
            if (!collectedEnergyCells.has(cellKey)) {
              collectedEnergyCells.add(cellKey)
              remainingEnergy = Math.max(0, remainingEnergy - 1)
              setEnergyRemaining(remainingEnergy)
              isNewEnergyCell = true
            }
            isEnergized = true
            gameEngineRef.current.animateEnergyCollection()

            if (isNewEnergyCell) {
              await triggerEnergyCutscene()

              // 🎯 Nivel 1: objetivo es llegar a la energía (pasar directo al nivel 2)
              if (level.level === 1) {
                stopTimer()
                await gameEngineRef.current.animateVictory()
                setError('')

                if (currentUser) {
                  const response = await postProgress({
                    success: true,
                    commandsUsed: 0,
                    energized: true,
                    timeTaken: elapsedTime,
                  })

                  if (response?.ok) {
                    setCompletedLevels(prev => {
                      if (prev.includes(1)) return prev
                      return [...prev, 1].sort((a, b) => a - b)
                    })
                    setMaxLevelCompleted(prev => Math.max(prev, 1))
                  }
                }

                if (currentLevel < 15) {
                  setTimeout(() => loadLevel(2), 1200)
                }

                setIsPlaying(false)
                return
              }
            }
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

            if (currentLevel <= 3) {
              addOfflineProgress({ level: currentLevel, timeTaken: elapsedTime, moves: movesCount })
            }

            if (currentUser) {
              const response = await postProgress({
                success: true,
                commandsUsed: commandCount,
                energized: isEnergized,
                timeTaken: elapsedTime,
              })

              if (response?.ok) {
                setCompletedLevels(prev => {
                  if (prev.includes(currentLevel)) return prev
                  return [...prev, currentLevel].sort((a, b) => a - b)
                })
                setMaxLevelCompleted(prev => Math.max(prev, currentLevel))
              } else if (response) {
                console.warn('No se pudo registrar el avance del usuario')
              }
            } else {
              if (currentLevel >= 3) {
                setTimeout(() => {
                  window.location.href = '/login?next=/game'
                }, 1200)
                setIsPlaying(false)
                return
              }
              // Permitir avanzar automáticamente si no hay sesión en niveles 1-2
              if (currentLevel < 3) {
                setTimeout(() => loadLevel(currentLevel + 1), 2000)
                setIsPlaying(false)
                return
              }
            }

            if (currentLevel < 15) {
              setTimeout(() => loadLevel(currentLevel + 1), 2000)
            } else {
              setShowFinalCelebration(true)
            }

            setIsPlaying(false)
            return
          }

          // Delay mínimo para suavizar animación
          await new Promise(resolve => setTimeout(resolve, 80))
        }
      }

      setIsPlaying(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error ejecutando comandos'
      setError(message)
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

  const isAdvancedLoopLevel = Boolean(level && level.level >= 11)

  const showTimer = Boolean(level)

  return (
    <div className="min-h-screen bg-ninja-dark text-white">
      {/* Header */}
      <div className="bg-ninja-purple border-b border-blue-500/30 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Home size={20} />
              Ninja Energy Quest
            </h1>
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
                  <div className="flex items-center gap-2 text-emerald-200">
                    <span role="img" aria-label="moves">🦶</span>
                    <span>Movimientos: <span className="font-semibold text-white">{movesCount}</span></span>
                  </div>
                  {levelInfo.timeLimit && (
                    <div className="flex items-center gap-2 text-blue-200">
                      <span role="img" aria-label="time-limit">⏱️</span>
                      <span>Tiempo límite: <span className="font-semibold text-white">{levelInfo.timeLimit}s</span></span>
                    </div>
                  )}
                  {levelInfo.hasGuideLines && <div className="text-yellow-400">💡 Líneas guía disponibles</div>}

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
                disabled={isPlaying || Boolean(level && level.level <= 3)}
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
                    <div className="mt-3 space-y-1">
                      <strong>Loops:</strong>
                      {isAdvancedLoopLevel && (
                        <p className="text-xs text-purple-200">
                          Un loop repite la secuencia entre paréntesis la cantidad indicada. Ejemplo:
                          <code className="ml-1">(D1,S1)x3</code> ejecuta derecha y subir tres veces.
                        </p>
                      )}
                      {!isAdvancedLoopLevel && (
                        <div>
                          <code>(D1,S1)x3</code> - Repite 3 veces
                        </div>
                      )}
                      {isAdvancedLoopLevel && (
                        <div>
                          <code>(D1,S1)x3</code> - Repite 3 veces
                        </div>
                      )}
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

      {/* Cutscene - Energy */}
      {showEnergyCutscene && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative w-full h-full max-w-4xl max-h-[90vh] flex items-center justify-center">
            <video
              src={energyCutsceneVideo}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain rounded-lg"
              onEnded={handleEnergyVideoClose}
            />
            <button
              onClick={handleEnergyVideoClose}
              className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen - Vacío */}
      {showVoidGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative w-full h-full max-w-4xl max-h-[90vh] flex items-center justify-center">
            <video
              src={voidGameOverVideo}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain rounded-lg"
              onEnded={() => {
                setShowVoidGameOver(false)
                resetLevel()
              }}
            />
            <button
              onClick={() => {
                setShowVoidGameOver(false)
                resetLevel()
              }}
              className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {showFinalCelebration && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur">
          <div className="relative w-full max-w-3xl mx-6 overflow-hidden rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-purple-900/90 via-slate-900/90 to-emerald-900/80 shadow-[0_0_45px_rgba(56,189,248,0.45)]">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-16 -left-10 h-48 w-48 rounded-full bg-emerald-500/40 blur-3xl animate-pulse" />
              <div className="absolute -bottom-12 -right-10 h-56 w-56 rounded-full bg-purple-500/40 blur-3xl animate-pulse delay-300" />
            </div>

            <div className="relative px-10 py-12 text-center space-y-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-lg">
                ¡Felicidades, Ninja!
              </h2>
              <p className="text-lg text-emerald-200 max-w-xl mx-auto">
                Has completado los 15 niveles del Ninja Energy Quest. Demostraste disciplina, precisión y una lógica impecable.
              </p>
              <div className="relative mx-auto flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-400/40 blur-xl animate-ping" />
                  <div className="relative flex items-center justify-center h-28 w-28 rounded-full border-4 border-emerald-300/70 bg-black/60 shadow-[0_0_25px_rgba(16,185,129,0.6)]">
                    <span className="text-4xl">🧬</span>
                  </div>
                </div>
                <p className="text-base text-purple-200 max-w-md">
                  Tu ADN programador ha sido analizado: creatividad + lógica en perfecto equilibrio. Estás listo para retos aún mayores.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowFinalCelebration(false)
                    void loadLevel(1)
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 transition-colors"
                >
                  Volver a practicar
                </button>
                <Link
                  to="/ranking"
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/40 hover:bg-blue-400 transition-colors"
                >
                  Revisa tu ranking
                </Link>
              </div>

              <button
                onClick={() => setShowFinalCelebration(false)}
                className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                type="button"
              >
                Cerrar celebración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
