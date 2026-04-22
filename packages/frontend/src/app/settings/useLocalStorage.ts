"use client";

import {
  UseMutateFunction,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";

type JsonDataType =
  | boolean
  | null
  | number
  | string
  | JsonDataType[]
  | { [key: string]: JsonDataType };

type AssertSatisfies<T extends BaseT, BaseT> = T;

interface LocalStorageValueTypes extends AssertSatisfies<
  {
    "cooldown-jingle": boolean;
    "sound-fx": boolean;
    webfonts: boolean;
  },
  { [key: string]: JsonDataType }
> {}

export type LocalStorageKey = keyof LocalStorageValueTypes;

const defaults = {
  "cooldown-jingle": true,
  "sound-fx": true,
  webfonts: true,
} as const satisfies LocalStorageValueTypes;

export default function useLocalStorage<KeyT extends LocalStorageKey>(
  key: KeyT,
): [
  LocalStorageValueTypes[KeyT] | undefined,
  UseMutateFunction<void, Error, LocalStorageValueTypes[KeyT], unknown>,
] {
  const get = useCallback(() => {
    const raw = window.localStorage.getItem(key);
    try {
      return raw !== null ?
          (JSON.parse(raw) as LocalStorageValueTypes[KeyT])
        : defaults[key];
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
      console.log(
        "Failed to parse localStorage value as JSON. Returning default value.",
        { key, value: raw },
      );
      return defaults[key];
    }
  }, [key]);

  const { data } = useQuery<LocalStorageValueTypes[KeyT]>({
    queryKey: ["localStorage", key],
    queryFn: get,
  });

  const queryClient = useQueryClient();
  const set = useCallback(
    async (newValue: LocalStorageValueTypes[KeyT]) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(newValue));
        console.time("invalidate");
        await queryClient.invalidateQueries({
          queryKey: ["localStorage", key],
        });
        console.timeEnd("invalidate");
      } catch (e) {
        console.error(e); // TODO: Reveal this error to user
      }
    },
    [key, queryClient],
  );

  const { mutate } = useMutation({
    mutationKey: ["localStorage", key],
    mutationFn: set,
  });

  return [data, mutate];
}
