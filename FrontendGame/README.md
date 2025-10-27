# 🎮 Ninja Energy Quest - Frontend

Frontend del juego desarrollado con React + Vite + TypeScript + Pixi.js

## 🚀 Tecnologías Utilizadas

- **React 18** - Framework principal
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Pixi.js** - Motor gráfico 2D
- **GSAP** - Animaciones avanzadas
- **TailwindCSS** - Estilos
- **Zustand** - Gestión de estado
- **React Router** - Navegación
- **Lucide React** - Iconos

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
├── pages/              # Páginas principales
│   ├── HomePage.tsx    # Página de inicio
│   ├── GamePage.tsx    # Juego principal
│   ├── LoginPage.tsx   # Inicio de sesión
│   ├── RegisterPage.tsx # Registro
│   ├── RankingPage.tsx # Rankings
│   └── AdminPage.tsx   # Panel admin
├── game/               # Motor del juego
│   ├── GameEngine.ts   # Pixi.js engine
│   ├── LevelGenerator.ts # Generador de niveles
│   └── CommandParser.ts # Parser de comandos
├── store/              # Estado global
│   └── GameStore.tsx   # Zustand store
├── types/              # Tipos TypeScript
│   └── game.ts         # Tipos del juego
├── App.tsx             # Componente principal
├── main.tsx            # Punto de entrada
└── index.css           # Estilos globales
```

## 🎯 Componentes Principales

### GameEngine.ts
Motor principal del juego usando Pixi.js:
- Renderizado de la cuadrícula 15x15
- Animaciones del ninja
- Efectos visuales (energía, fallos, victoria)
- Gestión de sprites y texturas

### LevelGenerator.ts
Generador procedural de niveles:
- 15 niveles con dificultad progresiva
- Colocación de obstáculos y energía
- Líneas guía para niveles iniciales
- Tiempo límite para niveles avanzados

### CommandParser.ts
Parser de comandos del jugador:
- Validación de sintaxis
- Soporte para loops (nivel 10+)
- Expansión de comandos
- Mensajes de error descriptivos

### GameStore.tsx
Estado global del juego:
- Información del usuario
- Estado del nivel actual
- Progreso del ninja
- Gestión de comandos

## 🎮 Mecánicas del Juego

### Tipos de Casillas
```typescript
enum CellType {
  SAFE = 'safe',      // 🟩 Segura
  ENERGY = 'energy',  // ⚡ Energía
  VOID = 'void',      // 🕳️ Vacío
  SNAKE = 'snake',    // 🐍 Serpiente
  DOOR = 'door'       // 🚪 Puerta
}
```

### Comandos Disponibles
- `D3` - Derecha 3 pasos
- `I2` - Izquierda 2 pasos
- `S1` - Subir 1 paso
- `B4` - Bajar 4 pasos
- `(D1,S1)x3` - Loop (nivel 10+)

### Sistema de Animaciones
- **Movimiento**: Transiciones suaves con GSAP
- **Energía**: Partículas y efectos de brillo
- **Fallos**: Caída en espiral, sacudidas
- **Victoria**: Explosión de luz

## 🔧 Configuración de Desarrollo

### Instalación
```bash
npm install
```

### Scripts Disponibles
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run preview      # Vista previa del build
npm run lint         # Linter
```

### Variables de Entorno
Crear `.env.local`:
```env
VITE_API_URL=http://localhost:3001/api
```

## 🎨 Personalización

### Añadir Nuevos Temas
1. Modificar `tailwind.config.js`
2. Añadir colores en el tema `ninja`
3. Actualizar CSS classes

### Nuevas Animaciones
1. Extender `GameEngine.ts`
2. Usar GSAP para efectos
3. Añadir al ciclo de renderizado

### Componentes UI
1. Seguir patrón de `pages/`
2. Usar TailwindCSS classes
3. Implementar responsividad

## 🐛 Debugging

### Herramientas de Desarrollo
- **React DevTools** - Estado de componentes
- **Console del navegador** - Logs del juego
- **Network tab** - Llamadas a API
- **Pixi.js DevTools** - Inspector de sprites

### Logs Útiles
```typescript
// En GameEngine.ts
console.log('Ninja position:', this.ninjaSprite.x, this.ninjaSprite.y);

// En CommandParser.ts
console.log('Parsed commands:', expandedCommands);

// En GameStore.tsx
console.log('Game state:', gameState);
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Adaptaciones
- Canvas escalable en móviles
- Menús colapsables
- Controles táctiles opcionales

## 🚀 Optimización

### Performance
- Lazy loading de componentes
- Memoización con `useMemo`
- Sprites optimizados en Pixi.js
- Throttling de animaciones

### Bundle Size
- Tree shaking automático
- Compresión de assets
- Code splitting por rutas

## 🧪 Testing

### Estructura de Tests
```bash
src/
├── __tests__/
│   ├── components/
│   ├── game/
│   └── utils/
```

### Ejecutar Tests
```bash
npm run test         # Tests unitarios
npm run test:watch   # Modo watch
npm run test:coverage # Cobertura
```

## 🔗 Integración con Backend

### API Endpoints
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/register` - Registro
- `GET /api/game/levels` - Información de niveles
- `POST /api/game/progress` - Guardar progreso
- `GET /api/ranking` - Rankings globales

### Gestión de Estado
```typescript
// Ejemplo de llamada API
const saveProgress = async (levelData) => {
  const response = await fetch('/api/game/progress', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(levelData)
  });
  return response.json();
};
```

## 📚 Recursos Adicionales

- [Pixi.js Documentation](https://pixijs.download/dev/docs/index.html)
- [GSAP Documentation](https://greensock.com/docs/)
- [React Documentation](https://react.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

---

**¡Happy coding! 🥷💻**
