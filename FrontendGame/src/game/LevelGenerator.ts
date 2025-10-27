import { GameLevel, CellType, Cell } from '../types/game'

export class LevelGenerator {
  private gridSize = 15

  public generateLevel(levelNumber: number): GameLevel {
    const grid = this.createEmptyGrid()
    const hasGuideLines = levelNumber <= 5
    const allowsLoops = levelNumber >= 10
    const timeLimit = levelNumber >= 10 ? 60 - (levelNumber - 10) * 5 : undefined

    // Generate path and obstacles based on level
    const { startPosition, doorPosition, energyPositions } = this.generateLevelLayout(levelNumber, grid)

    return {
      level: levelNumber,
      grid,
      startPosition,
      doorPosition,
      energyPositions,
      requiredEnergy: Math.min(levelNumber, 3),
      timeLimit,
      hasGuideLines,
      allowsLoops
    }
  }

  private createEmptyGrid(): Cell[][] {
    const grid: Cell[][] = []
    for (let y = 0; y < this.gridSize; y++) {
      grid[y] = []
      for (let x = 0; x < this.gridSize; x++) {
        grid[y][x] = {
          x,
          y,
          type: CellType.SAFE
        }
      }
    }
    return grid
  }

  private generateLevelLayout(levelNumber: number, grid: Cell[][]) {
    // Start position (always bottom-left corner)
    const startPosition = { x: 0, y: this.gridSize - 1 }
    
    // Door position (always top-right corner)
    const doorPosition = { x: this.gridSize - 1, y: 0 }
    grid[doorPosition.y][doorPosition.x].type = CellType.DOOR

    // Generate energy positions
    const energyPositions = this.generateEnergyPositions(levelNumber)
    energyPositions.forEach(pos => {
      grid[pos.y][pos.x].type = CellType.ENERGY
    })

    // Generate obstacles based on level difficulty
    this.generateObstacles(levelNumber, grid, startPosition, doorPosition, energyPositions)

    // Generate safe path for early levels
    if (levelNumber <= 5) {
      this.generateGuidePath(grid, startPosition, doorPosition, energyPositions)
    }

    return { startPosition, doorPosition, energyPositions }
  }

  private generateEnergyPositions(levelNumber: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = []
    const energyCount = Math.min(levelNumber, 3)

    for (let i = 0; i < energyCount; i++) {
      let x: number, y: number
      do {
        x = Math.floor(Math.random() * (this.gridSize - 2)) + 1
        y = Math.floor(Math.random() * (this.gridSize - 2)) + 1
      } while (positions.some(pos => pos.x === x && pos.y === y))
      
      positions.push({ x, y })
    }

    return positions
  }

  private generateObstacles(
    levelNumber: number, 
    grid: Cell[][], 
    startPosition: { x: number; y: number },
    doorPosition: { x: number; y: number },
    energyPositions: { x: number; y: number }[]
  ) {
    const obstacleCount = Math.floor(levelNumber * 2.5)
    const voidCount = Math.floor(obstacleCount * 0.6)
    const snakeCount = obstacleCount - voidCount

    // Place void cells
    for (let i = 0; i < voidCount; i++) {
      this.placeRandomObstacle(grid, CellType.VOID, startPosition, doorPosition, energyPositions)
    }

    // Place snake cells
    for (let i = 0; i < snakeCount; i++) {
      this.placeRandomObstacle(grid, CellType.SNAKE, startPosition, doorPosition, energyPositions)
    }
  }

  private placeRandomObstacle(
    grid: Cell[][],
    type: CellType,
    startPosition: { x: number; y: number },
    doorPosition: { x: number; y: number },
    energyPositions: { x: number; y: number }[]
  ) {
    let x: number, y: number
    let attempts = 0
    const maxAttempts = 100

    do {
      x = Math.floor(Math.random() * this.gridSize)
      y = Math.floor(Math.random() * this.gridSize)
      attempts++
    } while (
      attempts < maxAttempts &&
      (
        (x === startPosition.x && y === startPosition.y) ||
        (x === doorPosition.x && y === doorPosition.y) ||
        energyPositions.some(pos => pos.x === x && pos.y === y) ||
        grid[y][x].type !== CellType.SAFE
      )
    )

    if (attempts < maxAttempts) {
      grid[y][x].type = type
    }
  }

  private generateGuidePath(
    grid: Cell[][],
    startPosition: { x: number; y: number },
    doorPosition: { x: number; y: number },
    energyPositions: { x: number; y: number }[]
  ) {
    // Simple pathfinding to mark guide cells
    const path = this.findSimplePath(startPosition, energyPositions[0] || doorPosition)
    
    if (energyPositions.length > 0) {
      const pathToDoor = this.findSimplePath(energyPositions[0], doorPosition)
      path.push(...pathToDoor)
    }

    path.forEach(pos => {
      if (grid[pos.y] && grid[pos.y][pos.x]) {
        grid[pos.y][pos.x].isPath = true
      }
    })
  }

  private findSimplePath(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = []
    let current = { ...start }

    // Move horizontally first
    while (current.x !== end.x) {
      current.x += current.x < end.x ? 1 : -1
      path.push({ ...current })
    }

    // Then move vertically
    while (current.y !== end.y) {
      current.y += current.y < end.y ? 1 : -1
      path.push({ ...current })
    }

    return path
  }

  public generatePredefinedLevels(): GameLevel[] {
    const levels: GameLevel[] = []
    
    for (let i = 1; i <= 15; i++) {
      levels.push(this.generateLevel(i))
    }

    return levels
  }
}
