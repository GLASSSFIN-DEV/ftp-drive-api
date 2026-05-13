import { createLogger, format, transports, type Logger } from 'winston';
import { AsyncLocalStorage } from 'node:async_hooks';
import { env } from '@/config';

const logFormat = format.combine(
  format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label', 'ms'] }),
  format.label({ label: env.NODE_ENV }),
  format.ms(),
  format.json(),
);

let logger: Logger;

try {
  logger = createLogger({
    level: 'debug',
    format: logFormat,
    transports: [new transports.Console()],
  });
} catch (err) {
  console.error('Failed to initialize logger', err);
  logger = createLogger();
}

export const store = new AsyncLocalStorage<{ traceId?: string; }>();
export default logger;
