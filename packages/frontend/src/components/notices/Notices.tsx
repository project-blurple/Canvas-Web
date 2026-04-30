import { useCanvasContext } from "@/contexts";
import { useNotices } from "@/hooks/queries/useNotice";

export default function Notices() {
  const { data: notices } = useNotices();
  const { canvas } = useCanvasContext();

  if (!notices || notices.length === 0) return <h1>no notices</h1>;

  console.log("notices", notices);
  console.log("canvas id", canvas?.id);
  const filteredNotices = notices.filter(
    (notice) => notice.canvasId === null || notice.canvasId === canvas?.id,
  );
  console.log("filteredNotices", filteredNotices);

  return (
    <div>
      <h1>Notices</h1>
      {filteredNotices.map((notice) => (
        <div key={notice.id}>
          <h2>{notice.header}</h2>
          <p>{notice.content}</p>
        </div>
      ))}
    </div>
  );
}
