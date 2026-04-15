export type ValuesOf<T> = T extends object ? T[keyof T] : never;
