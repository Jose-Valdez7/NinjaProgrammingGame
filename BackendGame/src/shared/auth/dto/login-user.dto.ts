import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
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
}
