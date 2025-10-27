import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../enums/role.enums';

export class RegisterUserDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
  })
  @IsNotEmpty()
  @IsString()  
  firstName: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez',
  })
  @IsNotEmpty()
  @IsString()  
  lastName: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'usuario@ejemplo.com',
    format: 'email',
  })
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Cedula del usuario',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)  
  cedula: string;
  @ApiProperty({
    description: 'Telefono del usuario',
    example: '+593987654321',
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 13)  
  phone: string;

  @ApiProperty({
    description: 'Rol del usuario',
    example: Role.USER,
  })
  @IsEnum(Role, {
    message: 'El rol debe ser uno de los valores definidos en Role',
  })
  @IsNotEmpty()
  role: Role;
}
