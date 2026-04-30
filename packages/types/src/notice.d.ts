export type NoticeType = "info" | "warning" | "error";

export interface Notice {
  id: number;
  type: NoticeType;
  header: string | null;
  content: string | null;
  priority: number;
  active: boolean;
  persistOnDismiss: boolean;
  canvasId: number | null;
  createdAt: Date;
}
