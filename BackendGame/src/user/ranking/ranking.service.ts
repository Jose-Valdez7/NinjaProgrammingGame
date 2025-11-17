import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/database/prisma.service";
import { PaginationDto } from "../../common/dtos/pagination.dto";

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination?: PaginationDto) {
    try {
      const page = Math.max(1, Number(pagination?.page || 1));
      const limit = Math.max(1, Math.min(100, Number(pagination?.limit || 10)));
      const skip = (page - 1) * limit;
      const search = (pagination?.search || '').trim().toLowerCase();

      const maxLevelByUser = await this.prisma.ranking.groupBy({
        by: ['userId'],
        _max: { level: true },
      });

      const sumsLvl14To20 = await this.prisma.ranking.groupBy({
        by: ['userId'],
        where: { level: { gte: 14, lte: 20 } },
        _sum: { commandsUsed: true, timeTaken: true },
      });

      if (!maxLevelByUser.length) {
        return {
          items: [],
          meta: {
            totalItems: 0,
            itemCount: 0,
            perPage: limit,
            totalPages: 1,
            currentPage: page,
          },
        };
      }

      const userIds = maxLevelByUser.map(r => r.userId);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, score: true },
      });
      const userMap = new Map(users.map(u => [u.id, u] as const));

      // Preparar filas combinadas
      const sumsMap = new Map(sumsLvl14To20.map(s => [s.userId, s] as const));

      const combined = maxLevelByUser.map(r => {
        const user = userMap.get(r.userId);
        const sums = sumsMap.get(r.userId);
        return {
          userId: r.userId,
          level: r._max.level ?? 0, // nivel en el que está
          firstName: user?.firstName ?? '',
          lastName: user?.lastName ?? '',
          email: user?.email ?? '',
          phone: user?.phone ?? '',
          score: user?.score ?? 0,
          // totales a mostrar en el ranking
          commandsUsed: sums?._sum.commandsUsed ?? 0,
          timeTaken: sums?._sum.timeTaken ?? 0,
        };
      });

      // Ordenar por nivel, luego score, luego totales
      combined.sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
        if (a.commandsUsed !== b.commandsUsed) return a.commandsUsed - b.commandsUsed;
        return a.timeTaken - b.timeTaken;
      });

      const combinedWithPosition = combined.map((row, idx) => ({
        ...row,
        position: idx + 1,
      }));

      const filtered = search
        ? combinedWithPosition.filter(row => {
            const fullName = `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim().toLowerCase();
            return fullName.includes(search);
          })
        : combinedWithPosition;

      const total = filtered.length;
      const paginated = filtered.slice(skip, skip + limit);
      const totalPages = Math.max(1, Math.ceil(total / limit));

      return {
        items: paginated,
        meta: {
          totalItems: total,
          itemCount: paginated.length,
          perPage: limit,
          totalPages,
          currentPage: page,
        },
      };
    } catch (error) {
      // Fallback silencioso: devolver lista vacía si hay error (migraciones pendientes o tabla sin columna)
      console.error('❌ Error in RankingService.findAll:', error);
      const page = Math.max(1, Number(pagination?.page || 1));
      const limit = Math.max(1, Math.min(100, Number(pagination?.limit || 10)));
      return {
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          perPage: limit,
          totalPages: 1,
          currentPage: page,
        },
      };
    }
  }
}
