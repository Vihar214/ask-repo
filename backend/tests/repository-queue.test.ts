import { describe, expect, it, vi } from 'vitest';

import { RedisRepositoryQueue } from '../src/index.js';

describe('RedisRepositoryQueue', () => {
  it('writes a Kombu-compatible Celery task envelope', async () => {
    const redis = { lpush: vi.fn().mockResolvedValue(1) };
    const queue = new RedisRepositoryQueue(redis as never);

    const payload = {
      repositoryJobId: 'job-1',
      repositoryId: 'repo-1',
      url: 'https://github.com/openai/foo',
      isPrivate: false,
      privateRepositoryToken: null,
      replaceRepositoryId: null,
    };

    await queue.enqueueCloneAndCount(payload);

    expect(redis.lpush).toHaveBeenCalledOnce();
    const [queueName, rawMessage] = redis.lpush.mock.calls[0];
    const message = JSON.parse(rawMessage);

    expect(queueName).toBe('celery');
    expect(message['content-type']).toBe('application/json');
    expect(message['content-encoding']).toBe('utf-8');
    expect(message.content_type).toBeUndefined();
    expect(message.content_encoding).toBeUndefined();
    expect(message.headers).toMatchObject({
      lang: 'py',
      task: 'worker.clone_and_count',
    });

    const body = JSON.parse(
      Buffer.from(message.body, 'base64').toString('utf8'),
    );
    expect(body).toEqual([
      [payload],
      {},
      {
        callbacks: null,
        errbacks: null,
        chain: null,
        chord: null,
      },
    ]);
  });
});
