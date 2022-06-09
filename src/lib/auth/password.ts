import * as bcrypt from 'bcrypt';

const saltRounds = 10;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return await bcrypt.hash(plainTextPassword, saltRounds);
}

export async function comparePassword(plainTextPassword: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
}

export function validatePassword(password: string) {
  // better validation
  if (!password || password.length < 8) {
    return false;
  }
  return true;
}
