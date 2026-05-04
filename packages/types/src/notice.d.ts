export type NoticeType = "info" | "warning" | "error";

export interface Notice {
  id: number;
  type: NoticeType;
  header: string | null;
  content: string | null;
  priority: number; // lower number means higher priority
  startAt: Date | null;
  endAt: Date | null;
  persistOnDismiss: boolean;
  canvasId: number | null;
  createdAt: Date;
}
