import * as redis from 'redis';
import config from '../../config';

let client: redis.RedisClient;

export const Redis = {
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      client = redis.createClient({
        host: config.redisHost
      });

      client.on('ready', () => {
        console.log('[Redis] Connection ready');
        resolve();
      });
      client.on('error', (err) => console.log('[Redis] Error: ', err));
      client.on('reconnecting', () => console.log('[Redis] Reconnecting...'));
      client.on('end', () => console.log('[Redis] Connection end'));
    });
  },
  async set(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      client.set(key, value, (err, response) => {
        if (err) return reject(err);
        resolve();
      });
    });
  },
  async get(key: string) {
    return new Promise((resolve, reject) => {
      client.get(key, (err, value) => {
        if (err) return reject(err);
        resolve(value);
      });
    });
  },
  async delete(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      client.del(key, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};
