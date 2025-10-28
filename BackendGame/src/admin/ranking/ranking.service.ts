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
          },
        },
      },
      orderBy: [
        { level: "desc" }, // Nivel más alto primero
        { score: "desc" }, // Mayor puntuación después
        { commandsUsed: "asc" }, // Menos comandos después
        { timeTaken: "asc" }, // Menor tiempo por último
      ],
    });

    // Filtrar solo los registros del mejor nivel de cada usuario
    const filteredRecords = allBestRecords.filter(record => {
      const userBestLevel = userBestLevels.get(record.userId);
      return record.level === userBestLevel;
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
      score: r.score,
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
