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

  async function handleAdd(ids: Iterable<bigint>): Promise<boolean> {
    const arr = Array.from(ids);
    try {
      await toast
        .promise(addToBlocklistMutation.mutateAsync(arr), {
          loading: `Adding ${arr.length} ${arr.length > 1 ? "users" : "user"} to blocklist…`,
          success: `Added ${arr.length} ${arr.length > 1 ? "users" : "user"} to blocklist`,
          error: (error) =>
            isUnauthorizedError(error) ?
              "Your session has expired. Please log in again."
            : "Couldn’t add users to blocklist",
        })
        .unwrap();
      return true;
    } catch {
      return false;
    }
  }

  async function handleRemove(
    ids: Iterable<bigint>,
    shouldRestoreHistoryForCanvasId: number[] = [],
  ): Promise<boolean> {
    const arr = Array.from(ids);
    try {
      await toast
        .promise(
          removeFromBlocklistMutation.mutateAsync({
            ids: arr,
            shouldRestoreHistoryForCanvasId,
          }),
          {
            loading: `Removing ${arr.length} ${arr.length > 1 ? "users" : "user"} from blocklist…`,
            success: `Removed ${arr.length} ${arr.length > 1 ? "users" : "user"} from blocklist`,
            error: (error) =>
              isUnauthorizedError(error) ?
                "Your session has expired. Please log in again."
              : "Couldn’t remove users from blocklist",
          },
        )
        .unwrap();
      return true;
    } catch {
      return false;
    }
  }

  return {
    addToBlocklistMutation,
    removeFromBlocklistMutation,
    handleAdd,
    handleRemove,
  };
}
