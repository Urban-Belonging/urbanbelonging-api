import { User } from '../models/User';

export type AuthenticatedRequest<T> = T & {
  user: User;
};
