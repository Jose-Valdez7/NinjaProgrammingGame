import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Length,
  Matches,
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
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  @IsString({ message: 'El correo debe ser un texto' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @ApiProperty({
    description: 'Cedula del usuario',
    example: '1234567890',
  })
  @IsString({ message: 'La cédula debe ser un texto' })
  @IsNotEmpty({ message: 'Por favor ingresa tu cédula' })
  @Length(10, 10, { message: 'La cédula debe tener 10 dígitos' })
  @Matches(/^\d{10}$/, { message: 'La cédula solo puede contener números' })
  cedula: string;
  @ApiProperty({
    description: 'Telefono del usuario',
    example: '+593987654321',
  })
  @IsString({ message: 'El teléfono debe ser un texto' })
  @IsNotEmpty({ message: 'El número de teléfono es obligatorio' })
  @Length(10, 13, { message: 'El teléfono debe tener entre 10 y 13 caracteres' })  
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
