# 🛡️ Ninja Energy Quest - Backend API

Backend del juego desarrollado con NestJS + Prisma + PostgreSQL

## 🚀 Tecnologías Utilizadas

- **NestJS** - Framework Node.js
- **Prisma** - ORM moderno
- **PostgreSQL** - Base de datos
- **JWT** - Autenticación
- **bcrypt** - Hash de contraseñas
- **class-validator** - Validación de DTOs
- **Passport** - Estrategias de autenticación

## 📁 Estructura del Proyecto

```
src/
├── auth/                # Módulo de autenticación
│   ├── dto/            # Data Transfer Objects
│   ├── strategies/     # Passport strategies
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/              # Gestión de usuarios
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── game/               # Lógica del juego
│   ├── dto/
│   ├── game.controller.ts
│   ├── game.service.ts
│   └── game.module.ts
├── ranking/            # Sistema de ranking
│   ├── dto/
│   ├── ranking.controller.ts
│   ├── ranking.service.ts
│   └── ranking.module.ts
├── prisma/             # Configuración de Prisma
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── app.module.ts       # Módulo principal
└── main.ts             # Punto de entrada
```

## 🗄️ Modelo de Base de Datos

### Esquema Prisma
```prisma
model User {
  id          Int       @id @default(autoincrement())
  firstName   String
  lastName    String
  email       String    @unique
  phone       String?
  dni         String?
  password    String
  createdAt   DateTime  @default(now())
  levels      LevelProgress[]
  rankings    Ranking[]
}

model LevelProgress {
  id           Int      @id @default(autoincrement())
  userId       Int
  level        Int
  commandsUsed Int
  timeTaken    Int
  energized    Boolean
  success      Boolean
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id])
}

model Ranking {
  id           Int      @id @default(autoincrement())
  level        Int
  userId       Int
  score        Int
  commandsUsed Int
  timeTaken    Int
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id])
}
```

## 🔐 Sistema de Autenticación

### JWT Strategy
- Tokens con expiración configurable
- Refresh tokens para sesiones largas
- Middleware de protección de rutas

### Endpoints de Auth
```typescript
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
POST /api/auth/refresh
```

### Ejemplo de Uso
```typescript
// Registro
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan@example.com",
  "password": "securePassword123"
}

// Login
{
  "email": "juan@example.com",
  "password": "securePassword123"
}

// Respuesta
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com"
  }
}
```

## 🎮 API del Juego

### Endpoints Principales
```typescript
GET    /api/game/levels/:id      # Información de nivel
POST   /api/game/progress        # Guardar progreso
GET    /api/game/progress/:userId # Progreso del usuario
POST   /api/game/session         # Iniciar sesión de juego
PUT    /api/game/session/:id     # Actualizar sesión
```

### Guardar Progreso
```typescript
POST /api/game/progress
{
  "level": 5,
  "commandsUsed": 12,
  "timeTaken": 45,
  "energized": true,
  "success": true,
  "commands": ["D3", "S2", "I1"]
}
```

## 🏆 Sistema de Ranking

### Cálculo de Puntuación
```typescript
const calculateScore = (commandsUsed: number, timeTaken: number, level: number) => {
  const baseScore = level * 100;
  const efficiencyBonus = Math.max(0, 50 - commandsUsed);
  const speedBonus = Math.max(0, 60 - timeTaken);
  return baseScore + efficiencyBonus + speedBonus;
};
```

### Endpoints de Ranking
```typescript
GET /api/ranking                 # Ranking global
GET /api/ranking/level/:level    # Ranking por nivel
GET /api/ranking/user/:userId    # Ranking del usuario
```

## 🔧 Configuración

### Variables de Entorno (.env)
```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/ninja_quest"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Servidor
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL="http://localhost:3000"
```

### Instalación y Setup
```bash
# Instalar dependencias
npm install

# Configurar base de datos
npx prisma migrate dev
npx prisma generate

# Ejecutar seeders (opcional)
npm run prisma:seed

# Iniciar en desarrollo
npm run start:dev
```

## 📊 Middleware y Validación

### Global Pipes
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

### DTOs con Validación
```typescript
export class CreateUserDto {
  @IsString()
  firstName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

### Guards de Autenticación
```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req) {
  return req.user;
}
```

## 🔍 Logging y Monitoreo

### Logs Estructurados
```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  async saveProgress(data: any) {
    this.logger.log(`Saving progress for user ${data.userId}`);
    // ...
  }
}
```

### Health Checks
```typescript
GET /api/health
{
  "status": "ok",
  "database": "connected",
  "uptime": 3600
}
```

## 🧪 Testing

### Tests Unitarios
```bash
npm run test              # Ejecutar tests
npm run test:watch        # Modo watch
npm run test:cov          # Cobertura
```

### Tests E2E
```bash
npm run test:e2e
```

### Ejemplo de Test
```typescript
describe('AuthService', () => {
  it('should validate user credentials', async () => {
    const result = await authService.validateUser('test@example.com', 'password');
    expect(result).toBeDefined();
    expect(result.email).toBe('test@example.com');
  });
});
```

## 🚀 Deployment

### Build de Producción
```bash
npm run build
npm run start:prod
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

### Variables de Producción
```env
NODE_ENV=production
DATABASE_URL="postgresql://prod_user:prod_pass@prod_host:5432/ninja_quest"
JWT_SECRET="super-secure-production-secret"
```

## 📈 Performance

### Optimizaciones de Base de Datos
- Índices en campos frecuentemente consultados
- Paginación en endpoints de listado
- Conexiones pooling

### Caching
```typescript
@Injectable()
export class RankingService {
  @Cacheable('rankings', 300) // Cache por 5 minutos
  async getGlobalRanking() {
    return this.prisma.ranking.findMany({
      orderBy: { score: 'desc' },
      take: 100
    });
  }
}
```

## 🔒 Seguridad

### Medidas Implementadas
- Hash de contraseñas con bcrypt
- Validación de entrada con class-validator
- Rate limiting en endpoints críticos
- CORS configurado
- Headers de seguridad

### Ejemplo de Rate Limiting
```typescript
@UseGuards(ThrottlerGuard)
@Throttle(5, 60) // 5 requests por minuto
@Post('login')
async login(@Body() loginDto: LoginDto) {
  return this.authService.login(loginDto);
}
```

## 📚 Documentación API

### Swagger/OpenAPI
```bash
# Acceder a documentación
http://localhost:3001/api/docs
```

### Postman Collection
Incluye colección de Postman con todos los endpoints configurados.

---

**¡API lista para la aventura ninja! 🥷🛡️**
