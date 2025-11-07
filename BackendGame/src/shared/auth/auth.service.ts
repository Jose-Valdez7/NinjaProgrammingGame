import {
  BadRequestException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CurrentUser } from './interface/current-user.interfaces';
import { PrismaService } from '../database/prisma.service';
import {
  ResourceAlreadyExistsException,
  UsernameNotFoundException,
} from '../../common/exceptions';
import { LoggerService } from '../logger/logger.service';
import { BaseResponseDto } from '../../common/dtos/response.dto';
import { Role } from './enums/role.enums';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly loggerService: LoggerService,
  ) {}

  async register(
    registerUserDto: RegisterUserDto,
  ): Promise<BaseResponseDto<any>> {
    try {
      const { firstName, lastName, email, cedula, phone, role } = registerUserDto;

      // Verificar si el usuario ya existe
      const existingUser = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ResourceAlreadyExistsException(
          'El usuario con este email ya existe',
        );
      }

      // Verificar si la cédula ya existe
      const existingCedula = await this.prismaService.user.findUnique({
        where: { cedula },
      });

      if (existingCedula) {
        throw new ResourceAlreadyExistsException(
          'Ya existe un usuario con esta cédula',
        );
      }

      // Crear el usuario en la base de datos
      // La cédula se guarda sin hashear para poder usarla como contraseña
      const newUser = await this.prismaService.user.create({
        data: {
          email,
          firstName,
          lastName, 
          cedula,  
          phone,
          role: Role.USER,
        },
      });

      // Limpiar tokens revocados si el usuario ya existía (caso edge)
      await this.cleanupRevokedTokens(newUser.id.toString());

      const tokens = await this.generateTokens(newUser);

      const userResponse = {
        user: {
          id: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          cedula: newUser.cedula,
          phone: newUser.phone,
          email: newUser.email,
          role: newUser.role,
        },
        ...tokens,
      };

      return {
        status: HttpStatus.CREATED,
        message: 'Usuario registrado exitosamente',
        data: userResponse,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ResourceAlreadyExistsException) {
        throw error;
      }

      this.loggerService.error('Error en el registro de usuario', error);
      throw new BadRequestException('Error en el registro de usuario');
    }
  }

  async login(loginUserDto: LoginUserDto): Promise<BaseResponseDto<any>> {
    try {
      console.log('🔐 Iniciando proceso de login...');
      const { email, cedula } = loginUserDto;
      console.log(`📧 Email recibido: ${email}`);

      // Buscar el usuario en la base de datos
      console.log('🔍 Buscando usuario en la base de datos...');
      const user = await this.prismaService.user.findUnique({
        where: { email },
      });
      console.log(`✅ Consulta a base de datos completada. Usuario encontrado: ${!!user}`);

      if (!user) {
        console.log('❌ Usuario no encontrado');
        throw new UsernameNotFoundException('Credenciales inválidas');
      }

      // Verificar cédula
      // La cédula se compara directamente ya que se almacena sin hashear
      console.log('🔐 Verificando cédula...');
      if (user.cedula !== cedula) {
        console.log('❌ Cédula inválida');
        throw new UnauthorizedException('Cedula inválida');
      }
      
      // Generar tokens para el usuario
      console.log('🎫 Generando tokens...');
      const tokens = await this.generateTokens(user);
      console.log('✅ Tokens generados exitosamente');

      const userResponse = {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          cedula: user.cedula,
          phone: user.phone,
          email: user.email,
          role: user.role,
        },
        ...tokens,
      };

      console.log('📤 Preparando respuesta de login exitoso...');
      const response = {
        status: HttpStatus.OK,
        message: 'Inicio de sesión exitoso',
        data: userResponse,
        timestamp: new Date().toISOString(),
      };
      console.log('✅ Respuesta de login preparada, retornando...');
      return response;
    } catch (error) {
      console.error('❌ Error en proceso de login:', error);
      if (error instanceof UsernameNotFoundException) {
        console.log('🚫 Lanzando UsernameNotFoundException');
        throw error;
      }
      if (error instanceof UnauthorizedException) {
        console.log('🚫 Lanzando UnauthorizedException');
        throw error;
      }

      this.loggerService.error('Error en el inicio de sesión', error);
      console.log('🚫 Lanzando BadRequestException');
      throw new BadRequestException('Error en el inicio de sesión');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verificar el refresh token
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret',
      });

      // Verificar que es un refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Tipo de token inválido');
      }

      // Buscar todos los refresh tokens del usuario que no estén revocados
      const storedTokens = await this.prismaService.refreshToken.findMany({
        where: {
          userId: payload.id,
          isRevoked: false,
        },
        include: { user: true },
      });

      // Buscar el token que coincida
      let matchedToken: (typeof storedTokens)[0] | null = null;
      for (const storedToken of storedTokens) {
        const isMatch = await bcrypt.compare(refreshToken, storedToken.token);
        if (isMatch) {
          matchedToken = storedToken;
          break;
        }
      }

      // Si no existe o está revocado, es inválido
      if (!matchedToken) {
        throw new UnauthorizedException(
          'Token de actualización inválido o revocado',
        );
      }

      // Verificar si ha expirado
      if (new Date() > matchedToken.expiresAt) {
        // Marcar como revocado si ha expirado
        await this.prismaService.refreshToken.update({
          where: { id: matchedToken.id },
          data: { isRevoked: true },
        });
        throw new UnauthorizedException('Token de actualización expirado');
      }

      // Revocar el refresh token usado (one-time use)
      await this.prismaService.refreshToken.update({
        where: { id: matchedToken.id },
        data: { isRevoked: true },
      });

      // Generar nuevos tokens
      const user = matchedToken.user;
      const tokens = await this.generateTokens(user);

      return {
        status: HttpStatus.OK,
        message: 'Tokens renovados exitosamente',
        data: {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            cedula: user.cedula,
            phone: user.phone,
            email: user.email,
            role: user.role,
          },
          ...tokens,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.loggerService.error('Error renovando tokens', error);
      throw new UnauthorizedException('Token de actualización inválido');
    }
  }

  async logout(refreshToken: string) {
    try {
      if (!refreshToken) {
        throw new BadRequestException('Token de actualización requerido');
      }

      // Buscar todos los refresh tokens que no estén revocados
      const storedTokens = await this.prismaService.refreshToken.findMany({
        where: {
          isRevoked: false,
        },
      });

      // Buscar el token que coincida
      let matchedToken: (typeof storedTokens)[0] | null = null;
      for (const storedToken of storedTokens) {
        const isMatch = await bcrypt.compare(refreshToken, storedToken.token);
        if (isMatch) {
          matchedToken = storedToken;
          break;
        }
      }

      if (matchedToken) {
        // Revocar el refresh token
        await this.prismaService.refreshToken.update({
          where: { id: matchedToken.id },
          data: { isRevoked: true },
        });
      }

      return {
        status: HttpStatus.OK,
        message: 'Sesión cerrada exitosamente',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.loggerService.error('Error cerrando sesión', error);
      throw new BadRequestException('Error cerrando sesión');
    }
  }

  private async generateTokens(user: any) {
    const payload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      cedula: user.cedula,
      phone: user.phone,
      role: user.role,
    };

    // Access Token (corta duración)
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      expiresIn: '60m', // 60 minutos
    });

    // Refresh Token (larga duración)
    const refreshToken = await this.jwtService.signAsync(
      {
        ...payload,
        type: 'refresh', // Marca que es un refresh token
      },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret',
        expiresIn: '7d', // 7 días
      },
    );

    // Guardar el refresh token hasheado en la base de datos
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días

    await this.prismaService.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 60 * 60, // 60 minutos en segundos
    };
  }

  private async cleanupRevokedTokens(userId: string): Promise<void> {
    try {
      const now = new Date();

      // Eliminar tokens que están revocados O que han expirado
      const deletedTokens = await this.prismaService.refreshToken.deleteMany({
        where: {
          userId,
          OR: [
            { isRevoked: true }, // Tokens revocados
            { expiresAt: { lt: now } }, // Tokens expirados
          ],
        },
      });

      this.loggerService.log(
        `Limpieza de tokens para usuario ${userId}: ${deletedTokens.count} tokens eliminados`,
      );
    } catch (error) {
      this.loggerService.error(
        `Error limpiando tokens para usuario ${userId}`,
        error,
      );
    }
  }

  async cleanupAllRevokedTokens(): Promise<{ deletedCount: number }> {
    try {
      const now = new Date();

      // Eliminar todos los tokens revocados o expirados de todos los usuarios
      const deletedTokens = await this.prismaService.refreshToken.deleteMany({
        where: {
          OR: [
            { isRevoked: true }, // Tokens revocados
            { expiresAt: { lt: now } }, // Tokens expirados
          ],
        },
      });

      this.loggerService.log(
        `Limpieza global de tokens: ${deletedTokens.count} tokens eliminados`,
      );

      return { deletedCount: deletedTokens.count };
    } catch (error) {
      this.loggerService.error('Error en limpieza global de tokens', error);
      throw new BadRequestException('Error en limpieza de tokens');
    }
  }
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<BaseResponseDto<any>> {
    try {
      const { token, newPassword, confirmPassword } = resetPasswordDto;

      if (newPassword !== confirmPassword) {
        throw new BadRequestException('Las contraseñas no coinciden');
      }

      // Buscar el token en la base de datos
      const passwordResetToken =
        await this.prismaService.passwordResetToken.findUnique({
          where: { token },
          include: { user: true },
        });

      if (!passwordResetToken) {
        throw new BadRequestException('Token de restablecimiento inválido');
      }

      if (passwordResetToken.used) {
        throw new BadRequestException('Token de restablecimiento ya utilizado');
      }

      if (new Date() > passwordResetToken.expiresAt) {
        throw new BadRequestException('Token de restablecimiento expirado');
      }

      // Verificar que la nueva contraseña sea diferente de la actual
      if (passwordResetToken.user.cedula === newPassword) {
        throw new BadRequestException(
          'La nueva contraseña debe ser diferente de la actual',
        );
      }

      // Actualizar la cédula/contraseña del usuario (se guarda sin hashear)
      await this.prismaService.user.update({
        where: { id: passwordResetToken.userId },
        data: { cedula: newPassword },
      });

      // Marcar el token como usado
      await this.prismaService.passwordResetToken.update({
        where: { id: passwordResetToken.id },
        data: { used: true },
      });

      // Invalidar todos los refresh tokens del usuario por seguridad
      await this.prismaService.refreshToken.updateMany({
        where: { userId: passwordResetToken.userId },
        data: { isRevoked: true },
      });

      return {
        status: HttpStatus.OK,
        message: 'Contraseña restablecida exitosamente',
        data: null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.loggerService.error('Error en reset password', error);
      throw new BadRequestException('Error restableciendo la contraseña');
    }
  }

  /*   async validateUser(payload: any): Promise<CurrentUser> {
    // Aquí puedes hacer validaciones adicionales si es necesario
    return {
      id: payload.id,
      email: payload.email,
      roles: payload.roles || ['user'], // Asegura que siempre tenga roles
    };
  } */
}
