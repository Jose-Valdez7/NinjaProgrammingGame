import { Module } from '@nestjs/common';
import { UserProgressService } from './progress.service';
import { UserProgressController } from './progress.controller';

@Module({
  controllers: [UserProgressController],
  providers: [UserProgressService],
})
export class UserProgressModule {}
