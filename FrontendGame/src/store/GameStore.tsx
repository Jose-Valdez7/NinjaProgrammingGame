import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { GameState, GameLevel, User } from '../types/game'
import { authStorage } from '../config/env'

interface GameContextType {
  gameState: GameState
  currentUser: User | null
  currentLevel: GameLevel | null
  dispatch: React.Dispatch<GameAction>
}

type GameAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LEVEL'; payload: GameLevel }
  | { type: 'SET_PLAYER_POSITION'; payload: { x: number; y: number } }
  | { type: 'SET_ENERGY_COUNT'; payload: number }
  | { type: 'SET_ENERGIZED'; payload: boolean }
  | { type: 'SET_COMMANDS'; payload: string[] }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_TIME_REMAINING'; payload: number }
  | { type: 'INCREMENT_COMMANDS_USED' }
  | { type: 'RESET_LEVEL' }
  | { type: 'NEXT_LEVEL' }

const initialGameState: GameState = {
  currentLevel: 1,
  playerPosition: { x: 0, y: 0 },
  energyCount: 0,
  isEnergized: false,
  commands: [],
  isPlaying: false,
  commandsUsed: 0,
}

interface GameStoreState {
  gameState: GameState
  currentUser: User | null
  currentLevel: GameLevel | null
}

const initialState: GameStoreState = {
  gameState: initialGameState,
  currentUser: null,
  currentLevel: null,
}

function gameReducer(state: GameStoreState, action: GameAction): GameStoreState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload }
    case 'SET_LEVEL':
      return { ...state, currentLevel: action.payload }
    case 'SET_PLAYER_POSITION':
      return {
        ...state,
        gameState: { ...state.gameState, playerPosition: action.payload }
      }
    case 'SET_ENERGY_COUNT':
      return {
        ...state,
        gameState: { ...state.gameState, energyCount: action.payload }
      }
    case 'SET_ENERGIZED':
      return {
        ...state,
        gameState: { ...state.gameState, isEnergized: action.payload }
      }
    case 'SET_COMMANDS':
      return {
        ...state,
        gameState: { ...state.gameState, commands: action.payload }
      }
    case 'SET_PLAYING':
      return {
        ...state,
        gameState: { ...state.gameState, isPlaying: action.payload }
      }
    case 'SET_TIME_REMAINING':
      return {
        ...state,
        gameState: { ...state.gameState, timeRemaining: action.payload }
      }
    case 'INCREMENT_COMMANDS_USED':
      return {
        ...state,
        gameState: { 
          ...state.gameState, 
          commandsUsed: state.gameState.commandsUsed + 1 
        }
      }
    case 'RESET_LEVEL':
      return {
        ...state,
        gameState: {
          ...state.gameState,
          playerPosition: state.currentLevel?.startPosition || { x: 0, y: 0 },
          energyCount: 0,
          isEnergized: false,
          isPlaying: false,
          commandsUsed: 0,
        }
      }
    case 'NEXT_LEVEL':
      return {
        ...state,
        gameState: {
          ...initialGameState,
          currentLevel: state.gameState.currentLevel + 1,
        }
      }
    default:
      return state
  }
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    gameReducer,
    initialState,
    initial => {
      const storedUser = authStorage.getCurrentUser()
      if (storedUser) {
        return { ...initial, currentUser: storedUser }
      }
      return initial
    }
  )

  return (
    <GameContext.Provider value={{
      gameState: state.gameState,
      currentUser: state.currentUser,
      currentLevel: state.currentLevel,
      dispatch
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGameStore() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGameStore must be used within a GameProvider')
  }
  return context
}
