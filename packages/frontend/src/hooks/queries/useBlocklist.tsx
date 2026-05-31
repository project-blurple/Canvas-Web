import type { BlocklistRequest } from "@blurple-canvas-web/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import config from "@/config/clientConfig";
import { isUnauthorizedError } from "@/util";

export function useBlocklist() {
  const getBlocklist = async (): Promise<BlocklistRequest.BlocklistResBody> => {
    const url = `${config.apiUrl}/api/v1/blocklist`;

    const response = await axios.get<BlocklistRequest.BlocklistResBody>(url, {
      withCredentials: true,
    });
    return response.data;
  };

  return useQuery<BlocklistRequest.BlocklistResBody>({
    queryKey: ["blocklist"],
    queryFn: getBlocklist,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });
}

export function useBlocklistMutations() {
  const queryClient = useQueryClient();

  const addToBlocklistMutation = useMutation({
    mutationKey: ["blocklist", "add"],
    mutationFn: async (ids: bigint[]) => {
      const url = `${config.apiUrl}/api/v1/blocklist`;
      await axios.put(
        url,
        { userId: ids.map((id) => id.toString()) },
        { withCredentials: true },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocklist"] }),
  });

  const removeFromBlocklistMutation = useMutation({
    mutationKey: ["blocklist", "remove"],
    mutationFn: async ({
      ids,
      shouldRestoreHistoryForCanvasId,
    }: {
      ids: bigint[];
      shouldRestoreHistoryForCanvasId?: number[];
    }) => {
      const url = `${config.apiUrl}/api/v1/blocklist`;
      await axios.delete(url, {
        data: {
          userId: ids.map((id) => id.toString()),
          shouldRestoreHistoryForCanvasId,
        },
        withCredentials: true,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocklist"] }),
  });

  async function handleAdd(ids: Iterable<bigint>) {
    const arr = Array.from(ids);
    toast.promise(addToBlocklistMutation.mutateAsync(arr), {
      loading: `Adding ${arr.length} user${arr.length > 1 ? "s" : ""} to blocklist…`,
      success: `Added ${arr.length} user${arr.length > 1 ? "s" : ""} to blocklist`,
      error: (error) =>
        isUnauthorizedError(error) ?
          "Your session has expired. Please log in again."
        : "Failed to add users to blocklist",
    });
  }

  async function handleRemove(
    ids: Iterable<bigint>,
    shouldRestoreHistoryForCanvasId: number[] = [],
  ) {
    const arr = Array.from(ids);
    toast.promise(
      removeFromBlocklistMutation.mutateAsync({
        ids: arr,
        shouldRestoreHistoryForCanvasId,
      }),
      {
        loading: `Removing ${arr.length} user${arr.length > 1 ? "s" : ""} from blocklist…`,
        success: `Removed ${arr.length} user${arr.length > 1 ? "s" : ""} from blocklist`,
        error: (error) =>
          isUnauthorizedError(error) ?
            "Your session has expired. Please log in again."
          : "Failed to remove users from blocklist",
      },
    );
  }

  return {
    addToBlocklistMutation,
    removeFromBlocklistMutation,
    handleAdd,
    handleRemove,
  };
}
