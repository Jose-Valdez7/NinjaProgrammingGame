import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './shared/database/prisma.module';
import { AuthModule } from './shared/auth/auth.module';
import { RankingModule } from './user/ranking/ranking.module';
import { UserModule } from './admin/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    RankingModule,
    UserModule,
  ],
})
export class AppModule {}
