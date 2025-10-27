import { HttpException, HttpStatus } from '@nestjs/common';

export class ResourceAlreadyExistsException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT);
  }
}
