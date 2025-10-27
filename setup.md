# 🚀 Guía de Instalación Rápida - Ninja Energy Quest

## ⚡ Instalación Express (5 minutos)

### 1. Prerrequisitos
Asegúrate de tener instalado:
- **Node.js 18+** - [Descargar aquí](https://nodejs.org/)
- **PostgreSQL 14+** - [Descargar aquí](https://www.postgresql.org/download/)
- **Git** - [Descargar aquí](https://git-scm.com/)

### 2. Configurar Base de Datos
```sql
-- Conectar a PostgreSQL y ejecutar:
CREATE DATABASE ninja_energy_quest;
CREATE USER ninja_user WITH PASSWORD 'ninja_password';
GRANT ALL PRIVILEGES ON DATABASE ninja_energy_quest TO ninja_user;
```

### 3. Clonar y Configurar Backend
```bash
# Navegar al backend
cd NinjaProgrammingGame/BackendGame

# Instalar dependencias
npm install

# Configurar variables de entorno (ya está el .env)
# Ejecutar migraciones de base de datos
npx prisma migrate dev --name init
npx prisma generate

# Iniciar servidor backend
npm run start:dev
```

### 4. Configurar Frontend
```bash
# Abrir nueva terminal y navegar al frontend
cd NinjaProgrammingGame/FrontendGame

# Instalar dependencias
npm install

# Iniciar aplicación frontend
npm run dev
```

### 5. ¡Listo! 🎉
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Base de datos**: Prisma Studio en http://localhost:5555 (ejecutar `npx prisma studio`)

## 🔧 Comandos Útiles

### Backend
```bash
cd BackendGame
npm run start:dev        # Desarrollo
npm run build           # Compilar
npm run start:prod      # Producción
npx prisma studio       # Interfaz de base de datos
npx prisma migrate dev  # Nueva migración
npx prisma generate     # Regenerar cliente
```

### Frontend
```bash
cd FrontendGame
npm run dev             # Desarrollo
npm run build          # Compilar para producción
npm run preview        # Vista previa del build
npm run lint           # Verificar código
```

## 🐛 Solución de Problemas

### Error: Puerto ocupado
```bash
# Cambiar puerto en .env (backend) o vite.config.ts (frontend)
PORT=3002  # Backend
# o modificar vite.config.ts para frontend
```

### Error: Base de datos no conecta
```bash
# Verificar que PostgreSQL esté ejecutándose
# Windows: Servicios > PostgreSQL
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Verificar credenciales en .env
DATABASE_URL="postgresql://ninja_user:ninja_password@localhost:5432/ninja_energy_quest"
```

### Error: Dependencias
```bash
# Limpiar e instalar de nuevo
rm -rf node_modules package-lock.json
npm install
```

### Error: Migraciones
```bash
# Resetear base de datos (¡CUIDADO: borra todos los datos!)
npx prisma migrate reset
npx prisma migrate dev
npx prisma generate
```

## 📱 Primer Uso

1. **Abrir** http://localhost:3000
2. **Jugar Nivel 1** sin registro
3. **Registrarse** para niveles 2+
4. **Escribir comandos**: `D3,S2,I1`
5. **Presionar Play** y ver al ninja moverse
6. **Energizarse** tocando casillas amarillas ⚡
7. **Llegar a la puerta** 🚪 para completar el nivel

## 🎮 Comandos del Juego

- **D[n]** - Derecha n pasos (ej: D3)
- **I[n]** - Izquierda n pasos (ej: I2)
- **S[n]** - Subir n pasos (ej: S1)
- **B[n]** - Bajar n pasos (ej: B4)
- **Loops** (nivel 10+): `(D1,S1)x3`

## 🏆 Características Implementadas

✅ **Frontend Completo**
- React + TypeScript + Vite
- Pixi.js para gráficos 2D
- GSAP para animaciones
- TailwindCSS + Shadcn/UI
- Sistema de rutas completo
- Gestión de estado con Zustand

✅ **Backend Robusto**
- NestJS + Prisma + PostgreSQL
- Sistema de autenticación JWT
- API RESTful completa
- Validación de datos
- Manejo de errores

✅ **Funcionalidades del Juego**
- 15 niveles progresivos
- Motor de juego con Pixi.js
- Parser de comandos avanzado
- Sistema de animaciones
- Ranking global
- Panel de administración

✅ **Base de Datos**
- Modelos de usuario, progreso y ranking
- Migraciones automáticas
- Relaciones entre tablas
- Índices optimizados

## 🚀 Próximos Pasos

1. **Instalar dependencias** en ambos proyectos
2. **Configurar base de datos** PostgreSQL
3. **Ejecutar migraciones** de Prisma
4. **Iniciar ambos servidores**
5. **¡Comenzar a jugar!** 🥷

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs en la consola
2. Verifica que todos los servicios estén ejecutándose
3. Consulta los README específicos de cada proyecto
4. Revisa la documentación de las tecnologías utilizadas

---

**¡Que comience la aventura ninja! 🥷⚡**
