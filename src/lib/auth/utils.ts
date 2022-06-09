import * as crypto from 'crypto';

export function randomString(count = 5) {
  return crypto.randomBytes(count).toString('hex');
}
