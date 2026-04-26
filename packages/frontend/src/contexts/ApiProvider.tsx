"use client";

import ky, { KyInstance, type Options as KyOptions } from "ky";
import { createContext, useContext, useState } from "react";
import config from "@/config";

import { UsageError } from "@/util/errors";

const defaultKyOptions = {
  baseUrl: config.apiUrl,
} as const satisfies KyOptions;

const ApiContext = createContext<KyInstance | undefined>(undefined);

export function ApiProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [api] = useState<KyInstance>(() => ky.create(defaultKyOptions));
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApiContext(): KyInstance {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new UsageError(
      "`useApiContext` called from outside any `<ApiProvider>`",
    );
  }
  return context;
}
