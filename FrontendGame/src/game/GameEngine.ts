import { Application, Assets, Container, Graphics, Text } from 'pixi.js'
import { Spine } from '@esotericsoftware/spine-pixi-v8'
import { gsap } from 'gsap'
import { GameLevel, CellType } from '../types/game'

// Sistema de sprites avanzado con Canvas HTML5 nativo
class NativeCanvasRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private cellSize: number = 32
  private gridSize: number = 15
  private ninjaX: number = 0
  private ninjaY: number = 0
  private level: GameLevel | null = null
  private ninjaState: 'idle' | 'walking' | 'energized' | 'falling' | 'victory' = 'idle'
  private walkFrame: number = 0
  private energyLevel: number = 0
  private animationTime: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('No se pudo obtener un contexto 2D del canvas para el renderer nativo.')
    }

    this.ctx = context
    this.canvas.width = 480
    this.canvas.height = 480
  }

  loadLevel(level: GameLevel): void {
    this.level = level
    this.ninjaX = level.startPosition.x
    this.ninjaY = level.startPosition.y
    this.render()
  }

  setNinjaPosition(x: number, y: number): void {
    this.ninjaX = x
    this.ninjaY = y
    this.render()
  }

  animateNinjaMovement(_fromX: number, _fromY: number, toX: number, toY: number): Promise<void> {
    return new Promise((resolve) => {
      this.ninjaState = 'walking'
      this.walkFrame = 0
      
      gsap.to(this, {
        duration: 0.3,
        ease: "power2.inOut",
        ninjaX: toX,
        ninjaY: toY,
        onUpdate: () => this.render(),
        onComplete: () => {
          this.ninjaState = 'idle'
          resolve()
        }
      })
    })
  }

  animateEnergyCollection(): void {
    // Activar estado energizado
    this.ninjaState = 'energized'
    this.energyLevel = 100
    
    // Efecto de partículas de energía
    const particles: Array<{x: number, y: number, vx: number, vy: number, life: number}> = []
    
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
        this.ninjaState = 'idle'
        this.energyLevel = 0
      }
    }
    
    animateParticles()
  }

  animateFailure(type: 'void' | 'snake'): Promise<void> {
    return new Promise((resolve) => {
      this.ninjaState = 'falling'
      
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
            this.ninjaState = 'idle'
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
          this.ninjaState = 'idle'
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
    if (this.ninjaState === 'energized' || this.energyLevel > 0) {
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

  private render(): void {
    if (!this.level) return

    // Limpiar canvas
    this.ctx.fillStyle = '#1a1a2e'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Dibujar grid
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.level.grid[y][x]
        const pixelX = x * this.cellSize
        const pixelY = y * this.cellSize

        // Color de fondo
        const colors: Record<CellType, string> = {
          [CellType.SAFE]: '#22c55e',
          [CellType.ENERGY]: '#fbbf24',
          [CellType.VOID]: '#000000',
          [CellType.SNAKE]: '#dc2626',
          [CellType.DOOR]: '#2563eb',
        }

        this.ctx.fillStyle = colors[cell.type] || '#374151'
        this.ctx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize)

        // Borde
        this.ctx.strokeStyle = '#6b7280'
        this.ctx.lineWidth = 1
        this.ctx.strokeRect(pixelX, pixelY, this.cellSize, this.cellSize)

        // Líneas guía para celdas de camino
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

    // Dibujar ninja completo
    const ninjaPixelX = this.ninjaX * this.cellSize + this.cellSize / 2
    const ninjaPixelY = this.ninjaY * this.cellSize + this.cellSize / 2
    
    this.drawNinja(ninjaPixelX, ninjaPixelY)

    // Actualizar animación
    this.animationTime++
    if (this.ninjaState === 'walking') {
      this.walkFrame++
    }
  }

  destroy(): void {
    // No se requieren limpiezas específicas, pero se deja el método para simetría
  }
}

type GameEngineOptions = {
  width?: number
  height?: number
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
  private readonly cellSize = 32
  private readonly gridSize = 15
  private currentNinjaX = 0
  private currentNinjaY = 0

  constructor(container: HTMLElement, options?: GameEngineOptions) {
    this.container = container

    const gameWidth = options?.width ?? 480
    const gameHeight = options?.height ?? 480

    this.canvasElement = document.createElement('canvas')
    this.canvasElement.width = gameWidth
    this.canvasElement.height = gameHeight
    this.canvasElement.style.width = `${gameWidth}px`
    this.canvasElement.style.height = `${gameHeight}px`
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
        background: 0x1a1a2e,
        antialias: true,
        resolution: 1,
        powerPreference: 'high-performance',
      })

      this.app = app
      this.initializePixiScene()
    } catch (error) {
      console.warn('No fue posible inicializar PixiJS, usando renderer nativo.', error)
      this.switchToNativeRenderer(width, height)
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
    const ninjaSprite = this.createAdvancedNinjaSprite()

    app.stage.addChild(gameContainer)
    gameContainer.addChild(gridContainer)
    gameContainer.addChild(ninjaSprite)

    this.gameContainer = gameContainer
    this.gridContainer = gridContainer
    this.ninjaSprite = ninjaSprite

    void this.ensureSpineNinja()
  }

  private switchToNativeRenderer(width: number, height: number): void {
    const fallbackCanvas = document.createElement('canvas')
    fallbackCanvas.width = width
    fallbackCanvas.height = height
    fallbackCanvas.style.width = `${width}px`
    fallbackCanvas.style.height = `${height}px`
    fallbackCanvas.style.imageRendering = 'pixelated'
    fallbackCanvas.className = this.canvasElement.className

    this.container.replaceChild(fallbackCanvas, this.canvasElement)
    this.canvasElement = fallbackCanvas

    this.app = new NativeCanvasRenderer(this.canvasElement)
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

          const spine = Spine.from({ skeleton: 'spineSkeleton', atlas: 'spineAtlas', texture: 'spineTexture' })
        const scale = this.cellSize / 120
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

  private createCellSprite(cellType: CellType): Graphics {
    const graphics = new Graphics()

    const colors: Record<CellType, number> = {
      [CellType.SAFE]: 0x22c55e,
      [CellType.ENERGY]: 0xfbbf24,
      [CellType.VOID]: 0x000000,
      [CellType.SNAKE]: 0xdc2626,
      [CellType.DOOR]: 0x2563eb,
    }

    graphics.fill({ color: colors[cellType] ?? 0x374151 }).rect(0, 0, this.cellSize, this.cellSize).fill()
    graphics.stroke({ color: 0x6b7280, width: 1 }).rect(0, 0, this.cellSize, this.cellSize).stroke()

    return graphics
  }

  public loadLevel(level: GameLevel): void {
    const native = this.nativeRenderer
    if (native) {
      native.loadLevel(level)
      return
    }

    void this.ensureSpineNinja()

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

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = level.grid[y][x]
        const cellSprite = this.createCellSprite(cell.type)

        cellSprite.x = x * this.cellSize
        cellSprite.y = y * this.cellSize

        if (cell.type === CellType.ENERGY) {
          this.addEnergyGlow(cellSprite)
        }

        if (level.hasGuideLines && cell.isPath) {
          this.addGuideLine(cellSprite)
        }

        gridContainer.addChild(cellSprite)
      }
    }

    this.setNinjaPosition(level.startPosition.x, level.startPosition.y)
  }

  private addEnergyGlow(graphics: Graphics): void {
    graphics.stroke({ color: 0xfbbf24, width: 2, alpha: 0.8 }).circle(this.cellSize / 2, this.cellSize / 2, this.cellSize / 2 - 2).stroke()
  }

  private addGuideLine(graphics: Graphics): void {
    graphics.stroke({ color: 0xfbbf24, width: 2, alpha: 0.7 }).moveTo(this.cellSize / 4, this.cellSize / 2).lineTo((3 * this.cellSize) / 4, this.cellSize / 2).moveTo(this.cellSize / 2, this.cellSize / 4).lineTo(this.cellSize / 2, (3 * this.cellSize) / 4).stroke()
  }

  public setNinjaPosition(x: number, y: number): void {
    this.currentNinjaX = x
    this.currentNinjaY = y

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

  public animateNinjaMovement(_fromX: number, _fromY: number, toX: number, toY: number): Promise<void> {
    const native = this.nativeRenderer
    if (native) {
      return native.animateNinjaMovement(_fromX, _fromY, toX, toY)
    }

    void this.ensureSpineNinja()
    this.playNinjaAnimation('walk', true, true)

    const ninjaSprite = this.ninjaSprite
    if (!ninjaSprite) {
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      const toPixelX = toX * this.cellSize + this.cellSize / 2
      const toPixelY = toY * this.cellSize + this.cellSize / 2

      gsap.to(ninjaSprite, {
        x: toPixelX,
        y: toPixelY,
        duration: 0.3,
        ease: 'power2.inOut',
        onComplete: () => {
          this.playNinjaAnimation('idle', true)
          resolve()
        },
      })
    })
  }

  public animateEnergyCollection(): void {
    const native = this.nativeRenderer
    if (native) {
      native.animateEnergyCollection()
      return
    }

    void this.ensureSpineNinja()
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
      },
    })

    gsap.delayedCall(1, () => this.playNinjaAnimation('idle', true))
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

  private createEnergyRays(): void {
    const gameContainer = this.gameContainer
    const ninjaSprite = this.ninjaSprite
    if (!gameContainer || !ninjaSprite) return

    for (let i = 0; i < 8; i++) {
      const ray = new Graphics()
      ray.stroke({ color: 0xfbbf24, width: 3, alpha: 0.8 }).moveTo(Math.cos((i / 8) * Math.PI * 2) * 20, Math.sin((i / 8) * Math.PI * 2) * 20).lineTo(Math.cos((i / 8) * Math.PI * 2) * 35, Math.sin((i / 8) * Math.PI * 2) * 35).stroke()

      ray.x = ninjaSprite.x
      ray.y = ninjaSprite.y

      gameContainer.addChild(ray)

      gsap.to(ray, {
        rotation: Math.PI * 2,
        alpha: 0,
        duration: 1,
        ease: 'power2.out',
        onComplete: () => {
          gameContainer.removeChild(ray)
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
          this.playNinjaAnimation('idle', true)
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
}
