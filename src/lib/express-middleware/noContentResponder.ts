import { Request, Response, NextFunction } from 'express';

export default (req: Request, res: Response, next: NextFunction) => {
  res.noContent = () => {
    res.status(204).send();
  };

  next();
};
