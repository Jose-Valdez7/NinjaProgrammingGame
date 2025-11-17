import { Command, LoopCommand } from '../types/game'

type ParseOptions = {
  requireCommaAfterCommand?: boolean
  level?: number
  startPosition?: { x: number; y: number }
  doorPosition?: { x: number; y: number }
}

type ParseState = {
  requireCommaAfterCommand: boolean
  commaError: boolean
  invalidToken: boolean
  invalidMessage?: string
}

export class CommandParser {
  private lastCommaError = false
  private lastInvalidToken = false
  private lastInvalidMessage: string | undefined

  public hasCommaSeparationError(): boolean {
    return this.lastCommaError
  }

  public parseCommands(
    input: string,
    options: ParseOptions = {},
    state?: ParseState
  ): (Command | LoopCommand)[] {
    const commands: (Command | LoopCommand)[] = []
    const cleanInput = input.replace(/\s/g, '').toUpperCase()

    const rootState: ParseState = state ?? {
      requireCommaAfterCommand: options.requireCommaAfterCommand ?? false,
      commaError: false,
      invalidToken: false,
      invalidMessage: undefined,
    }

    const requireComma = rootState.requireCommaAfterCommand

    let i = 0
    while (i < cleanInput.length) {
      const currentChar = cleanInput[i]

      if (currentChar === ',') {
        i++
        continue
      }

      // Check for loop pattern: (commands)xN
      if (currentChar === '(') {
        const loopResult = this.parseLoop(
          cleanInput,
          i,
          {
            requireCommaAfterCommand: requireComma,
            level: options.level,
          },
          rootState
        )
        if (loopResult) {
          commands.push(loopResult.command)
          i = loopResult.nextIndex
          this.ensureCommaSeparator(cleanInput, rootState, i)
          continue
        } else {
          rootState.invalidToken = true
          // Solo sobrescribir el mensaje si no hay uno más específico ya establecido
          if (!rootState.invalidMessage) {
            rootState.invalidMessage = 'Comando incorrecto.'
          }
        }
      } else {
        // Parse single command
        const commandResult = this.parseSingleCommand(cleanInput, i)
        if (commandResult) {
          commands.push(commandResult.command)
          i = commandResult.nextIndex
          this.ensureCommaSeparator(cleanInput, rootState, i)
          continue
        } else {
          rootState.invalidToken = true
          // Solo sobrescribir el mensaje si no hay uno más específico ya establecido
          if (!rootState.invalidMessage) {
            rootState.invalidMessage = 'Comando incorrecto.'
          }
        }
      }

      i++
    }

    if (!state) {
      this.lastCommaError = rootState.commaError
      this.lastInvalidToken = rootState.invalidToken
      this.lastInvalidMessage = rootState.invalidMessage
    }

    return commands
  }

  private parseSingleCommand(input: string, startIndex: number): { command: Command; nextIndex: number } | null {
    if (startIndex >= input.length) return null
    
    const direction = input[startIndex] as 'D' | 'I' | 'S' | 'B'
    if (!['D', 'I', 'S', 'B'].includes(direction)) return null
    
    let numberStr = ''
    let i = startIndex + 1
    
    while (i < input.length && /\d/.test(input[i])) {
      numberStr += input[i]
      i++
    }
    
    if (numberStr === '') return null
    
    const steps = parseInt(numberStr, 10)
    if (isNaN(steps) || steps <= 0) return null
    
    return {
      command: { direction, steps },
      nextIndex: i
    }
  }

  private parseLoop(
    input: string,
    startIndex: number,
    options: ParseOptions,
    state: ParseState
  ): { command: LoopCommand; nextIndex: number } | null {
    if (input[startIndex] !== '(') return null
    
    // Find matching closing parenthesis
    let depth = 0
    let i = startIndex
    let endParen = -1
    
    while (i < input.length) {
      if (input[i] === '(') depth++
      if (input[i] === ')') {
        depth--
        if (depth === 0) {
          endParen = i
          break
        }
      }
      i++
    }
    
    if (endParen === -1) return null
    
    // Extract commands inside parentheses
    const innerCommands = input.substring(startIndex + 1, endParen)
    const parsedInnerCommands = this.parseCommands(innerCommands, options, state)
    
    // Check for 'x' and repetition number
    i = endParen + 1
    if (i >= input.length || input[i] !== 'X') return null
    
    i++ // Skip 'X'
    let numberStr = ''
    
    while (i < input.length && /\d/.test(input[i])) {
      numberStr += input[i]
      i++
    }
    
    if (numberStr === '') return null
    
    const repetitions = parseInt(numberStr, 10)
    if (isNaN(repetitions) || repetitions <= 0) return null
    
    // Validar que para niveles 14-20, los bucles deben tener al menos 2 repeticiones
    if (options.level !== undefined && options.level >= 14 && options.level <= 20) {
      if (repetitions < 2) {
        state.invalidToken = true
        state.invalidMessage = 'Comando incorrecto: debe repetirse por lo menos 2 veces'
        return null
      }
    }
    
    // Convert parsed commands to Command type
    const commands: Command[] = []
    for (const cmd of parsedInnerCommands) {
      if ('direction' in cmd) {
        commands.push(cmd)
      } else {
        // Flatten nested loops (not supported in this implementation)
        commands.push(...cmd.commands)
      }
    }
    
    return {
      command: { commands, repetitions },
      nextIndex: i
    }
  }

  private ensureCommaSeparator(input: string, state: ParseState, nextIndex: number): void {
    if (!state.requireCommaAfterCommand) return
    if (nextIndex >= input.length) return

    const nextChar = input[nextIndex]
    if (nextChar === ',' || nextChar === ')' ) {
      return
    }

    state.commaError = true
  }

  private calculateFinalPosition(commands: (Command | LoopCommand)[], startPosition: { x: number; y: number }): { x: number; y: number } {
    const expanded = this.expandCommands(commands)
    let currentPos = { ...startPosition }
    
    for (const cmd of expanded) {
      switch (cmd.direction) {
        case 'D':
          currentPos.x += cmd.steps
          break
        case 'I':
          currentPos.x -= cmd.steps
          break
        case 'S':
          currentPos.y -= cmd.steps
          break
        case 'B':
          currentPos.y += cmd.steps
          break
      }
    }
    
    return currentPos
  }

  public expandCommands(commands: (Command | LoopCommand)[]): Command[] {
    const expanded: Command[] = []
    
    for (const cmd of commands) {
      if ('direction' in cmd) {
        expanded.push(cmd)
      } else {
        // Expand loop
        for (let i = 0; i < cmd.repetitions; i++) {
          expanded.push(...cmd.commands)
        }
      }
    }
    
    return expanded
  }

  public validateCommands(
    input: string,
    options: ParseOptions = {}
  ): { isValid: boolean; error?: string } {
    try {
      const commands = this.parseCommands(input, options)
      
      // Validar bucles con repetición mínima para niveles 14-20
      if (options.level !== undefined && options.level >= 14 && options.level <= 20) {
        for (const cmd of commands) {
          if ('repetitions' in cmd && cmd.repetitions < 2) {
            return {
              isValid: false,
              error: 'Comando incorrecto: debe repetirse por lo menos 2 veces',
            }
          }
        }
        
        // Validar que el bucle termine exactamente en el portal
        if (options.startPosition && options.doorPosition) {
          const finalPosition = this.calculateFinalPosition(commands, options.startPosition)
          if (finalPosition.x !== options.doorPosition.x || finalPosition.y !== options.doorPosition.y) {
            return {
              isValid: false,
              error: 'Comando incorrecto: el patrón del bucle debe terminar exactamente en el portal',
            }
          }
        }
      }

      if (this.lastCommaError) {
        return {
          isValid: false,
          error: 'Comandos INCORRECTOS: separa cada instrucción con una coma (,).',
        }
      }
      if (this.lastInvalidToken) {
        return {
          isValid: false,
          error: this.lastInvalidMessage || 'Comandos INCORRECTOS',
        }
      }
      if (commands.length === 0) {
        return { isValid: false, error: 'Comandos INCORRECTOS' }
      }
      
      // Check for valid directions and numbers
      const expanded = this.expandCommands(commands)
      for (const cmd of expanded) {
        if (!['D', 'I', 'S', 'B'].includes(cmd.direction)) {
          return { isValid: false, error: `Dirección inválida: ${cmd.direction}` }
        }
        if (cmd.steps <= 0 || cmd.steps > 15) {
          return { isValid: false, error: `Número de pasos inválido: ${cmd.steps}` }
        }
      }
      
      return { isValid: true }
    } catch (error) {
      return { isValid: false, error: 'Error al parsear comandos' }
    }
  }

  public getCommandsHelp(): string {
    return `
Comandos disponibles:
- D[número]: Mover a la derecha (ej: D3)
- I[número]: Mover a la izquierda (ej: I2)
- S[número]: Mover hacia arriba (ej: S1)
- B[número]: Mover hacia abajo (ej: B4)

Loops (nivel 10+):
- (comandos)x[repeticiones]: Repetir comandos (ej: (D1,S1)x3)

Ejemplos:
- D3,S2,I1: Derecha 3, Subir 2, Izquierda 1
- (D2,S1)x5: Repetir "Derecha 2, Subir 1" cinco veces
    `
  }
}
