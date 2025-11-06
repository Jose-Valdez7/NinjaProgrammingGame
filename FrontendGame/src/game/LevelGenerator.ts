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
  private gridSize = 12
  private patternTemplates: PatternTemplate[] = [
    {
      name: 'stair-right',
      start: { x: 1, y: 10 },
      pattern: [
        { direction: 'D', steps: 2 },
        { direction: 'S', steps: 1 },
      ],
      repetitions: 5,
      energyIndices: [4, 8, 12],
    },
    {
      name: 'stair-left',
      start: { x: 10, y: 10 },
      pattern: [
        { direction: 'I', steps: 2 },
        { direction: 'S', steps: 1 },
      ],
      repetitions: 5,
      energyIndices: [4, 8, 12],
    },
    {
      name: 'zigzag-right',
      start: { x: 2, y: 10 },
      pattern: [
        { direction: 'S', steps: 2 },
        { direction: 'D', steps: 1 },
      ],
      repetitions: 4,
      energyIndices: [3, 7, 10],
    },
    {
      name: 'zigzag-left',
      start: { x: 9, y: 10 },
      pattern: [
        { direction: 'S', steps: 2 },
        { direction: 'I', steps: 1 },
      ],
      repetitions: 4,
      energyIndices: [3, 7, 10],
    },
    {
      name: 'ladder',
      start: { x: 6, y: 10 },
      pattern: [
        { direction: 'D', steps: 1 },
        { direction: 'S', steps: 1 },
        { direction: 'I', steps: 1 },
        { direction: 'S', steps: 1 },
      ],
      repetitions: 4,
      energyIndices: [4, 9, 12],
    },
    {
      name: 'wide-wave',
      start: { x: 2, y: 10 },
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
      start: { x: 4, y: 11 },
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

  private advancedPatternAssignments = new Map<number, PatternTemplate>()
  private remainingAdvancedPatterns: PatternTemplate[] = []

  public generateLevel(levelNumber: number): GameLevel {
    const grid = this.createEmptyGrid()
    const hasGuideLines = levelNumber <= 5
    const allowsLoops = levelNumber >= 11
    const timeLimit = levelNumber >= 11 ? 60 : levelNumber === 10 ? 75 : undefined

    const requiredEnergy = this.computeRequiredEnergy(levelNumber)
    const { startPosition, doorPosition, energyPositions } =
      levelNumber >= 11
        ? this.generatePatternLevel(levelNumber, grid, requiredEnergy)
        : this.generateNormalLevelLayout(levelNumber, grid, requiredEnergy)

    return {
      level: levelNumber,
      grid,
      startPosition,
      doorPosition,
      energyPositions,
      requiredEnergy,
      timeLimit,
      hasGuideLines,
      allowsLoops
    }
  }

  private computeRequiredEnergy(levelNumber: number): number {
    const baseRequiredEnergy = Math.min(levelNumber, 3)
    if (levelNumber >= 6 && levelNumber <= 10) {
      return 4
    }
    return baseRequiredEnergy
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
    const requiredEnergy = this.computeRequiredEnergy(levelNumber)

    if (energyPositions.length < requiredEnergy) {
      const needed = requiredEnergy - energyPositions.length
      for (let i = 0; i < needed; i++) {
        const pos = this.findRandomSafeCell(grid, pathKeys, energyKeys, startPosition, doorPosition)
        if (pos) {
          energyPositions.push(pos)
          energyKeys.add(this.positionKey(pos))
          grid[pos.y][pos.x].type = CellType.ENERGY
        }
      }
    }

    this.ensureMinimumHazards(grid, startPosition, doorPosition, energyPositions, pathKeys)
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

  private generateNormalLevelLayout(levelNumber: number, grid: Cell[][], requiredEnergy: number) {
    const { startPosition, doorPosition } = this.generateStartAndDoorPositions()
    const normalizedDoorPosition = this.markDoorArea(grid, doorPosition)

    // Generate energy positions
    const energyPositions = this.generateEnergyPositions(levelNumber, requiredEnergy)
    energyPositions.forEach(pos => {
      grid[pos.y][pos.x].type = CellType.ENERGY
    })

    // Generate obstacles based on level difficulty
    this.generateObstacles(levelNumber, grid, startPosition, normalizedDoorPosition, energyPositions)

    // Generate safe path for early levels
    if (levelNumber <= 5) {
      this.generateGuidePath(grid, startPosition, normalizedDoorPosition, energyPositions)
    }

    return { startPosition, doorPosition: normalizedDoorPosition, energyPositions }
  }

  private generatePatternLevel(levelNumber: number, grid: Cell[][], requiredEnergy: number) {
    const template = this.selectPatternTemplate(levelNumber)

    const path = this.buildPatternPath(template)
    if (path.length < 2) {
      return this.generateNormalLevelLayout(levelNumber, grid, requiredEnergy)
    }

    const startPosition = { ...path[0] }
    const originalDoorPosition = { ...path[path.length - 1] }
    const doorPosition = this.markDoorArea(grid, originalDoorPosition)

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

    if (energyPositions.length < requiredEnergy) {
      const pathKeys = new Set(path.map(pos => this.positionKey(pos)))
      const energyKeys = new Set(energyPositions.map(pos => this.positionKey(pos)))
      const needed = requiredEnergy - energyPositions.length

      for (let i = 0; i < needed; i++) {
        const pos = this.findRandomSafeCell(grid, pathKeys, energyKeys, startPosition, doorPosition)
        if (pos) {
          energyPositions.push(pos)
          energyKeys.add(this.positionKey(pos))
          grid[pos.y][pos.x].type = CellType.ENERGY
        }
      }
    }

    this.reinforcePatternPath(grid, path, startPosition, doorPosition, energyPositions)

    return { startPosition, doorPosition, energyPositions }
  }

  private selectPatternTemplate(levelNumber: number): PatternTemplate {
    const findByName = (name: string) => this.patternTemplates.find(template => template.name === name)

    if (levelNumber === 15) {
      return findByName('wide-wave') ?? this.patternTemplates[0]
    }

    if (levelNumber === 14) {
      return findByName('triangle') ?? this.patternTemplates[0]
    }

    if (levelNumber >= 11 && levelNumber <= 13) {
      const assigned = this.advancedPatternAssignments.get(levelNumber)
      if (assigned) {
        return assigned
      }

      if (this.remainingAdvancedPatterns.length === 0) {
        this.remainingAdvancedPatterns = this.patternTemplates.filter(template => {
          return template.name !== 'wide-wave' && template.name !== 'triangle'
        })
      }

      const index = Math.floor(Math.random() * this.remainingAdvancedPatterns.length)
      const [selected] = this.remainingAdvancedPatterns.splice(index, 1)
      const template = selected ?? this.patternTemplates[0]
      this.advancedPatternAssignments.set(levelNumber, template)
      return template
    }

    return this.patternTemplates[Math.floor(Math.random() * this.patternTemplates.length)]
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
      doorPosition: this.randomDoorEdgePosition(choice.door),
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

  private randomDoorEdgePosition(edge: 'top' | 'bottom' | 'left' | 'right'): { x: number; y: number } {
    const clamp = (value: number) => Math.max(0, Math.min(this.gridSize - 2, value))

    switch (edge) {
      case 'top':
        return { x: clamp(this.randomCoordinate()), y: 0 }
      case 'bottom':
        return { x: clamp(this.randomCoordinate()), y: this.gridSize - 2 }
      case 'left':
        return { x: 0, y: clamp(this.randomCoordinate()) }
      case 'right':
        return { x: this.gridSize - 2, y: clamp(this.randomCoordinate()) }
      default:
        return { x: clamp(this.randomCoordinate()), y: this.gridSize - 2 }
    }
  }

  private markDoorArea(grid: Cell[][], doorPosition: { x: number; y: number }): { x: number; y: number } {
    const baseX = Math.max(0, Math.min(this.gridSize - 2, doorPosition.x))
    const baseY = Math.max(0, Math.min(this.gridSize - 2, doorPosition.y))

    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const x = baseX + dx
        const y = baseY + dy
        const row = grid[y]
        if (!row) continue

        const cell = row[x]
        if (cell) {
          cell.type = CellType.DOOR
        }
      }
    }

    return { x: baseX, y: baseY }
  }

  private randomCoordinate(): number {
    return Math.floor(Math.random() * this.gridSize)
  }

  private generateEnergyPositions(levelNumber: number, requiredEnergy: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = []
    const baseEnergyCount = Math.min(levelNumber, 3)
    const energyCount = Math.max(requiredEnergy, baseEnergyCount)

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

    for (let i = 0; i < voidCount; i++) {
      this.placeRandomObstacle(grid, CellType.VOID, startPosition, doorPosition, energyPositions)
    }

    for (let i = 0; i < snakeCount; i++) {
      this.placeRandomObstacle(grid, CellType.SNAKE, startPosition, doorPosition, energyPositions)
    }

    this.ensureMinimumHazards(grid, startPosition, doorPosition, energyPositions)
  }

  private placeRandomObstacle(
    grid: Cell[][],
    type: CellType,
    startPosition: { x: number; y: number },
    doorPosition: { x: number; y: number },
    energyPositions: { x: number; y: number }[],
    forbiddenPositions?: Set<string>
  ): boolean {
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
      grid[y][x].isPath = false
      return true
    }

    return false
  }

  private ensureMinimumHazards(
    grid: Cell[][],
    startPosition: { x: number; y: number },
    doorPosition: { x: number; y: number },
    energyPositions: { x: number; y: number }[],
    forbiddenPositions?: Set<string>
  ): void {
    const totalCells = this.gridSize * this.gridSize
    const forbiddenCount = forbiddenPositions?.size ?? 0
    const usableCells = Math.max(totalCells - forbiddenCount, 1)
    const target = Math.ceil(usableCells * 0.2)
    let current = this.countHazards(grid)

    let toggle = true
    let safetyCounter = 0
    const maxExtraAttempts = totalCells * 4

    while (current < target && safetyCounter < maxExtraAttempts) {
      const type = toggle ? CellType.VOID : CellType.SNAKE
      if (this.placeRandomObstacle(grid, type, startPosition, doorPosition, energyPositions, forbiddenPositions)) {
        current++
      }
      toggle = !toggle
      safetyCounter++
    }
  }

  private reinforcePatternPath(
    grid: Cell[][],
    path: { x: number; y: number }[],
    startPosition: { x: number; y: number },
    doorPosition: { x: number; y: number },
    energyPositions: { x: number; y: number }[]
  ): void {
    const energyKeys = new Set(energyPositions.map(pos => this.positionKey(pos)))
    const doorKeys = new Set<string>()

    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        doorKeys.add(this.positionKey({ x: doorPosition.x + dx, y: doorPosition.y + dy }))
      }
    }

    const startKey = this.positionKey(startPosition)

    path.forEach(pos => {
      const cell = grid[pos.y]?.[pos.x]
      if (!cell) return

      const key = this.positionKey(pos)
      cell.isPath = true

      if (doorKeys.has(key) || energyKeys.has(key) || key === startKey) {
        return
      }

      cell.type = CellType.SAFE
    })
  }

  private countHazards(grid: Cell[][]): number {
    let count = 0
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = grid[y][x]
        if (cell.type === CellType.VOID || cell.type === CellType.SNAKE) {
          count++
        }
      }
    }
    return count
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
