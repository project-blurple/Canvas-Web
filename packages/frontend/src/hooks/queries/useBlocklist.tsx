import type { BlocklistRequest } from "@blurple-canvas-web/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

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
    mutationFn: async (ids: bigint[]) => {
      const url = `${config.apiUrl}/api/v1/blocklist`;
      await axios.delete(url, {
        data: { userId: ids.map((id) => id.toString()) },
        withCredentials: true,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocklist"] }),
  });

  async function handleAdd(ids: Iterable<bigint>) {
    try {
      const arr = Array.from(ids);
      await addToBlocklistMutation.mutateAsync(arr);
      return true;
    } catch (e) {
      console.error(e);
      if ((e as { response?: { status?: number } }).response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        return false;
      }

      alert("Failed to add users to blocklist");
      return false;
    }
  }

  async function handleRemove(ids: Iterable<bigint>) {
    try {
      const arr = Array.from(ids);
      await removeFromBlocklistMutation.mutateAsync(arr);
      return true;
    } catch (e) {
      console.error(e);
      if ((e as { response?: { status?: number } }).response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        return false;
      }

      alert("Failed to remove users from blocklist");
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
