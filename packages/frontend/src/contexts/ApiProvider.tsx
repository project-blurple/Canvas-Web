"use client";

import ky, { type KyInstance } from "ky";
import { createContext, useContext } from "react";
import config from "@/config";

import { UsageError } from "@/util/errors";

const ApiContext = createContext<KyInstance | undefined>(undefined);

const api = ky.create({ baseUrl: new URL("/api/v1/", config.apiUrl) });

export function ApiProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
