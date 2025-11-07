import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// 🧠 Usamos una referencia global para que Prisma no se cree en cada invocación (importante para Vercel)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Configura los logs y la conexión
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    // ⚙️ En Vercel, Prisma usa lazy connection (no llamamos a $connect directamente)
    if (process.env.VERCEL) {
      if (!globalForPrisma.prisma) {
        console.log('🧩 Inicializando Prisma singleton en Vercel...');
        globalForPrisma.prisma = this;
      } else {
        console.log('♻️ Reusando Prisma singleton existente (Vercel)');
        return globalForPrisma.prisma;
      }

      console.log('📊 DATABASE_URL configurada:', !!process.env.DATABASE_URL);
      if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('pooler')) {
        console.warn('⚠️ DATABASE_URL no usa pooler. Usa el puerto 6543 y el pooler de Supabase.');
      }

      // Verificamos conexión mínima
      try {
        await this.$queryRaw`SELECT 1`;
        console.log('✅ Prisma conectado correctamente a la base de datos (lazy mode)');
      } catch (err) {
        console.error('❌ Error de conexión en Vercel:', err);
      }

      return;
    }

    // 🧩 En local o dev, conectamos inmediatamente
    try {
      await this.$connect();
      console.log('✅ Prisma conectado a la base de datos (modo local)');
    } catch (error: any) {
      console.error('❌ Error conectando Prisma:', error?.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // 🧹 Helper opcional
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;
    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && key[0] !== '_',
    ) as string[];
    return Promise.all(models.map((modelKey) => (this as any)[modelKey].deleteMany()));
  }
}
