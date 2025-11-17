import { PrismaService } from '../../shared/database/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PointsService {
    constructor(private readonly prisma: PrismaService) {}

    async assingPoints(userId: string, points: number) {
        // findUniqueOrThrow ya lanza excepción si no existe
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });
        
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                score: {
                    increment: points,
                },
            },
            select: {
                id: true,
                score: true,
            },
        });
        
        return updatedUser;
    }
}
