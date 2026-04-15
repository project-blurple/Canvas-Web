export type ValueOf<T> = T extends object ? T[keyof T] : never;
