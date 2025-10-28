import { HttpException, HttpStatus } from '@nestjs/common';

export class UsernameNotFoundException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}
