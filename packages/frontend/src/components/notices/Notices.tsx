import { styled } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import useLocalStorage from "@/app/settings/useLocalStorage";
import { useCanvasContext } from "@/contexts";
import { useNotices } from "@/hooks/queries/useNotice";
import NoticeBanner from "./NoticeBanner";

const NoticeWrapper = styled("div")`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  left: 50%;
  margin-top: 2.5rem;
  pointer-events: auto;
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  width: 90%;
  z-index: 2000;
`;

export default function Notices() {
  const { data: notices = [] } = useNotices();
  const { canvas } = useCanvasContext();

  const [persistedDismissed = [], setPersistedDismissed] =
    useLocalStorage("notices/dismissed");

  const [transientDismissed, setTransientDismissed] = useState<Set<string>>(
    new Set(),
  );

  const persistedSet = useMemo(
    () => new Set<string>(persistedDismissed),
    [persistedDismissed],
  );

  const dismiss = useCallback(
    (id: string, persist: boolean = false) => {
      setTransientDismissed((s) => {
        const next = new Set(s);
        next.add(id);
        return next;
      });

      const n = notices.find((x) => x.id === id);
      if (persist && n && n.persistOnDismiss === false) {
        const nextArr = Array.from(
          new Set([...(persistedDismissed ?? []), id]),
        );
        setPersistedDismissed(nextArr);
      }
    },
    [notices, persistedDismissed, setPersistedDismissed],
  );

  const filteredNotices = notices
    .filter(
      (notice) =>
        (notice.canvasId === null || notice.canvasId === canvas?.id) &&
        !transientDismissed.has(notice.id) &&
        !persistedSet.has(notice.id),
    )
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      } else {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    });

  return (
    <NoticeWrapper>
      {filteredNotices.map((notice) => (
        <NoticeBanner
          key={notice.id}
          notice={notice}
          onDismiss={() => dismiss(notice.id, false)}
          onDismissPermanently={() => dismiss(notice.id, true)}
        />
      ))}
    </NoticeWrapper>
  );
}
