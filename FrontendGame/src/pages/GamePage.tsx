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
import ninjaGameBgm from '@/assets/sounds/ninjaGame.mp3'
import arrowUp from '@/assets/images/icons/arriba.png'
import arrowDown from '@/assets/images/icons/abajo.png'
import arrowLeft from '@/assets/images/icons/izquierda.png'
import arrowRight from '@/assets/images/icons/derecha.png'
import ninjaIcon from '@/assets/images/icons/Ninja.png'
import krakeLogo from '@/assets/images/ui/Krake evolution Claro.png'
import movilisLogo from '@/assets/images/ui/Movilis.png'

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
  const timeLimitRef = useRef<number | null>(null)
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
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const [timerMode, setTimerMode] = useState<'none' | 'countdown' | 'countup'>('none')
  const [movesCount, setMovesCount] = useState(0)
  const [showSnakeGameOver, setShowSnakeGameOver] = useState(false)
  const [showVoidGameOver, setShowVoidGameOver] = useState(false)
  const [energyRemaining, setEnergyRemaining] = useState(0)
  const [maxLevelCompleted, setMaxLevelCompleted] = useState<number | null>(null)
  const [completedLevels, setCompletedLevels] = useState<number[]>([])
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [showCompletedModal, setShowCompletedModal] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [showIntroModal, setShowIntroModal] = useState(false)
  const [introTitle, setIntroTitle] = useState('')
  const [introMessage, setIntroMessage] = useState('')
  const [showEnergyCutscene, setShowEnergyCutscene] = useState(false)
  const [showFinalCelebration, setShowFinalCelebration] = useState(false)
  const [showRegistrationExplanationModal, setShowRegistrationExplanationModal] = useState(false)
  const [pendingLevelAfterCelebration, setPendingLevelAfterCelebration] = useState<number | null>(null)
 
  // 🔊 Música de fondo
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem('forceGameReload') === 'true') {
      sessionStorage.removeItem('forceGameReload')
      window.location.reload()
    }
  }, [])

  // Intentar reproducir BGM tras interacción del usuario (para evitar bloqueo de autoplay)
  useEffect(() => {
    const tryPlay = () => {
      if (!audioRef.current) return
      void audioRef.current.play().catch(() => {})
      window.removeEventListener('pointerdown', tryPlay)
      window.removeEventListener('keydown', tryPlay)
    }
    window.addEventListener('pointerdown', tryPlay)
    window.addEventListener('keydown', tryPlay)
    return () => {
      window.removeEventListener('pointerdown', tryPlay)
      window.removeEventListener('keydown', tryPlay)
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
    timeLimitExceededRef.current = false
    setRemainingTime(null)
    setElapsedTime(0)
    timerRef.current = window.setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)
  }, [stopTimer])

  const startCountdown = useCallback((seconds: number) => {
    stopTimer()
    timeLimitExceededRef.current = false
    setElapsedTime(0)
    setRemainingTime(seconds)
    timerRef.current = window.setInterval(() => {
      setRemainingTime(prev => {
        if (prev === null) return prev
        if (prev <= 1) {
          if (timerRef.current !== null) {
            window.clearInterval(timerRef.current)
            timerRef.current = null
          }
          return 0
        }
        return prev - 1
      })
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

  const hasLoadedUserProgressRef = useRef(false)

  useEffect(() => {
    const fetchProgress = async () => {
      if (!currentUser) {
        setMaxLevelCompleted(0)
        setCompletedLevels([])
        setProgressLoaded(true)
        hasLoadedUserProgressRef.current = false
        return
      }

      if (sessionExpired) {
        setSessionExpired(false)
        setError('')
      }

      // Resetear los flags cuando cambia el usuario para permitir cargar el nivel correcto
      hasLoadedUserProgressRef.current = false
      setProgressLoaded(false)

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
        setProgressLoaded(true)
      } catch (err) {
        console.warn('Error cargando progreso del usuario:', err)
        setProgressLoaded(true)
      }
    }

    void fetchProgress()
  }, [currentUser, handleSessionExpired, sessionExpired])

  // 🧩 Inicializar motor Pixi
  useLayoutEffect(() => {
    const container = canvasContainerRef.current
    if (!container || gameEngineRef.current) return

    const initializeGame = async () => {
      try {
        const width = container.clientWidth || 480
        const height = container.clientHeight || 480
        gameEngineRef.current = new GameEngine(container, { width, height })
        // Si no hay usuario, cargar nivel 1 inmediatamente para poder jugar
        if (!currentUser) {
          const levelGen = levelGeneratorRef.current
          const newLevel = levelGen.generateLevel(1)
          setLevel(newLevel)
          setEnergyRemaining(newLevel.requiredEnergy || 0)
          setCommands('')
          setShowHelp(false)
          await gameEngineRef.current.loadLevel(newLevel)
          gameEngineRef.current.setGuideVisibility(false)
          gameEngineRef.current.previewGuideForCommands([])
          setCurrentLevel(1)
        }
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
      if (audioRef.current) {
        audioRef.current.pause()
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

    // Reproducir música de fondo
    if (audioRef.current) {
      audioRef.current.src = ninjaGameBgm
      audioRef.current.loop = true
      audioRef.current.volume = 0.35
      void audioRef.current.play().catch(() => {})
    }

    let nextTimerMode: 'none' | 'countdown' | 'countup' = 'none'
    let countdownLimit: number | null = null

    if (levelNumber >= 7 && levelNumber <= 8) {
      nextTimerMode = 'countdown'
      countdownLimit = 120
    } else if (levelNumber >= 9 && levelNumber <= 10) {
      nextTimerMode = 'countdown'
      countdownLimit = 180
    } else if (levelNumber >= 11) {
      nextTimerMode = 'countup'
    }

    setTimerMode(nextTimerMode)
    timeLimitRef.current = countdownLimit
    timeLimitExceededRef.current = false

    if (nextTimerMode === 'countdown' && countdownLimit) {
      startCountdown(countdownLimit)
    } else if (nextTimerMode === 'countup') {
      startTimer()
      setRemainingTime(null)
    } else {
      stopTimer()
      setElapsedTime(0)
      setRemainingTime(null)
    }

    // Mostrar modales introductorios según nivel
    if (levelNumber === 1) {
      setIntroTitle('Nivel 1')
      setIntroMessage('Usa las flechas del panel de comandos para mover al ninja.')
      setShowIntroModal(true)
    } else if (levelNumber === 2) {
      setIntroTitle('Nivel 2')
      setIntroMessage('Sigue usando las flechas. Ahora debes recoger todas las energías requeridas y entrar al portal.')
      setShowIntroModal(true)
    } else if (levelNumber === 4) {
      setIntroTitle('Nivel 4')
      setIntroMessage('A partir de aquí debes mover al ninja usando comandos en lugar de flechas.')
      setShowIntroModal(true)
    } else if (levelNumber === 7) {
      setIntroTitle('Nivel 7')
      setIntroMessage('¡Aumenta la dificultad! A partir de aquí se activa el reloj.')
      setShowIntroModal(true)
    } else if (levelNumber === 9) {
      setIntroTitle('Nivel 9')
      setIntroMessage('¡Atención! En los siguientes niveles las líneas guía desaparecen.')
      setShowIntroModal(true)
    } else if (levelNumber === 11) {
      setIntroTitle('Nivel 11: ¡Bucles!')
      setIntroMessage('¡Ahora puedes usar bucles! Repite secuencias de comandos con (comandos)xN')
      setShowIntroModal(true)
    } else {
      setShowIntroModal(false)
    }
  }, [commands, dispatch, startCountdown, startTimer, stopTimer])

  useEffect(() => {
    const engine = gameEngineRef.current
    if (!engine) return

    engine.setFlowHandlers({
      onNextLevel: () => {
        setIsPlaying(false)

        if (!currentUser && currentLevel >= 3) {
          setShowRegistrationExplanationModal(true)
          return
        }

        if (currentLevel >= 14) {
          if (currentLevel === 14) {
            setPendingLevelAfterCelebration(currentLevel + 1)
          } else {
            setPendingLevelAfterCelebration(null)
          }
          setShowFinalCelebration(true)
          return
        }

        void loadLevel(currentLevel + 1)
      },
      onRestart: () => {
        setIsPlaying(false)
        void loadLevel(currentLevel)
      },
    })
  }, [currentLevel, currentUser, loadLevel])

  // Cargar automáticamente el nivel correcto cuando el usuario inicia sesión
  // Solo se ejecuta cuando cambia el usuario o cuando se carga el progreso por primera vez
  const userChangedRef = useRef<string | null>(null)
  
  useEffect(() => {
    // Si el motor no está listo, no hacer nada
    if (!gameEngineRef.current) {
      return
    }

    // Si no hay usuario, no hacer nada (ya se cargó nivel 1 en useLayoutEffect)
    if (!currentUser) {
      hasLoadedUserProgressRef.current = false
      userChangedRef.current = null
      return
    }

    // Detectar si el usuario cambió
    const userId = String(currentUser.id || currentUser.email || '')
    if (userChangedRef.current !== userId) {
      userChangedRef.current = userId
      hasLoadedUserProgressRef.current = false // Resetear cuando cambia el usuario
    }

    // Si hay usuario, esperar a que se cargue el progreso
    if (!progressLoaded || maxLevelCompleted === null) {
      return
    }

    // Solo cargar automáticamente si no se ha cargado ningún nivel para este usuario
    // Esto permite que el usuario navegue manualmente sin que se sobrescriba
    if (!hasLoadedUserProgressRef.current) {
      const expectedLevel = maxLevelCompleted >= 15 ? 15 : (maxLevelCompleted > 0 ? Math.min(maxLevelCompleted + 1, 15) : 1)
      hasLoadedUserProgressRef.current = true
      void loadLevel(expectedLevel)
    }
  }, [progressLoaded, maxLevelCompleted, currentUser, loadLevel])

  // 🔁 Reiniciar nivel
  const resetLevel = useCallback(() => loadLevel(currentLevel), [currentLevel, loadLevel])

  const handleArrowInput = useCallback((dir: 'D' | 'I' | 'S' | 'B') => {
    if (isPlaying) return

    if (audioRef.current && audioRef.current.paused) {
      void audioRef.current.play().catch(() => {})
    }

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
  }, [isPlaying])

  // ⌨️ Registro de comandos con flechas (niveles 1-3)
  useEffect(() => {
    const shouldUseArrows = Boolean(level && level.level <= 3)
    if (!shouldUseArrows) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const map: Record<string, 'D' | 'I' | 'S' | 'B'> = {
        ArrowRight: 'D',
        ArrowLeft: 'I',
        ArrowUp: 'S',
        ArrowDown: 'B',
      }
      const dir = map[e.key]
      if (!dir) return
      e.preventDefault()
      handleArrowInput(dir)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [level, handleArrowInput])

  useEffect(() => {
    if (timerMode !== 'countdown') {
      timeLimitExceededRef.current = false
      return
    }

    if (remainingTime === null) return
    if (remainingTime > 0) return
    if (timeLimitExceededRef.current) return

      const handleTimeout = async () => {
        timeLimitExceededRef.current = true
        stopTimer()
        setIsPlaying(false)
        setError('Tiempo límite sobrepasado. ¡Vuelve a intentarlo!')
        
        // Mostrar overlay de derrota para niveles 7-10
        if (currentLevel >= 7 && currentLevel <= 10) {
          gameEngineRef.current?.showNotification('TIEMPO LIMITE \n AGOTADO', 0xff4444, 'defeat')
        } else {
          await resetLevel()
        }
      }

      void handleTimeout()
  }, [remainingTime, timerMode, currentLevel])

  // 🧩 Validar y preparar comandos
  const prepareCommands = () => {
    const parser = commandParserRef.current
    const trimmed = commands.trim()
    const requireComma = Boolean(level && level.level >= 4)
    const validation = parser.validateCommands(trimmed, {
      requireCommaAfterCommand: requireComma,
    })
    if (!validation.isValid) throw new Error(validation.error || 'Comando incorrecto.')
    const parsed = parser.parseCommands(trimmed, {
      requireCommaAfterCommand: requireComma,
    })
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
            stopTimer()
            setError('¡Caíste al vacío! Intenta de nuevo.')
            setIsPlaying(false)
            await postProgress({
              success: false,
              commandsUsed: commandCount,
              energized: isEnergized,
              timeTaken: getTimeTaken(),
              failureType: 'void',
            })
            gameEngineRef.current?.showNotification('GAME OVER', 0xff4444, 'defeat')
            return
          }

          if (cell.type === 'snake') {
            await gameEngineRef.current.animateFailure('snake')
            stopTimer()
            setError('¡Te mordió una serpiente! Intenta de nuevo.')
            setIsPlaying(false)
            await postProgress({
              success: false,
              commandsUsed: commandCount,
              energized: isEnergized,
              timeTaken: getTimeTaken(),
              failureType: 'snake',
            })
            gameEngineRef.current?.showNotification('GAME OVER', 0xff4444, 'defeat')
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
                    timeTaken: getTimeTaken(),
                  })

                  if (response?.ok) {
                    setCompletedLevels(prev => {
                      if (prev.includes(1)) return prev
                      return [...prev, 1].sort((a, b) => a - b)
                    })
                    setMaxLevelCompleted(prev => Math.max(prev ?? 0, 1))
                  } else {
                    addOfflineProgress({
                      level: 1,
                      timeTaken: getTimeTaken(),
                      moves: movesCount,
                    })
                  }
                }

                gameEngineRef.current?.showNotification('Felicitaciones\nNivel superado', 0x00ff99, 'victory')
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

            const requiresSingleCommand = currentLevel >= 11 && currentLevel <= 15
            if (requiresSingleCommand && commandCount !== 1) {
              stopTimer()
              setError('Hazlo en un solo comando para superar este nivel.')
              setIsPlaying(false)
              gameEngineRef.current?.showNotification('\nEncuentra el patron\nHazlo en solo \n 1 COMANDO', 0xff4444, 'defeat')
              return
            }

            stopTimer()
            await gameEngineRef.current.animateVictory()
            setError('')

            if (currentLevel <= 3) {
              addOfflineProgress({ level: currentLevel, timeTaken: getTimeTaken(), moves: movesCount })
            }

            if (currentUser) {
              const response = await postProgress({
                success: true,
                commandsUsed: commandCount,
                energized: isEnergized,
                timeTaken: getTimeTaken(),
              })

              if (response?.ok) {
                setCompletedLevels(prev => {
                  if (prev.includes(currentLevel)) return prev
                  return [...prev, currentLevel].sort((a, b) => a - b)
                })
                setMaxLevelCompleted(prev => Math.max(prev !== null ? prev : 0, currentLevel))
              } else if (response) {
                console.warn('No se pudo registrar el avance del usuario')
              }
            }

            gameEngineRef.current?.showNotification('Felicitaciones\nNivel superado', 0x00ff99, 'victory')
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

  const showTimer = timerMode !== 'none'
  const currentTimerValue = timerMode === 'countdown'
    ? Math.max(0, remainingTime ?? (timeLimitRef.current ?? 0))
    : elapsedTime

  const getTimeTaken = () => {
    if (timerMode === 'countdown') {
      const limit = timeLimitRef.current ?? 0
      const remaining = remainingTime ?? limit
      return Math.max(0, limit - remaining)
    }
    return elapsedTime
  }

  const levelInfo = level ? {
    energyRequired: energyRemaining,
    totalEnergy: level.requiredEnergy,
    timeLimit: timerMode === 'countdown' ? (timeLimitRef.current ?? level.timeLimit ?? null) : null,
    hasGuideLines: level.hasGuideLines,
    allowsLoops: level.allowsLoops
  } : {}

  const isAdvancedLoopLevel = Boolean(level && level.level >= 11)

  const introModalContainerClass =
    level && (level.level === 4 || level.level === 11)
      ? 'relative w-full max-w-3xl max-h-[90vh] mx-6 overflow-hidden rounded-3xl border border-red-500/60 bg-gradient-to-br from-[#5a0412] via-[#a6101f] to-[#ff5722] shadow-[0_0_65px_rgba(248,113,113,0.6)] flex flex-col'
      : level && (level.level === 7 || level.level === 9)
        ? 'relative w-full max-w-3xl max-h-[90vh] mx-6 overflow-hidden rounded-3xl border border-blue-500/60 bg-gradient-to-br from-[#051235] via-[#0c2ed1] to-[#21d4fd] shadow-[0_0_65px_rgba(59,130,246,0.55)] flex flex-col'
      : 'relative w-full max-w-3xl max-h-[90vh] mx-6 overflow-hidden rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-purple-900/90 via-slate-900/90 to-emerald-900/80 shadow-[0_0_45px_rgba(56,189,248,0.45)] flex flex-col'

  const introModalGlowTopClass =
    level && (level.level === 4 || level.level === 11)
      ? 'absolute -top-16 -left-10 h-48 w-48 rounded-full bg-red-500/80 blur-2xl animate-pulse'
      : level && (level.level === 7 || level.level === 9)
        ? 'absolute -top-16 -left-10 h-48 w-48 rounded-full bg-blue-400/80 blur-2xl animate-pulse'
      : 'absolute -top-16 -left-10 h-48 w-48 rounded-full bg-emerald-500/40 blur-3xl animate-pulse'

  const introModalGlowBottomClass =
    level && (level.level === 4 || level.level === 11)
      ? 'absolute -bottom-12 -right-10 h-56 w-56 rounded-full bg-orange-500/80 blur-2xl animate-pulse delay-300'
      : level && (level.level === 7 || level.level === 9)
        ? 'absolute -bottom-12 -right-10 h-56 w-56 rounded-full bg-cyan-400/80 blur-2xl animate-pulse delay-300'
      : 'absolute -bottom-12 -right-10 h-56 w-56 rounded-full bg-purple-500/40 blur-3xl animate-pulse delay-300'

  return (
    <div className="min-h-screen bg-ninja-dark text-white">
      {/* Audio de fondo */}
      <audio ref={audioRef} src={ninjaGameBgm} loop hidden />
      {/* Header */}
      <div className="bg-ninja-purple border-b border-blue-500/30 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Home size={20} />
              Ninja 404 Quest
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

            {!currentUser ? (
              <p className="text-sm text-gray-300">Inicia sesión para acceder a todos los niveles.</p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 15 }, (_, i) => {
                  const levelNumber = i + 1
                  const isCompleted = completedLevels.includes(levelNumber)
                  const isUnlocked = maxLevelCompleted !== null && (maxLevelCompleted === 0 ? levelNumber === 1 : levelNumber <= maxLevelCompleted + 1)
                  
                  return (
                    <button
                      key={levelNumber}
                      onClick={() => {
                        setShowCompletedModal(false)
                        hasLoadedUserProgressRef.current = false // Permitir cargar el nivel seleccionado
                        void loadLevel(levelNumber)
                      }}
                      disabled={!isUnlocked}
                      className={`
                        w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm
                        transition-colors duration-200
                        ${isUnlocked
                          ? isCompleted
                            ? 'bg-gray-700 text-white border border-white/20 hover:bg-gray-600'
                            : 'bg-blue-600 text-white border border-blue-400/40 hover:bg-blue-500'
                          : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed opacity-50'
                        }
                      `}
                      title={isUnlocked ? (isCompleted ? `Nivel ${levelNumber} completado` : `Jugar nivel ${levelNumber}`) : 'Nivel bloqueado'}
                    >
                      {levelNumber}
                    </button>
                  )
                })}
              </div>
            )}

            {completedLevels.length > 0 && maxLevelCompleted !== null && (
              <p className="text-sm text-gray-200 mt-4">
                Has completado hasta el nivel {maxLevelCompleted}.
              </p>
            )}

            <p className="text-xs text-gray-300 mt-4">
              {currentUser 
                ? 'Selecciona cualquier nivel desbloqueado para jugarlo. Los niveles completados están en gris.'
                : 'Inicia sesión para acceder a todos los niveles disponibles.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Intro Modals por nivel (mismo estilo que celebración final) */}
      {showIntroModal && (
        <>
          <style>{`
            .intro-modal-scroll::-webkit-scrollbar {
              width: 8px;
            }
            .intro-modal-scroll::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.2);
              border-radius: 10px;
            }
            .intro-modal-scroll::-webkit-scrollbar-thumb {
              background: linear-gradient(180deg, rgba(16, 185, 129, 0.8) 0%, rgba(16, 185, 129, 0.6) 100%);
              border-radius: 10px;
              border: 1px solid rgba(16, 185, 129, 0.3);
              box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
            }
            .intro-modal-scroll::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(180deg, rgba(16, 185, 129, 1) 0%, rgba(16, 185, 129, 0.8) 100%);
              box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
            }
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            .shimmer-effect {
              animation: shimmer 3s infinite;
            }
          `}</style>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur p-4">
            <div className={introModalContainerClass}>
              <div className="absolute inset-0 pointer-events-none">
                <div className={introModalGlowTopClass} />
                <div className={introModalGlowBottomClass} />
              </div>

              <div 
                className="intro-modal-scroll relative px-10 py-8 text-center space-y-4 overflow-y-auto flex-1 min-h-0"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(16, 185, 129, 0.6) transparent',
                }}
              >
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-lg">
                {introTitle}
              </h2>
              <div className="flex flex-col items-center gap-2">
                <p className="text-lg text-emerald-200 max-w-xl mx-auto">
                  {introMessage}
                </p>
                {/* Mostrar imagen de objetivo según el nivel */}
                {currentLevel === 1 && (
                  <div className="flex items-center gap-2 mt-1">
                    <img 
                      src={energyTileImg} 
                      alt="Energía" 
                      className="w-12 h-12 object-contain animate-pulse shadow-lg shadow-yellow-500/50 rounded-lg border border-yellow-400/30 p-1 bg-black/20"
                    />
                    <span className="text-sm text-yellow-300 font-semibold">Objetivo: Recoge la energía</span>
                  </div>
                )}
                {currentLevel === 2 && (
                  <div className="flex flex-col items-center gap-3 mt-1 w-full">
                    <div className="flex items-center gap-2">
                      <img 
                        src={doorTileImg} 
                        alt="Portal" 
                        className="w-12 h-12 object-contain animate-pulse shadow-lg shadow-purple-500/50 rounded-lg border border-purple-400/30 p-1 bg-black/20"
                      />
                      <span className="text-sm text-purple-300 font-semibold">Objetivo: Llega al portal</span>
                    </div>

                    <div className="relative max-w-lg w-full mx-auto">
                      <div className="relative bg-gradient-to-br from-red-900/80 via-orange-900/75 to-red-800/80 rounded-2xl border-2 border-red-500/70 shadow-2xl shadow-red-500/40 p-6 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/25 to-transparent rounded-2xl shimmer-effect pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col items-center gap-4">
                          <div className="flex items-center justify-center gap-3">
                            <img
                              src={energyTileImg}
                              alt="Energía"
                              className="w-12 h-12 object-contain drop-shadow-[0_0_20px_rgba(252,211,77,0.6)]"
                            />
                            <span className="text-4xl animate-bounce text-red-200">⚡</span>
                            <h3 className="text-xl font-extrabold text-red-100 drop-shadow-lg">
                              <span className="bg-gradient-to-r from-red-200 to-orange-200 bg-clip-text text-transparent">
                                ¡IMPORTANTE!
                              </span>
                            </h3>
                          </div>
                          <div className="bg-black/60 rounded-xl p-4 border border-red-500/60 w-full">
                            <p className="text-base text-red-100 text-center font-semibold leading-relaxed">
                              Debes recoger <span className="text-red-200 text-lg font-bold">TODAS LAS ENERGÍAS</span> requeridas<br />
                              <span className="text-orange-200 text-sm">antes de llegar al portal</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mostrar flechas para niveles 1, 2 y 4 */}
              {(currentLevel === 1 || currentLevel === 2 || currentLevel === 4) && (
                <div className="flex flex-col items-center gap-2 py-2">
                  {currentLevel === 4 ? (
                    <>
                      <p className="text-base text-purple-200 mb-2">Comandos disponibles:</p>
                      <div className="relative max-w-md">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col items-center gap-2 p-4 bg-black/70 rounded-xl border border-emerald-400/30">
                          <img src={arrowRight} alt="Derecha" className="w-16 h-16 object-contain animate-pulse" />
                          <span className="text-sm text-emerald-200 font-semibold">D = Derecha</span>
                        </div>
                          <div className="flex flex-col items-center gap-2 p-4 bg-black/70 rounded-xl border border-emerald-400/30">
                          <img src={arrowLeft} alt="Izquierda" className="w-16 h-16 object-contain animate-pulse" />
                          <span className="text-sm text-emerald-200 font-semibold">I = Izquierda</span>
                        </div>
                          <div className="flex flex-col items-center gap-2 p-4 bg-black/70 rounded-xl border border-emerald-400/30">
                          <img src={arrowUp} alt="Arriba" className="w-16 h-16 object-contain animate-pulse" />
                          <span className="text-sm text-emerald-200 font-semibold">S = Subir</span>
                        </div>
                          <div className="flex flex-col items-center gap-2 p-4 bg-black/70 rounded-xl border border-emerald-400/30">
                          <img src={arrowDown} alt="Abajo" className="w-16 h-16 object-contain animate-pulse" />
                          <span className="text-sm text-emerald-200 font-semibold">B = Bajar</span>
                        </div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-9xl font-extrabold text-red-500 drop-shadow-[0_0_35px_rgba(248,113,113,0.75)]">
                            ✕
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 p-4 bg-black/40 rounded-xl border border-emerald-400/30 max-w-md">
                        <p className="text-sm text-purple-200 mb-2">Ejemplo de comandos:</p>
                        <div className="bg-black/60 rounded-lg p-3 border border-emerald-500/40">
                          <code className="text-emerald-300 font-mono text-sm">D3,S2,I1</code>
                        </div>
                        <p className="text-xs text-emerald-300 mt-2">
                          Esto significa: Derecha 3 pasos, Subir 2 pasos, Izquierda 1 paso
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center max-w-4xl">
                        <div className="bg-black/40 rounded-xl border border-emerald-400/30 p-6">
                          <p className="text-base text-purple-200 mb-4 text-center">Usa estas flechas del panel de comandos:</p>
                          <div className="grid grid-cols-3 gap-4">
                            <div />
                            <div className="group relative overflow-hidden rounded-2xl border border-blue-400/40 bg-gradient-to-br from-blue-700/80 via-indigo-600/80 to-purple-700/80 p-4 shadow-[0_0_30px_rgba(59,130,246,0.45)]">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <div className="relative flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 via-indigo-400 to-violet-400 border border-white/40 shadow-[0_0_20px_rgba(129,140,248,0.6)] flex items-center justify-center">
                                  <img src={arrowUp} alt="Arriba" className="w-10 h-10 object-contain" />
                                </div>
                                <span className="text-sm font-semibold text-blue-100 tracking-wide">↑</span>
                              </div>
                            </div>
                            <div />
                            <div className="group relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-600/80 via-orange-500/80 to-amber-700/80 p-4 shadow-[0_0_30px_rgba(245,158,11,0.45)]">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <div className="relative flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 via-orange-300 to-yellow-400 border border-white/40 shadow-[0_0_20px_rgba(253,230,138,0.6)] flex items-center justify-center">
                                  <img src={arrowLeft} alt="Izquierda" className="w-10 h-10 object-contain" />
                                </div>
                                <span className="text-sm font-semibold text-amber-100 tracking-wide">←</span>
                              </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-700/80 via-teal-600/80 to-emerald-800/80 p-4 shadow-[0_0_30px_rgba(16,185,129,0.45)]">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <div className="relative flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-300 via-teal-300 to-emerald-400 border border-white/40 shadow-[0_0_20px_rgba(110,231,183,0.6)] flex items-center justify-center">
                                  <img src={ninjaIcon} alt="Ninja" className="w-10 h-10 object-contain" />
                                </div>
                                <span className="text-sm font-semibold text-emerald-100 tracking-wide">Ninja</span>
                              </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-600/80 via-orange-500/80 to-amber-700/80 p-4 shadow-[0_0_30px_rgba(245,158,11,0.45)]">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <div className="relative flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 via-orange-300 to-yellow-400 border border-white/40 shadow-[0_0_20px_rgba(253,230,138,0.6)] flex items-center justify-center">
                                  <img src={arrowRight} alt="Derecha" className="w-10 h-10 object-contain" />
                                </div>
                                <span className="text-sm font-semibold text-amber-100 tracking-wide">→</span>
                              </div>
                            </div>
                            <div />
                            <div className="group relative overflow-hidden rounded-2xl border border-blue-400/40 bg-gradient-to-br from-blue-700/80 via-indigo-600/80 to-purple-700/80 p-4 shadow-[0_0_30px_rgba(59,130,246,0.45)]">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <div className="relative flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 via-indigo-400 to-violet-400 border border-white/40 shadow-[0_0_20px_rgba(129,140,248,0.6)] flex items-center justify-center">
                                  <img src={arrowDown} alt="Abajo" className="w-10 h-10 object-contain" />
                                </div>
                                <span className="text-sm font-semibold text-blue-100 tracking-wide">↓</span>
                              </div>
                            </div>
                            <div />
                          </div>
                         </div>
                       </div>
                       {currentLevel === 1 && (
                        <>
                          <div className="mt-2 p-3 bg-gradient-to-r from-yellow-900/40 to-yellow-800/40 rounded-xl border border-yellow-400/30 max-w-md shadow-lg">
                            <p className="text-sm text-yellow-200 mb-1 flex items-center justify-center gap-2">
                              <span className="text-lg">💡</span>
                              <span>Al presionar las flechas aparecerá una <strong className="text-yellow-300">línea guía</strong> que debes seguir hasta el objetivo</span>
                            </p>
                          </div>
                          <div className="mt-2 p-3 bg-black/40 rounded-xl border border-yellow-400/30 max-w-md">
                            <p className="text-sm text-yellow-200 flex items-center justify-center gap-2">
                              <span className="text-lg">⚡</span>
                              <span>Recuerda pulsar el botón <strong className="text-yellow-300">Ejecutar</strong> al final para que el ninja se mueva</span>
                            </p>
                          </div>
                        </>
                      )}
                      {currentLevel === 2 && (
                        <div className="mt-2 p-3 bg-gradient-to-r from-purple-900/40 to-purple-800/40 rounded-xl border border-purple-400/30 max-w-md shadow-lg">
                          <p className="text-sm text-purple-200 mb-1 flex items-center justify-center gap-2">
                            <span className="text-lg">💡</span>
                            <span>La <strong className="text-purple-300">línea guía</strong> te mostrará el camino mientras presionas las flechas</span>
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Modal del nivel 6 - Sin líneas guía y con tiempo */}
              {currentLevel === 7 && (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="relative max-w-lg w-full mx-auto">
                    <div className="relative bg-gradient-to-br from-[#052a7a]/95 via-[#0a54ff]/85 to-[#36e1ff]/85 rounded-2xl border-2 border-blue-400/70 shadow-[0_0_35px_rgba(59,130,246,0.6)] p-6 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#5ecbff]/30 to-transparent rounded-2xl shimmer-effect pointer-events-none" />
                      <div className="relative flex flex-col items-center gap-3">
                        <span className="text-[12rem] leading-none animate-pulse text-blue-50 drop-shadow-[0_0_35px_rgba(255,255,255,0.45)]">⏱️</span>
                        <div className="text-center space-y-2">
                          <h3 className="text-xl font-extrabold text-white drop-shadow-[0_0_18px_rgba(59,130,246,0.6)] uppercase tracking-wide">
                            ¡Menos tiempo = Mejor clasificación!
                          </h3>
                          <p className="text-sm text-cyan-100 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                            Optimiza tu estrategia para completar rápido
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#04194f]/90 via-[#08317e]/85 to-[#1265cc]/80 rounded-xl border border-blue-400/40 p-4 max-w-md shadow-[0_0_25px_rgba(59,130,246,0.5)]">
                    <p className="text-sm text-blue-200 text-center flex items-center justify-center gap-2">
                      <span className="text-xl">💡</span>
                      <span>Planifica bien tu ruta, <strong className="text-blue-50">cada segundo cuenta</strong> en tu clasificación</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Modal para nivel 9 - Líneas guía desaparecen */}
              {currentLevel === 9 && (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="relative max-w-lg w-full mx-auto">
                    <div className="relative bg-gradient-to-br from-[#04194f]/90 via-[#08317e]/85 to-[#1265cc]/80 rounded-2xl border-2 border-blue-400/60 shadow-[0_0_30px_rgba(59,130,246,0.45)] p-6 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/25 to-transparent rounded-2xl shimmer-effect pointer-events-none" />
                      <div className="relative flex flex-col items-center gap-4">
                        <h3 className="text-xl font-extrabold drop-shadow-[0_0_16px_rgba(248,113,113,0.6)] uppercase tracking-wide text-center">
                          <span className="text-red-400">¡Atención!</span>
                        </h3>
                        <p className="text-lg font-bold text-center mt-2">
                          <span className="text-yellow-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]">¡Ahora eres un NINJA PRO!</span><br />
                          <span className="text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]">Demuestra que puedes hacerlo sin guía</span>
                        </p>
                        <p className="text-sm text-blue-200 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] text-center">
                          Las líneas guía ya no estarán disponibles en los siguientes niveles
                        </p>
                        
                        {/* Línea guía visual con flecha */}
                        <div className="w-full max-w-md mt-2">
                          <svg width="100%" height="60" viewBox="0 0 300 60" className="overflow-visible">
                            {/* Línea amarilla */}
                            <path
                              d="M 20 30 L 250 30"
                              stroke="#fbbf24"
                              strokeWidth="4"
                              fill="none"
                              strokeLinecap="round"
                              opacity="0.9"
                            />
                            {/* Flecha al final */}
                            <path
                              d="M 250 30 L 235 20 M 250 30 L 235 40"
                              stroke="#fbbf24"
                              strokeWidth="4"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity="0.9"
                            />
                            {/* Efecto de brillo */}
                            <path
                              d="M 20 30 L 250 30"
                              stroke="#ffd700"
                              strokeWidth="2"
                              fill="none"
                              strokeLinecap="round"
                              opacity="0.5"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de Loops para nivel 11 */}
              {currentLevel === 11 && (
                <div className="flex flex-col items-center gap-3 py-2">
                  {/* Mensaje destacado sobre tiempo y movimientos */}
                  <div className="relative max-w-lg w-full mx-auto">
                    <div className="relative bg-gradient-to-br from-purple-900/90 via-indigo-900/85 to-purple-900/90 rounded-2xl border-2 border-purple-400/60 shadow-[0_0_30px_rgba(168,85,247,0.45)] p-6 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/25 to-transparent rounded-2xl shimmer-effect pointer-events-none" />
                      <div className="relative flex items-center gap-4 justify-center">
                        <span className="text-5xl animate-pulse text-fuchsia-200 drop-shadow-[0_0_18px_rgba(232,121,249,0.6)]">⚡</span>
                        <div className="text-left space-y-1">
                          <h3 className="text-lg font-extrabold text-purple-100 drop-shadow-[0_0_16px_rgba(168,85,247,0.6)] uppercase tracking-wide">
                            ¡Menos tiempo y movimientos = Mejor clasificación!
                          </h3>
                          <p className="text-sm text-purple-200 drop-shadow-[0_0_10px_rgba(124,58,237,0.5)]">
                            Usa bucles inteligentes para optimizar cada intento y avanzar a la cima
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-base text-purple-200 mb-1 font-semibold">Sintaxis de bucles:</p>
                  <div className="bg-black/40 rounded-xl border border-purple-400/30 p-4 max-w-md shadow-lg">
                    <div className="bg-gradient-to-r from-purple-900/40 to-purple-800/40 rounded-lg p-3 border border-purple-500/50 mb-3 shadow-md">
                      <code className="text-purple-200 font-mono text-base font-bold">(D1,S1)x3</code>
                    </div>
                    <p className="text-xs text-purple-200 mb-3 flex items-center gap-2">
                      <span className="text-purple-400">→</span>
                      <span>Repite 3 veces: Derecha 1 paso, Subir 1 paso</span>
                      <span className="text-emerald-400 ml-auto">✓ 1 movimiento</span>
                    </p>
                    <div className="bg-gradient-to-r from-purple-900/40 to-purple-800/40 rounded-lg p-3 border border-purple-500/50 shadow-md">
                      <code className="text-purple-200 font-mono text-base font-bold">(D2,I1)x2,S2,B1</code>
                    </div>
                    <div className="text-xs text-purple-200 mt-2 space-y-1">
                      <p className="flex items-center gap-2">
                        <span className="text-purple-400">→</span>
                        <span>Repite 2 veces: Derecha 2 pasos, Izquierda 1 paso</span>
                      </p>
                      <p className="flex items-center gap-2 ml-6">
                        <span className="text-purple-400">→</span>
                        <span>Subir 2 pasos, Bajar 1 paso</span>
                        <span className="text-emerald-400 ml-auto">✓ 3 movimientos</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 p-3 bg-gradient-to-r from-purple-900/40 to-purple-800/40 rounded-xl border border-purple-400/50 max-w-md shadow-lg">
                    <p className="text-sm text-purple-300 text-center flex items-center justify-center gap-2">
                      <span className="text-xl">💡</span>
                      <span>Los bucles cuentan como <strong className="text-purple-200">un solo movimiento</strong>, aunque repitan múltiples acciones</span>
                    </p>
                  </div>
                </div>
              )}

              {currentLevel === 1 && (
                <div className="mt-6 relative max-w-lg mx-auto">
                  {/* Efecto de resplandor de fondo */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600/30 via-red-500/40 to-red-600/30 rounded-2xl blur-xl animate-pulse"></div>
                  
                  {/* Contenedor principal */}
                  <div className="relative bg-gradient-to-br from-red-900/80 via-red-800/70 to-red-900/80 rounded-2xl border-2 border-red-500/60 shadow-2xl shadow-red-500/50 p-6 transform hover:scale-[1.02] transition-transform duration-300">
                    {/* Efecto de brillo animado */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/20 to-transparent rounded-2xl shimmer-effect"></div>
                    
                    <div className="relative z-10">
                      {/* Título con efecto llamativo */}
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <span className="text-4xl animate-bounce">⚠️</span>
                        <h3 className="text-xl font-extrabold text-red-100 drop-shadow-lg">
                          <span className="bg-gradient-to-r from-red-200 to-red-400 bg-clip-text text-transparent">
                            ¡EVITA ESTOS PELIGROS!
                          </span>
                        </h3>
                      </div>
                      
                      {/* Mensaje destacado */}
                      <div className="bg-black/50 rounded-xl p-4 mb-4 border border-red-400/40">
                        <p className="text-base text-red-100 text-center font-semibold leading-relaxed">
                          Si tocas estos elementos,<br />
                          <span className="text-red-200 text-lg font-bold">tendrás que REPETIR el nivel</span>
                        </p>
                      </div>
                      
                      {/* Imágenes de peligros con efectos */}
                      <div className="flex items-center justify-center gap-6">
                        <div className="flex flex-col items-center gap-2 group">
                          <div className="relative">
                            <div className="absolute inset-0 bg-red-500/50 rounded-lg blur-md group-hover:blur-lg transition-all"></div>
                            <img 
                              src={snakeTileImg} 
                              alt="Serpiente" 
                              className="relative w-16 h-16 object-contain rounded-lg border-2 border-red-400/60 p-2 bg-black/40 shadow-lg shadow-red-500/50 group-hover:scale-110 transition-transform"
                            />
                          </div>
                          <span className="text-sm font-bold text-red-200 drop-shadow-md">SERPIENTE</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 group">
                          <div className="relative">
                            <div className="absolute inset-0 bg-red-500/50 rounded-lg blur-md group-hover:blur-lg transition-all"></div>
                            <img 
                              src={voidTileImg} 
                              alt="Vacío" 
                              className="relative w-16 h-16 object-contain rounded-lg border-2 border-red-400/60 p-2 bg-black/40 shadow-lg shadow-red-500/50 group-hover:scale-110 transition-transform"
                            />
                          </div>
                          <span className="text-sm font-bold text-red-200 drop-shadow-md">VACÍO</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setShowIntroModal(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 transition-colors text-sm"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Modal de explicación de registro (después de completar nivel 3 sin sesión) */}
      {showRegistrationExplanationModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] mx-6 overflow-hidden rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-purple-900/90 via-slate-900/90 to-emerald-900/80 shadow-[0_0_45px_rgba(56,189,248,0.45)] flex flex-col">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-16 -left-10 h-48 w-48 rounded-full bg-emerald-500/40 blur-3xl animate-pulse" />
              <div className="absolute -bottom-12 -right-10 h-56 w-56 rounded-full bg-purple-500/40 blur-3xl animate-pulse delay-300" />
            </div>

            <div 
              className="relative px-10 py-8 text-center space-y-4 overflow-y-auto flex-1 min-h-0 intro-modal-scroll"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(16, 185, 129, 0.6) transparent',
              }}
            >
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-lg">
                ¡Regístrate para Continuar!
              </h2>

              <div className="flex flex-col items-center gap-4 py-2">
                <p className="text-lg text-emerald-200 max-w-xl mx-auto">
                  Has completado los primeros 3 niveles. Para continuar y desbloquear todas las características del juego, necesitas crear una cuenta.
                </p>

                <div className="relative max-w-lg w-full mx-auto">
                  <div className="relative bg-gradient-to-br from-amber-900/80 via-yellow-800/70 to-amber-900/80 rounded-2xl border-2 border-amber-500/60 shadow-2xl shadow-amber-500/50 p-4 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent rounded-2xl shimmer-effect pointer-events-none"></div>
                    <p className="text-base text-amber-100 text-center font-semibold leading-relaxed">
                      ¡Es rápido y gratuito! <span className="text-amber-200 text-lg font-bold">Solo necesitas tu email y cédula.</span>
                    </p>
                  </div>
                </div>

                {/* Beneficios destacados */}
                <div className="w-full max-w-lg space-y-3 mt-4">
                  <div className="bg-gradient-to-r from-emerald-900/60 to-emerald-800/60 rounded-xl border border-emerald-400/40 p-4 shadow-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">🏆</span>
                      <h3 className="text-lg font-bold text-emerald-200">Ranking de Clasificación</h3>
                    </div>
                    <p className="text-sm text-emerald-100 text-left">
                      Compite con otros jugadores y muestra tus habilidades en el ranking global. Cada nivel completado mejora tu posición.
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-purple-900/60 to-purple-800/60 rounded-xl border border-purple-400/40 p-4 shadow-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">💾</span>
                      <h3 className="text-lg font-bold text-purple-200">Progreso Guardado</h3>
                    </div>
                    <p className="text-sm text-purple-100 text-left">
                      Tus niveles superados se guardan automáticamente. Nunca perderás tu progreso, incluso si cierras el juego.
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-blue-900/60 to-blue-800/60 rounded-xl border border-blue-400/40 p-4 shadow-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">🎮</span>
                      <h3 className="text-lg font-bold text-blue-200">Acceso Completo</h3>
                    </div>
                    <p className="text-sm text-blue-100 text-left">
                      Desbloquea todos los niveles (4-15) y disfruta de todas las características avanzadas del juego.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowRegistrationExplanationModal(false)
                    setTimeout(() => {
                      window.location.href = '/login?next=/game'
                    }, 300)
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 transition-colors text-base"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-ninja-purple rounded-lg p-6 border border-blue-500/30 relative">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">Nivel {currentLevel}</h2>
                <div className="flex items-center gap-12 py-0.1">
                  <img 
                    src={krakeLogo} 
                    alt="Krake Evolution" 
                    className="h-20 object-contain opacity-90 hover:opacity-100 transition-opacity"
                  />
                  <img 
                    src={movilisLogo} 
                    alt="Movilis" 
                    className="h-20 object-contain opacity-90 hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCompletedModal(true)}
                    disabled={!currentUser || completedLevels.length === 0}
                    className={`px-3 py-1 rounded flex items-center gap-1 text-sm border border-blue-400/40 transition-all duration-200
                      ${!currentUser || completedLevels.length === 0
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400 text-white shadow-[0_0_15px_rgba(129,140,248,0.6)]'}
                    `}
                  >
                    <ListChecks size={16} />
                    <span className="uppercase tracking-wide font-bold text-sm drop-shadow-[0_0_6px_rgba(191,219,254,0.7)]">Niveles</span>
                  </button>

                  <button
                    onClick={resetLevel}
                    className="px-3 py-1 rounded flex items-center gap-1 text-sm text-white bg-gradient-to-r from-rose-600 via-red-600 to-orange-500 hover:from-rose-500 hover:via-red-500 hover:to-orange-400 shadow-[0_0_18px_rgba(248,113,113,0.65)] transition-all duration-200"
                  >
                    <RotateCcw size={16} />
                    <span className="uppercase tracking-wide font-bold text-sm drop-shadow-[0_0_6px_rgba(254,202,202,0.7)]">Reiniciar</span>
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
            {/* Hacker Cat y Level Info lado a lado */}
            <div className="flex items-start gap-4">
              {/* Hacker Cat */}
              <div className="flex-shrink-0">
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
              <div className="flex-1 min-w-[280px] max-w-md bg-ninja-purple rounded-lg p-4 border border-blue-500/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Información del Nivel</h3>
                {showTimer && (
                  <div className="flex items-center gap-2 bg-blue-900/60 border border-blue-400/40 px-3 py-1 rounded-full shadow-md shadow-blue-500/20">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <div className="text-sm font-semibold tracking-wide text-blue-200">
                      {formatTime(currentTimerValue)}
                    </div>
                  </div>
                )}
              </div>

              {level && (
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2.5 text-amber-300">
                    <span role="img" aria-label="energy" className="text-base">⚡</span>
                    <span className="flex-1">
                      Energía restante: <span className="font-semibold text-white">{levelInfo.energyRequired}</span>
                      {typeof levelInfo.totalEnergy === 'number' && (
                        <span className="text-sm text-amber-200"> / {levelInfo.totalEnergy}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-emerald-200">
                    <span role="img" aria-label="moves" className="text-base">🦶</span>
                    <span className="flex-1">Movimientos: <span className="font-semibold text-white">{movesCount}</span></span>
                  </div>
                  {typeof levelInfo.timeLimit === 'number' && (
                    <div className="flex items-center gap-2.5 text-blue-200">
                      <span className="flex-1">Tiempo límite: <span className="font-semibold text-white">{formatTime(levelInfo.timeLimit)}</span></span>
                    </div>
                  )}
                  {levelInfo.hasGuideLines && (
                    <div className="flex items-center gap-2.5 text-yellow-400">
                      <span className="text-base">💡</span>
                      <span>Líneas guía disponibles</span>
                    </div>
                  )}

                </div>
              )}
              </div>
            </div>

          <div className="mt-4 flex justify-center">
            <div className="bg-ninja-purple border border-emerald-400/30 rounded-lg px-6 py-4 shadow-[0_0_18px_rgba(16,185,129,0.25)]">
              <p className="text-sm text-emerald-200 text-center font-semibold mb-3 tracking-wide">
                Controla al ninja con los botones
              </p>
              <div className="grid grid-cols-3 gap-3">
                <span />
                <button
                  onClick={() => handleArrowInput('S')}
                  className={`ninja-button flex flex-col items-center justify-center px-4 py-3 gap-1 ${
                    level && level.level > 3 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  aria-label="Mover arriba"
                  disabled={Boolean(level && level.level > 3)}
                >
                  <img src={arrowUp} alt="" className="w-14 h-14 select-none" />
                  <span className="text-base font-bold tracking-wide">S</span>
                </button>
                <span />
                <button
                  onClick={() => handleArrowInput('I')}
                  className={`ninja-button flex flex-col items-center justify-center px-4 py-3 gap-1 ${
                    level && level.level > 3 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  aria-label="Mover izquierda"
                  disabled={Boolean(level && level.level > 3)}
                >
                  <img src={arrowLeft} alt="" className="w-14 h-14 select-none" />
                  <span className="text-base font-bold tracking-wide">I</span>
                </button>
                <button
                  onClick={() => handleArrowInput('B')}
                  className={`ninja-button flex flex-col items-center justify-center px-4 py-3 gap-1 ${
                    level && level.level > 3 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  aria-label="Mover abajo"
                  disabled={Boolean(level && level.level > 3)}
                >
                  <img src={arrowDown} alt="" className="w-14 h-14 select-none" />
                  <span className="text-base font-bold tracking-wide">B</span>
                </button>
                <button
                  onClick={() => handleArrowInput('D')}
                  className={`ninja-button flex flex-col items-center justify-center px-4 py-3 gap-1 ${
                    level && level.level > 3 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  aria-label="Mover derecha"
                  disabled={Boolean(level && level.level > 3)}
                >
                  <img src={arrowRight} alt="" className="w-14 h-14 select-none" />
                  <span className="text-base font-bold tracking-wide">D</span>
                </button>
              </div>
            </div>
            </div>

            {/* Commands */}
            <div className="bg-ninja-purple rounded-lg p-4 border border-blue-500/30">
              <div className="flex justify-between items-center mb-3">
                <h3 className={`font-semibold text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.6)]`}>
                  {level && level.level <= 3 ? 'Cada ACCIÓN genera un Comando' : 'Ahora TÚ debes INGRESAR los comandos'}
                </h3>
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
                placeholder={level && level.level >= 11 && level.level <= 15 ? "Ej: (D1,S1)x3" : "Ej: D3,S2,I1"}
                className="ninja-input w-full h-24 resize-none"
                disabled={isPlaying || Boolean(level && level.level <= 3)}
              />

              {error && (
                <div className="mt-2 text-sm font-semibold text-red-400">
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-red-700/80 via-rose-600/80 to-red-700/80 border border-red-300/70 text-red-50 px-3 py-2 rounded-xl shadow-[0_0_20px_rgba(248,113,113,0.55)]">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-500/70 text-red-100 drop-shadow-sm animate-pulse">
                      !
                    </span>
                    <span className="tracking-wide text-red-50 drop-shadow-[0_0_10px_rgba(254,202,202,0.6)]">
                      {error}
                    </span>
                  </span>
                </div>
              )}

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

            {/* Legend eliminada según solicitud del usuario */}
            
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
          <div className={`relative w-full max-w-3xl mx-6 overflow-hidden rounded-3xl border ${pendingLevelAfterCelebration ? 'border-emerald-400/40 bg-gradient-to-br from-purple-900/90 via-slate-900/90 to-emerald-900/80 shadow-[0_0_45px_rgba(56,189,248,0.45)]' : 'border-yellow-500/60 bg-gradient-to-br from-[#140032] via-[#36009b] to-[#ff7300] shadow-[0_0_65px_rgba(255,175,0,0.6)]'}`}>
            <div className="absolute inset-0 pointer-events-none">
              <div className={`absolute -top-16 -left-10 h-48 w-48 rounded-full ${pendingLevelAfterCelebration ? 'bg-emerald-500/40' : 'bg-[#ffbf00]/70'} blur-3xl animate-pulse`} />
              <div className={`absolute -bottom-12 -right-10 h-56 w-56 rounded-full ${pendingLevelAfterCelebration ? 'bg-purple-500/40' : 'bg-[#ff0099]/60'} blur-3xl animate-pulse delay-300`} />
            </div>

            <div className="relative px-10 py-12 text-center space-y-6">
              <h2 className={`text-3xl sm:text-4xl font-extrabold drop-shadow-[0_0_25px_rgba(255,255,255,0.7)] ${pendingLevelAfterCelebration ? 'text-white' : 'text-yellow-200'}`}>
                {pendingLevelAfterCelebration ? '¡Felicidades, Ninja!' : '¡Leyenda absoluta del código!'}
              </h2>
              <p className={`text-lg max-w-xl mx-auto ${pendingLevelAfterCelebration ? 'text-emerald-200' : 'text-yellow-100'}`}>
                {pendingLevelAfterCelebration
                  ? 'Has dominado los 14 niveles iniciales. Un reto de un solo comando te espera. ¡Inténtalo, supéralo y sorpréndete!'
                  : '¡Eres el mejor! Domaste el nivel más difícil. Tu ADN programador está en la cima; creatividad y lógica hechas leyenda.'}
              </p>
              <div className="relative mx-auto flex flex-col items-center gap-4">
                <div className="relative">
                  <div className={`absolute inset-0 rounded-full blur-xl animate-ping ${pendingLevelAfterCelebration ? 'bg-emerald-400/40' : 'bg-white/60'}`} />
                  <div className={`relative flex items-center justify-center h-28 w-28 rounded-full border-4 ${pendingLevelAfterCelebration ? 'border-emerald-300/70 bg-black/60 shadow-[0_0_25px_rgba(16,185,129,0.6)]' : 'border-yellow-300/70 bg-black/70 shadow-[0_0_35px_rgba(255,255,255,0.6)]'}`}>
                    <span className={`text-4xl ${pendingLevelAfterCelebration ? '' : 'animate-pulse text-yellow-200 drop-shadow-[0_0_20px_rgba(255,215,0,0.7)]'}`}>🧬</span>
                  </div>
                </div>
                <p className={`text-base max-w-md ${pendingLevelAfterCelebration ? 'text-purple-200' : 'text-yellow-100'}`}>
                  Tu ADN programador ha sido analizado: creatividad + lógica en perfecto equilibrio. Estás listo para retos aún mayores.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowFinalCelebration(false)
                    setPendingLevelAfterCelebration(null)
                    void loadLevel(1)
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 transition-colors"
                >
                  Volver a practicar
                </button>
                {pendingLevelAfterCelebration && (
                  <button
                    onClick={() => {
                      const nextLevel = pendingLevelAfterCelebration
                      setShowFinalCelebration(false)
                      setPendingLevelAfterCelebration(null)
                      void loadLevel(nextLevel)
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-orange-500 text-white font-semibold shadow-lg shadow-orange-500/40 hover:bg-orange-400 transition-colors"
                  >
                    Continuar al nivel {pendingLevelAfterCelebration}
                  </button>
                )}
                <Link
                  to="/ranking"
                  className={`w-full sm:w-auto px-5 py-3 rounded-xl ${pendingLevelAfterCelebration ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40 hover:bg-blue-400' : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 hover:bg-indigo-400'} transition-colors`}
                >
                  Revisa tu ranking
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
