import { Request, Response, NextFunction } from 'express';
import { PaginationRequest } from '../../@types/pagination';

export default (req: Request, res: Response, next: NextFunction) => {
  res.success = (data: any) => {
    const body: any = {
      result: data
    };

    const maybePaginationReq = req as PaginationRequest<typeof req>;

    if (
      maybePaginationReq.skip !== undefined &&
      maybePaginationReq.limit !== undefined &&
      maybePaginationReq.total !== undefined
    ) {
      body.skip = maybePaginationReq.skip;
      body.limit = maybePaginationReq.limit;
      body.total = maybePaginationReq.total;
    }

    res.status(200);
    res.json(body);
  };

  next();
};
