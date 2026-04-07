import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { checkService } from '../../../src/checkers/services/checkServices.js';

class FakeSocket extends EventEmitter {
  setTimeout() {}
  destroy() {}
  removeAllListeners(): this { super.removeAllListeners(); return this; }
  connect() { return this; }
}

describe('checkService', () => {
  it('reports successful connect latency', async () => {
    const socket = new FakeSocket();
    const promise = checkService('db', 'localhost', 5432, () => socket as never);
    socket.emit('connect');
    await expect(promise).resolves.toMatchObject({ name: 'db', status: 'up', latencyMs: expect.any(Number) });
  });

  it('reports refused connections as down', async () => {
    const socket = new FakeSocket();
    const promise = checkService('db', 'localhost', 5432, () => socket as never);
    socket.emit('error', new Error('ECONNREFUSED'));
    await expect(promise).resolves.toEqual({ name: 'db', status: 'down', latencyMs: null });
  });

  it('reports timeouts as down', async () => {
    const socket = new FakeSocket();
    const promise = checkService('db', 'localhost', 5432, () => socket as never);
    socket.emit('timeout');
    await expect(promise).resolves.toEqual({ name: 'db', status: 'down', latencyMs: null });
  });

  it('reports dns failures as down', async () => {
    const socket = new FakeSocket();
    const promise = checkService('db', 'bad-host', 5432, () => socket as never);
    socket.emit('error', new Error('ENOTFOUND'));
    await expect(promise).resolves.toEqual({ name: 'db', status: 'down', latencyMs: null });
  });
});
