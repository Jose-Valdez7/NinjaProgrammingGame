import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
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
    // En Vercel/serverless, NO conectar explícitamente
    // Prisma se conectará automáticamente en la primera query
    // Esto evita timeouts en cold starts
    if (process.env.VERCEL) {
      console.log('🔧 Vercel environment detected - using lazy Prisma connection');
      console.log('📊 DATABASE_URL configured:', !!process.env.DATABASE_URL);
      // Verificar que la URL use el pooler de Supabase
      if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('pooler')) {
        console.warn('⚠️ DATABASE_URL might not be using Supabase pooler. For serverless, use: postgresql://...@...supabase.co:6543/...?pgbouncer=true');
      }
      return;
    }
    
    // En desarrollo/local, conectar inmediatamente
    try {
      await this.$connect();
      console.log('✅ Prisma connected to database');
    } catch (error: any) {
      console.error('❌ Prisma connection error:', error?.message);
      console.error('DATABASE_URL present:', !!process.env.DATABASE_URL);
      // Lanzar el error solo en desarrollo
      throw error;
    }
  }

  async onModuleDestroy() {
    // Desconectar de la base de datos cuando el módulo se destruya
    await this.$disconnect();
  }

  // Método helper para limpiar la base de datos (útil para testing)
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && key[0] !== '_',
    ) as string[];

    return Promise.all(
      models.map((modelKey) => (this as any)[modelKey].deleteMany()),
    );
  }
}
