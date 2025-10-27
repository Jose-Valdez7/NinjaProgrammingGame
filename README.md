# 🥷 Ninja Energy Quest

Un videojuego web educativo e interactivo donde el jugador controla a un ninja que debe atravesar una cuadrícula de 15x15 para llegar a una puerta. El ninja solo puede pasar la puerta si previamente se "energiza" tocando un punto especial dentro del mapa.

## 🎮 Características del Juego

### Mecánica Principal
- **Cuadrícula 15x15** con diferentes tipos de casillas:
  - 🟩 **Seguras**: El ninja puede caminar
  - ⚡ **Energía**: Recarga al ninja (necesario para pasar la puerta)
  - 🕳️ **Vacío**: Si pisa, cae y reinicia el nivel
  - 🐍 **Serpiente**: Muere y repite nivel
  - 🚪 **Puerta**: Solo atraviesa si está energizado

### Niveles Progresivos (1-15)
- **Nivel 1-5**: Líneas amarillas guían el camino correcto
- **Nivel 6-10**: Sin líneas guía, lógica igual
- **Nivel 11-15**: Loops de comandos + tiempo limitado

### Sistema de Comandos
- **D[n]**: Mover derecha n pasos
- **I[n]**: Mover izquierda n pasos  
- **S[n]**: Mover arriba n pasos
- **B[n]**: Mover abajo n pasos
- **Loops** (nivel 10+): `(D1,S1)x3` - Repetir comandos

### Sistema de Puntuación
- Basado en eficiencia de código + velocidad
- Ranking global por nivel
- Menor cantidad de comandos = mejor puntuación
- Menor tiempo = mejor puntuación

## 🏗️ Arquitectura Técnica

### Frontend
- **Framework**: React + Vite + TypeScript
- **Gráficos**: Pixi.js (renderizado 2D acelerado por GPU)
- **Animaciones**: GSAP
- **UI**: TailwindCSS + Shadcn/UI + Lucide Icons
- **Estado**: Zustand
- **Routing**: React Router DOM

### Backend
- **Framework**: NestJS + Express
- **Base de Datos**: PostgreSQL + Prisma ORM
- **Autenticación**: JWT + bcrypt
- **Validación**: class-validator

### Características Avanzadas
- **Animaciones**: Ninja energizado, caída al vacío, mordida de serpiente
- **Efectos Visuales**: Partículas de energía, efectos de luz
- **Registro de Usuario**: A partir del nivel 2
- **Panel Admin**: Gestión de usuarios y estadísticas
- **Ranking Global**: Competencia entre jugadores

## 📁 Estructura del Proyecto

```
NinjaProgrammingGame/
├── FrontendGame/          # React + Pixi.js Frontend
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas principales
│   │   ├── game/          # Motor del juego (Pixi.js)
│   │   ├── store/         # Gestión de estado
│   │   └── types/         # Tipos TypeScript
│   ├── public/            # Archivos estáticos
│   └── package.json
├── BackendGame/           # NestJS Backend API
│   ├── src/
│   │   ├── auth/          # Autenticación
│   │   ├── users/         # Gestión de usuarios
│   │   ├── game/          # Lógica del juego
│   │   ├── ranking/       # Sistema de ranking
│   │   └── prisma/        # Base de datos
│   ├── prisma/            # Esquemas y migraciones
│   └── package.json
└── README.md
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd NinjaProgrammingGame
```

### 2. Configurar Backend
```bash
cd BackendGame
npm install

# Configurar base de datos
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL

# Ejecutar migraciones
npx prisma migrate dev
npx prisma generate

# Iniciar servidor
npm run start:dev
```

### 3. Configurar Frontend
```bash
cd ../FrontendGame
npm install

# Iniciar aplicación
npm run dev
```

### 4. Acceder a la Aplicación
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Prisma Studio**: `npx prisma studio`

## 🎯 Cómo Jugar

1. **Nivel 1**: Juega sin registro para aprender
2. **Nivel 2+**: Regístrate para guardar progreso
3. **Escribe comandos**: Ej: `D3,S2,I1,B1`
4. **Ejecuta**: Presiona "Play" para ver al ninja moverse
5. **Energízate**: Toca casillas amarillas ⚡
6. **Llega a la puerta**: Solo si tienes energía 🚪
7. **Compite**: Ve tu ranking global

## 🏆 Sistema de Ranking

- **Puntuación**: Combinación de eficiencia + velocidad
- **Factores**:
  - Menor número de comandos
  - Menor tiempo de ejecución
  - Completar el nivel exitosamente
- **Ranking Global**: Por nivel individual
- **Medallas**: 🥇🥈🥉 para top 3

## 👥 Panel de Administración

Acceso en `/admin` para:
- Ver estadísticas de usuarios
- Gestionar cuentas
- Analizar progreso por nivel
- Exportar datos de juego

## 🔧 Desarrollo

### Scripts Disponibles

**Frontend:**
```bash
npm run dev          # Desarrollo
npm run build        # Producción
npm run preview      # Vista previa
```

**Backend:**
```bash
npm run start:dev    # Desarrollo
npm run build        # Compilar
npm run start:prod   # Producción
npm run prisma:studio # Base de datos UI
```

### Variables de Entorno

**Backend (.env):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/ninja_quest"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

## 🎨 Personalización

### Añadir Nuevos Niveles
1. Modificar `LevelGenerator.ts`
2. Ajustar lógica de dificultad
3. Actualizar base de datos si necesario

### Nuevos Tipos de Casillas
1. Añadir a `CellType` enum
2. Implementar en `GameEngine.ts`
3. Actualizar estilos CSS

### Comandos Personalizados
1. Extender `CommandParser.ts`
2. Añadir validación
3. Actualizar ayuda del juego

## 🐛 Solución de Problemas

### Errores Comunes
- **Puerto ocupado**: Cambiar puerto en `.env`
- **Base de datos**: Verificar PostgreSQL ejecutándose
- **Dependencias**: `npm install` en ambas carpetas
- **Migraciones**: `npx prisma migrate reset`

### Logs
- Frontend: Consola del navegador
- Backend: Terminal del servidor
- Base de datos: Prisma Studio

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -m 'Añadir nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🎉 Créditos

Desarrollado con ❤️ usando:
- React + TypeScript
- Pixi.js para gráficos
- NestJS + Prisma
- TailwindCSS para estilos
- GSAP para animaciones

---

**¡Que comience la aventura ninja! 🥷⚡**
