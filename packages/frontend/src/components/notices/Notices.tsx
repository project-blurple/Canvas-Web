import { styled } from "@mui/material";
import { useCanvasContext } from "@/contexts";
import { useNotices } from "@/hooks/queries/useNotice";
import NoticeBanner from "./NoticeBanner";

const NoticeWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  left: 50%;
  margin-top: 1rem;
  pointer-events: auto;
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  z-index: 2000;
  align-items: center;
`;

export default function Notices() {
  const { data: notices = [] } = useNotices();
  const { canvas } = useCanvasContext();

  const filteredNotices = notices.filter(
    (notice) => notice.canvasId === null || notice.canvasId === canvas?.id,
  );

  return (
    <NoticeWrapper>
      {filteredNotices.map((notice) => (
        <NoticeBanner key={notice.id} notice={notice} />
      ))}
    </NoticeWrapper>
  );
}
