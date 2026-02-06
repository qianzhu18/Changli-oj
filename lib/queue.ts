import { Queue } from 'bullmq';
import IORedis from 'ioredis';

let connection: IORedis | null = null;

export function getRedisConnection() {
  if (connection) return connection;
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  connection = new IORedis(url, { maxRetriesPerRequest: null });
  return connection;
}

export function getParseQueue() {
  return new Queue('quiz-parse-queue', { connection: getRedisConnection() });
}
