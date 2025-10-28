import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T> {
  @ApiProperty()
  status: HttpStatus;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data: T;

  @ApiProperty()
  timestamp: string;

  constructor(data: T, message = 'Success') {
    this.status = HttpStatus.OK;
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }
}
