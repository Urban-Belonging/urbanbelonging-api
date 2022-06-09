export interface PaginationRequestParams {
  skip: number;
  limit: number;
  total?: number;
}

export interface PaginationResponseParams {
  total: number;
  skip: number;
  limit: number;
}

export type PaginationRequest<T> = T & PaginationRequestParams;
export type PaginationResponse<T> = T & PaginationResponseParams;
