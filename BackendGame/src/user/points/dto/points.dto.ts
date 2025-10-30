import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class AssingPointsDto {
  @ApiProperty({
    example: 100,
    default: 100,
    type: Number,
    description: 'Points to assing',
  })
  @IsPositive()
  points: number;

  @ApiProperty({
    example: '1234567890',
    description: 'Cedula del usuario',
  })
  @IsString()
  @IsNotEmpty()
  cedula: string;
}
