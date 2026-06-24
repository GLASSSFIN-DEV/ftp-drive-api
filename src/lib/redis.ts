
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Redis } from 'ioredis';
import { getContext } from 'hono/context-storage';
import logger from './logger.js';
import { env } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REDIS_CERT = process.env.REDIS_CERT;
let instance: Redis | null = null;

function createRedisClient(): Redis {
  const client = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null,
    password: process.env.REDIS_PASSWORD,
    tls: REDIS_CERT ? { cert: fs.readFileSync(path.resolve(__dirname, REDIS_CERT)) } : undefined,
  });

  client.on('error', (err: Error) =>
    logger.warn('redisConnection: ' + err.message)
  );
  client.on('connect', () =>
    logger.info('redisConnection: OK ' + env.REDIS_HOST)
  );

  return client;
}

export function getRedisClient(): Redis {
  if (!instance) {
    instance = createRedisClient();
  }
  return instance;
}

export function getRedis(): Redis {
  try {
    const context = getContext();
    const fromCtx = context.get('redis');
    if (fromCtx) return fromCtx;
  } catch {
    // outside request context — fall back to singleton
  }
  
  return getRedisClient();
}

const redis = getRedisClient();

export { redis };
export default redis;
