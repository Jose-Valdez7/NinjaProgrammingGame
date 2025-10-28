import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/database/prisma.service";
import { UserRole } from "@prisma/client";
import { PaginationDto } from "../../common/dtos/pagination.dto";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination?: PaginationDto) {
    const page = Math.max(1, Number(pagination?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(pagination?.limit || 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { role: UserRole.USER },
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.user.count({ where: { role: UserRole.USER } }),
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
}
