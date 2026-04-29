"use client";

import {
  type UseMutateFunction,
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

type Satisfies<T extends BaseT, BaseT> = T;

interface LocalStorageValueTypes extends Satisfies<
  {
    "audio/cooldown-jingle": boolean;
    "audio/sound-fx": boolean;
  },
  { [key: string]: JsonDataType }
> {}

export type LocalStorageKey = keyof LocalStorageValueTypes;

const defaults = {
  "audio/cooldown-jingle": true,
  "audio/sound-fx": true,
} as const satisfies LocalStorageValueTypes;

export default function useLocalStorage<Key extends LocalStorageKey>(
  key: Key,
): [
  LocalStorageValueTypes[Key] | undefined,
  UseMutateFunction<void, Error, LocalStorageValueTypes[Key], unknown>,
] {
  const get = useCallback(() => {
    const raw = window.localStorage.getItem(key);
    try {
      return raw !== null ?
          (JSON.parse(raw) as LocalStorageValueTypes[Key])
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

  const { data } = useQuery<LocalStorageValueTypes[Key]>({
    queryKey: ["localStorage", key],
    queryFn: get,
  });

  const queryClient = useQueryClient();
  const set = useCallback(
    async (newValue: LocalStorageValueTypes[Key]) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(newValue));
        await queryClient.invalidateQueries({
          queryKey: ["localStorage", key],
        });
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
