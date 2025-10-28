import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive } from 'class-validator';

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
}
