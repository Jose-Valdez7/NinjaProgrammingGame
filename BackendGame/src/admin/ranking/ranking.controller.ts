import { Controller, Get, UseGuards } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { AuthGuard } from 'src/shared/auth/guards/auth.guard';
import { RolesGuard } from 'src/shared/auth/guards/roles.guard';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Roles } from 'src/shared/auth/decorators/roles.decorator';
import { Role } from 'src/shared/auth/enums/role.enums';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Rankings')
@Controller('rankings')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get()
  @ApiOperation({ summary: 'Get all rankings' })
  @ApiResponse({ status: 200, description: 'Return all rankings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAll() {
    return this.rankingService.findAll();
  }
}