export type PersonResponse = Record<string, any>;

export interface PersonListQuery {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}

export interface PaginatedPersons {
  data: PersonResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}