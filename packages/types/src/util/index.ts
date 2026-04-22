export type Satisfies<T extends BaseT, BaseT> = T;

export type ValueOf<T> = T extends object ? T[keyof T] : never;
