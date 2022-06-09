import * as express from 'express';
import { NextFunction } from 'connect';
import { PaginationRequestParams } from './pagination';

declare module 'express' {
  interface Request {}

  interface Response<ResBody = any, Locals extends Record<string, any> = Record<string, any>> {
    success: (body: ResBody) => void;
    error: (error?: any) => void;
    noContent: () => void;
  }
}
