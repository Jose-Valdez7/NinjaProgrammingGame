import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class SearchDto extends PaginationDto {
  @IsString()
  @IsOptional()
  search?: string | null;
}
