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
      
      // Agregar por usuario: mejor nivel alcanzado y sumas de comandos/tiempo
      const aggregatedByUser = await this.prisma.ranking.groupBy({
        by: ['userId'],
        _max: { level: true },
        _sum: { commandsUsed: true, timeTaken: true },
      });

      // Si no hay registros, devolver vacío controlado
      if (!aggregatedByUser.length) {
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
      const userIds = aggregatedByUser.map(r => r.userId);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, score: true },
      });
      const userMap = new Map(users.map(u => [u.id, u] as const));

      // Preparar filas combinadas
      const combined = aggregatedByUser.map(r => {
        const user = userMap.get(r.userId);
        return {
          userId: r.userId,
          level: r._max.level ?? 0, // nivel en el que está
          firstName: user?.firstName ?? '',
          lastName: user?.lastName ?? '',
          email: user?.email ?? '',
          phone: user?.phone ?? '',
          score: user?.score ?? 0,
          // totales a mostrar en el ranking
          commandsUsed: r._sum.commandsUsed ?? 0,
          timeTaken: r._sum.timeTaken ?? 0,
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
