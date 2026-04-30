import type { NoticeRequest } from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config";

export function useNotices(fetchAll: boolean = false) {
  const getNotices = async (): Promise<NoticeRequest.NoticeResBody> => {
    const url =
      !fetchAll ?
        `${config.apiUrl}/api/v1/notice`
      : `${config.apiUrl}/api/v1/notice/all`;

    const response = await axios.get<NoticeRequest.NoticeResBody>(url);
    return response.data;
  };

  return useQuery<NoticeRequest.NoticeResBody>({
    queryKey: ["notices"],
    queryFn: getNotices,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });
}
