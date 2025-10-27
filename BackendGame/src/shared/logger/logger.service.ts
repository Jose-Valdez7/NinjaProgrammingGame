import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService extends Logger {
  constructor() {
    super('AppLogger');
  }

  logInfo(message: string, context?: string) {
    this.log(message, context);
  }

  logError(message: string, trace?: string, context?: string) {
    this.error(message, trace, context);
  }

  logWarn(message: string, context?: string) {
    this.warn(message, context);
  }

  logDebug(message: string, context?: string) {
    this.debug(message, context);
  }

  logVerbose(message: string, context?: string) {
    this.verbose(message, context);
  }
}
