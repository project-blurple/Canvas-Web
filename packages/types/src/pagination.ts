import z from "zod";

export const paginatedSchema = <Item extends z.ZodType>(item: Item) =>
  z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().nonnegative(),
    size: z.number().int().nonnegative(),
    entries: z.array(item),
  });

export type Paginated<T> = {
  total: number;
  page: number;
  size: number;
  entries: T[];
};
