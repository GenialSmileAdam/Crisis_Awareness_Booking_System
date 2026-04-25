export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_next: boolean;
  };
}

export interface ApiError {
  message: string;
  status: number;
}
