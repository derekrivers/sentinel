import net from 'node:net';
import type { SentinelConfig, ServiceCheckResult } from '../../types.js';

export type SocketFactory = () => net.Socket;

export async function checkService(
  name: string,
  host: string,
  port: number,
  createSocket: SocketFactory = () => new net.Socket()
): Promise<ServiceCheckResult> {
  return new Promise((resolve) => {
    const socket = createSocket();
    const started = Date.now();

    const finish = (status: 'up' | 'down', latencyMs: number | null) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve({ name, status, latencyMs });
    };

    socket.setTimeout(2000);
    socket.once('connect', () => finish('up', Date.now() - started));
    socket.once('timeout', () => finish('down', null));
    socket.once('error', () => finish('down', null));
    socket.connect(port, host);
  });
}

export async function checkServices(services: SentinelConfig['services']): Promise<ServiceCheckResult[]> {
  return Promise.all(services.map((service) => checkService(service.name, service.host, service.port)));
}
