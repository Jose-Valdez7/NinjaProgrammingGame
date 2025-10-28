import * as PIXI from 'pixi.js'
import '@pixi/canvas-renderer'
import '@pixi/canvas-graphics'
import '@pixi/canvas-sprite'
import '@pixi/canvas-text'
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

  animateNinjaMovement(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    return new Promise((resolve) => {
      this.ninjaState = 'walking'
      this.walkFrame = 0
      
      const startX = fromX * this.cellSize + this.cellSize / 2
      const startY = fromY * this.cellSize + this.cellSize / 2
      const endX = toX * this.cellSize + this.cellSize / 2
      const endY = toY * this.cellSize + this.cellSize / 2

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
    // Limpiar canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}

export class GameEngine {
  private app: PIXI.Application | NativeCanvasRenderer | null = null
  private container: HTMLElement
  private canvasElement: HTMLCanvasElement
  private gameContainer!: PIXI.Container
  private gridContainer!: PIXI.Container
  private ninjaSprite!: PIXI.Container
  private cellSize: number = 32
  private gridSize: number = 15

  private get pixiApp(): PIXI.Application | null {
    return this.app instanceof PIXI.Application ? this.app : null
  }

  private get nativeRenderer(): NativeCanvasRenderer | null {
    return this.app instanceof NativeCanvasRenderer ? this.app : null
  }

  constructor(container: HTMLElement, options?: { width?: number; height?: number }) {
    if (!container) throw new Error('Contenedor no encontrado al inicializar el juego')

    this.container = container

    const gameWidth = options?.width || 480
    const gameHeight = options?.height || 480

    this.canvasElement = document.createElement('canvas')
    this.canvasElement.width = gameWidth
    this.canvasElement.height = gameHeight
    this.canvasElement.style.width = `${gameWidth}px`
    this.canvasElement.style.height = `${gameHeight}px`
    this.canvasElement.style.imageRendering = 'pixelated'
    this.canvasElement.className = 'ninja-canvas'

    this.container.innerHTML = ''
    this.container.appendChild(this.canvasElement)

    // Configuración robusta para PixiJS
    PIXI.settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = false

    try {
      this.app = new PIXI.Application({
        view: this.canvasElement,
        width: gameWidth,
        height: gameHeight,
        backgroundColor: 0x1a1a2e,
        antialias: true,
        autoDensity: false,
        resolution: 1,
        powerPreference: 'high-performance',
        sharedTicker: false,
      })

      this.initializePixiScene()
    } catch (pixiErr) {
      this.switchToNativeRenderer(gameWidth, gameHeight)
    }
  }

  private initializePixiScene(): void {
    const app = this.pixiApp
    if (!app) return

    this.gameContainer = new PIXI.Container()
    this.gridContainer = new PIXI.Container()

    app.stage.addChild(this.gameContainer)
    this.gameContainer.addChild(this.gridContainer)

    this.ninjaSprite = this.createAdvancedNinjaSprite()
    this.gameContainer.addChild(this.ninjaSprite)
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

  private createAdvancedNinjaSprite(): PIXI.Container {
    const ninjaContainer = new PIXI.Container()
    
    // Crear ninja usando solo rectángulos para máxima compatibilidad
    const ninjaBody = new PIXI.Graphics()
    
    // Cuerpo principal (azul oscuro)
    ninjaBody.beginFill(0x1e3a8a)
    ninjaBody.drawRect(-8, -15, 16, 25)
    ninjaBody.endFill()
    
    // Capucha
    ninjaBody.beginFill(0x1e3a8a)
    ninjaBody.drawRect(-12, -20, 24, 12)
    ninjaBody.endFill()
    
    // Cinta roja
    ninjaBody.beginFill(0xdc2626)
    ninjaBody.drawRect(-10, -12, 20, 3)
    ninjaBody.endFill()
    
    // Máscara amarilla
    ninjaBody.beginFill(0xfbbf24)
    ninjaBody.drawRect(-6, -6, 12, 8)
    ninjaBody.endFill()
    
    // Ojos blancos
    ninjaBody.beginFill(0xffffff)
    ninjaBody.drawRect(-4, -4, 3, 3)
    ninjaBody.drawRect(1, -4, 3, 3)
    ninjaBody.endFill()
    
    // Pupilas negras
    ninjaBody.beginFill(0x000000)
    ninjaBody.drawRect(-3, -3, 2, 2)
    ninjaBody.drawRect(2, -3, 2, 2)
    ninjaBody.endFill()
    
    // Brillo en ojos
    ninjaBody.beginFill(0xffffff)
    ninjaBody.drawRect(-2, -2, 1, 1)
    ninjaBody.drawRect(3, -2, 1, 1)
    ninjaBody.endFill()
    
    // Brazos
    ninjaBody.beginFill(0x1e3a8a)
    ninjaBody.drawRect(-12, -5, 4, 12)
    ninjaBody.drawRect(8, -5, 4, 12)
    ninjaBody.endFill()
    
    // Piernas
    ninjaBody.beginFill(0x1e3a8a)
    ninjaBody.drawRect(-6, 8, 3, 8)
    ninjaBody.drawRect(3, 8, 3, 8)
    ninjaBody.endFill()
    
    // Cinturón rojo
    ninjaBody.beginFill(0xdc2626)
    ninjaBody.drawRect(-8, 5, 16, 3)
    ninjaBody.endFill()
    
    // Dispositivos USB
    ninjaBody.beginFill(0x22c55e)
    ninjaBody.drawRect(-6, 6, 2, 2)
    ninjaBody.endFill()
    
    ninjaBody.beginFill(0x3b82f6)
    ninjaBody.drawRect(-3, 6, 2, 2)
    ninjaBody.endFill()
    
    ninjaBody.beginFill(0x8b5cf6)
    ninjaBody.drawRect(0, 6, 2, 2)
    ninjaBody.endFill()
    
    ninjaBody.beginFill(0x6b7280)
    ninjaBody.drawRect(3, 6, 2, 2)
    ninjaBody.endFill()
    
    // Ratones
    ninjaBody.beginFill(0x6b7280)
    ninjaBody.drawRect(-15, 15, 4, 2)
    ninjaBody.drawRect(-8, 18, 4, 2)
    ninjaBody.drawRect(5, 16, 4, 2)
    ninjaBody.endFill()
    
    ninjaContainer.addChild(ninjaBody)
    
    // Agregar texto "N" por separado
    const nText = new PIXI.Text('N', {
      fontFamily: 'Arial',
      fontSize: 8,
      fontWeight: 'bold',
      fill: 0xffffff,
      align: 'center'
    })
    nText.anchor.set(0.5)
    nText.x = 0
    nText.y = -8
    ninjaContainer.addChild(nText)
    
    // Guardar referencias para animaciones (usando el mismo objeto)
    ;(ninjaContainer as any).leftArm = ninjaBody
    ;(ninjaContainer as any).rightArm = ninjaBody
    ;(ninjaContainer as any).leftLeg = ninjaBody
    ;(ninjaContainer as any).rightLeg = ninjaBody
    
    return ninjaContainer
  }

  private createCellSprite(cellType: CellType): PIXI.Graphics {
    const graphics = new PIXI.Graphics()
    
    const colors: Record<CellType, number> = {
      [CellType.SAFE]: 0x22c55e,    // Verde
      [CellType.ENERGY]: 0xfbbf24,  // Amarillo
      [CellType.VOID]: 0x000000,    // Negro
      [CellType.SNAKE]: 0xdc2626,   // Rojo
      [CellType.DOOR]: 0x2563eb,    // Azul
    }

    // Fondo de la celda
    graphics.beginFill(colors[cellType] ?? 0x374151)
    graphics.drawRect(0, 0, this.cellSize, this.cellSize)
    graphics.endFill()
    
    // Borde
    graphics.lineStyle(1, 0x6b7280, 1)
    graphics.drawRect(0, 0, this.cellSize, this.cellSize)

    return graphics
  }

  public loadLevel(level: GameLevel): void {
    const native = this.nativeRenderer
    if (native) {
      native.loadLevel(level)
      return
    }

    const pixi = this.pixiApp
    if (!pixi) {
      console.error('Renderer no disponible al cargar nivel')
      return
    }

    // Limpiar grid anterior
    this.gridContainer.removeChildren()
    
    // Crear nuevo grid
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = level.grid[y][x]
        const cellSprite = this.createCellSprite(cell.type)
        
        cellSprite.x = x * this.cellSize
        cellSprite.y = y * this.cellSize
        
        // Efectos especiales
        if (cell.type === CellType.ENERGY) {
          this.addEnergyGlow(cellSprite)
        }
        
        if (level.hasGuideLines && cell.isPath) {
          this.addGuideLine(cellSprite)
        }
        
        this.gridContainer.addChild(cellSprite)
      }
    }
    
    this.setNinjaPosition(level.startPosition.x, level.startPosition.y)
  }

  private addEnergyGlow(graphics: PIXI.Graphics): void {
    // Simplificar el efecto de brillo para Canvas renderer
    graphics.lineStyle(2, 0xfbbf24, 0.8)
    graphics.drawCircle(this.cellSize / 2, this.cellSize / 2, this.cellSize / 2 - 2)
  }

  private addGuideLine(graphics: PIXI.Graphics): void {
    // Simplificar las líneas guía
    graphics.lineStyle(2, 0xfbbf24, 0.7)
    graphics.moveTo(this.cellSize / 4, this.cellSize / 2)
    graphics.lineTo(3 * this.cellSize / 4, this.cellSize / 2)
    graphics.moveTo(this.cellSize / 2, this.cellSize / 4)
    graphics.lineTo(this.cellSize / 2, 3 * this.cellSize / 4)
  }

  public setNinjaPosition(x: number, y: number): void {
    const native = this.nativeRenderer
    if (native) {
      native.setNinjaPosition(x, y)
      return
    }

    this.ninjaSprite.x = x * this.cellSize + this.cellSize / 2
    this.ninjaSprite.y = y * this.cellSize + this.cellSize / 2
  }

  public animateNinjaMovement(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    const native = this.nativeRenderer
    if (native) {
      return native.animateNinjaMovement(fromX, fromY, toX, toY)
    }

    return new Promise((resolve) => {
      const toPixelX = toX * this.cellSize + this.cellSize / 2
      const toPixelY = toY * this.cellSize + this.cellSize / 2

      // Animación de caminar con movimiento de brazos y piernas
      const leftArm = (this.ninjaSprite as any).leftArm
      const rightArm = (this.ninjaSprite as any).rightArm
      const leftLeg = (this.ninjaSprite as any).leftLeg
      const rightLeg = (this.ninjaSprite as any).rightLeg
      
      // Animación de brazos oscilantes
      gsap.to(leftArm, {
        rotation: 0.3,
        duration: 0.15,
        ease: "power2.inOut",
        yoyo: true,
        repeat: 1
      })
      
      gsap.to(rightArm, {
        rotation: -0.3,
        duration: 0.15,
        ease: "power2.inOut",
        yoyo: true,
        repeat: 1
      })
      
      // Animación de piernas alternadas
      gsap.to(leftLeg, {
        rotation: 0.2,
        duration: 0.15,
        ease: "power2.inOut",
        yoyo: true,
        repeat: 1
      })
      
      gsap.to(rightLeg, {
        rotation: -0.2,
        duration: 0.15,
        ease: "power2.inOut",
        yoyo: true,
        repeat: 1
      })
      
      // Movimiento principal
      gsap.to(this.ninjaSprite, {
        x: toPixelX,
        y: toPixelY,
        duration: 0.3,
        ease: "power2.inOut",
        onComplete: () => {
          // Resetear rotaciones
          leftArm.rotation = 0
          rightArm.rotation = 0
          leftLeg.rotation = 0
          rightLeg.rotation = 0
          resolve()
        }
      })
    })
  }

  public animateEnergyCollection(): void {
    const native = this.nativeRenderer
    if (native) {
      native.animateEnergyCollection()
      return
    }

    // Crear efectos de energía simples
    this.createEnergyEffects()
    
    // Efecto de brillo en el ninja
    gsap.to(this.ninjaSprite, {
      alpha: 0.7,
      duration: 0.1,
      yoyo: true,
      repeat: 5,
      ease: "power2.inOut",
      onComplete: () => {
        this.ninjaSprite.alpha = 1
      }
    })
  }

  private createEnergyEffects(): void {
    // Crear partículas de energía usando rectángulos simples
    for (let i = 0; i < 8; i++) {
      const particle = new PIXI.Graphics()
      particle.beginFill(0xfbbf24)
      particle.drawRect(-2, -2, 4, 4)
      particle.endFill()
      
      particle.x = this.ninjaSprite.x
      particle.y = this.ninjaSprite.y
      
      this.gameContainer.addChild(particle)
      
      const angle = (i / 8) * Math.PI * 2
      const distance = 50
      
      gsap.to(particle, {
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 0.8,
        ease: "power2.out",
        onComplete: () => {
          this.gameContainer.removeChild(particle)
        }
      })
    }
  }

  private createEnergyRays(): void {
    // Crear rayos individuales para evitar problemas con Canvas renderer
    for (let i = 0; i < 8; i++) {
      const ray = new PIXI.Graphics()
      ray.lineStyle(3, 0xfbbf24, 0.8)
      
      const angle = (i / 8) * Math.PI * 2
      const startRadius = 20
      const endRadius = 35
      
      ray.moveTo(
        Math.cos(angle) * startRadius,
        Math.sin(angle) * startRadius
      )
      ray.lineTo(
        Math.cos(angle) * endRadius,
        Math.sin(angle) * endRadius
      )
      
      ray.x = this.ninjaSprite.x
      ray.y = this.ninjaSprite.y
      
      this.gameContainer.addChild(ray)
      
      // Animación individual de cada rayo
      gsap.to(ray, {
        rotation: Math.PI * 2,
        alpha: 0,
      duration: 1,
        ease: "power2.out",
        onComplete: () => {
          this.gameContainer.removeChild(ray)
        }
      })
    }
  }

  public animateFailure(type: 'void' | 'snake'): Promise<void> {
    const native = this.nativeRenderer
    if (native) {
      return native.animateFailure(type)
    }

    return new Promise((resolve) => {
      if (type === 'void') {
        // Animación de caída al vacío con efectos dramáticos
        gsap.to(this.ninjaSprite, {
          rotation: Math.PI * 4,
          scale: 0,
          alpha: 0,
          duration: 1.2,
          ease: "power2.in",
          onComplete: () => {
            this.resetNinjaAppearance()
            resolve()
          }
        })
        
        // Crear efecto de vórtice
        this.createVortexEffect()
      } else {
        // Animación de mordida de serpiente con temblor intenso
        const shakeSequence = gsap.timeline()
        shakeSequence.to(this.ninjaSprite, {
          x: this.ninjaSprite.x + 8,
          duration: 0.05,
          ease: "power2.inOut"
        })
        .to(this.ninjaSprite, {
          x: this.ninjaSprite.x - 8,
          duration: 0.05,
          ease: "power2.inOut"
        })
        .to(this.ninjaSprite, {
          x: this.ninjaSprite.x + 6,
          duration: 0.05,
          ease: "power2.inOut"
        })
        .to(this.ninjaSprite, {
          x: this.ninjaSprite.x - 6,
          duration: 0.05,
          ease: "power2.inOut"
        })
        .to(this.ninjaSprite, {
          x: this.ninjaSprite.x,
          duration: 0.1,
          ease: "power2.out",
          onComplete: () => {
            this.resetNinjaAppearance()
            resolve()
          }
        })
      }
    })
  }

  private resetNinjaAppearance(): void {
    this.ninjaSprite.alpha = 1
    this.ninjaSprite.rotation = 0
    this.ninjaSprite.scale.set(1)
    // No remover children para evitar problemas con Canvas renderer
  }

  private createVortexEffect(): void {
    // Crear círculos concéntricos simples para evitar problemas con Canvas renderer
    for (let i = 0; i < 5; i++) {
      const circle = new PIXI.Graphics()
      circle.lineStyle(2, 0x000000, 0.8 - i * 0.15)
      circle.drawCircle(0, 0, 10 + i * 5)
      
      circle.x = this.ninjaSprite.x
      circle.y = this.ninjaSprite.y
      
      this.gameContainer.addChild(circle)
      
      // Animación individual de cada círculo
      gsap.to(circle, {
        rotation: Math.PI * 2,
        scale: 2,
        alpha: 0,
        duration: 1.2,
        ease: "power2.in",
        onComplete: () => {
          this.gameContainer.removeChild(circle)
        }
      })
    }
  }

  public animateVictory(): Promise<void> {
    const native = this.nativeRenderer
    if (native) {
      return native.animateVictory()
    }

    return new Promise((resolve) => {
      // Crear efecto de luz expansiva
      const light = new PIXI.Graphics()
      light.beginFill(0xffffff, 0.8)
      light.drawCircle(0, 0, 10)
      light.endFill()
      
      light.x = this.ninjaSprite.x
      light.y = this.ninjaSprite.y
      
      this.gameContainer.addChild(light)
      
      // Crear partículas de victoria
      for (let i = 0; i < 20; i++) {
        const particle = new PIXI.Graphics()
        particle.beginFill(0xffffff)
        particle.drawCircle(0, 0, 2)
        particle.endFill()
        
        particle.x = this.ninjaSprite.x
        particle.y = this.ninjaSprite.y
        
        this.gameContainer.addChild(particle)
        
        const angle = (i / 20) * Math.PI * 2
        const distance = 80
        
        gsap.to(particle, {
          x: particle.x + Math.cos(angle) * distance,
          y: particle.y + Math.sin(angle) * distance,
          alpha: 0,
          scale: 0,
          duration: 1.5,
          ease: "power2.out",
          onComplete: () => {
            this.gameContainer.removeChild(particle)
          }
        })
      }
      
      // Animación de la luz
      gsap.to(light, {
        scale: 8,
            alpha: 0,
        duration: 1.5,
        ease: "power2.out",
            onComplete: () => {
              this.gameContainer.removeChild(light)
              resolve()
            }
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
    if (!app) return null

    return {
      rendererType: app.renderer.type === PIXI.RENDERER_TYPE.WEBGL ? 'WebGL' : 'Canvas',
      isNativeRenderer: false,
      stageChildren: this.gameContainer ? this.gameContainer.children.length : 0,
      gridChildren: this.gridContainer ? this.gridContainer.children.length : 0,
      ninjaPosition: { x: this.ninjaSprite?.x ?? 0, y: this.ninjaSprite?.y ?? 0 }
    }
  }

  public destroy(): void {
    const native = this.nativeRenderer
    if (native) {
      native.destroy()
    } else {
      this.pixiApp?.destroy(true)
    }
  }
}
