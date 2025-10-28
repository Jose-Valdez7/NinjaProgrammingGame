declare module '@esotericsoftware/spine-pixi-v8' {
  import type { Container } from 'pixi.js'

  export interface SpineAnimationState {
    setAnimation(trackIndex: number, name: string, loop?: boolean): { timeScale: number }
    getCurrent(trackIndex: number): { animation: { name: string } | null } | null
  }

  export class Spine extends Container {
    skeleton: unknown
    state: SpineAnimationState
    autoUpdate: boolean
    spineData: unknown

    static from(options: { skeleton: string; atlas: string }): Spine
  }
}
