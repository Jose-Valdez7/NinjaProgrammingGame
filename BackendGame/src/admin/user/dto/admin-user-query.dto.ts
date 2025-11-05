import { PaginationDto } from '../../../common/dtos/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class AdminUserQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
}
