import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../../shared/auth/guards/auth.guard';
import { RolesGuard } from '../../shared/auth/guards/roles.guard';
import { Roles } from '../../shared/auth/decorators/roles.decorator';
import { Role } from '../../shared/auth/enums/role.enums';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Controller('users')
@ApiTags('Users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Return users with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' }) 
  async getAll(@Query() paginationDto: PaginationDto) {
    return this.userService.findAll(paginationDto);
  }
}
