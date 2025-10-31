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

      // Primero obtener el mejor registro de cada usuario (nivel más alto)
      const bestUserRecords = await this.prisma.ranking.groupBy({
        by: ['userId'],
        _max: { level: true },
      });

      // Si no hay registros, devolver vacío controlado
      if (!bestUserRecords.length) {
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

      // Crear un mapa de userId -> mejor nivel
      const userBestLevels = new Map<string, number>();
      bestUserRecords.forEach(record => {
        userBestLevels.set(record.userId, record._max.level ?? 0);
      });

      // Obtener todos los registros de los mejores niveles de cada usuario
      const allBestRecords = await this.prisma.ranking.findMany({
        where: {
          userId: {
            in: Array.from(userBestLevels.keys()),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              score: true,
            },
          },
        },
      });

      // Filtrar solo los registros del mejor nivel de cada usuario
      const filteredRecords = allBestRecords.filter(record => {
        const userBestLevel = userBestLevels.get(record.userId) ?? 0;
        return record.level === userBestLevel;
      });

      // Ordenar por nivel, score del usuario, comandos y tiempo
      filteredRecords.sort((a, b) => {
        if (b.level !== a.level) {
          return b.level - a.level;
        }

        const aScore = a.user?.score ?? 0;
        const bScore = b.user?.score ?? 0;
        if (bScore !== aScore) {
          return bScore - aScore;
        }

        if (a.commandsUsed !== b.commandsUsed) {
          return a.commandsUsed - b.commandsUsed;
        }

        return a.timeTaken - b.timeTaken;
      });

      const total = filteredRecords.length;
      const paginatedRecords = filteredRecords.slice(skip, skip + limit);
      const totalPages = Math.max(1, Math.ceil(total / limit));

      const mappedItems = paginatedRecords.map(r => ({
        level: r.level,
        userId: r.userId,
        firstName: r.user?.firstName ?? '',
        lastName: r.user?.lastName ?? '',
        email: r.user?.email ?? '',
        phone: r.user?.phone ?? '',
        score: r.user?.score ?? 0,
        commandsUsed: r.commandsUsed,
        timeTaken: r.timeTaken,
      }));

      return {
        items: mappedItems,
        meta: {
          totalItems: total,
          itemCount: mappedItems.length,
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
