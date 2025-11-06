# Configuración de Supabase para Vercel (Serverless)

## ⚠️ Problema

Supabase requiere usar un **connection pooler** cuando se despliega en entornos serverless como Vercel. Las conexiones directas pueden causar timeouts y problemas de conexión.

## ✅ Solución

### 1. Obtener la URL del Connection Pooler

Hay varias formas de obtener la URL del connection pooler en Supabase:

#### Opción A: Desde el Dashboard de Supabase
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral izquierdo, busca **Project Settings** (icono de engranaje ⚙️)
3. Dentro de Project Settings, busca la sección **Database**
4. Busca la sección **Connection string** o **Connection pooling**
5. Selecciona la pestaña **Connection pooling** (no "Direct connection")
6. Copia la URL que se muestra (debería tener el puerto **6543** y `?pgbouncer=true`)

#### Opción B: Si no encuentras "Database" en Settings
1. Ve a **Project Settings** (icono de engranaje ⚙️ en el menú lateral)
2. Busca la sección **API** o **Database**
3. O busca directamente **Connection string** en la barra de búsqueda del dashboard
4. Deberías ver opciones para "Direct connection" y "Connection pooling"
5. Selecciona "Connection pooling" y copia la URL

#### Opción C: Construir la URL manualmente
Si tienes la URL directa de Supabase, puedes convertirla a connection pooler:

**Ejemplo con tu URL:**
- **URL Directa (NO usar en Vercel):**
  ```
  postgresql://postgres:dQ1qiFqK5NxClKBo@db.welmxwvtmmxkmsvaiwwc.supabase.co:5432/postgres
  ```

- **URL Pooler (USAR en Vercel):**
  ```
  postgresql://postgres:dQ1qiFqK5NxClKBo@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```

**Cambios necesarios:**
- Cambiar `db.welmxwvtmmxkmsvaiwwc.supabase.co` por `aws-0-us-east-1.pooler.supabase.com`
- Cambiar puerto `5432` por `6543`
- Agregar `?pgbouncer=true` al final

**Nota:** Si `us-east-1` no funciona, prueba con otras regiones comunes:
- `us-west-1` (Norteamérica Oeste)
- `eu-west-1` (Europa Oeste)
- `ap-southeast-1` (Asia Pacífico)

### 2. Configurar en Vercel

1. Ve a tu proyecto en Vercel
2. Ve a **Settings** → **Environment Variables**
3. Busca o crea la variable `DATABASE_URL`
4. **IMPORTANTE**: Usa la URL del **Connection Pooler**, no la directa

#### Formato correcto:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

#### Formato incorrecto (NO usar en Vercel):
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

### 3. Verificar la configuración

La URL debe:
- ✅ Usar el puerto **6543** (pooler)
- ✅ Incluir `?pgbouncer=true` al final
- ✅ Usar el dominio `pooler.supabase.com` o similar

### 4. Aplicar cambios

Después de actualizar la variable de entorno:
1. Ve a **Deployments**
2. Haz un nuevo deploy o redeploy del último deployment
3. Los cambios se aplicarán automáticamente

## 🔍 Verificar en los logs

Después del deploy, revisa los logs de Vercel. Deberías ver:
- `🔧 Vercel environment detected - using lazy Prisma connection`
- `📊 DATABASE_URL configured: true`

Si ves una advertencia sobre el pooler, significa que la URL no está configurada correctamente.

## 📝 Notas adicionales

- **Desarrollo local**: Puedes usar la conexión directa (puerto 5432)
- **Producción (Vercel)**: DEBE usar el connection pooler (puerto 6543)
- El pooler limita el número de conexiones simultáneas, pero es necesario para serverless

## 🚨 Si aún hay problemas

1. Verifica que la `DATABASE_URL` en Vercel use el pooler
2. Revisa los logs de Vercel para ver errores de conexión
3. Asegúrate de que la contraseña en la URL esté correctamente codificada (URL encoded)
4. Verifica que el proyecto de Supabase esté activo y no pausado

