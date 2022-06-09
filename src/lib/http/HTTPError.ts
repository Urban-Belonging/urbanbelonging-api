import { AxiosResponse } from 'axios';

export class HTTPError extends Error {
  statusCode: number;
  code: string;
  response: AxiosResponse<any>;
  constructor(data?: any) {
    super(data);
  }
}

export class NotFoundError extends HTTPError {
  constructor(data?: any) {
    super(data);
    this.statusCode = 404;
    this.code = 'NOT_FOUND';
  }
}

export class BadRequestError extends HTTPError {
  constructor(data?: any) {
    super(data);
    this.statusCode = 400;
    this.code = 'BAD_REQUEST';
  }
}

export class ForbiddenError extends HTTPError {
  constructor(data?: any) {
    super(data);
    this.statusCode = 403;
    this.code = 'FORBIDDEN';
  }
}

export class AuthError extends HTTPError {
  constructor(data?: any) {
    super(data);
    this.statusCode = 401;
    this.code = 'AUTH';
  }
}
