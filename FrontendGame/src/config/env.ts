/**
 * Configuración centralizada de variables de entorno
 */
import type { User } from '../types/game'

export const config = {
  // URL base de la API
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  
  // Configuración de autenticación
  AUTH: {
    ACCESS_TOKEN_KEY: 'accessToken',
    REFRESH_TOKEN_KEY: 'refreshToken',
    CURRENT_USER_KEY: 'currentUser',
  },
  
  // Configuración de la aplicación
  APP: {
    NAME: 'Ninja Programming Game',
    VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
  
  // Configuración de desarrollo
  DEV: {
    DEBUG: import.meta.env.DEV || false,
  }
} as const

// Funciones de utilidad para localStorage
export const authStorage = {
  getAccessToken: () => localStorage.getItem(config.AUTH.ACCESS_TOKEN_KEY),
  setAccessToken: (token: string) => localStorage.setItem(config.AUTH.ACCESS_TOKEN_KEY, token),
  removeAccessToken: () => localStorage.removeItem(config.AUTH.ACCESS_TOKEN_KEY),
  
  getRefreshToken: () => localStorage.getItem(config.AUTH.REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => localStorage.setItem(config.AUTH.REFRESH_TOKEN_KEY, token),
  removeRefreshToken: () => localStorage.removeItem(config.AUTH.REFRESH_TOKEN_KEY),
  
  getCurrentUser: () => {
    const user = localStorage.getItem(config.AUTH.CURRENT_USER_KEY)
    return user ? JSON.parse(user) : null
  },
  setCurrentUser: (user: User) => localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(user)),
  removeCurrentUser: () => localStorage.removeItem(config.AUTH.CURRENT_USER_KEY),
  
  clearAll: () => {
    localStorage.removeItem(config.AUTH.ACCESS_TOKEN_KEY)
    localStorage.removeItem(config.AUTH.REFRESH_TOKEN_KEY)
    localStorage.removeItem(config.AUTH.CURRENT_USER_KEY)
  }
}

// Función para construir URLs de la API
export const apiUrl = (endpoint: string) => {
  const baseUrl = config.API_BASE_URL.replace(/\/$/, '') // Remover trailing slash
  const cleanEndpoint = endpoint.replace(/^\//, '') // Remover leading slash
  return `${baseUrl}/${cleanEndpoint}`
}

// Función para obtener headers de autenticación
export const getAuthHeaders = () => {
  const token = authStorage.getAccessToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
