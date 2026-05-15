import { createLogger, format, transports, type Logger } from 'winston';
import { env, Environments, Logs } from '@/config';
import prismaProxy from './prisma';
import { v7 } from 'uuid';
import Transport from 'winston-transport';
import { getContext } from 'hono/context-storage';
import fastRedact from 'fast-redact';

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

const redact = fastRedact({
  paths: [
    // body
    'password',
    'confirmPassword',
    'oldPassword',

    // auth
    'token',
    'accessToken',
    'refreshToken',
    'authorization',

    // headers
    'headers.authorization',
    'headers.cookie',
    'cookie',

    // api keys
    'apiKey',
    'secret',
    'clientSecret',

    // nested
    '*.password',
    '*.token',
    '*.accessToken',
    '*.refreshToken',
    '*.authorization',

    '*.*.password',
    '*.*.token',
    '*.*.authorization',
  ],

  censor: '[REDACTED]',
});

class PrismaTransport extends Transport {
  async log(info: any, callback: () => void) {
    try {
      if (info.level !== 'http') {
        callback();
        return;
      }

      const context = getContext()
      const metadata = info.metadata
        ? JSON.parse(redact(info.metadata))
        : null;

      await prismaProxy.traceSpan.create({
        data: {
          id: v7(),
          traceId: context.get('traceId'),
          json: metadata,
          context: info.message,
          durationMs: 0,
        }
      });
    } catch (err) {
      console.error(err);
    }

    callback();
  }
}

const logFormat = format.combine(
  format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label', 'ms'] }),
  format.label({ label: env.NODE_ENV }),
  format.ms(),
  format.json(),
  format.splat(),
);

let logger: Logger;

try {
  logger = createLogger({
    level: 'silly',
    format: logFormat,
    transports: [
      new PrismaTransport(), 
      env.LOG === Logs.VERBOSE ? new transports.Console() : null
    ].filter(notEmpty),
  });
} catch (err) {
  console.error('Failed to initialize logger', err);
  logger = createLogger();
}

export default logger;
