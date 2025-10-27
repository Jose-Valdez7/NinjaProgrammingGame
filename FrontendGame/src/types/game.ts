export interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  phone?: string
  dni?: string
  createdAt: string
}

export interface LevelProgress {
  id: number
  userId: number
  level: number
  commandsUsed: number
  timeTaken: number
  energized: boolean
  success: boolean
  createdAt: string
}

export interface Ranking {
  id: number
  level: number
  userId: number
  score: number
  createdAt: string
  user: User
}

export enum CellType {
  SAFE = 'safe',
  ENERGY = 'energy',
  VOID = 'void',
  SNAKE = 'snake',
  DOOR = 'door'
}

export interface Cell {
  x: number
  y: number
  type: CellType
  isPath?: boolean
}

export interface GameLevel {
  level: number
  grid: Cell[][]
  startPosition: { x: number; y: number }
  doorPosition: { x: number; y: number }
  energyPositions: { x: number; y: number }[]
  requiredEnergy: number
  timeLimit?: number
  hasGuideLines: boolean
  allowsLoops: boolean
}

export interface GameState {
  currentLevel: number
  playerPosition: { x: number; y: number }
  energyCount: number
  isEnergized: boolean
  commands: string[]
  isPlaying: boolean
  timeRemaining?: number
  commandsUsed: number
  startTime?: number
}

export interface Command {
  direction: 'D' | 'I' | 'S' | 'B' // Derecha, Izquierda, Subir, Bajar
  steps: number
}

export interface LoopCommand {
  commands: Command[]
  repetitions: number
}
