import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // Conectar a la base de datos cuando el módulo se inicialice
    await this.$connect();
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
