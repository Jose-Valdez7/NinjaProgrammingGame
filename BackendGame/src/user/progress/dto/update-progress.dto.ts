import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsInt()
  @Min(1)
  level: number;

  @IsInt()
  @Min(0)
  commandsUsed: number;

  @IsInt()
  @Min(0)
  timeTaken: number;

  @IsBoolean()
  energized: boolean;

  @IsBoolean()
  success: boolean;

  @IsOptional()
  @IsString()
  failureType?: 'void' | 'snake';
}
