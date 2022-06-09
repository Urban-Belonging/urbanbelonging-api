import { NextFunction, Request, Response } from 'express';
import { UserModel } from '../../models/User';
import ApiKeyUserMap from '../auth/api-keys';
import { AuthError } from '../http/HTTPError';

export const apiKeyAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || typeof apiKey !== 'string') return res.error(new AuthError('Invalid API key provided'));

  const userId = ApiKeyUserMap[apiKey];
  if (!userId) return res.error(new AuthError('Invalid API key provided'));

  const user = await UserModel.findById(userId);
  if (!user) return res.error(new AuthError('Invalid API key provided'));

  req.user = user;

  next();
};
