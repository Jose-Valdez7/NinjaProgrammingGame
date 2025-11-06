import { Body, Controller, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { PointsService } from './points.service';
import { Roles } from '../../shared/auth/decorators/roles.decorator';
import { Role } from '../../shared/auth/enums/role.enums';
import { AuthGuard } from '../../shared/auth/guards/auth.guard';
import { RolesGuard } from '../../shared/auth/guards/roles.guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AssingPointsDto } from './dto/points.dto';
import { User } from '../../shared/auth/decorators/user.decorator';
import type { CurrentUser } from '../../shared/auth/interface/current-user.interfaces';

@Controller('points')
@ApiTags('Points')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.USER)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Post('assing')
  @ApiOperation({ summary: 'Assing points to a user' })
  @ApiResponse({ status: 200, description: 'Return the updated user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 403, description: 'No puedes asignar puntos a otro usuario' })
  async assingPoints(
    @Body() assingPointsDto: AssingPointsDto,
    @User() currentUser: CurrentUser,
  ) {
    // Validar que el usuario solo pueda asignar puntos a su propia cédula
    if (assingPointsDto.cedula !== currentUser.cedula) {
      throw new ForbiddenException('No puedes asignar puntos a otro usuario');
    }
    return this.pointsService.assingPoints(currentUser.id, assingPointsDto.points);
  }
}
