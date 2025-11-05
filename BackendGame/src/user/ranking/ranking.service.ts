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
      
      // 1) Mejor nivel alcanzado (sobre todos los niveles)
      const maxLevelByUser = await this.prisma.ranking.groupBy({
        by: ['userId'],
        _max: { level: true },
      });

      // 2) Sumas de comandos/tiempo SOLO de niveles 11 a 15
      const sumsLvl11To15 = await this.prisma.ranking.groupBy({
        by: ['userId'],
        where: { level: { gte: 11, lte: 15 } },
        _sum: { commandsUsed: true, timeTaken: true },
      });

      // Si no hay registros, devolver vacío controlado
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

      // Cargar datos de usuario
      const userIds = maxLevelByUser.map(r => r.userId);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, score: true },
      });
      const userMap = new Map(users.map(u => [u.id, u] as const));

      // Preparar filas combinadas
      const sumsMap = new Map(sumsLvl11To15.map(s => [s.userId, s] as const));

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

      const total = combined.length;
      const paginated = combined.slice(skip, skip + limit);
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
