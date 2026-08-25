import { Redis } from 'ioredis';
import crypto from 'crypto';
import type { CloneAndCountPayload, RepositoryQueue } from './types.js';

export class RedisRepositoryQueue implements RepositoryQueue {
  constructor(private redis: Redis) {}

  async enqueueCloneAndCount(payload: CloneAndCountPayload) {
    const taskId = crypto.randomUUID();
    await this.redis.lpush(
      'celery',
      JSON.stringify({
        body: Buffer.from(
          JSON.stringify([
            [payload],
            {},
            {
              callbacks: null,
              errbacks: null,
              chain: null,
              chord: null,
            },
          ]),
        ).toString('base64'),
        content_encoding: 'utf-8',
        content_type: 'application/json',
        headers: {
          lang: 'py',
          task: 'worker.clone_and_count',
          id: taskId,
          root_id: taskId,
          parent_id: null,
          group: null,
        },
        properties: {
          correlation_id: taskId,
          reply_to: taskId,
          delivery_mode: 2,
          delivery_info: {
            exchange: '',
            routing_key: 'celery',
          },
          priority: 0,
          body_encoding: 'base64',
          delivery_tag: taskId,
        },
      }),
    );
  }
}
