import { useCanvasContext } from "@/contexts";
import { useNotices } from "@/hooks/queries/useNotice";

export default function Notices() {
  const { data: notices } = useNotices();
  const { canvas } = useCanvasContext();

  if (!notices || notices.length === 0) return null;

  const filteredNotices = notices.filter(
    (notice) => notice.canvasId === null || notice.canvasId === canvas?.id,
  );

  return (
    <div>
      <h1>Notices</h1>
    </div>
  );
}
