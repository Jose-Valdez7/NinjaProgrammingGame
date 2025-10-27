import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import { GameLevel, CellType, GameState, Command } from '../types/game'

export class GameEngine {
  private app: PIXI.Application
  private gameContainer: PIXI.Container
  private gridContainer: PIXI.Container
  private ninjaSprite: PIXI.Sprite
  private cellSize: number = 32
  private gridSize: number = 15
  
  constructor(canvas: HTMLCanvasElement) {
    this.app = new PIXI.Application({
      view: canvas,
      width: 480, // 15 * 32
      height: 480, // 15 * 32
      backgroundColor: 0x1a1a2e,
      antialias: true,
    })

    this.gameContainer = new PIXI.Container()
    this.gridContainer = new PIXI.Container()
    this.app.stage.addChild(this.gameContainer)
    this.gameContainer.addChild(this.gridContainer)

    this.ninjaSprite = this.createNinjaSprite()
    this.gameContainer.addChild(this.ninjaSprite)
  }

  private createNinjaSprite(): PIXI.Sprite {
    const graphics = new PIXI.Graphics()
    graphics.beginFill(0x4f46e5) // Indigo color for ninja
    graphics.drawCircle(0, 0, 12)
    graphics.endFill()
    
    // Add ninja eyes
    graphics.beginFill(0xffffff)
    graphics.drawCircle(-4, -3, 2)
    graphics.drawCircle(4, -3, 2)
    graphics.endFill()
    
    graphics.beginFill(0x000000)
    graphics.drawCircle(-4, -3, 1)
    graphics.drawCircle(4, -3, 1)
    graphics.endFill()

    const texture = this.app.renderer.generateTexture(graphics)
    const sprite = new PIXI.Sprite(texture)
    sprite.anchor.set(0.5)
    
    return sprite
  }

  private createCellSprite(cellType: CellType): PIXI.Sprite {
    const graphics = new PIXI.Graphics()
    
    switch (cellType) {
      case CellType.SAFE:
        graphics.beginFill(0x22c55e) // Green
        break
      case CellType.ENERGY:
        graphics.beginFill(0xfbbf24) // Yellow
        break
      case CellType.VOID:
        graphics.beginFill(0x000000) // Black
        break
      case CellType.SNAKE:
        graphics.beginFill(0xdc2626) // Red
        break
      case CellType.DOOR:
        graphics.beginFill(0x2563eb) // Blue
        break
      default:
        graphics.beginFill(0x374151) // Gray
    }
    
    graphics.drawRect(0, 0, this.cellSize, this.cellSize)
    graphics.endFill()
    
    // Add border
    graphics.lineStyle(1, 0x6b7280)
    graphics.drawRect(0, 0, this.cellSize, this.cellSize)

    const texture = this.app.renderer.generateTexture(graphics)
    return new PIXI.Sprite(texture)
  }

  public loadLevel(level: GameLevel): void {
    // Clear existing grid
    this.gridContainer.removeChildren()
    
    // Create grid
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = level.grid[y][x]
        const cellSprite = this.createCellSprite(cell.type)
        
        cellSprite.x = x * this.cellSize
        cellSprite.y = y * this.cellSize
        
        // Add glow effect for energy cells
        if (cell.type === CellType.ENERGY) {
          this.addEnergyGlow(cellSprite)
        }
        
        // Add guide lines for early levels
        if (level.hasGuideLines && cell.isPath) {
          this.addGuideLine(cellSprite)
        }
        
        this.gridContainer.addChild(cellSprite)
      }
    }
    
    // Position ninja at start
    this.setNinjaPosition(level.startPosition.x, level.startPosition.y)
  }

  private addEnergyGlow(sprite: PIXI.Sprite): void {
    const glow = new PIXI.Graphics()
    glow.beginFill(0xfbbf24, 0.3)
    glow.drawCircle(this.cellSize / 2, this.cellSize / 2, this.cellSize / 2 + 5)
    glow.endFill()
    
    sprite.addChild(glow)
    
    // Animate glow
    gsap.to(glow, {
      alpha: 0.1,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut"
    })
  }

  private addGuideLine(sprite: PIXI.Sprite): void {
    const line = new PIXI.Graphics()
    line.lineStyle(3, 0xfbbf24, 0.7)
    line.moveTo(this.cellSize / 4, this.cellSize / 2)
    line.lineTo(3 * this.cellSize / 4, this.cellSize / 2)
    line.moveTo(this.cellSize / 2, this.cellSize / 4)
    line.lineTo(this.cellSize / 2, 3 * this.cellSize / 4)
    
    sprite.addChild(line)
  }

  public setNinjaPosition(x: number, y: number): void {
    this.ninjaSprite.x = x * this.cellSize + this.cellSize / 2
    this.ninjaSprite.y = y * this.cellSize + this.cellSize / 2
  }

  public animateNinjaMovement(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    return new Promise((resolve) => {
      const fromPixelX = fromX * this.cellSize + this.cellSize / 2
      const fromPixelY = fromY * this.cellSize + this.cellSize / 2
      const toPixelX = toX * this.cellSize + this.cellSize / 2
      const toPixelY = toY * this.cellSize + this.cellSize / 2

      gsap.to(this.ninjaSprite, {
        x: toPixelX,
        y: toPixelY,
        duration: 0.3,
        ease: "power2.inOut",
        onComplete: resolve
      })
    })
  }

  public animateEnergyCollection(): void {
    // Create energy particles
    for (let i = 0; i < 8; i++) {
      const particle = new PIXI.Graphics()
      particle.beginFill(0xfbbf24)
      particle.drawCircle(0, 0, 3)
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
        duration: 0.8,
        ease: "power2.out",
        onComplete: () => {
          this.gameContainer.removeChild(particle)
        }
      })
    }
    
    // Ninja glow effect
    this.addNinjaEnergyGlow()
  }

  private addNinjaEnergyGlow(): void {
    const glow = new PIXI.Graphics()
    glow.beginFill(0xfbbf24, 0.5)
    glow.drawCircle(0, 0, 20)
    glow.endFill()
    
    this.ninjaSprite.addChild(glow)
    
    gsap.to(glow, {
      alpha: 0.2,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut"
    })
  }

  public animateFailure(type: 'void' | 'snake'): Promise<void> {
    return new Promise((resolve) => {
      if (type === 'void') {
        // Falling animation
        gsap.to(this.ninjaSprite, {
          alpha: 0.3,
          rotation: Math.PI * 4,
          scale: 0.1,
          duration: 1,
          ease: "power2.in",
          onComplete: () => {
            this.resetNinjaAppearance()
            resolve()
          }
        })
      } else {
        // Snake bite animation
        gsap.to(this.ninjaSprite, {
          x: this.ninjaSprite.x + 10,
          duration: 0.1,
          repeat: 5,
          yoyo: true,
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
    this.ninjaSprite.removeChildren() // Remove glow effects
  }

  public animateVictory(): Promise<void> {
    return new Promise((resolve) => {
      // Victory light effect
      const light = new PIXI.Graphics()
      light.beginFill(0xffffff, 0.8)
      light.drawCircle(0, 0, 100)
      light.endFill()
      light.x = this.ninjaSprite.x
      light.y = this.ninjaSprite.y
      light.alpha = 0
      
      this.gameContainer.addChild(light)
      
      gsap.to(light, {
        alpha: 1,
        scale: 2,
        duration: 0.5,
        onComplete: () => {
          gsap.to(light, {
            alpha: 0,
            duration: 0.5,
            onComplete: () => {
              this.gameContainer.removeChild(light)
              resolve()
            }
          })
        }
      })
    })
  }

  public destroy(): void {
    this.app.destroy(true)
  }
}
