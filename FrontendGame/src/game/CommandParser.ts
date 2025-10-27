import { Command, LoopCommand } from '../types/game'

export class CommandParser {
  public parseCommands(input: string): (Command | LoopCommand)[] {
    const commands: (Command | LoopCommand)[] = []
    const cleanInput = input.replace(/\s/g, '').toUpperCase()
    
    let i = 0
    while (i < cleanInput.length) {
      // Check for loop pattern: (commands)xN
      if (cleanInput[i] === '(') {
        const loopResult = this.parseLoop(cleanInput, i)
        if (loopResult) {
          commands.push(loopResult.command)
          i = loopResult.nextIndex
        } else {
          i++
        }
      } else {
        // Parse single command
        const commandResult = this.parseSingleCommand(cleanInput, i)
        if (commandResult) {
          commands.push(commandResult.command)
          i = commandResult.nextIndex
        } else {
          i++
        }
      }
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

  private parseLoop(input: string, startIndex: number): { command: LoopCommand; nextIndex: number } | null {
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
    const parsedInnerCommands = this.parseCommands(innerCommands)
    
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

  public validateCommands(input: string): { isValid: boolean; error?: string } {
    try {
      const commands = this.parseCommands(input)
      if (commands.length === 0) {
        return { isValid: false, error: 'No hay comandos válidos' }
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
