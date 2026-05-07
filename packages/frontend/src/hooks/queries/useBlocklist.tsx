import type { BlocklistRequest } from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

export function useBlocklist() {
  const getBlocklist = async (): Promise<BlocklistRequest.BlocklistResBody> => {
    const url = `${config.apiUrl}/api/v1/blocklist`;

    const response = await axios.get<BlocklistRequest.BlocklistResBody>(url);
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
