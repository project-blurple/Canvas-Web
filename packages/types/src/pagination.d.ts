export interface Paginated<T> {
  total: number;
  page: number;
  size: number;
  entries: T[];
}
