import { Request, Response, NextFunction } from 'express';
import { PaginationRequest } from '../../@types/pagination';

export default (
  req: PaginationRequest<
    Request<unknown, unknown, { skip: string; limit: string }>
  >,
  res: Response,
  next: NextFunction
) => {
  req.skip = parseInt(req.query.skip as string, 10) || 0;
  req.limit = parseInt(req.query.limit as string, 10) || 50;

  next();
};
