import { GameLevel, CellType, Cell } from '../types/game'

type PatternDirection = 'D' | 'I' | 'S' | 'B'

interface PatternCommand {
  direction: PatternDirection
  steps: number
}

interface PatternTemplate {
  name: string
  start: { x: number; y: number }
  pattern: PatternCommand[]
  repetitions: number
  energyIndices: number[]
}

export class LevelGenerator {
  private gridSize = 15
  private patternTemplates: PatternTemplate[] = [
    {
      name: 'stair-right',
      start: { x: 1, y: 13 },
      pattern: [
        { direction: 'D', steps: 2 },
        { direction: 'S', steps: 1 },
      ],
      repetitions: 5,
      energyIndices: [4, 8, 12],
    },
    {
      name: 'stair-left',
      start: { x: 13, y: 13 },
      pattern: [
        { direction: 'I', steps: 2 },
        { direction: 'S', steps: 1 },
      ],
      repetitions: 5,
      energyIndices: [4, 8, 12],
    },
    {
      name: 'zigzag-right',
      start: { x: 2, y: 13 },
      pattern: [
        { direction: 'S', steps: 2 },
        { direction: 'D', steps: 1 },
      ],
      repetitions: 4,
      energyIndices: [3, 7, 10],
    },
    {
      name: 'zigzag-left',
      start: { x: 12, y: 13 },
      pattern: [
        { direction: 'S', steps: 2 },
        { direction: 'I', steps: 1 },
      ],
      repetitions: 4,
      energyIndices: [3, 7, 10],
    },
    {
      name: 'ladder',
      start: { x: 7, y: 13 },
      pattern: [
        { direction: 'D', steps: 1 },
        { direction: 'S', steps: 1 },
        { direction: 'I', steps: 1 },
        { direction: 'S', steps: 1 },
      ],
      repetitions: 4,
      energyIndices: [4, 8, 12],
    },
    {
      name: 'wide-wave',
      start: { x: 2, y: 13 },
      pattern: [
        { direction: 'D', steps: 3 },
        { direction: 'S', steps: 1 },
        { direction: 'I', steps: 2 },
        { direction: 'S', steps: 1 },
      ],
      repetitions: 4,
      energyIndices: [6, 14, 22],
    },
    {
      name: 'triangle',
      start: { x: 4, y: 14 },
      pattern: [
        { direction: 'D', steps: 1 },
        { direction: 'S', steps: 2 },
        { direction: 'D', steps: 1 },
        { direction: 'S', steps: 1 },
      ],
      repetitions: 3,
      energyIndices: [3, 7, 11],
    },
  ]

  public generateLevel(levelNumber: number): GameLevel {
    const grid = this.createEmptyGrid()
    const hasGuideLines = levelNumber <= 5
    const allowsLoops = levelNumber >= 10
    const timeLimit = levelNumber >= 10 ? 60 - (levelNumber - 10) * 5 : undefined

    const { startPosition, doorPosition, energyPositions } =
      levelNumber >= 11
        ? this.generatePatternLevel(levelNumber, grid)
        : this.generateNormalLevelLayout(levelNumber, grid)

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

  private buildPatternPath(template: PatternTemplate): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [{ ...template.start }]
    const current = { ...template.start }

    for (let rep = 0; rep < template.repetitions; rep++) {
      for (const command of template.pattern) {
        for (let step = 0; step < command.steps; step++) {
          switch (command.direction) {
            case 'D': current.x += 1; break
            case 'I': current.x -= 1; break
            case 'S': current.y -= 1; break
            case 'B': current.y += 1; break
          }

          if (current.x < 0 || current.y < 0 || current.x >= this.gridSize || current.y >= this.gridSize) {
            return path
          }

          path.push({ ...current })
        }
      }
    }

    return path
  }

  private decoratePatternLevel(
    grid: Cell[][],
    path: { x: number; y: number }[],
    startPosition: { x: number; y: number },
    doorPosition: { x: number; y: number },
    energyPositions: { x: number; y: number }[],
    levelNumber: number
  ): void {
    const pathKeys = new Set(path.map(pos => this.positionKey(pos)))
    const energyKeys = new Set(energyPositions.map(pos => this.positionKey(pos)))

    const obstacleCount = Math.max(5, Math.floor(levelNumber * 1.5))
    const voidCount = Math.floor(obstacleCount * 0.4)
    const snakeCount = obstacleCount - voidCount

    for (let i = 0; i < voidCount; i++) {
      this.placeRandomObstacle(grid, CellType.VOID, startPosition, doorPosition, energyPositions, pathKeys)
    }

    for (let i = 0; i < snakeCount; i++) {
      this.placeRandomObstacle(grid, CellType.SNAKE, startPosition, doorPosition, energyPositions, pathKeys)
    }

    // optional extra energy placement off-path
    if (energyPositions.length < 3) {
      const needed = 3 - energyPositions.length
      for (let i = 0; i < needed; i++) {
        const pos = this.findRandomSafeCell(grid, pathKeys, energyKeys, startPosition, doorPosition)
        if (pos) {
          energyPositions.push(pos)
          energyKeys.add(this.positionKey(pos))
          grid[pos.y][pos.x].type = CellType.ENERGY
        }
      }
    }
  }

  private findRandomSafeCell(
    grid: Cell[][],
    pathKeys: Set<string>,
    energyKeys: Set<string>,
    startPosition: { x: number; y: number },
    doorPosition: { x: number; y: number }
  ): { x: number; y: number } | null {
    const maxAttempts = 200
    let attempts = 0

    while (attempts < maxAttempts) {
      attempts++
      const x = Math.floor(Math.random() * this.gridSize)
      const y = Math.floor(Math.random() * this.gridSize)
      const key = this.positionKey({ x, y })

      if (
        pathKeys.has(key) ||
        energyKeys.has(key) ||
        (x === startPosition.x && y === startPosition.y) ||
        (x === doorPosition.x && y === doorPosition.y)
      ) {
        continue
      }

      const cell = grid[y]?.[x]
      if (cell && cell.type === CellType.SAFE) {
        return { x, y }
      }
    }

    return null
  }

  private positionKey(pos: { x: number; y: number }): string {
    return `${pos.x},${pos.y}`
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

  private generateNormalLevelLayout(levelNumber: number, grid: Cell[][]) {
    const { startPosition, doorPosition } = this.generateStartAndDoorPositions()
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

  private generatePatternLevel(levelNumber: number, grid: Cell[][]) {
    const template = this.patternTemplates[Math.floor(Math.random() * this.patternTemplates.length)]

    const path = this.buildPatternPath(template)
    if (path.length < 2) {
      return this.generateNormalLevelLayout(levelNumber, grid)
    }

    const startPosition = { ...path[0] }
    const doorPosition = { ...path[path.length - 1] }

    grid[doorPosition.y][doorPosition.x].type = CellType.DOOR

    const energyPositions: { x: number; y: number }[] = []

    for (const index of template.energyIndices) {
      const node = path[index]
      if (!node) continue
      if ((node.x === startPosition.x && node.y === startPosition.y) || (node.x === doorPosition.x && node.y === doorPosition.y)) {
        continue
      }

      energyPositions.push({ ...node })
    }

    path.forEach(pos => {
      const cell = grid[pos.y]?.[pos.x]
      if (cell) {
        cell.isPath = true
      }
    })

    energyPositions.forEach(pos => {
      const cell = grid[pos.y]?.[pos.x]
      if (cell) {
        cell.type = CellType.ENERGY
      }
    })

    this.decoratePatternLevel(grid, path, startPosition, doorPosition, energyPositions, levelNumber)

    return { startPosition, doorPosition, energyPositions }
  }

  private generateStartAndDoorPositions(): {
    startPosition: { x: number; y: number }
    doorPosition: { x: number; y: number }
  } {
    type Edge = 'top' | 'bottom' | 'left' | 'right'

    const edgePairs: Array<{ start: Edge; door: Edge }> = [
      { start: 'bottom', door: 'top' },
      { start: 'top', door: 'bottom' },
      { start: 'left', door: 'right' },
      { start: 'right', door: 'left' },
    ]

    const choice = edgePairs[Math.floor(Math.random() * edgePairs.length)]

    return {
      startPosition: this.randomEdgePosition(choice.start),
      doorPosition: this.randomEdgePosition(choice.door),
    }
  }

  private randomEdgePosition(edge: 'top' | 'bottom' | 'left' | 'right'): { x: number; y: number } {
    switch (edge) {
      case 'top':
        return { x: this.randomCoordinate(), y: 0 }
      case 'bottom':
        return { x: this.randomCoordinate(), y: this.gridSize - 1 }
      case 'left':
        return { x: 0, y: this.randomCoordinate() }
      case 'right':
        return { x: this.gridSize - 1, y: this.randomCoordinate() }
      default:
        return { x: 0, y: this.gridSize - 1 }
    }
  }

  private randomCoordinate(): number {
    return Math.floor(Math.random() * this.gridSize)
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
    energyPositions: { x: number; y: number }[],
    forbiddenPositions?: Set<string>
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
        grid[y][x].type !== CellType.SAFE ||
        (forbiddenPositions && forbiddenPositions.has(this.positionKey({ x, y })))
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
