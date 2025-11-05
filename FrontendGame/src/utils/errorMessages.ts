export const normalizeLoginError = (input?: unknown): string => {
  if (!input) return 'Credenciales inválidas'

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      return normalizeLoginError(parsed)
    } catch {
      const lower = input.toLowerCase()
      if (lower.includes('cedula') || lower.includes('cédula')) return 'Cédula incorrecta'
      if (lower.includes('correo') || lower.includes('email')) return 'Correo incorrecto'
      return 'Credenciales inválidas'
    }
  }

  if (Array.isArray((input as any)?.message)) {
    return normalizeLoginError((input as any).message.join(' '))
  }

  if (typeof input === 'object' && input !== null) {
    const message = (input as any).message || (input as any).error || ''
    return normalizeLoginError(typeof message === 'string' ? message : String(message))
  }

  return 'Credenciales inválidas'
}
