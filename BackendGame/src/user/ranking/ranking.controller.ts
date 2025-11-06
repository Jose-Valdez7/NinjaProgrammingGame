import { Controller, Get, Query } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@ApiTags('Rankings')
@Controller('rankings')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get()
  @ApiOperation({ summary: 'Get all rankings (paginated)' })
  @ApiResponse({ status: 200, description: 'Return rankings with pagination' })
  async getAll(@Query() paginationDto: PaginationDto) {
    return this.rankingService.findAll(paginationDto);
  }
}