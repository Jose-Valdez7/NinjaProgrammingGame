import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // En Vercel/serverless, conectar de forma lazy puede evitar timeouts
    // Prisma se conectará automáticamente en la primera query
    // Solo conectar explícitamente si no estamos en un entorno serverless
    if (process.env.VERCEL) {
      console.log('🔧 Vercel environment detected - using lazy Prisma connection');
      // En Vercel, Prisma se conectará automáticamente cuando se necesite
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
