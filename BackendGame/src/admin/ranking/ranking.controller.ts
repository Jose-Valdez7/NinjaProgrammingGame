import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { AuthGuard } from 'src/shared/auth/guards/auth.guard';
import { RolesGuard } from 'src/shared/auth/guards/roles.guard';
import { Roles } from 'src/shared/auth/decorators/roles.decorator';
import { Role } from 'src/shared/auth/enums/role.enums';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Controller('rankings')
@ApiTags('Rankings')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get()
  @ApiOperation({ summary: 'Get all rankings (paginated)' })
  @ApiResponse({ status: 200, description: 'Return rankings with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAll(@Query() paginationDto: PaginationDto) {
    return this.rankingService.findAll(paginationDto);
  }
}