import { styled } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import useLocalStorage from "@/app/settings/useLocalStorage";
import { useCanvasContext } from "@/contexts";
import { useNotices } from "@/hooks/queries/useNotice";
import NoticeListItem from "./NoticeListItem";

const UnorderedList = styled("ul")`
  align-content: flex-start;
  align-items: center;
  display: grid;
  font-size: 1rem;
  gap: 0.75em;
  grid-template-columns: auto 1fr;
  line-height: 1.55;
`;

export default function NoticeList(
  props: React.ComponentPropsWithRef<typeof UnorderedList>,
) {
  const { data: notices = [] } = useNotices();
  const { canvas } = useCanvasContext();

  const [persistedDismissed = [], setPersistedDismissed] =
    useLocalStorage("notices/dismissed");

  const [transientDismissed, setTransientDismissed] = useState(
    new Set<string>(),
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
        const nextArr = Array.from(new Set([...persistedDismissed, id]));
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
    <UnorderedList {...props} role="list">
      {filteredNotices.map((notice) => (
        <NoticeListItem
          key={notice.id}
          notice={notice}
          onDismiss={() => dismiss(notice.id, false)}
          onDismissPermanently={() => dismiss(notice.id, true)}
        />
      ))}
    </UnorderedList>
  );
}
