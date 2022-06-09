import { Request, Response, NextFunction } from 'express';
import { NotFoundError, HTTPError } from '../http/HTTPError';

export default (req: Request, res: Response, next: NextFunction) => {
  res.error = (err: Error | NotFoundError) => {
    const body: any = {
      errorCode: 'UNKNOWN'
    };

    res.status(500);

    if (err instanceof HTTPError) {
      res.status((err as HTTPError).statusCode);
      body.errorCode = err.code;
      body.errorMessage = err.message;
      body.statusCode = err.statusCode;
    } else {
      body.errorMessage = err.message;
    }

    if (res.statusCode !== 401) {
      console.error(`${res.statusCode} [${req.path}]`, err);
    }

    res.json(body);
  };

  next();
};
