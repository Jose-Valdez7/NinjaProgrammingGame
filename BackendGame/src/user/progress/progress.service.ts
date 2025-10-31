import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';

@Injectable()
export class UserProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getMaxCompletedLevel(userId: string): Promise<number> {
    const aggregate = await this.prisma.levelProgress.aggregate({
      where: {
        userId,
        success: true,
      },
      _max: {
        level: true,
      },
    });

    return aggregate._max?.level ?? 0;
  }

  async saveProgress(userId: string, progress: {
    level: number;
    commandsUsed?: number;
    timeTaken?: number;
    energized?: boolean;
    success: boolean;
  }) {
    return this.prisma.levelProgress.create({
      data: {
        userId,
        level: progress.level,
        commandsUsed: progress.commandsUsed ?? 0,
        timeTaken: progress.timeTaken ?? 0,
        energized: progress.energized ?? false,
        success: progress.success,
      },
    });
  }
}
