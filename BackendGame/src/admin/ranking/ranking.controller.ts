import { Controller, Get, UseGuards } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { AuthGuard } from 'src/shared/auth/guards/auth.guard';
import { RolesGuard } from 'src/shared/auth/guards/roles.guard';
import { Roles } from 'src/shared/auth/decorators/roles.decorator';
import { Role } from 'src/shared/auth/enums/role.enums';

@Controller('rankings')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get()
  async getAll() {
    return this.rankingService.findAll();
  }
}