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
        { direction: 'S', steps: 2 },
        { direction: 'I', steps: 2 },
        { direction: 'S', steps: 1 },
      ],
      repetitions: 4,
      energyIndices: [6, 16, 22],
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
  private fixedChallengeLevels: Record<number, {
    start: { x: number; y: number }
    door: { x: number; y: number }
    exactMoves: number
    energyPositions: { x: number; y: number }[]
    paths: { x: number; y: number }[][]
    wrongPaths: { x: number; y: number }[][]
  }> = {
    11: {
      start: { x: 0, y: 0 },
      door: { x: 9, y: 11 },
      exactMoves: 8,
      energyPositions: [
        { x: 1, y: 1 },
        { x: 10, y: 3 },
        { x: 4, y: 9 },
      ],
      paths: [
        // Path 1: D1,B1,D9,B2,I6,B6,D5,B2 (8 comandos - camino complicado con zigzag)
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 }, // Energía 1
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 4, y: 1 },
          { x: 5, y: 1 },
          { x: 6, y: 1 },
          { x: 7, y: 1 },
          { x: 8, y: 1 },
          { x: 9, y: 1 },
          { x: 10, y: 1 },
          { x: 10, y: 2 },
          { x: 10, y: 3 }, // Energía 2
          { x: 9, y: 3 },
          { x: 8, y: 3 },
          { x: 7, y: 3 },
          { x: 6, y: 3 },
          { x: 5, y: 3 },
          { x: 4, y: 3 },
          { x: 4, y: 4 },
          { x: 4, y: 5 },
          { x: 4, y: 6 },
          { x: 4, y: 7 },
          { x: 4, y: 8 },
          { x: 4, y: 9 }, // Energía 3
          { x: 5, y: 9 },
          { x: 6, y: 9 },
          { x: 7, y: 9 },
          { x: 8, y: 9 },
          { x: 9, y: 9 },
          { x: 9, y: 10 }, // B2
          { x: 9, y: 11 },
        ],
        // Path 2: D1,B1,D9,B7,I6,B1,D5,B2 (8 comandos - camino complicado alternativo)
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 }, // Energía 1
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 4, y: 1 },
          { x: 5, y: 1 },
          { x: 6, y: 1 },
          { x: 7, y: 1 },
          { x: 8, y: 1 },
          { x: 9, y: 1 },
          { x: 10, y: 1 },
          { x: 10, y: 2 },
          { x: 10, y: 3 }, // Energía 2
          { x: 10, y: 4 },
          { x: 10, y: 5 },
          { x: 10, y: 6 },
          { x: 10, y: 7 },
          { x: 10, y: 8 },
          { x: 9, y: 8 },
          { x: 8, y: 8 },
          { x: 7, y: 8 },
          { x: 6, y: 8 },
          { x: 5, y: 8 },
          { x: 4, y: 8 },
          { x: 4, y: 9 }, // Energía 3
          { x: 5, y: 9 },
          { x: 6, y: 9 },
          { x: 7, y: 9 },
          { x: 8, y: 9 },
          { x: 9, y: 9 },
          { x: 9, y: 10 }, // B2
          { x: 9, y: 11 },
        ],
      ],
      wrongPaths: [
        [
          { x: 0, y: 2 },
          { x: 0, y: 3 },
          { x: 1, y: 3 },
          { x: 1, y: 4 },
          { x: 1, y: 5 },
          { x: 2, y: 5 },
          { x: 3, y: 5 },
          { x: 3, y: 6 },
        ],
        [
          { x: 2, y: 0 },
          { x: 3, y: 0 },
          { x: 4, y: 0 },
          { x: 5, y: 0 },
          { x: 6, y: 0 },
          { x: 7, y: 0 },
          { x: 8, y: 0 },
          { x: 9, y: 0 },
        ],
        [
          { x: 2, y: 7 },
          { x: 3, y: 7 },
          { x: 3, y: 8 },
          { x: 2, y: 8 },
          { x: 2, y: 9 },
          { x: 3, y: 9 },
        ],
      ],
    },
    12: {
      start: { x: 1, y: 10 },
      door: { x: 6, y: 1 },
      exactMoves: 9,
      energyPositions: [
        { x: 3, y: 10 },
        { x: 1, y: 3 },
        { x: 9, y: 5 },
      ],
      paths: [
        // Path 1: D2,S7,I2,B2,D8,S2,B1,S2,I3,S2 (9 comandos - sin repeticiones consecutivas)
        [
          { x: 1, y: 10 },
          { x: 2, y: 10 },
          { x: 3, y: 10 }, // Energía 1
          { x: 3, y: 9 },
          { x: 3, y: 8 },
          { x: 3, y: 7 },
          { x: 3, y: 6 },
          { x: 3, y: 5 },
          { x: 3, y: 4 },
          { x: 3, y: 3 },
          { x: 2, y: 3 },
          { x: 1, y: 3 }, // Energía 2
          { x: 1, y: 4 },
          { x: 1, y: 5 },
          { x: 2, y: 5 },
          { x: 3, y: 5 },
          { x: 4, y: 5 },
          { x: 5, y: 5 },
          { x: 6, y: 5 },
          { x: 7, y: 5 },
          { x: 8, y: 5 },
          { x: 9, y: 5 }, // Energía 3
          { x: 9, y: 4 },
          { x: 9, y: 3 },
          { x: 8, y: 3 },
          { x: 7, y: 3 },
          { x: 6, y: 3 },
          { x: 6, y: 4 },
          { x: 6, y: 3 },
          { x: 6, y: 2 },
          { x: 6, y: 1 },
        ],
        // Path 2: D4,S5,I4,S3,D8,S2,I3,S2 (9 comandos - sin repeticiones consecutivas)
        [
          { x: 1, y: 10 },
          { x: 2, y: 10 },
          { x: 3, y: 10 }, // Energía 1
          { x: 4, y: 10 },
          { x: 5, y: 10 },
          { x: 5, y: 9 },
          { x: 5, y: 8 },
          { x: 5, y: 7 },
          { x: 5, y: 6 },
          { x: 5, y: 5 },
          { x: 4, y: 5 },
          { x: 3, y: 5 },
          { x: 2, y: 5 },
          { x: 1, y: 5 },
          { x: 1, y: 4 },
          { x: 1, y: 3 }, // Energía 2
          { x: 1, y: 2 },
          { x: 2, y: 2 },
          { x: 3, y: 2 },
          { x: 4, y: 2 },
          { x: 5, y: 2 },
          { x: 6, y: 2 },
          { x: 7, y: 2 },
          { x: 8, y: 2 },
          { x: 9, y: 2 },
          { x: 9, y: 3 },
          { x: 9, y: 4 },
          { x: 9, y: 5 }, // Energía 3
          { x: 9, y: 4 },
          { x: 9, y: 3 },
          { x: 8, y: 3 },
          { x: 7, y: 3 },
          { x: 6, y: 3 },
          { x: 6, y: 2 },
          { x: 6, y: 1 },
        ],
      ],
      wrongPaths: [
        [
          { x: 2, y: 9 },
          { x: 3, y: 9 },
          { x: 4, y: 9 },
          { x: 4, y: 8 },
          { x: 4, y: 7 },
          { x: 3, y: 7 },
          { x: 2, y: 7 },
        ],
        [
          { x: 0, y: 10 },
          { x: 0, y: 9 },
          { x: 0, y: 8 },
          { x: 0, y: 7 },
          { x: 0, y: 6 },
          { x: 0, y: 5 },
        ],
        [
          { x: 2, y: 4 },
          { x: 2, y: 3 },
          { x: 2, y: 2 },
          { x: 2, y: 1 },
          { x: 2, y: 0 },
        ],
      ],
    },
    13: {
      start: { x: 0, y: 11 },
      door: { x: 9, y: 0 },
      exactMoves: 10,
      energyPositions: [
        { x: 6, y: 10 },
        { x: 11, y: 6 },
        { x: 0, y: 3 },
      ],
      paths: [
        // Path 1: D6,S1,D5,S4,I11,S3,D9,S3 (8 comandos) -> necesita 10
        // Agregando pasos: D6,S1,D5,S4,I11,S3,D4,S1,D5,S3 (10 comandos)
        [
          { x: 0, y: 11 },
          { x: 1, y: 11 },
          { x: 2, y: 11 },
          { x: 3, y: 11 },
          { x: 4, y: 11 },
          { x: 5, y: 11 },
          { x: 6, y: 11 },
          { x: 6, y: 10 }, // Energía 1
          { x: 7, y: 10 },
          { x: 8, y: 10 },
          { x: 9, y: 10 },
          { x: 10, y: 10 },
          { x: 11, y: 10 },
          { x: 11, y: 9 },
          { x: 11, y: 8 },
          { x: 11, y: 7 },
          { x: 11, y: 6 }, // Energía 2
          { x: 10, y: 6 },
          { x: 9, y: 6 },
          { x: 8, y: 6 },
          { x: 7, y: 6 },
          { x: 6, y: 6 },
          { x: 5, y: 6 },
          { x: 4, y: 6 },
          { x: 3, y: 6 },
          { x: 2, y: 6 },
          { x: 1, y: 6 },
          { x: 0, y: 6 },
          { x: 0, y: 5 },
          { x: 0, y: 4 },
          { x: 0, y: 3 }, // Energía 3
          { x: 1, y: 3 },
          { x: 2, y: 3 },
          { x: 3, y: 3 },
          { x: 4, y: 3 },
          { x: 4, y: 2 },
          { x: 5, y: 2 },
          { x: 6, y: 2 },
          { x: 7, y: 2 },
          { x: 8, y: 2 },
          { x: 9, y: 2 },
          { x: 9, y: 1 },
          { x: 9, y: 0 },
        ],
        // Path 2: S8,D6,B7,I11,S3,D4,S1,D5,S3 (10 comandos - sin repeticiones consecutivas)
        [
          { x: 0, y: 11 },
          { x: 0, y: 10 },
          { x: 0, y: 9 },
          { x: 0, y: 8 },
          { x: 0, y: 7 },
          { x: 0, y: 6 },
          { x: 0, y: 5 },
          { x: 0, y: 4 },
          { x: 0, y: 3 }, // Energía 3
          { x: 1, y: 3 },
          { x: 2, y: 3 },
          { x: 3, y: 3 },
          { x: 4, y: 3 },
          { x: 5, y: 3 },
          { x: 6, y: 3 },
          { x: 6, y: 4 },
          { x: 6, y: 5 },
          { x: 6, y: 6 },
          { x: 6, y: 7 },
          { x: 6, y: 8 },
          { x: 6, y: 9 },
          { x: 6, y: 10 }, // Energía 1
          { x: 7, y: 10 },
          { x: 8, y: 10 },
          { x: 9, y: 10 },
          { x: 10, y: 10 },
          { x: 11, y: 10 },
          { x: 11, y: 9 },
          { x: 11, y: 8 },
          { x: 11, y: 7 },
          { x: 11, y: 6 }, // Energía 2
          { x: 10, y: 6 },
          { x: 9, y: 6 },
          { x: 9, y: 5 },
          { x: 9, y: 4 },
          { x: 9, y: 3 },
          { x: 9, y: 2 },
          { x: 8, y: 2 },
          { x: 9, y: 2 },
          { x: 9, y: 1 },
          { x: 9, y: 0 },
        ],
      ],
      wrongPaths: [
        [
          { x: 1, y: 11 },
          { x: 2, y: 10 },
          { x: 3, y: 9 },
          { x: 4, y: 8 },
          { x: 5, y: 7 },
          { x: 6, y: 6 },
        ],
        [
          { x: 11, y: 11 },
          { x: 11, y: 10 },
          { x: 11, y: 9 },
          { x: 10, y: 8 },
          { x: 9, y: 7 },
          { x: 8, y: 6 },
        ],
        [
          { x: 0, y: 2 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
          { x: 3, y: 2 },
          { x: 3, y: 1 },
          { x: 3, y: 0 },
        ],
      ],
    },
  }

  private advancedPatternAssignments = new Map<number, PatternTemplate>()
  private remainingAdvancedPatterns: PatternTemplate[] = []

  public generateLevel(levelNumber: number): GameLevel {
    const grid = this.createEmptyGrid()
    const hasGuideLines =
      levelNumber <= 8 ||
      levelNumber === 11 ||
      levelNumber === 12 ||
      levelNumber >= 14 && levelNumber <= 17
    const allowsLoops = levelNumber >= 14
    let timeLimit: number | undefined
    if (levelNumber >= 7 && levelNumber <= 8) {
      timeLimit = 120
    } else if (levelNumber >= 9 && levelNumber <= 13) {
      timeLimit = 180
    }

    const requiredEnergy = this.computeRequiredEnergy(levelNumber)
    const layout =
      levelNumber >= 14
        ? this.generatePatternLevel(levelNumber, grid, requiredEnergy)
        : levelNumber >= 11 && levelNumber <= 13
          ? this.generateFixedChallengeLevel(levelNumber, grid, requiredEnergy)
        : this.generateNormalLevelLayout(levelNumber, grid, requiredEnergy)

    const { startPosition, doorPosition, energyPositions, exactMoveCount } = layout

    return {
      level: levelNumber,
      grid,
      startPosition,
      doorPosition,
      energyPositions,
      requiredEnergy,
      timeLimit,
      hasGuideLines,
      allowsLoops,
      exactMoveCount,
    }
  }

  private generateFixedChallengeLevel(levelNumber: number, grid: Cell[][], requiredEnergy: number) {
    const config = this.fixedChallengeLevels[levelNumber]
    if (!config) {
      return this.generateNormalLevelLayout(levelNumber, grid, requiredEnergy)
    }

    // Inicializar grid: algunos espacios como SAFE, otros como VOID para hacer el nivel menos obvio
    const pathKeys = new Set<string>()
    config.paths.forEach(path => {
      path.forEach(pos => {
        pathKeys.add(this.positionKey(pos))
      })
    })

    // Porcentaje de espacios SAFE según el nivel (más SAFE = menos obvio)
    const safePercentage = levelNumber === 11 ? 0.4 : levelNumber === 12 ? 0.45 : 0.5

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = grid[y][x]
        const key = this.positionKey({ x, y })
        // Si está en un camino correcto, será SAFE (se marcará después)
        // Si no, hay un porcentaje de probabilidad de que sea SAFE (para hacer menos obvio)
        if (!pathKeys.has(key)) {
          cell.type = Math.random() < safePercentage ? CellType.SAFE : CellType.VOID
        } else {
          cell.type = CellType.VOID // Se cambiará a SAFE después
        }
        cell.isPath = false
      }
    }

    // Asegurar que la posición solicitada sea SAFE en el nivel 11
    if (levelNumber === 11) {
      const ensureSafe = (x: number, y: number) => {
        const cell = grid[y]?.[x]
        if (cell) {
          cell.type = CellType.SAFE
          cell.isPath = false
        }
      }
      ensureSafe(0, 1)
      ensureSafe(2, 0)
    }

    if (levelNumber === 12) {
      const ensureSafe = (x: number, y: number) => {
        const cell = grid[y]?.[x]
        if (cell) {
          cell.type = CellType.SAFE
          cell.isPath = false
        }
      }
      ensureSafe(1, 9)
      ensureSafe(2, 9)
    }

    if (levelNumber === 13) {
      const ensureSafe = (x: number, y: number) => {
        const cell = grid[y]?.[x]
        if (cell) {
          cell.type = CellType.SAFE
          cell.isPath = false
        }
      }
      ensureSafe(1, 10)
      ensureSafe(2, 10)
      ensureSafe(3, 10)
      ensureSafe(4, 10)
      ensureSafe(5, 10)
      ensureSafe(5, 9)
      ensureSafe(5, 9)
      ensureSafe(10, 0)
      ensureSafe(10, 1)
      ensureSafe(10, 2)
    }

    const isInsideGrid = (pos: { x: number; y: number }) =>
      pos.x >= 0 && pos.y >= 0 && pos.x < this.gridSize && pos.y < this.gridSize

    config.paths.forEach(path => {
      path.forEach(pos => {
        if (!isInsideGrid(pos)) return
        const cell = grid[pos.y]?.[pos.x]
        if (cell) {
          cell.type = CellType.SAFE
          cell.isPath = true
        }
      })
    })

    const startPosition = { ...config.start }
    if (isInsideGrid(startPosition)) {
      const startCell = grid[startPosition.y]?.[startPosition.x]
      if (startCell) {
        startCell.type = CellType.SAFE
        startCell.isPath = true
      }
    }

    const energyPositions: { x: number; y: number }[] = []
    config.energyPositions.forEach(pos => {
      if (!isInsideGrid(pos)) return
      const cell = grid[pos.y]?.[pos.x]
      if (cell) {
        cell.type = CellType.ENERGY
        cell.isPath = true
        energyPositions.push({ ...pos })
      }
    })

    const doorPosition = this.markDoorArea(grid, config.door)
    const doorCell = grid[doorPosition.y]?.[doorPosition.x]
    if (doorCell) {
      doorCell.isPath = true
    }

    if (config.wrongPaths?.length) {
      config.wrongPaths.forEach((path, pathIdx) => {
        path.forEach((pos, stepIdx) => {
          if (!isInsideGrid(pos)) return
          const cell = grid[pos.y]?.[pos.x]
          if (!cell) return
          if (cell.type === CellType.SAFE || cell.type === CellType.ENERGY || cell.type === CellType.DOOR) {
            return
          }
          const hazardType = (pathIdx + stepIdx) % 2 === 0 ? CellType.SNAKE : CellType.VOID
          cell.type = hazardType
          cell.isPath = false
        })
      })
    }

    if (energyPositions.length < requiredEnergy) {
      const filledKeys = new Set(energyPositions.map(pos => this.positionKey(pos)))
      const avoidKeys = new Set([
        this.positionKey(startPosition),
        this.positionKey(doorPosition),
      ])

      for (const path of config.paths) {
        for (const pos of path) {
          if (energyPositions.length >= requiredEnergy) break
          if (!isInsideGrid(pos)) continue
          const key = this.positionKey(pos)
          if (filledKeys.has(key) || avoidKeys.has(key)) continue
          const cell = grid[pos.y]?.[pos.x]
          if (cell && cell.type === CellType.SAFE) {
            cell.type = CellType.ENERGY
            energyPositions.push({ ...pos })
            filledKeys.add(key)
          }
        }
      }
    }

    this.ensureStartAccessibility(grid, startPosition)

    return { startPosition, doorPosition, energyPositions, exactMoveCount: config.exactMoves }
  }

  private computeRequiredEnergy(levelNumber: number): number {
    const specificEnergyByLevel: Record<number, number> = {
      1: 1,
      2: 2,
      3: 3,
      4: 1,
      5: 1,
      6: 2,
      7: 1,
      8: 2,
      9: 1,
      10: 2,
      11: 3,
      12: 3,
      13: 3,
    }

    if (Object.prototype.hasOwnProperty.call(specificEnergyByLevel, levelNumber)) {
      return specificEnergyByLevel[levelNumber]
    }

    return Math.min(levelNumber, 3)
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

    // Para los niveles 18, 19 y 20, agregar obstáculos estratégicos para bloquear rutas alternativas
    if (levelNumber === 18) {
      this.blockAlternativeRoutesLevel18(grid, path, pathKeys, startPosition, doorPosition, energyPositions)
    }
    if (levelNumber === 19) {
      this.blockAlternativeRoutesLevel19(grid, path, pathKeys, startPosition, doorPosition, energyPositions)
    }
    if (levelNumber === 20) {
      this.blockAlternativeRoutesLevel20(grid, path, pathKeys, startPosition, doorPosition, energyPositions)
    }

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

    this.ensureStartAccessibility(grid, startPosition)

    return { startPosition, doorPosition: normalizedDoorPosition, energyPositions, exactMoveCount: undefined }
  }

  private generatePatternLevel(levelNumber: number, grid: Cell[][], requiredEnergy: number) {
    const template = this.selectPatternTemplate(levelNumber)

    const path = this.buildPatternPath(template)
    if (path.length < 2) {
      return this.generateNormalLevelLayout(levelNumber, grid, requiredEnergy)
    }

    const startPosition = { ...path[0] }
    let originalDoorPosition = { ...path[path.length - 1] }
    
    // Para los niveles 18, 19 y 20, colocar el portal al final del path completo
    if (levelNumber === 18 || levelNumber === 19 || levelNumber === 20) {
      // El portal debe estar al final del path completo
      if (path.length > 0) {
        originalDoorPosition = { ...path[path.length - 1] }
      } else {
        // Fallback para nivel 18
        if (levelNumber === 18) {
          originalDoorPosition = { x: 5, y: 4 }
        } else if (levelNumber === 19) {
          // Fallback para nivel 19
          originalDoorPosition = { x: 5, y: 1 }
        } else {
          // Fallback para nivel 20
          originalDoorPosition = { x: 5, y: 0 }
        }
      }
    } else {
      // Para otros niveles, asegurar que el portal no esté en ninguna celda intermedia del path
      const pathKeys = new Set<string>()
      for (let i = 0; i < path.length - 1; i++) {
        pathKeys.add(this.positionKey(path[i]))
      }
      
      const finalPos = path[path.length - 1]
      const finalKey = this.positionKey(finalPos)
      
      // Si la posición final está en el path intermedio, mover el portal
      if (pathKeys.has(finalKey)) {
        // Intentar mover el portal a una posición adyacente que no esté en el path
        const adjacentPositions = [
          { x: finalPos.x + 1, y: finalPos.y },
          { x: finalPos.x - 1, y: finalPos.y },
          { x: finalPos.x, y: finalPos.y + 1 },
          { x: finalPos.x, y: finalPos.y - 1 },
          { x: finalPos.x + 1, y: finalPos.y + 1 },
          { x: finalPos.x - 1, y: finalPos.y - 1 },
          { x: finalPos.x + 1, y: finalPos.y - 1 },
          { x: finalPos.x - 1, y: finalPos.y + 1 },
        ]
        
        for (const adjPos of adjacentPositions) {
          if (adjPos.x >= 0 && adjPos.x < this.gridSize && adjPos.y >= 0 && adjPos.y < this.gridSize) {
            const adjKey = this.positionKey(adjPos)
            if (!pathKeys.has(adjKey) && adjKey !== this.positionKey(startPosition)) {
              originalDoorPosition = { ...adjPos }
              break
            }
          }
        }
      }
    }
    
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

    this.ensureStartAccessibility(grid, startPosition)

    return { startPosition, doorPosition, energyPositions, exactMoveCount: undefined }
  }

  private selectPatternTemplate(levelNumber: number): PatternTemplate {
    const findByName = (name: string) => this.patternTemplates.find(template => template.name === name)

    if (levelNumber === 20) {
      // Patrón: (d2,s3,i3,d2)x3 desde (3,9)
      // Path completo: 31 posiciones (0-30)
      // Portal final: (6,0)
      return {
        name: 'level20-specific',
        start: { x: 3, y: 9 },
        pattern: [
          { direction: 'D', steps: 2 },
          { direction: 'S', steps: 3 },
          { direction: 'I', steps: 3 },
          { direction: 'D', steps: 2 },
        ],
        repetitions: 3,
        energyIndices: [6, 18, 24],
      }
    }

    if (levelNumber === 19) {
      // Patrón: (i2,s2,d2,s1,i1)x3 desde (10,11)
      // Path completo: 25 posiciones (0-24)
      // Rep 1: 8 pasos -> termina en (9,8) - índice 8
      // Rep 2: 8 pasos -> termina en (8,5) - índice 16
      // Rep 3: 8 pasos -> termina en (7,2) - índice 24 (portal)
      // Energías distribuidas: índice 4=(8,9), índice 9=(8,8), índice 13=(8,6)
      return {
        name: 'level19-specific',
        start: { x: 10, y: 11 },
        pattern: [
          { direction: 'I', steps: 2 },
          { direction: 'S', steps: 2 },
          { direction: 'D', steps: 2 },
          { direction: 'S', steps: 1 },
          { direction: 'I', steps: 1 },
        ],
        repetitions: 3,
        energyIndices: [4, 14, 22],
      }
    }

    if (levelNumber === 18) {
      return {
        name: 'level18-specific',
        start: { x: 1, y: 8 },
        pattern: [
          { direction: 'D', steps: 3 },
          { direction: 'S', steps: 2 },
          { direction: 'I', steps: 1 },
          { direction: 'B', steps: 1 },
        ],
        repetitions: 4,
        energyIndices: [6, 14, 22],
      }
    }

    if (levelNumber === 17) {
      return findByName('triangle') ?? this.patternTemplates[0]
    }

    if (levelNumber === 16) {
      return findByName('ladder') ?? this.patternTemplates[0]
    }

    if (levelNumber >= 14 && levelNumber <= 15) {
      const assigned = this.advancedPatternAssignments.get(levelNumber)
      if (assigned) {
        return assigned
      }

      if (this.remainingAdvancedPatterns.length === 0 || levelNumber === 15) {
        this.remainingAdvancedPatterns = this.patternTemplates.filter(template => {
          if (levelNumber <= 15) {
            return template.name !== 'wide-wave' && template.name !== 'triangle' && template.name !== 'ladder'
          }
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
    const clamp = (value: number) => Math.max(0, Math.min(this.gridSize - 1, value))

    switch (edge) {
      case 'top':
        return { x: clamp(this.randomCoordinate()), y: 0 }
      case 'bottom':
        return { x: clamp(this.randomCoordinate()), y: this.gridSize - 1 }
      case 'left':
        return { x: 0, y: clamp(this.randomCoordinate()) }
      case 'right':
        return { x: this.gridSize - 1, y: clamp(this.randomCoordinate()) }
      default:
        return { x: clamp(this.randomCoordinate()), y: this.gridSize - 1 }
    }
  }

  private markDoorArea(grid: Cell[][], doorPosition: { x: number; y: number }): { x: number; y: number } {
    const doorX = Math.max(0, Math.min(this.gridSize - 1, doorPosition.x))
    const doorY = Math.max(0, Math.min(this.gridSize - 1, doorPosition.y))

    const row = grid[doorY]
    if (row) {
      const cell = row[doorX]
        if (cell) {
          cell.type = CellType.DOOR
      }
    }

    return { x: doorX, y: doorY }
  }

  private randomCoordinate(): number {
    return Math.floor(Math.random() * this.gridSize)
  }

  private computeEnergySpawnCount(levelNumber: number, requiredEnergy: number): number {
    if (levelNumber <= 10) {
      return requiredEnergy
    }

    const baseEnergyCount = Math.min(levelNumber, 3)
    return Math.max(requiredEnergy, baseEnergyCount)
  }

  private generateEnergyPositions(levelNumber: number, requiredEnergy: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = []
    const energyCount = this.computeEnergySpawnCount(levelNumber, requiredEnergy)

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

    doorKeys.add(this.positionKey(doorPosition))

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

  private ensureStartAccessibility(
    grid: Cell[][],
    startPosition: { x: number; y: number }
  ): void {
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]

    const isPassable = (cell: Cell | undefined): boolean => {
      if (!cell) return false
      return cell.type === CellType.SAFE || cell.type === CellType.ENERGY || cell.type === CellType.DOOR
    }

    const hasPassableNeighbor = directions.some(dir => {
      const nx = startPosition.x + dir.x
      const ny = startPosition.y + dir.y
      const row = grid[ny]
      if (!row) return false
      return isPassable(row[nx])
    })

    if (hasPassableNeighbor) {
      return
    }

    for (const dir of directions) {
      const nx = startPosition.x + dir.x
      const ny = startPosition.y + dir.y
      const row = grid[ny]
      if (!row) continue
      const cell = row[nx]
      if (!cell) continue
      if (cell.type === CellType.VOID || cell.type === CellType.SNAKE) {
        cell.type = CellType.SAFE
        cell.isPath = false
        break
      }
    }
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

  private blockAlternativeRoutesLevel18(
    grid: Cell[][],
    path: { x: number; y: number }[],
    pathKeys: Set<string>,
    startPosition: { x: number; y: number },
    doorPosition: { x: number; y: number },
    energyPositions: { x: number; y: number }[]
  ): void {
    // Bloquear rutas alternativas para el patrón del nivel 18
    // El patrón es: (d3,s2,i1,b1)x5
    // Necesitamos bloquear rutas que permitan otros patrones alternativos
    // Bloquear agresivamente como antes

    const startKey = this.positionKey(startPosition)
    const doorKey = this.positionKey(doorPosition)
    const energyKeys = new Set(energyPositions.map(pos => this.positionKey(pos)))

    // Bloquear celdas adyacentes al path que permitirían rutas alternativas
    const obstaclesToPlace: Array<{ x: number; y: number; type: CellType }> = []

    // Para cada celda del path, identificar y bloquear celdas adyacentes que permitirían atajos
    // Bloquear agresivamente como antes
    path.forEach((pos, index) => {
      const key = this.positionKey(pos)
      if (key === startKey || key === doorKey || energyKeys.has(key)) {
        return
      }

      // Direcciones adyacentes (derecha, izquierda, abajo, arriba)
      const adjacent = [
        { x: pos.x + 1, y: pos.y },     // Derecha
        { x: pos.x - 1, y: pos.y },     // Izquierda
        { x: pos.x, y: pos.y + 1 },     // Abajo
        { x: pos.x, y: pos.y - 1 },     // Arriba
      ]

      adjacent.forEach((adj, adjIndex) => {
        if (adj.x < 0 || adj.x >= this.gridSize || adj.y < 0 || adj.y >= this.gridSize) {
          return
        }

        const adjKey = this.positionKey(adj)
        if (pathKeys.has(adjKey)) {
          return // Es parte del path, no bloquear
        }

        const cell = grid[adj.y]?.[adj.x]
        if (cell && cell.type === CellType.SAFE) {
          // Bloquear agresivamente cerca del inicio
          if (index < 8) {
            // Cerca del inicio, bloquear todas las celdas adyacentes
            const obstacleType = (index + adjIndex) % 2 === 0 ? CellType.VOID : CellType.SNAKE
            obstaclesToPlace.push({ x: adj.x, y: adj.y, type: obstacleType })
          } else {
            // En otras partes, bloquear si está muy cerca del path
            const isCloseToPath = path.some(p => {
              const dist = Math.abs(p.x - adj.x) + Math.abs(p.y - adj.y)
              return dist <= 1 && p !== pos
            })
            if (isCloseToPath) {
              obstaclesToPlace.push({ x: adj.x, y: adj.y, type: CellType.VOID })
            }
          }
        }
      })
    })

    // Bloquear específicamente rutas que permitirían patrones alternativos
    // Bloquear celdas arriba del inicio que permitirían movimientos directos hacia arriba
    for (let i = 1; i <= 3; i++) {
      const aboveStart = { x: startPosition.x, y: startPosition.y - i }
      if (aboveStart.y >= 0) {
        const key = this.positionKey(aboveStart)
        if (!pathKeys.has(key)) {
          const cell = grid[aboveStart.y]?.[aboveStart.x]
          if (cell && cell.type === CellType.SAFE) {
            obstaclesToPlace.push({ x: aboveStart.x, y: aboveStart.y, type: CellType.VOID })
          }
        }
      }
    }

    // Bloquear celdas que permitirían patrones alternativos desde posiciones tempranas del path
    path.slice(0, 15).forEach((pos) => {
      // Bloquear celda a la derecha si no es parte del path
      const rightOfPath = { x: pos.x + 1, y: pos.y }
      if (rightOfPath.x < this.gridSize) {
        const rightKey = this.positionKey(rightOfPath)
        if (!pathKeys.has(rightKey)) {
          const cell = grid[rightOfPath.y]?.[rightOfPath.x]
          if (cell && cell.type === CellType.SAFE) {
            obstaclesToPlace.push({ x: rightOfPath.x, y: rightOfPath.y, type: CellType.VOID })
          }
        } else {
          // Si la celda a la derecha ES parte del path, bloquear las celdas arriba de ella
          // que permitirían hacer s2 directo (bloquear atajo)
          for (let i = 1; i <= 2; i++) {
            const aboveRight = { x: rightOfPath.x, y: rightOfPath.y - i }
            if (aboveRight.y >= 0) {
              const aboveKey = this.positionKey(aboveRight)
              if (!pathKeys.has(aboveKey)) {
                const cell = grid[aboveRight.y]?.[aboveRight.x]
                if (cell && cell.type === CellType.SAFE) {
                  obstaclesToPlace.push({ x: aboveRight.x, y: aboveRight.y, type: CellType.VOID })
                }
              }
            }
          }
        }
      }
    })

    // Aplicar los obstáculos (evitar duplicados)
    const placedKeys = new Set<string>()
    obstaclesToPlace.forEach(obstacle => {
      const key = this.positionKey(obstacle)
      if (!placedKeys.has(key) && !pathKeys.has(key) && key !== startKey && key !== doorKey && !energyKeys.has(key)) {
        const cell = grid[obstacle.y]?.[obstacle.x]
        if (cell && cell.type === CellType.SAFE) {
          cell.type = obstacle.type
          placedKeys.add(key)
        }
      }
    })
  }

  private blockAlternativeRoutesLevel19(
    grid: Cell[][],
    path: { x: number; y: number }[],
    pathKeys: Set<string>,
    startPosition: { x: number; y: number },
    doorPosition: { x: number; y: number },
    energyPositions: { x: number; y: number }[]
  ): void {
    // Bloquear rutas alternativas para el patrón del nivel 19
    // El patrón es: (d4,s2,i2,b2)x5
    const startKey = this.positionKey(startPosition)
    const doorKey = this.positionKey(doorPosition)
    const energyKeys = new Set(energyPositions.map(pos => this.positionKey(pos)))

    const obstaclesToPlace: Array<{ x: number; y: number; type: CellType }> = []

    // Bloquear celdas adyacentes al path que permitirían rutas alternativas
    path.forEach((pos, index) => {
      const key = this.positionKey(pos)
      if (key === startKey || key === doorKey || energyKeys.has(key)) {
        return
      }

      const adjacent = [
        { x: pos.x + 1, y: pos.y },
        { x: pos.x - 1, y: pos.y },
        { x: pos.x, y: pos.y + 1 },
        { x: pos.x, y: pos.y - 1 },
      ]

      adjacent.forEach((adj, adjIndex) => {
        if (adj.x < 0 || adj.x >= this.gridSize || adj.y < 0 || adj.y >= this.gridSize) {
          return
        }

        const adjKey = this.positionKey(adj)
        if (pathKeys.has(adjKey)) {
          return
        }

        const cell = grid[adj.y]?.[adj.x]
        if (cell && cell.type === CellType.SAFE) {
          // Bloquear agresivamente cerca del inicio
          if (index < 10) {
            const obstacleType = (index + adjIndex) % 2 === 0 ? CellType.VOID : CellType.SNAKE
            obstaclesToPlace.push({ x: adj.x, y: adj.y, type: obstacleType })
          } else {
            const isCloseToPath = path.some(p => {
              const dist = Math.abs(p.x - adj.x) + Math.abs(p.y - adj.y)
              return dist <= 1 && p !== pos
            })
            if (isCloseToPath) {
              obstaclesToPlace.push({ x: adj.x, y: adj.y, type: CellType.VOID })
            }
          }
        }
      })
    })

    // Bloquear celdas arriba del inicio
    for (let i = 1; i <= 3; i++) {
      const aboveStart = { x: startPosition.x, y: startPosition.y - i }
      if (aboveStart.y >= 0) {
        const key = this.positionKey(aboveStart)
        if (!pathKeys.has(key)) {
          const cell = grid[aboveStart.y]?.[aboveStart.x]
          if (cell && cell.type === CellType.SAFE) {
            obstaclesToPlace.push({ x: aboveStart.x, y: aboveStart.y, type: CellType.VOID })
          }
        }
      }
    }

    // Bloquear celdas que permitirían patrones alternativos desde posiciones tempranas del path
    path.slice(0, 18).forEach((pos) => {
      const rightOfPath = { x: pos.x + 1, y: pos.y }
      if (rightOfPath.x < this.gridSize) {
        const rightKey = this.positionKey(rightOfPath)
        if (!pathKeys.has(rightKey)) {
          const cell = grid[rightOfPath.y]?.[rightOfPath.x]
          if (cell && cell.type === CellType.SAFE) {
            obstaclesToPlace.push({ x: rightOfPath.x, y: rightOfPath.y, type: CellType.VOID })
          }
        } else {
          for (let i = 1; i <= 2; i++) {
            const aboveRight = { x: rightOfPath.x, y: rightOfPath.y - i }
            if (aboveRight.y >= 0) {
              const aboveKey = this.positionKey(aboveRight)
              if (!pathKeys.has(aboveKey)) {
                const cell = grid[aboveRight.y]?.[aboveRight.x]
                if (cell && cell.type === CellType.SAFE) {
                  obstaclesToPlace.push({ x: aboveRight.x, y: aboveRight.y, type: CellType.VOID })
                }
              }
            }
          }
        }
      }
    })

    // Aplicar los obstáculos (evitar duplicados)
    const placedKeys = new Set<string>()
    obstaclesToPlace.forEach(obstacle => {
      const key = this.positionKey(obstacle)
      if (!placedKeys.has(key) && !pathKeys.has(key) && key !== startKey && key !== doorKey && !energyKeys.has(key)) {
        const cell = grid[obstacle.y]?.[obstacle.x]
        if (cell && cell.type === CellType.SAFE) {
          cell.type = obstacle.type
          placedKeys.add(key)
        }
      }
    })
  }

  private blockAlternativeRoutesLevel20(
    grid: Cell[][],
    path: { x: number; y: number }[],
    pathKeys: Set<string>,
    startPosition: { x: number; y: number },
    doorPosition: { x: number; y: number },
    energyPositions: { x: number; y: number }[]
  ): void {
    // Bloquear rutas alternativas para el patrón del nivel 20
    // El patrón es: (d2,s3,i3,s2,d2)x3
    const startKey = this.positionKey(startPosition)
    const doorKey = this.positionKey(doorPosition)
    const energyKeys = new Set(energyPositions.map(pos => this.positionKey(pos)))

    const obstaclesToPlace: Array<{ x: number; y: number; type: CellType }> = []

    // Bloquear celdas adyacentes al path que permitirían rutas alternativas
    path.forEach((pos, index) => {
      const key = this.positionKey(pos)
      if (key === startKey || key === doorKey || energyKeys.has(key)) {
        return
      }

      const adjacent = [
        { x: pos.x + 1, y: pos.y },
        { x: pos.x - 1, y: pos.y },
        { x: pos.x, y: pos.y + 1 },
        { x: pos.x, y: pos.y - 1 },
      ]

      adjacent.forEach((adj, adjIndex) => {
        if (adj.x < 0 || adj.x >= this.gridSize || adj.y < 0 || adj.y >= this.gridSize) {
          return
        }

        const adjKey = this.positionKey(adj)
        if (pathKeys.has(adjKey)) {
          return
        }

        const cell = grid[adj.y]?.[adj.x]
        if (cell && cell.type === CellType.SAFE) {
          // Bloquear agresivamente cerca del inicio
          if (index < 12) {
            const obstacleType = (index + adjIndex) % 2 === 0 ? CellType.VOID : CellType.SNAKE
            obstaclesToPlace.push({ x: adj.x, y: adj.y, type: obstacleType })
          } else {
            const isCloseToPath = path.some(p => {
              const dist = Math.abs(p.x - adj.x) + Math.abs(p.y - adj.y)
              return dist <= 1 && p !== pos
            })
            if (isCloseToPath) {
              obstaclesToPlace.push({ x: adj.x, y: adj.y, type: CellType.VOID })
            }
          }
        }
      })
    })

    // Bloquear celdas arriba del inicio
    for (let i = 1; i <= 3; i++) {
      const aboveStart = { x: startPosition.x, y: startPosition.y - i }
      if (aboveStart.y >= 0) {
        const key = this.positionKey(aboveStart)
        if (!pathKeys.has(key)) {
          const cell = grid[aboveStart.y]?.[aboveStart.x]
          if (cell && cell.type === CellType.SAFE) {
            obstaclesToPlace.push({ x: aboveStart.x, y: aboveStart.y, type: CellType.VOID })
          }
        }
      }
    }

    // Bloquear celdas que permitirían patrones alternativos desde posiciones tempranas del path
    path.slice(0, 20).forEach((pos) => {
      const rightOfPath = { x: pos.x + 1, y: pos.y }
      if (rightOfPath.x < this.gridSize) {
        const rightKey = this.positionKey(rightOfPath)
        if (!pathKeys.has(rightKey)) {
          const cell = grid[rightOfPath.y]?.[rightOfPath.x]
          if (cell && cell.type === CellType.SAFE) {
            obstaclesToPlace.push({ x: rightOfPath.x, y: rightOfPath.y, type: CellType.VOID })
          }
        } else {
          for (let i = 1; i <= 2; i++) {
            const aboveRight = { x: rightOfPath.x, y: rightOfPath.y - i }
            if (aboveRight.y >= 0) {
              const aboveKey = this.positionKey(aboveRight)
              if (!pathKeys.has(aboveKey)) {
                const cell = grid[aboveRight.y]?.[aboveRight.x]
                if (cell && cell.type === CellType.SAFE) {
                  obstaclesToPlace.push({ x: aboveRight.x, y: aboveRight.y, type: CellType.VOID })
                }
              }
            }
          }
        }
      }
    })

    // Aplicar los obstáculos (evitar duplicados)
    const placedKeys = new Set<string>()
    obstaclesToPlace.forEach(obstacle => {
      const key = this.positionKey(obstacle)
      if (!placedKeys.has(key) && !pathKeys.has(key) && key !== startKey && key !== doorKey && !energyKeys.has(key)) {
        const cell = grid[obstacle.y]?.[obstacle.x]
        if (cell && cell.type === CellType.SAFE) {
          cell.type = obstacle.type
          placedKeys.add(key)
        }
      }
    })
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
    
    for (let i = 1; i <= 20; i++) {
      levels.push(this.generateLevel(i))
    }

    return levels
  }
}
