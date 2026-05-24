export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  has_next: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface ApiError {
  message: string;
  status: number;
}
