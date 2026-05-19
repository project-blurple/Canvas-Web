import type { Notice, NoticeRequest } from "@blurple-canvas-web/types";
import {
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios, { type AxiosError, type AxiosResponse } from "axios";
import config from "@/config/clientConfig";

type NoticeInput = Partial<Omit<Notice, "id" | "createdAt">>;
type NoticeCreateInput = NoticeInput & {
  type: Notice["type"];
};

export function useNotices(fetchAll: boolean = false) {
  const getNotices = async (): Promise<NoticeRequest.NoticeResBody> => {
    const url =
      !fetchAll ?
        `${config.apiUrl}/api/v1/notice`
      : `${config.apiUrl}/api/v1/notice/all`;

    const response = await axios.get<NoticeRequest.NoticeResBody>(url, {
      withCredentials: fetchAll,
    });
    return response.data;
  };

  return useQuery<NoticeRequest.NoticeResBody>({
    queryKey: ["notices", fetchAll],
    queryFn: getNotices,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });
}

export function useCreateNotice(): UseMutationResult<
  AxiosResponse<Notice>,
  AxiosError,
  NoticeCreateInput
> {
  const queryClient = useQueryClient();

  return useMutation<AxiosResponse<Notice>, AxiosError, NoticeCreateInput>({
    mutationFn: async (data: NoticeCreateInput) => {
      const requestUrl = `${config.apiUrl}/api/v1/notice`;

      return await axios.post(requestUrl, data, {
        withCredentials: true,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}

export function useModifyNotice(
  noticeId: number,
): UseMutationResult<AxiosResponse<Notice>, AxiosError, NoticeInput> {
  const queryClient = useQueryClient();

  return useMutation<AxiosResponse<Notice>, AxiosError, NoticeInput>({
    mutationFn: async (data: NoticeInput) => {
      const requestUrl = `${config.apiUrl}/api/v1/notice/${encodeURIComponent(
        noticeId,
      )}`;

      return await axios.put(requestUrl, data, {
        withCredentials: true,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}

export function useDeleteNotice(
  noticeId: number,
): UseMutationResult<AxiosResponse<void>, AxiosError, void> {
  const queryClient = useQueryClient();

  return useMutation<AxiosResponse<void>, AxiosError, void>({
    mutationFn: async () => {
      const requestUrl = `${config.apiUrl}/api/v1/notice/${encodeURIComponent(
        noticeId,
      )}`;

      return await axios.delete(requestUrl, {
        withCredentials: true,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}
