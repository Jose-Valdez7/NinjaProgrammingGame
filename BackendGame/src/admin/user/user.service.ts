import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../shared/database/prisma.service";
import { UserRole } from "@prisma/client";
import { PaginationDto } from "../../common/dtos/pagination.dto";
import { AdminUserQueryDto } from "./dto/admin-user-query.dto";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination?: PaginationDto | AdminUserQueryDto) {
    const page = Math.max(1, Number(pagination?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(pagination?.limit || 10)));
    const skip = (page - 1) * limit;

    const searchTerm = (pagination as AdminUserQueryDto)?.search?.trim();
    const where: Prisma.UserWhereInput = {
      role: UserRole.USER,
      ...(searchTerm
        ? {
            OR: [
              { firstName: { contains: searchTerm, mode: "insensitive" } },
              { lastName: { contains: searchTerm, mode: "insensitive" } },
              { email: { contains: searchTerm, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items,
      meta: {
        totalItems: total,
        itemCount: items.length,
        perPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async getSummary() {
    const [totalUsers, totalGames] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { role: UserRole.USER } }),
      this.prisma.levelProgress.count({ where: { success: true } }),
    ]);

    return {
      totalUsers,
      totalGames,
      levelsAvailable: 20,
    };
  }

  async remove(id: string) {
    await this.prisma.user.delete({
      where: { id },
    });
  }
}
