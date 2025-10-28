import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/database/prisma.service";

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const rankings = await this.prisma.ranking.findMany({
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

    return rankings.map((r) => ({
      level: r.level,
      userId: r.userId,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      score: r.score,
      commandsUsed: r.commandsUsed,
      timeTaken: r.timeTaken,
    }));
  }
}
