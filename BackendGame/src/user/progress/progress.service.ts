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
    failureType?: 'void' | 'snake';
  }) {
    const alreadyCompletedLevel = await this.prisma.ranking.findUnique({
      where: {
        level_userId: {
          level: progress.level,
          userId,
        },
      },
      select: { id: true },
    });

    const created = await this.prisma.levelProgress.create({
      data: {
        userId,
        level: progress.level,
        commandsUsed: progress.commandsUsed ?? 0,
        timeTaken: progress.timeTaken ?? 0,
        energized: progress.energized ?? false,
        success: progress.success,
      },
    });

    await this.applyScoreAdjustment(userId, {
      success: progress.success,
      failureType: progress.failureType,
      alreadyCompletedLevel: Boolean(alreadyCompletedLevel),
    });

    if (progress.success) {
      await this.updateRankingEntry(userId, progress.level, progress.commandsUsed ?? 0, progress.timeTaken ?? 0);
    }

    return created;
  }

  private async applyScoreAdjustment(
    userId: string,
    options: { success: boolean; failureType?: 'void' | 'snake'; alreadyCompletedLevel: boolean },
  ): Promise<void> {
    let delta = 0;

    if (options.success) {
      if (options.alreadyCompletedLevel) {
        return;
      }
      delta = 10;
    } else if (options.failureType === 'void' || options.failureType === 'snake') {
      delta = -3;
    }

    if (delta === 0) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { score: true },
    });

    if (!user) {
      return;
    }

    const nextScore = Math.max(0, Math.min(150, user.score + delta));

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        score: nextScore,
      },
    });
  }

  private async updateRankingEntry(userId: string, level: number, commandsUsed: number, timeTaken: number): Promise<void> {
    const existing = await this.prisma.ranking.findUnique({
      where: {
        level_userId: {
          level,
          userId,
        },
      },
      select: {
        id: true,
        commandsUsed: true,
        timeTaken: true,
      },
    });

    if (!existing) {
      await this.prisma.ranking.create({
        data: {
          level,
          userId,
          commandsUsed,
          timeTaken,
        },
      });
      return;
    }

    const hasBetterCommands = commandsUsed < existing.commandsUsed;
    const hasEqualCommandsBetterTime = commandsUsed === existing.commandsUsed && timeTaken < existing.timeTaken;

    if (!(hasBetterCommands || hasEqualCommandsBetterTime)) {
      return;
    }

    await this.prisma.ranking.update({
      where: {
        level_userId: {
          level,
          userId,
        },
      },
      data: {
        commandsUsed,
        timeTaken,
      },
    });
  }
}
