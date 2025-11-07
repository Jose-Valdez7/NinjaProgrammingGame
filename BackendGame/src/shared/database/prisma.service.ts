import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// 🧠 Usamos una referencia global para que Prisma no se cree en cada invocación (importante para Vercel)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const enableQueryLogging = process.env.PRISMA_QUERY_DEBUG === 'true';
    super({
      log: enableQueryLogging ? ['query', 'warn', 'error'] : ['warn', 'error'],
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
        globalForPrisma.prisma = this;
      } else {
        return globalForPrisma.prisma;
      }

      // Verificamos conexión mínima
      try {
        await this.$queryRaw`SELECT 1`;
      } catch (err) {
        console.error('Error de conexión en Vercel:', err);
      }

      return;
    }

    // 🧩 En local o dev, conectamos inmediatamente
    try {
      await this.$connect();
    } catch (error: any) {
      console.error('Error conectando Prisma:', error?.message);
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
