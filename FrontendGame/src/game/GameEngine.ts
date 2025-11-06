import { Application, Assets, Container, Graphics, Text, Texture, AnimatedSprite, Sprite } from 'pixi.js'
import { Spine } from '@esotericsoftware/spine-pixi-v8'
import { gsap } from 'gsap'
import { GameLevel, CellType, Command } from '../types/game'
const snakeFrameSources = Array.from({ length: 10 }, (_, index) =>
  new URL(`../assets/snake/Snake${index + 1}.png`, import.meta.url).href
)

const snakeTextureManifests = snakeFrameSources.map((src, index) => ({
  alias: `snake-frame-${index + 1}`,
  src,
}))

const createSnakeImages = (): HTMLImageElement[] => {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return []
  }

  return snakeFrameSources.map(src => {
    const image = new Image()
    image.src = src
    return image
  })
}

const doorFrameSources = Array.from({ length: 9 }, (_, index) =>
  new URL(`../assets/door/door${index + 1}.png`, import.meta.url).href
)

const doorTextureManifests = doorFrameSources.map((src, index) => ({
  alias: `door-frame-${index + 1}`,
  src,
}))

const SAFE_TILE_TEXTURE = new URL('../assets/images/backgrounds/secure1.png', import.meta.url).href
const VOID_TILE_TEXTURE = new URL('../assets/void/void1.png', import.meta.url).href
const ENERGY_TILE_TEXTURE = new URL('../assets/energy/energy1.png', import.meta.url).href

const baseTileTextureManifests = [
  { alias: 'tile-safe', src: SAFE_TILE_TEXTURE },
  { alias: 'tile-void', src: VOID_TILE_TEXTURE },
  { alias: 'tile-energy', src: ENERGY_TILE_TEXTURE },
]

const createDoorImages = (): HTMLImageElement[] => {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return []
  }

  return doorFrameSources.map(src => {
    const image = new Image()
    image.src = src
    return image
  })
}

const positionKey = (x: number, y: number): string => `${x},${y}`

type DoorCoverage = {
  mainKey: string | null
  overlayKeys: Set<string>
}

const computeDoorCoverage = (
  level: GameLevel | null | undefined,
  gridSize: number
): DoorCoverage => {
  const overlayKeys = new Set<string>()
  let mainKey: string | null = null

  let doorPosition = level?.doorPosition ?? null

  if (!doorPosition && level) {
    for (let y = 0; y < level.grid.length; y++) {
      for (let x = 0; x < level.grid[y].length; x++) {
        if (level.grid[y][x].type === CellType.DOOR) {
          doorPosition = { x, y }
          break
        }
      }
      if (doorPosition) break
    }
  }

  if (doorPosition) {
    const { x, y } = doorPosition
    mainKey = positionKey(x, y)

    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy

        if (nx >= gridSize || ny >= gridSize) continue

        if (dx === 0 && dy === 0) continue

        overlayKeys.add(positionKey(nx, ny))
      }
    }
  }

  return { mainKey, overlayKeys }
}

// Sistema de sprites avanzado con Canvas HTML5 nativo
class NativeCanvasRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private cellSize: number
  private gridSize: number
  private ninjaX: number = 0
  private ninjaY: number = 0
  private level: GameLevel | null = null
  private ninjaState: 'idle' | 'walking' | 'energized' | 'falling' | 'victory' = 'idle'
  private walkFrame: number = 0
  private energyLevel: number = 0
  private persistentEnergized = false
  private animationTime: number = 0
  private snakeImages: HTMLImageElement[] = createSnakeImages()
  private doorImages: HTMLImageElement[] = createDoorImages()
  private safeImage: HTMLImageElement | null = null
  private voidImage: HTMLImageElement | null = null
  private energyImage: HTMLImageElement | null = null
  private snakeFrameIndex: number = 0
  private doorFrameIndex: number = 0
  private snakeAnimationInterval: number | null = null
  private doorAnimationInterval: number | null = null
  private readonly snakeFrameIntervalMs = 100
  private readonly doorFrameIntervalMs = 500
  private doorCoverage: DoorCoverage = { mainKey: null, overlayKeys: new Set() }

  constructor(canvas: HTMLCanvasElement, gridSize: number, cellSize: number) {
    this.canvas = canvas
    this.gridSize = gridSize
    this.cellSize = cellSize
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('No se pudo obtener un contexto 2D del canvas para el renderer nativo.')
    }

    this.ctx = context
    this.canvas.width = this.gridSize * this.cellSize
    this.canvas.height = this.gridSize * this.cellSize
  }

  loadLevel(level: GameLevel): void {
    this.level = level
    this.ninjaX = level.startPosition.x
    this.ninjaY = level.startPosition.y
    this.doorCoverage = computeDoorCoverage(level, this.gridSize)
    this.persistentEnergized = false
    this.startSnakeAnimation()
    this.startDoorAnimation()
    this.render()
  }

  setNinjaPosition(x: number, y: number): void {
    this.ninjaX = x
    this.ninjaY = y
    this.render()
  }

  animateNinjaMovement(_fromX: number, _fromY: number, toX: number, toY: number): Promise<void> {
    return new Promise((resolve) => {
      const energized = this.persistentEnergized
      this.ninjaState = energized ? 'energized' : 'walking'
      if (!energized) {
        this.walkFrame = 0
      }

      gsap.to(this, {
        duration: 0.3,
        ease: "power2.inOut",
        ninjaX: toX,
        ninjaY: toY,
        onUpdate: () => this.render(),
        onComplete: () => {
          this.ninjaState = energized ? 'energized' : 'idle'
          resolve()
        }
      })
    })
  }

  animateEnergyCollection(): void {
    // Activar estado energizado
    this.ninjaState = 'energized'
    this.energyLevel = 100
    this.persistentEnergized = true

    // Efecto de partículas de energía
    const particles: Array<{ x: number, y: number, vx: number, vy: number, life: number }> = []

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      particles.push({
        x: this.ninjaX * this.cellSize + this.cellSize / 2,
        y: this.ninjaY * this.cellSize + this.cellSize / 2,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        life: 40
      })
    }

    const animateParticles = () => {
      this.render()

      // Dibujar partículas
      this.ctx.save()
      this.ctx.fillStyle = '#fbbf24'
      particles.forEach(particle => {
        this.ctx.beginPath()
        this.ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2)
        this.ctx.fill()

        particle.x += particle.vx
        particle.y += particle.vy
        particle.life--
      })
      this.ctx.restore()

      // Reducir energía gradualmente
      this.energyLevel -= 2

      // Continuar animación si hay partículas vivas o energía
      if (particles.some(p => p.life > 0) || this.energyLevel > 0) {
        requestAnimationFrame(animateParticles)
      } else {
        this.energyLevel = 0
        this.ninjaState = this.persistentEnergized ? 'energized' : 'idle'
      }
    }

    animateParticles()
  }

  animateFailure(type: 'void' | 'snake'): Promise<void> {
    return new Promise((resolve) => {
      this.persistentEnergized = false

      if (type === 'void') {
        // Animación de caída al vacío
        let rotation = 0
        let scale = 1
        let alpha = 1

        const animateFall = () => {
          this.render()

          // Dibujar ninja con efectos de caída
          this.ctx.save()
          this.ctx.translate(
            this.ninjaX * this.cellSize + this.cellSize / 2,
            this.ninjaY * this.cellSize + this.cellSize / 2
          )
          this.ctx.rotate(rotation)
          this.ctx.scale(scale, scale)
          this.ctx.globalAlpha = alpha

          this.drawNinja(0, 0)

          this.ctx.restore()

          // Actualizar valores
          rotation += 0.3
          scale -= 0.02
          alpha -= 0.02

          if (alpha > 0) {
            requestAnimationFrame(animateFall)
          } else {
            resolve()
          }
        }

        animateFall()
      } else {
        // Animación de mordida de serpiente
        let shakeX = 0
        let shakeCount = 0

        const animateShake = () => {
          this.render()

          // Dibujar ninja con temblor
          this.ctx.save()
          this.ctx.translate(
            this.ninjaX * this.cellSize + this.cellSize / 2 + shakeX,
            this.ninjaY * this.cellSize + this.cellSize / 2
          )

          this.drawNinja(0, 0)

          this.ctx.restore()

          // Actualizar temblor
          shakeX = Math.sin(shakeCount * 0.5) * 5
          shakeCount++

          if (shakeCount < 20) {
            requestAnimationFrame(animateShake)
          } else {
            this.ninjaState = 'idle'
            resolve()
          }
        }

        animateShake()
      }
    })
  }

  animateVictory(): Promise<void> {
    return new Promise((resolve) => {
      this.ninjaState = 'victory'

      // Efecto de luz expansiva
      let lightRadius = 0
      let lightAlpha = 1

      const animateLight = () => {
        this.render()

        // Dibujar luz de victoria
        this.ctx.save()
        this.ctx.globalAlpha = lightAlpha
        this.ctx.fillStyle = '#ffffff'
        this.ctx.beginPath()
        this.ctx.arc(
          this.ninjaX * this.cellSize + this.cellSize / 2,
          this.ninjaY * this.cellSize + this.cellSize / 2,
          lightRadius,
          0,
          Math.PI * 2
        )
        this.ctx.fill()
        this.ctx.restore()

        // Actualizar valores
        lightRadius += 8
        lightAlpha -= 0.05

        if (lightAlpha > 0) {
          requestAnimationFrame(animateLight)
        } else {
          this.ninjaState = this.persistentEnergized ? 'energized' : 'idle'
          resolve()
        }
      }

      animateLight()
    })
  }

  private drawNinja(x: number, y: number): void {
    this.ctx.save()
    this.ctx.translate(x, y)

    // Efectos de energía si está energizado
    if (this.ninjaState === 'energized' || this.energyLevel > 0 || this.persistentEnergized) {
      this.drawEnergyEffects()
    }

    // Dibujar sombra
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.beginPath()
    this.ctx.ellipse(0, 20, 8, 4, 0, 0, Math.PI * 2)
    this.ctx.fill()

    // Cuerpo del ninja (traje azul oscuro)
    this.ctx.fillStyle = '#1e3a8a'
    this.ctx.fillRect(-8, -15, 16, 25)

    // Capucha
    this.ctx.fillStyle = '#1e3a8a'
    this.ctx.beginPath()
    this.ctx.arc(0, -8, 12, Math.PI, 0)
    this.ctx.fill()

    // Cinta roja en la cabeza
    this.ctx.fillStyle = '#dc2626'
    this.ctx.fillRect(-10, -12, 20, 3)

    // Letra "N" en la cinta
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = 'bold 8px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('N', 0, -8)

    // Máscara/cara
    this.ctx.fillStyle = '#fbbf24'
    this.ctx.fillRect(-6, -6, 12, 8)

    // Ojos grandes y expresivos
    this.ctx.fillStyle = '#ffffff'
    this.ctx.beginPath()
    this.ctx.arc(-3, -2, 3, 0, Math.PI * 2)
    this.ctx.arc(3, -2, 3, 0, Math.PI * 2)
    this.ctx.fill()

    // Pupilas
    this.ctx.fillStyle = '#000000'
    this.ctx.beginPath()
    this.ctx.arc(-3, -2, 2, 0, Math.PI * 2)
    this.ctx.arc(3, -2, 2, 0, Math.PI * 2)
    this.ctx.fill()

    // Brillo en los ojos
    this.ctx.fillStyle = '#ffffff'
    this.ctx.beginPath()
    this.ctx.arc(-2.5, -2.5, 0.5, 0, Math.PI * 2)
    this.ctx.arc(3.5, -2.5, 0.5, 0, Math.PI * 2)
    this.ctx.fill()

    // Brazos con animación de caminar
    const armOffset = this.ninjaState === 'walking' ? Math.sin(this.walkFrame * 0.3) * 2 : 0
    this.ctx.fillStyle = '#1e3a8a'
    this.ctx.fillRect(-12, -5 + armOffset, 4, 12)
    this.ctx.fillRect(8, -5 - armOffset, 4, 12)

    // Piernas con animación de caminar
    const legOffset = this.ninjaState === 'walking' ? Math.sin(this.walkFrame * 0.3 + Math.PI) * 1.5 : 0
    this.ctx.fillStyle = '#1e3a8a'
    this.ctx.fillRect(-6, 8 + legOffset, 3, 8)
    this.ctx.fillRect(3, 8 - legOffset, 3, 8)

    // Cinturón rojo
    this.ctx.fillStyle = '#dc2626'
    this.ctx.fillRect(-8, 5, 16, 3)

    // Dispositivos en el cinturón
    this.ctx.fillStyle = '#22c55e'
    this.ctx.fillRect(-6, 6, 2, 2)
    this.ctx.fillStyle = '#3b82f6'
    this.ctx.fillRect(-3, 6, 2, 2)
    this.ctx.fillStyle = '#8b5cf6'
    this.ctx.fillRect(0, 6, 2, 2)
    this.ctx.fillStyle = '#6b7280'
    this.ctx.fillRect(3, 6, 2, 2)

    // Cables conectados
    this.ctx.strokeStyle = '#374151'
    this.ctx.lineWidth = 1
    this.ctx.beginPath()
    this.ctx.moveTo(-6, 8)
    this.ctx.lineTo(-6, 15)
    this.ctx.moveTo(-3, 8)
    this.ctx.lineTo(-3, 15)
    this.ctx.moveTo(0, 8)
    this.ctx.lineTo(0, 15)
    this.ctx.moveTo(3, 8)
    this.ctx.lineTo(3, 15)
    this.ctx.stroke()

    // Ratones en el suelo
    this.ctx.fillStyle = '#6b7280'
    this.ctx.fillRect(-15, 15, 4, 2)
    this.ctx.fillRect(-8, 18, 4, 2)
    this.ctx.fillRect(5, 16, 4, 2)

    this.ctx.restore()
  }

  private drawEnergyEffects(): void {
    // Rayos de energía alrededor del ninja
    this.ctx.strokeStyle = '#fbbf24'
    this.ctx.lineWidth = 2
    this.ctx.globalAlpha = 0.8

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + this.animationTime * 0.1
      const startRadius = 15
      const endRadius = 25 + Math.sin(this.animationTime * 0.2) * 5

      this.ctx.beginPath()
      this.ctx.moveTo(
        Math.cos(angle) * startRadius,
        Math.sin(angle) * startRadius
      )
      this.ctx.lineTo(
        Math.cos(angle) * endRadius,
        Math.sin(angle) * endRadius
      )
      this.ctx.stroke()
    }

    // Aura de energía
    this.ctx.strokeStyle = '#fbbf24'
    this.ctx.lineWidth = 3
    this.ctx.globalAlpha = 0.4
    this.ctx.beginPath()
    this.ctx.arc(0, 0, 20 + Math.sin(this.animationTime * 0.3) * 3, 0, Math.PI * 2)
    this.ctx.stroke()

    this.ctx.globalAlpha = 1
  }

  private startSnakeAnimation(): void {
    if (this.snakeImages.length === 0 || typeof window === 'undefined') {
      return
    }

    if (this.snakeAnimationInterval !== null) {
      return
    }

    this.snakeAnimationInterval = window.setInterval(() => {
      if (!this.level) {
        return
      }

      this.snakeFrameIndex = (this.snakeFrameIndex + 1) % this.snakeImages.length
      this.render()
    }, this.snakeFrameIntervalMs)
  }

  private stopSnakeAnimation(): void {
    if (this.snakeAnimationInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.snakeAnimationInterval)
      this.snakeAnimationInterval = null
    }
  }

  private startDoorAnimation(): void {
    if (this.doorImages.length === 0 || typeof window === 'undefined') {
      return
    }

    if (this.doorAnimationInterval !== null) {
      return
    }

    this.doorAnimationInterval = window.setInterval(() => {
      if (!this.level) {
        return
      }

      this.doorFrameIndex = (this.doorFrameIndex + 1) % this.doorImages.length
      this.render()
    }, this.doorFrameIntervalMs)
  }

  private stopDoorAnimation(): void {
    if (this.doorAnimationInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.doorAnimationInterval)
      this.doorAnimationInterval = null
    }
  }

  private drawTileImage(
    pixelX: number,
    pixelY: number,
    src: string,
    cacheKey: 'safeImage' | 'voidImage' | 'energyImage',
    width: number = this.cellSize,
    height: number = this.cellSize
  ): void {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      this.ctx.fillStyle = '#1f2937'
      this.ctx.fillRect(pixelX, pixelY, width, height)
      return
    }

    let cache: HTMLImageElement | null

    switch (cacheKey) {
      case 'safeImage':
        cache = this.safeImage
        break
      case 'voidImage':
        cache = this.voidImage
        break
      case 'energyImage':
        cache = this.energyImage
        break
    }

    if (!cache) {
      cache = new Image()
      cache.crossOrigin = 'anonymous'
      cache.onload = () => {
        // Forzar re-render cuando la imagen se carga
        if (this.level) {
          this.render()
        }
      }
      cache.onerror = () => {
        console.warn(`Error al cargar imagen: ${src}`)
        // El fallback se manejará en el render cuando cache.complete sea true pero naturalWidth sea 0
      }
      cache.src = src

      switch (cacheKey) {
        case 'safeImage':
          this.safeImage = cache
          break
        case 'voidImage':
          this.voidImage = cache
          break
        case 'energyImage':
          this.energyImage = cache
          break
      }
    }

    if (cache.complete && cache.naturalWidth > 0 && cache.naturalHeight > 0) {
      try {
        this.ctx.drawImage(cache, pixelX, pixelY, width, height)
      } catch (error) {
        console.warn(`Error al dibujar imagen ${cacheKey}:`, error)
        // Fallback a color sólido
        const fallbackColors: Record<string, string> = {
          safeImage: '#22c55e',
          voidImage: '#000000',
          energyImage: '#fbbf24',
        }
        this.ctx.fillStyle = fallbackColors[cacheKey] || '#1f2937'
        this.ctx.fillRect(pixelX, pixelY, width, height)
      }
    } else {
      // Si la imagen aún no está cargada, dibujar un placeholder
      const placeholderColors: Record<string, string> = {
        safeImage: '#1f2937',
        voidImage: '#0f172a',
        energyImage: '#1f2937',
      }
      this.ctx.fillStyle = placeholderColors[cacheKey] || '#1f2937'
      this.ctx.fillRect(pixelX, pixelY, width, height)
    }
  }

  private render(): void {
    if (!this.level) return

    const processedVoidCells = new Set<string>()
    const processedSnakeCells = new Set<string>()

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.level.grid[y][x]
        const pixelX = x * this.cellSize
        const pixelY = y * this.cellSize
        const key = positionKey(x, y)
        const isDoorMain = this.doorCoverage.mainKey === key
        const isDoorOverlay = this.doorCoverage.overlayKeys.has(key)

        if (cell.type === CellType.VOID) {
          if (processedVoidCells.has(key)) {
            continue
          }

          processedVoidCells.add(key)

          let drawWidth = this.cellSize
          let drawHeight = this.cellSize

          const rightKey = positionKey(x + 1, y)
          if (x + 1 < this.gridSize) {
            const rightCell = this.level.grid[y][x + 1]
            if (rightCell.type === CellType.VOID && !processedVoidCells.has(rightKey)) {
              drawWidth = this.cellSize * 2
              processedVoidCells.add(rightKey)
            }
          }

          if (drawWidth === this.cellSize && y + 1 < this.gridSize) {
            const bottomKey = positionKey(x, y + 1)
            const bottomCell = this.level.grid[y + 1][x]
            if (bottomCell.type === CellType.VOID && !processedVoidCells.has(bottomKey)) {
              drawHeight = this.cellSize * 2
              processedVoidCells.add(bottomKey)
            }
          }

          this.drawTileImage(pixelX, pixelY, VOID_TILE_TEXTURE, 'voidImage', drawWidth, drawHeight)
          this.ctx.strokeStyle = '#6b7280'
          this.ctx.lineWidth = 1
          this.ctx.strokeRect(pixelX, pixelY, drawWidth, drawHeight)
          continue
        }

        if (cell.type === CellType.SNAKE) {
          if (processedSnakeCells.has(key)) {
            continue
          }

          processedSnakeCells.add(key)

          let drawWidth = this.cellSize
          let drawHeight = this.cellSize

          const rightKey = positionKey(x + 1, y)
          if (x + 1 < this.gridSize) {
            const rightCell = this.level.grid[y][x + 1]
            if (rightCell.type === CellType.SNAKE && !processedSnakeCells.has(rightKey)) {
              drawWidth = this.cellSize * 2
              processedSnakeCells.add(rightKey)
            }
          }

          if (drawWidth === this.cellSize && y + 1 < this.gridSize) {
            const bottomKey = positionKey(x, y + 1)
            const bottomCell = this.level.grid[y + 1][x]
            if (bottomCell.type === CellType.SNAKE && !processedSnakeCells.has(bottomKey)) {
              drawHeight = this.cellSize * 2
              processedSnakeCells.add(bottomKey)
            }
          }

          this.ctx.fillStyle = '#0f172a'
          this.ctx.fillRect(pixelX, pixelY, drawWidth, drawHeight)

          if (this.snakeImages.length > 0) {
            const frame = this.snakeImages[this.snakeFrameIndex % this.snakeImages.length]
            if (!frame.complete) {
              frame.onload = () => this.render()
            } else {
              this.ctx.drawImage(frame, pixelX, pixelY, drawWidth, drawHeight)
            }
          }

          this.ctx.strokeStyle = '#1f2937'
          this.ctx.lineWidth = 1
          this.ctx.strokeRect(pixelX, pixelY, drawWidth, drawHeight)
          continue
        }

        const isDoorCell = isDoorMain || isDoorOverlay || cell.type === CellType.DOOR

        if (isDoorCell) {
          this.drawTileImage(pixelX, pixelY, SAFE_TILE_TEXTURE, 'safeImage')
        } else if (cell.type === CellType.SAFE) {
          this.drawTileImage(pixelX, pixelY, SAFE_TILE_TEXTURE, 'safeImage')
        } else if (cell.type === CellType.ENERGY) {
          this.drawTileImage(pixelX, pixelY, ENERGY_TILE_TEXTURE, 'energyImage')
        } else {
          const colors: Record<CellType, string> = {
            [CellType.SAFE]: '#22c55e',
            [CellType.ENERGY]: '#fbbf24',
            [CellType.VOID]: '#000000',
            [CellType.SNAKE]: '#134e4a',
            [CellType.DOOR]: '#374151',
          }

          this.ctx.fillStyle = colors[cell.type] || '#374151'
          this.ctx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize)
        }

        if (isDoorMain && this.doorImages.length > 0) {
          const frame = this.doorImages[this.doorFrameIndex % this.doorImages.length]
          if (!frame.complete) {
            frame.onload = () => this.render()
          } else {
            const drawSize = this.cellSize * 2
            this.ctx.drawImage(frame, pixelX, pixelY, drawSize, drawSize)
          }
        }

        if (!isDoorCell) {
          this.ctx.strokeStyle = '#6b7280'
          this.ctx.lineWidth = 1
          this.ctx.strokeRect(pixelX, pixelY, this.cellSize, this.cellSize)
        }

        if (this.level.hasGuideLines && cell.isPath) {
          this.ctx.strokeStyle = '#fbbf24'
          this.ctx.lineWidth = 3
          this.ctx.globalAlpha = 0.7

          const centerX = pixelX + this.cellSize / 2
          const centerY = pixelY + this.cellSize / 2

          this.ctx.beginPath()
          this.ctx.moveTo(pixelX + this.cellSize / 4, centerY)
          this.ctx.lineTo(pixelX + 3 * this.cellSize / 4, centerY)
          this.ctx.moveTo(centerX, pixelY + this.cellSize / 4)
          this.ctx.lineTo(centerX, pixelY + 3 * this.cellSize / 4)
          this.ctx.stroke()

          this.ctx.globalAlpha = 1
        }
      }
    }

    const ninjaPixelX = this.ninjaX * this.cellSize + this.cellSize / 2
    const ninjaPixelY = this.ninjaY * this.cellSize + this.cellSize / 2
    this.drawNinja(ninjaPixelX, ninjaPixelY)

    this.animationTime++
    if (this.ninjaState === 'walking') {
      this.walkFrame++
    }
  }

  destroy(): void {
    this.stopSnakeAnimation()
    this.stopDoorAnimation()
  }
}

type GameEngineOptions = {
  width?: number
  height?: number
  cellSize?: number
  gridSize?: number
}

export class GameEngine {
  private app: Application | NativeCanvasRenderer | null = null
  private readonly container: HTMLElement
  private canvasElement: HTMLCanvasElement
  private gameContainer: Container | null = null
  private gridContainer: Container | null = null
  private ninjaSprite: Container | null = null
  private ninjaSpine: Spine | null = null
  private spineLoadPromise: Promise<void> | null = null
  //private textures: Record<string, Texture> = {}
  private readonly cellSize: number
  private readonly gridSize: number
  private ninjaEnergized = false
  private ready = false
  private currentLevelData: GameLevel | null = null
  private guideOverlay: Graphics | null = null
  private guideVisible = false
  private snakeTextures: Texture[] = []
  private snakeTexturesPromise: Promise<void> | null = null
  private doorTextures: Texture[] = []
  private doorTexturesPromise: Promise<void> | null = null
  private safeTexture: Texture | null = null
  private voidTexture: Texture | null = null
  private energyTexture: Texture | null = null
  private baseTileTexturesPromise: Promise<void> | null = null
  private doorCoverage: DoorCoverage = { mainKey: null, overlayKeys: new Set() }

  constructor(container: HTMLElement, options?: GameEngineOptions) {
    this.container = container
    this.gridSize = options?.gridSize ?? 12

    const baseCellSize = options?.cellSize ?? 32
    this.cellSize = Math.round(baseCellSize * 1.25)

    const gameWidth = options?.width ?? this.gridSize * this.cellSize
    const gameHeight = options?.height ?? this.gridSize * this.cellSize

    this.canvasElement = document.createElement('canvas')
    this.canvasElement.width = gameWidth
    this.canvasElement.height = gameHeight
    this.canvasElement.style.width = `${gameWidth * 1.5}px`
    this.canvasElement.style.height = `${gameHeight * 1.5}px`
    this.canvasElement.style.imageRendering = 'pixelated'
    this.canvasElement.className = 'ninja-canvas'

    this.container.innerHTML = ''
    this.container.appendChild(this.canvasElement)

    void this.initializeRenderer(gameWidth, gameHeight)
  }

  private async initializeRenderer(width: number, height: number): Promise<void> {
    try {
      const app = new Application()
      await app.init({
        canvas: this.canvasElement,
        width,
        height,
        background: 0x22c55e,
        antialias: true,
        resolution: 1,
        powerPreference: 'high-performance',
      })

      this.app = app
      this.initializePixiScene()
      this.ready = true
    } catch (error) {
      console.warn('No fue posible inicializar PixiJS, usando renderer nativo.', error)
      this.switchToNativeRenderer()
      this.ready = true
    }
  }

  private get pixiApp(): Application | null {
    return this.app instanceof Application ? this.app : null
  }

  private get nativeRenderer(): NativeCanvasRenderer | null {
    return this.app instanceof NativeCanvasRenderer ? this.app : null
  }

  private initializePixiScene(): void {
    const app = this.pixiApp
    if (!app) return

    const gameContainer = new Container()
    const gridContainer = new Container()
    gridContainer.sortableChildren = true
    const ninjaSprite = this.createAdvancedNinjaSprite()

    app.stage.addChild(gameContainer)
    gameContainer.addChild(gridContainer)
    gameContainer.addChild(ninjaSprite)

    this.gameContainer = gameContainer
    this.gridContainer = gridContainer
    this.ninjaSprite = ninjaSprite

    void this.ensureSpineNinja()
    // Cargar texturas de celdas
    void this.loadTextures()
  }

  private switchToNativeRenderer(): void {
    const fallbackCanvas = document.createElement('canvas')
    const canvasSize = this.gridSize * this.cellSize
    fallbackCanvas.width = canvasSize
    fallbackCanvas.height = canvasSize
    fallbackCanvas.style.width = `${canvasSize * 1.5}px`
    fallbackCanvas.style.height = `${canvasSize * 1.5}px`
    fallbackCanvas.style.imageRendering = 'pixelated'
    fallbackCanvas.className = this.canvasElement.className

    // Verificar si el canvas actual está en el DOM antes de reemplazarlo
    if (this.canvasElement.parentNode === this.container) {
      this.container.replaceChild(fallbackCanvas, this.canvasElement)
    } else {
      // Si el canvas no está en el DOM, limpiar el container y agregar el nuevo canvas
      this.container.innerHTML = ''
      this.container.appendChild(fallbackCanvas)
    }
    
    this.canvasElement = fallbackCanvas

    this.app = new NativeCanvasRenderer(this.canvasElement, this.gridSize, this.cellSize)
  }

  private async ensureSpineNinja(): Promise<void> {
    const app = this.pixiApp
    const ninjaSprite = this.ninjaSprite

    if (!app || !ninjaSprite || this.ninjaSpine) return

    if (!this.spineLoadPromise) {
      this.spineLoadPromise = (async () => {
        try {
          await Assets.load([
            { alias: 'spineSkeleton', src: '/spine/spineboy-pro.json' },
            { alias: 'spineAtlas', src: '/spine/spineboy-pma.atlas' },
            { alias: 'spineTexture', src: '/spine/spineboy-pma.png' },
          ])

          const spine = Spine.from({ skeleton: 'spineSkeleton', atlas: 'spineAtlas' })
          const scale = (this.cellSize / 120) * 0.3
          spine.scale.set(scale)
          spine.x = 0
          spine.y = this.cellSize / 2

          spine.state.setAnimation(0, 'idle', true)

          this.ninjaSpine = spine
          ninjaSprite.removeChildren()
          ninjaSprite.addChild(spine)
        } catch (error) {
          console.warn('No se pudo cargar Spine, usando sprite manual:', error)
        }
      })()
    }

    await this.spineLoadPromise
  }


  private playNinjaAnimation(name: string, loop = true, force = false): void {
    const spine = this.ninjaSpine
    if (!spine) return

    const current = spine.state.getCurrent(0)
    if (!force && current?.animation?.name === name) return

    spine.state.setAnimation(0, name, loop)
  }

  private createAdvancedNinjaSprite(): Container {
    const container = new Container()

    const shadow = new Graphics()
    shadow.fill({ color: 0x000000, alpha: 0.3 }).ellipse(0, this.cellSize / 2 - 4, this.cellSize * 0.3, this.cellSize * 0.12).fill()
    container.addChild(shadow)

    const body = new Graphics()
    body.fill({ color: 0x1e3a8a }).rect(-8, -15, 16, 25).fill()
    body.fill({ color: 0x1e3a8a }).rect(-12, -22, 24, 12).fill()
    body.fill({ color: 0xdc2626 }).rect(-10, -14, 20, 3).fill()
    body.fill({ color: 0xfbbf24 }).rect(-6, -6, 12, 8).fill()
    body.fill({ color: 0xffffff }).circle(-3, -2, 3).fill()
    body.fill({ color: 0xffffff }).circle(3, -2, 3).fill()
    body.fill({ color: 0x000000 }).circle(-3, -2, 1.5).fill()
    body.fill({ color: 0x000000 }).circle(3, -2, 1.5).fill()
    body.fill({ color: 0xffffff }).circle(-2.2, -3, 0.6).fill()
    body.fill({ color: 0xffffff }).circle(3.2, -3, 0.6).fill()
    body.fill({ color: 0x1e3a8a }).rect(-12, -4, 4, 12).fill()
    body.fill({ color: 0x1e3a8a }).rect(8, -4, 4, 12).fill()
    body.fill({ color: 0x1e3a8a }).rect(-6, 8, 3, 8).fill()
    body.fill({ color: 0x1e3a8a }).rect(3, 8, 3, 8).fill()
    body.fill({ color: 0xdc2626 }).rect(-8, 5, 16, 3).fill()
    body.fill({ color: 0x22c55e }).rect(-6, 7, 2, 2).fill()
    body.fill({ color: 0x3b82f6 }).rect(-3, 7, 2, 2).fill()
    body.fill({ color: 0x8b5cf6 }).rect(0, 7, 2, 2).fill()
    body.fill({ color: 0x6b7280 }).rect(3, 7, 2, 2).fill()
    body.fill({ color: 0x6b7280 }).rect(-15, 16, 4, 2).fill()
    body.fill({ color: 0x6b7280 }).rect(-8, 19, 4, 2).fill()
    body.fill({ color: 0x6b7280 }).rect(5, 17, 4, 2).fill()

    container.addChild(body)

    const emblem = new Text({
      text: 'N',
      style: { fontFamily: 'Arial', fontSize: 8, fontWeight: 'bold', fill: 0xffffff },
    })
    emblem.anchor.set(0.5)
    emblem.position.set(0, -8)
    container.addChild(emblem)

    return container
  }

  private createCellSprite(cellType: CellType, width = this.cellSize, height = this.cellSize): Container {
    const container = new Container()

    const fallbackColors: Record<CellType, number> = {
      [CellType.SAFE]: 0x1f2937,
      [CellType.ENERGY]: 0xfbbf24,
      [CellType.VOID]: 0x000000,
      [CellType.SNAKE]: 0x134e4a,
      [CellType.DOOR]: 0x1f2937,
    }

    const background = new Graphics()
    background
      .fill({ color: fallbackColors[cellType] ?? 0x374151 })
      .rect(0, 0, width, height)
      .fill()
    container.addChild(background)

    const tileTexture = (() => {
      if (cellType === CellType.SAFE || cellType === CellType.DOOR) {
        return this.safeTexture
      }
      if (cellType === CellType.VOID) {
        return this.voidTexture
      }
      if (cellType === CellType.ENERGY) {
        return this.energyTexture
      }
      return null
    })()

    if (tileTexture) {
      const tileSprite = new Sprite(tileTexture)
      tileSprite.width = width
      tileSprite.height = height
      container.addChild(tileSprite)
    }

    if (cellType !== CellType.DOOR) {
      const border = new Graphics()
      border.stroke({ color: 0x6b7280, width: 1 }).rect(0, 0, width, height).stroke()
      container.addChild(border)
    }

    if (cellType === CellType.SNAKE && this.snakeTextures.length > 0) {
      const sprite = new AnimatedSprite(this.snakeTextures)
      sprite.loop = true
      sprite.animationSpeed = 0.1
      sprite.play()
      sprite.width = width
      sprite.height = height
      container.addChild(sprite)
    }

    container.cacheAsBitmap = false

    return container
  }

  // Función no utilizada actualmente - comentada para evitar errores de TypeScript
  // private addEnergyGlow(target: Container): void {
  //   const glow = new Graphics()
  //   glow.stroke({ color: 0xfbbf24, width: 2, alpha: 0.8 }).circle(this.cellSize / 2, this.cellSize / 2, this.cellSize / 2 - 2).stroke()
  //   target.addChild(glow)
  // }

  private ensureSnakeTextures(): Promise<void> {
    if (this.snakeTextures.length > 0) {
      return Promise.resolve()
    }

    if (this.snakeTexturesPromise) {
      return this.snakeTexturesPromise
    }

    this.snakeTexturesPromise = (async () => {
      try {
        await Assets.load(snakeTextureManifests)
        this.snakeTextures = snakeTextureManifests.map(manifest => Texture.from(manifest.alias))
      } catch (error) {
        console.warn('No se pudieron cargar las texturas de serpiente:', error)
        this.snakeTextures = []
      } finally {
        this.snakeTexturesPromise = null
      }
    })()

    return this.snakeTexturesPromise
  }

  private ensureDoorTextures(): Promise<void> {
    if (this.doorTextures.length > 0) {
      return Promise.resolve()
    }

    if (this.doorTexturesPromise) {
      return this.doorTexturesPromise
    }

    this.doorTexturesPromise = (async () => {
      try {
        await Assets.load(doorTextureManifests)
        this.doorTextures = doorTextureManifests.map(manifest => Texture.from(manifest.alias))
      } catch (error) {
        console.warn('No se pudieron cargar las texturas de puerta:', error)
        this.doorTextures = []
      } finally {
        this.doorTexturesPromise = null
      }
    })()

    return this.doorTexturesPromise
  }

  private ensureBaseTileTextures(): Promise<void> {
    if (this.safeTexture && this.voidTexture && this.energyTexture) {
      return Promise.resolve()
    }

    if (this.baseTileTexturesPromise) {
      return this.baseTileTexturesPromise
    }

    this.baseTileTexturesPromise = (async () => {
      try {
        await Assets.load(baseTileTextureManifests)
        this.safeTexture = Texture.from(SAFE_TILE_TEXTURE)
        this.voidTexture = Texture.from(VOID_TILE_TEXTURE)
        this.energyTexture = Texture.from(ENERGY_TILE_TEXTURE)
      } catch (error) {
        console.warn('No se pudieron cargar las texturas base de losetas:', error)
        this.safeTexture = null
        this.voidTexture = null
        this.energyTexture = null
      } finally {
        this.baseTileTexturesPromise = null
      }
    })()

    return this.baseTileTexturesPromise
  }

  private loadTextures(): void {
    // Iniciar la precarga de texturas de forma no bloqueante
    void this.ensureSnakeTextures()
    void this.ensureDoorTextures()
    void this.ensureBaseTileTextures()
  }

  public async loadLevel(level: GameLevel): Promise<void> {
    // Esperar a que el renderer esté listo
    while (!this.ready) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    const native = this.nativeRenderer
    if (native) {
      native.loadLevel(level)
      this.ninjaEnergized = false
      return
    }

    void this.ensureSpineNinja()
    await this.ensureSnakeTextures()
    await this.ensureDoorTextures()
    await this.ensureBaseTileTextures()
    this.doorCoverage = computeDoorCoverage(level, this.gridSize)

    if (!this.pixiApp) {
      console.error('Renderer no disponible al cargar nivel')
      return
    }

    const gridContainer = this.gridContainer
    if (!gridContainer) {
      console.error('Renderer no disponible al cargar nivel')
      return
    }

    gridContainer.removeChildren()

    const doorOverlaySprites: AnimatedSprite[] = []
    const processedVoidCells = new Set<string>()
    const processedSnakeCells = new Set<string>()

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = level.grid[y][x]
        const key = positionKey(x, y)
        const isDoorMain = this.doorCoverage.mainKey === key
        const isDoorOverlay = this.doorCoverage.overlayKeys.has(key)

        if (cell.type === CellType.VOID) {
          if (processedVoidCells.has(key)) {
            continue
          }

          processedVoidCells.add(key)

          let drawWidth = this.cellSize
          let drawHeight = this.cellSize

          const rightKey = positionKey(x + 1, y)
          if (x + 1 < this.gridSize) {
            const rightCell = level.grid[y][x + 1]
            if (rightCell.type === CellType.VOID && !processedVoidCells.has(rightKey)) {
              drawWidth = this.cellSize * 2
              processedVoidCells.add(rightKey)
            }
          }

          if (drawWidth === this.cellSize && y + 1 < this.gridSize) {
            const bottomKey = positionKey(x, y + 1)
            const bottomCell = level.grid[y + 1][x]
            if (bottomCell.type === CellType.VOID && !processedVoidCells.has(bottomKey)) {
              drawHeight = this.cellSize * 2
              processedVoidCells.add(bottomKey)
            }
          }

          const voidSprite = this.createCellSprite(CellType.VOID, drawWidth, drawHeight)
          voidSprite.x = x * this.cellSize
          voidSprite.y = y * this.cellSize
          voidSprite.zIndex = 1
          gridContainer.addChild(voidSprite)
          continue
        }

        if (cell.type === CellType.SNAKE) {
          if (processedSnakeCells.has(key)) {
            continue
          }

          processedSnakeCells.add(key)

          let drawWidth = this.cellSize
          let drawHeight = this.cellSize

          const rightKey = positionKey(x + 1, y)
          if (x + 1 < this.gridSize) {
            const rightCell = level.grid[y][x + 1]
            if (rightCell.type === CellType.SNAKE && !processedSnakeCells.has(rightKey)) {
              drawWidth = this.cellSize * 2
              processedSnakeCells.add(rightKey)
            }
          }

          if (drawWidth === this.cellSize && y + 1 < this.gridSize) {
            const bottomKey = positionKey(x, y + 1)
            const bottomCell = level.grid[y + 1][x]
            if (bottomCell.type === CellType.SNAKE && !processedSnakeCells.has(bottomKey)) {
              drawHeight = this.cellSize * 2
              processedSnakeCells.add(bottomKey)
            }
          }

          const snakeSprite = this.createCellSprite(CellType.SNAKE, drawWidth, drawHeight)
          snakeSprite.x = x * this.cellSize
          snakeSprite.y = y * this.cellSize
          snakeSprite.zIndex = 2
          gridContainer.addChild(snakeSprite)
          continue
        }

        const renderType = cell.type === CellType.DOOR && isDoorOverlay ? CellType.SAFE : cell.type
        const cellSprite = this.createCellSprite(renderType)

        cellSprite.x = x * this.cellSize
        cellSprite.y = y * this.cellSize
        cellSprite.zIndex = isDoorMain ? 5 : 1

        if (isDoorMain) {
          const doorSprite = new AnimatedSprite(this.doorTextures)
          doorSprite.animationSpeed = 0.06
          doorSprite.loop = true
          doorSprite.play()
          doorSprite.width = this.cellSize * 2
          doorSprite.height = this.cellSize * 2
          doorSprite.x = x * this.cellSize
          doorSprite.y = y * this.cellSize
          doorSprite.zIndex = 6
          doorSprite.anchor.set(0, 0)
          doorOverlaySprites.push(doorSprite)
        } else if (cell.type === CellType.DOOR && isDoorOverlay) {
          cellSprite.zIndex = 4
        }

        gridContainer.addChild(cellSprite)
      }
    }

    doorOverlaySprites.forEach(sprite => {
      gridContainer.addChild(sprite)
    })

    gridContainer.sortChildren()

    this.ninjaEnergized = false
    this.setNinjaPosition(level.startPosition.x, level.startPosition.y)
    this.updateGuideOverlay(level)
    this.updateNinjaAnimationState()
  }

  private updateGuideOverlay(level: GameLevel, pathOverride?: { x: number; y: number }[]): void {
    this.currentLevelData = level

    const gridContainer = this.gridContainer
    const app = this.pixiApp
    if (!gridContainer || !app) return

    if (this.guideOverlay) {
      gridContainer.removeChild(this.guideOverlay)
      this.guideOverlay.destroy()
      this.guideOverlay = null
    }

    if (!level.hasGuideLines) {
      return
    }

    const path = pathOverride ?? this.buildGuidePath(level)
    if (path.length < 2) {
      return
    }

    const overlay = new Graphics()
    overlay.stroke({ color: 0xfbbf24, width: 3, alpha: 0.9 })

    const firstPoint = this.cellCenter(path[0])
    overlay.moveTo(firstPoint.x, firstPoint.y)

    for (let i = 1; i < path.length; i++) {
      const point = this.cellCenter(path[i])
      overlay.lineTo(point.x, point.y)
    }

    overlay.stroke()

    // Dibujar flecha en la punta directamente en el mismo Graphics (sin addChild)
    const lastPoint = this.cellCenter(path[path.length - 1])
    const prevPoint = this.cellCenter(path[path.length - 2])
    const dx = lastPoint.x - prevPoint.x
    const dy = lastPoint.y - prevPoint.y
    const len = Math.hypot(dx, dy) || 1
    const nx = dx / len
    const ny = dy / len
    const arrowLength = this.cellSize * 0.5
    const arrowWidth = this.cellSize * 0.4
    const baseX = lastPoint.x - nx * arrowLength
    const baseY = lastPoint.y - ny * arrowLength
    const leftX = baseX + (-ny) * (arrowWidth / 2)
    const leftY = baseY + nx * (arrowWidth / 2)
    const rightX = baseX - (-ny) * (arrowWidth / 2)
    const rightY = baseY - nx * (arrowWidth / 2)
    overlay.stroke({ color: 0xfbbf24, alpha: 0.9, width: 3 })
      .moveTo(lastPoint.x, lastPoint.y)
      .lineTo(leftX, leftY)
      .moveTo(lastPoint.x, lastPoint.y)
      .lineTo(rightX, rightY)
      .stroke()

    overlay.visible = this.guideVisible
    overlay.zIndex = 10

    gridContainer.addChild(overlay)
    this.guideOverlay = overlay
  }

  public previewGuideForCommands(commands: Command[]): void {
    const level = this.currentLevelData
    if (!level || !level.hasGuideLines) return

    const path = this.buildPathFromCommands(level, commands)
    this.updateGuideOverlay(level, path)
  }

  // Función no utilizada actualmente - comentada para evitar errores de TypeScript
  // private createArrow(tip: { x: number; y: number }, prev: { x: number; y: number }): Graphics {
  //   const arrow = new Graphics()
  //   const dx = tip.x - prev.x
  //   const dy = tip.y - prev.y
  //   const length = Math.hypot(dx, dy) || 1
  //   const nx = dx / length
  //   const ny = dy / length
  //   const arrowLength = this.cellSize * 0.5
  //   const arrowWidth = this.cellSize * 0.4
  //
  //   const baseX = tip.x - nx * arrowLength
  //   const baseY = tip.y - ny * arrowLength
  //   const leftX = baseX + (-ny) * (arrowWidth / 2)
  //   const leftY = baseY + nx * (arrowWidth / 2)
  //   const rightX = baseX - (-ny) * (arrowWidth / 2)
  //   const rightY = baseY - nx * (arrowWidth / 2)
  //
  //   arrow.fill({ color: 0xfbbf24, alpha: 0.9 })
  //     .moveTo(tip.x, tip.y)
  //     .lineTo(leftX, leftY)
  //     .lineTo(rightX, rightY)
  //     .fill()
  //
  //   return arrow
  // }

  private cellCenter(pos: { x: number; y: number }): { x: number; y: number } {
    return {
      x: pos.x * this.cellSize + this.cellSize / 2,
      y: pos.y * this.cellSize + this.cellSize / 2,
    }
  }

  private buildGuidePath(level: GameLevel): { x: number; y: number }[] {
    const segments: { x: number; y: number }[] = []
    let current = { ...level.startPosition }

    const targets = [...level.energyPositions]
    targets.push(level.doorPosition)

    segments.push({ ...current })

    for (const target of targets) {
      const path = this.buildStraightPath(current, target)
      segments.push(...path)
      current = { ...target }
    }

    return segments
  }

  private buildStraightPath(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = []
    const current = { ...start }

    while (current.x !== end.x) {
      current.x += current.x < end.x ? 1 : -1
      path.push({ ...current })
    }

    while (current.y !== end.y) {
      current.y += current.y < end.y ? 1 : -1
      path.push({ ...current })
    }

    return path
  }

  private buildPathFromCommands(level: GameLevel, commands: Command[]): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = []
    const current = { ...level.startPosition }

    path.push({ ...current })

    for (const command of commands) {
      for (let step = 0; step < command.steps; step++) {
        switch (command.direction) {
          case 'D': current.x += 1; break
          case 'I': current.x -= 1; break
          case 'S': current.y -= 1; break
          case 'B': current.y += 1; break
        }

        if (!this.isWalkable(level, current.x, current.y)) {
          return path
        }

        path.push({ ...current })
      }
    }

    return path
  }

  private isWalkable(level: GameLevel, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.gridSize || y >= this.gridSize) {
      return false
    }

    const cell = level.grid[y][x]
    if (!cell) return false

    return cell.type !== CellType.VOID && cell.type !== CellType.SNAKE
  }

  public setGuideVisibility(visible: boolean): void {
    this.guideVisible = visible
    if (this.guideOverlay) {
      this.guideOverlay.visible = visible
    }
  }

  public setNinjaPosition(x: number, y: number): void {
    const native = this.nativeRenderer
    if (native) {
      native.setNinjaPosition(x, y)
      return
    }

    const ninjaSprite = this.ninjaSprite
    if (ninjaSprite) {
      ninjaSprite.x = x * this.cellSize + this.cellSize / 2
      ninjaSprite.y = y * this.cellSize + this.cellSize / 2
    }
  }

  public async animateNinjaMovement(_fromX: number, _fromY: number, toX: number, toY: number): Promise<void> {
    await this.ensureSpineNinja()
    const animation = this.ninjaEnergized ? 'hoverboard' : 'walk'
    this.playNinjaAnimation(animation, true)

    return new Promise((resolve) => {
      const ninjaSprite = this.ninjaSprite
      if (!ninjaSprite) return resolve()

      gsap.to(ninjaSprite, {
        x: toX * this.cellSize + this.cellSize / 2,
        y: toY * this.cellSize + this.cellSize / 2,
        duration: 0.3,
        ease: 'power2.inOut',
        onComplete: () => {
          this.updateNinjaAnimationState()
          resolve()
        },
      })
    })
  }


  public animateEnergyCollection(): void {
    const native = this.nativeRenderer
    if (native) {
      native.animateEnergyCollection()
      this.ninjaEnergized = true
      return
    }

    void this.ensureSpineNinja()
    this.ninjaEnergized = true
    this.playNinjaAnimation('hoverboard', true, true)

    this.createEnergyEffects()

    const ninjaSprite = this.ninjaSprite
    if (!ninjaSprite) return

    gsap.to(ninjaSprite, {
      alpha: 0.7,
      duration: 0.1,
      yoyo: true,
      repeat: 5,
      ease: 'power2.inOut',
      onComplete: () => {
        ninjaSprite.alpha = 1
        this.updateNinjaAnimationState()
      },
    })
  }

  private createEnergyEffects(): void {
    const gameContainer = this.gameContainer
    const ninjaSprite = this.ninjaSprite
    if (!gameContainer || !ninjaSprite) return

    for (let i = 0; i < 8; i++) {
      const particle = new Graphics()
      particle.fill({ color: 0xfbbf24 }).rect(-2, -2, 4, 4).fill()

      particle.x = ninjaSprite.x
      particle.y = ninjaSprite.y

      gameContainer.addChild(particle)

      const angle = (i / 8) * Math.PI * 2
      const distance = 50

      gsap.to(particle, {
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 0.8,
        ease: 'power2.out',
        onComplete: () => {
          gameContainer.removeChild(particle)
        },
      })
    }
  }

  public animateFailure(type: 'void' | 'snake'): Promise<void> {
    const native = this.nativeRenderer
    if (native) {
      return native.animateFailure(type)
    }

    void this.ensureSpineNinja()
    this.ninjaEnergized = false

    const ninjaSprite = this.ninjaSprite
    if (!ninjaSprite) {
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      if (type === 'void') {
        gsap.to(ninjaSprite, {
          rotation: Math.PI * 4,
          scale: 0,
          alpha: 0,
          duration: 1.2,
          ease: 'power2.in',
          onComplete: () => {
            this.resetNinjaAppearance()
            this.playNinjaAnimation('idle', true, true)
            resolve()
          },
        })

        this.createVortexEffect()
      } else {
        const shakeTimeline = gsap.timeline()

        shakeTimeline
          .to(ninjaSprite, {
            x: ninjaSprite.x + 8,
            duration: 0.05,
            ease: 'power2.inOut',
          })
          .to(ninjaSprite, {
            x: ninjaSprite.x - 8,
            duration: 0.05,
            ease: 'power2.inOut',
          })
          .to(ninjaSprite, {
            x: ninjaSprite.x + 6,
            duration: 0.05,
            ease: 'power2.inOut',
          })
          .to(ninjaSprite, {
            x: ninjaSprite.x - 6,
            duration: 0.05,
            ease: 'power2.inOut',
          })
          .to(ninjaSprite, {
            x: ninjaSprite.x,
            duration: 0.1,
            ease: 'power2.out',
            onComplete: () => {
              this.resetNinjaAppearance()
              this.playNinjaAnimation('idle', true, true)
              resolve()
            },
          })
      }
    })
  }

  private resetNinjaAppearance(): void {
    const ninjaSprite = this.ninjaSprite
    if (!ninjaSprite) return

    ninjaSprite.alpha = 1
    ninjaSprite.rotation = 0
    ninjaSprite.scale.set(1)
    this.ninjaEnergized = false
    this.updateNinjaAnimationState()
  }

  private createVortexEffect(): void {
    const gameContainer = this.gameContainer
    const ninjaSprite = this.ninjaSprite
    if (!gameContainer || !ninjaSprite) return

    for (let i = 0; i < 5; i++) {
      const circle = new Graphics()
      circle.stroke({ color: 0x000000, width: 2, alpha: 0.8 - i * 0.15 }).circle(0, 0, 10 + i * 5).stroke()

      circle.x = ninjaSprite.x
      circle.y = ninjaSprite.y

      gameContainer.addChild(circle)

      gsap.to(circle, {
        rotation: Math.PI * 2,
        scale: 2,
        alpha: 0,
        duration: 1.2,
        ease: 'power2.in',
        onComplete: () => {
          gameContainer.removeChild(circle)
        },
      })
    }
  }

  public animateVictory(): Promise<void> {
    const native = this.nativeRenderer
    if (native) {
      return native.animateVictory()
    }

    void this.ensureSpineNinja()
    this.playNinjaAnimation('jump', false, true)

    const gameContainer = this.gameContainer
    const ninjaSprite = this.ninjaSprite
    if (!gameContainer || !ninjaSprite) {
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      const light = new Graphics()
      light.fill({ color: 0xffffff, alpha: 0.8 }).circle(0, 0, 10).fill()

      light.x = ninjaSprite.x
      light.y = ninjaSprite.y

      gameContainer.addChild(light)

      for (let i = 0; i < 20; i++) {
        const particle = new Graphics()
        particle.fill({ color: 0xffffff }).circle(0, 0, 2).fill()

        particle.x = ninjaSprite.x
        particle.y = ninjaSprite.y

        gameContainer.addChild(particle)

        const angle = (i / 20) * Math.PI * 2
        const distance = 80

        gsap.to(particle, {
          x: particle.x + Math.cos(angle) * distance,
          y: particle.y + Math.sin(angle) * distance,
          alpha: 0,
          scale: 0,
          duration: 1.5,
          ease: 'power2.out',
          onComplete: () => {
            gameContainer.removeChild(particle)
          },
        })
      }

      gsap.to(light, {
        scale: 8,
        alpha: 0,
        duration: 1.5,
        ease: 'power2.out',
        onComplete: () => {
          gameContainer.removeChild(light)
          this.updateNinjaAnimationState()
          resolve()
        },
      })
    })
  }

  public debugDump(): Record<string, unknown> | null {
    const native = this.nativeRenderer
    if (native) {
      return {
        rendererType: 'Native Canvas',
        isNativeRenderer: true,
        cellSize: this.cellSize,
        gridSize: this.gridSize,
      }
    }

    const app = this.pixiApp
    if (!app) {
      return null
    }

    const rendererType = (app.renderer as any)?.type ?? 'unknown'

    return {
      rendererType,
      isNativeRenderer: false,
      stageChildren: this.gameContainer?.children.length ?? 0,
      gridChildren: this.gridContainer?.children.length ?? 0,
      ninjaPosition: {
        x: this.ninjaSprite?.x ?? 0,
        y: this.ninjaSprite?.y ?? 0,
      },
    }
  }

  public destroy(): void {
    const native = this.nativeRenderer
    if (native) {
      native.destroy()
      return
    }

    const app = this.pixiApp
    if (app) {
      void app.destroy()
    }

    this.app = null
    this.gameContainer = null
    this.gridContainer = null
    this.ninjaSprite = null
    this.ninjaSpine = null
    this.spineLoadPromise = null
  }

  private updateNinjaAnimationState(): void {
    const native = this.nativeRenderer
    if (native) {
      return
    }

    const animation = this.ninjaEnergized ? 'hoverboard' : 'idle'
    this.playNinjaAnimation(animation, true, true)
  }

  // Fuerza un redibujado del grid preservando la posición actual del ninja (solo Pixi)
  public async refreshGridPreservePosition(): Promise<void> {
    const app = this.pixiApp
    if (!app) {
      // En renderer nativo el render es inmediato, no hacemos nada
      return
    }

    const level = this.currentLevelData
    const gridContainer = this.gridContainer
    const ninjaSprite = this.ninjaSprite
    if (!level || !gridContainer || !ninjaSprite) return

    // Calcular posición de celda actual del ninja
    const currentCellX = Math.round((ninjaSprite.x - this.cellSize / 2) / this.cellSize)
    const currentCellY = Math.round((ninjaSprite.y - this.cellSize / 2) / this.cellSize)

    // Reconstruir grid (reutiliza la lógica de loadLevel sin mover al ninja)
    gridContainer.removeChildren()

    const doorOverlaySprites: AnimatedSprite[] = []
    const processedVoidCells = new Set<string>()
    const processedSnakeCells = new Set<string>()

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = level.grid[y][x]
        const key = positionKey(x, y)
        const isDoorMain = this.doorCoverage.mainKey === key
        const isDoorOverlay = this.doorCoverage.overlayKeys.has(key)

        if (cell.type === CellType.VOID) {
          if (processedVoidCells.has(key)) {
            continue
          }
          processedVoidCells.add(key)

          let drawWidth = this.cellSize
          let drawHeight = this.cellSize

          const rightKey = positionKey(x + 1, y)
          if (x + 1 < this.gridSize) {
            const rightCell = level.grid[y][x + 1]
            if (rightCell.type === CellType.VOID && !processedVoidCells.has(rightKey)) {
              drawWidth = this.cellSize * 2
              processedVoidCells.add(rightKey)
            }
          }

          if (drawWidth === this.cellSize && y + 1 < this.gridSize) {
            const bottomKey = positionKey(x, y + 1)
            const bottomCell = level.grid[y + 1][x]
            if (bottomCell.type === CellType.VOID && !processedVoidCells.has(bottomKey)) {
              drawHeight = this.cellSize * 2
              processedVoidCells.add(bottomKey)
            }
          }

          const voidSprite = this.createCellSprite(CellType.VOID, drawWidth, drawHeight)
          voidSprite.x = x * this.cellSize
          voidSprite.y = y * this.cellSize
          voidSprite.zIndex = 1
          gridContainer.addChild(voidSprite)
          continue
        }

        if (cell.type === CellType.SNAKE) {
          if (processedSnakeCells.has(key)) {
            continue
          }
          processedSnakeCells.add(key)

          let drawWidth = this.cellSize
          let drawHeight = this.cellSize

          const rightKey = positionKey(x + 1, y)
          if (x + 1 < this.gridSize) {
            const rightCell = level.grid[y][x + 1]
            if (rightCell.type === CellType.SNAKE && !processedSnakeCells.has(rightKey)) {
              drawWidth = this.cellSize * 2
              processedSnakeCells.add(rightKey)
            }
          }

          if (drawWidth === this.cellSize && y + 1 < this.gridSize) {
            const bottomKey = positionKey(x, y + 1)
            const bottomCell = level.grid[y + 1][x]
            if (bottomCell.type === CellType.SNAKE && !processedSnakeCells.has(bottomKey)) {
              drawHeight = this.cellSize * 2
              processedSnakeCells.add(bottomKey)
            }
          }

          const snakeSprite = this.createCellSprite(CellType.SNAKE, drawWidth, drawHeight)
          snakeSprite.x = x * this.cellSize
          snakeSprite.y = y * this.cellSize
          snakeSprite.zIndex = 2
          gridContainer.addChild(snakeSprite)
          continue
        }

        const renderType = cell.type === CellType.DOOR && isDoorOverlay ? CellType.SAFE : cell.type
        const cellSprite = this.createCellSprite(renderType)
        cellSprite.x = x * this.cellSize
        cellSprite.y = y * this.cellSize
        cellSprite.zIndex = isDoorMain ? 5 : 1

        if (isDoorMain) {
          const doorSprite = new AnimatedSprite(this.doorTextures)
          doorSprite.animationSpeed = 0.06
          doorSprite.loop = true
          doorSprite.play()
          doorSprite.width = this.cellSize * 2
          doorSprite.height = this.cellSize * 2
          doorSprite.x = x * this.cellSize
          doorSprite.y = y * this.cellSize
          doorSprite.zIndex = 6
          doorSprite.anchor.set(0, 0)
          doorOverlaySprites.push(doorSprite)
        } else if (cell.type === CellType.DOOR && isDoorOverlay) {
          cellSprite.zIndex = 4
        }

        gridContainer.addChild(cellSprite)
      }
    }

    doorOverlaySprites.forEach(sprite => {
      gridContainer.addChild(sprite)
    })
    gridContainer.sortChildren()

    this.updateGuideOverlay(level)
    // Restaurar la posición actual del ninja
    this.setNinjaPosition(currentCellX, currentCellY)
    this.updateNinjaAnimationState()
  }
}
