import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiException } from './api.exception';
import { ResourceNotFoundException } from './resource-not-found.exception';
import { UnauthorizedException } from './unauthorized.exception';
import { ResourceAlreadyExistsException } from './resource-already-exists.exception';
import { UsernameNotFoundException } from './username-not-found.exception';

interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status: HttpStatus;
    let message: string;

    if (exception instanceof ApiException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    } else if (exception instanceof ResourceNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
    } else if (exception instanceof UnauthorizedException) {
      status = HttpStatus.UNAUTHORIZED;
      message = exception.message;
    } else if (exception instanceof ResourceAlreadyExistsException) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
    } else if (exception instanceof UsernameNotFoundException) {
      status = HttpStatus.UNAUTHORIZED;
      message = exception.message;
    } else if (exception instanceof BadRequestException) {
      status = HttpStatus.BAD_REQUEST;
      const exceptionResponse = exception.getResponse() as any;

      // Manejo de errores de validación
      if (typeof exceptionResponse === 'object' && exceptionResponse.message) {
        if (Array.isArray(exceptionResponse.message)) {
          message = exceptionResponse.message.join(', ');
        } else {
          message = exceptionResponse.message;
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        message = (exceptionResponse as any).message || exception.message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Error interno del servidor';

      // En desarrollo, mostrar el error completo
      if (process.env.NODE_ENV === 'development') {
        message = exception.message;
        console.error('Error stack:', exception.stack);
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Error interno del servidor';
    }

    const errorBody: ErrorResponse = this.buildResponse(
      message,
      status,
      request.url,
    );

    response.status(status).json(errorBody);
  }

  private buildResponse(
    message: string,
    status: HttpStatus,
    path?: string,
  ): ErrorResponse {
    return {
      timestamp: new Date().toISOString(),
      status: status,
      error: this.getHttpStatusText(status),
      message: message,
      ...(path && { path }),
    };
  }

  private getHttpStatusText(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      default:
        return 'Error';
    }
  }
}
