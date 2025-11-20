import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, IsString } from 'class-validator';

export class PaginationDto {
  @ApiProperty({
    example: 1,
    default: 1,
    type: Number,
    description: 'Page number',
  })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @ApiProperty({
    example: 1,
    default: 1,
    type: Number,
    description: 'Page limit',
  })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  limit: number = 10;

  @ApiProperty({
    example: 'Enrique',
    required: false,
    type: String,
    description: 'Optional search by user first or last name',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
