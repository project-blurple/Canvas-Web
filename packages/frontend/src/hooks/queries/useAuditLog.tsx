"use client";

import type { AuditLogPage } from "@blurple-canvas-web/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

const DEFAULT_LIMIT = 50;

export function useAuditLog(filters: AuditLogFilters) {
  return useInfiniteQuery<AuditLogPage>({
    queryKey: ["auditLog", filters],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const response = await axios.get<AuditLogPage>(
        `${config.apiUrl}/api/v1/audit-log`,
        {
          params: {
            actorId: filters.actorId || undefined,
            action: filters.action || undefined,
            resourceType: filters.resourceType || undefined,
            resourceId: filters.resourceId || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
            limit: filters.limit ?? DEFAULT_LIMIT,
            cursor: pageParam ?? undefined,
          },
          signal,
          withCredentials: true,
        },
      );
      return response.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
  });
}
