import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/shared/auth/guards/auth.guard';
import { RolesGuard } from '@/shared/auth/guards/roles.guard';
import { Roles } from '@/shared/auth/decorators/roles.decorator';
import { Role } from '@/shared/auth/enums/role.enums';
import { User } from '@/shared/auth/decorators/user.decorator';
import type { CurrentUser } from '@/shared/auth/interface/current-user.interfaces';
import { UserProgressService } from './progress.service';
import { UpdateProgressDto } from './dto/update-progress.dto';

@ApiTags('User Progress')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.USER, Role.ADMIN)
@Controller('user/progress')
export class UserProgressController {
  constructor(private readonly userProgressService: UserProgressService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener progreso del usuario actual' })
  @ApiResponse({ status: 200, description: 'Devuelve el nivel máximo completado del usuario.' })
  async getProgress(@User() currentUser: CurrentUser) {
    const maxLevelCompleted = await this.userProgressService.getMaxCompletedLevel(
      currentUser.id,
    );

    return {
      maxLevelCompleted,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Registrar progreso de nivel del usuario' })
  @ApiResponse({ status: 201, description: 'Progreso registrado correctamente.' })
  async saveProgress(
    @User() currentUser: CurrentUser,
    @Body() progress: UpdateProgressDto,
  ) {
    await this.userProgressService.saveProgress(currentUser.id, progress);
    return { ok: true };
  }
}
