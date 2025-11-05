import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../../shared/auth/guards/auth.guard';
import { RolesGuard } from '../../shared/auth/guards/roles.guard';
import { Roles } from '../../shared/auth/decorators/roles.decorator';
import { Role } from '../../shared/auth/enums/role.enums';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';

@Controller('users')
@ApiTags('Users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregate user stats' })
  @ApiResponse({ status: 200, description: 'Return admin dashboard stats' })
  async getSummary() {
    return this.userService.getSummary();
  }

  @Get()
  @ApiOperation({ summary: 'Get all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Return users with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' }) 
  async getAll(@Query() paginationDto: AdminUserQueryDto) {
    return this.userService.findAll(paginationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by id' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
    return { ok: true };
  }
}
