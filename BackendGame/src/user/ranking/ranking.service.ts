import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/database/prisma.service";
import { PaginationDto } from "../../common/dtos/pagination.dto";

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination?: PaginationDto) {
    const page = Math.max(1, Number(pagination?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(pagination?.limit || 10)));
    const skip = (page - 1) * limit;

    // Primero obtener el mejor registro de cada usuario (nivel más alto)
    const bestUserRecords = await this.prisma.ranking.groupBy({
      by: ['userId'],
      _max: {
        level: true,
      },
    });

    // Crear un mapa de userId -> mejor nivel
    const userBestLevels = new Map();
    bestUserRecords.forEach(record => {
      userBestLevels.set(record.userId, record._max.level);
    });

    // Obtener todos los registros de los mejores niveles de cada usuario
    // Necesitamos obtener primero los usuarios y luego sus rankings
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
      const userBestLevel = userBestLevels.get(record.userId);
      return record.level === userBestLevel;
    });

    // Ordenar por el score del usuario, no por el score del ranking
    filteredRecords.sort((a, b) => {
      // Primero por nivel (descendente)
      if (b.level !== a.level) {
        return b.level - a.level;
      }
      // Luego por score del usuario (descendente)
      if (b.user.score !== a.user.score) {
        return b.user.score - a.user.score;
      }
      // Luego por comandos usados (ascendente)
      if (a.commandsUsed !== b.commandsUsed) {
        return a.commandsUsed - b.commandsUsed;
      }
      // Finalmente por tiempo (ascendente)
      return a.timeTaken - b.timeTaken;
    });

    // Aplicar paginación manualmente
    const total = filteredRecords.length;
    const paginatedRecords = filteredRecords.slice(skip, skip + limit);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const mappedItems = paginatedRecords.map((r) => ({
      level: r.level,
      userId: r.userId,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      email: r.user.email,
      phone: r.user.phone,
      score: r.user.score, // Usar el score del usuario, no del ranking
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
  }
}
