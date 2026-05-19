import type { Notice } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import Markdown from "markdown-to-jsx";
import { resolveSpecialText } from "@/util/text";

const NoticeWrapper = styled("div")`
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: 1rem;
  border: var(--card-border);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  width: 100%;
`;

const ChipWrapper = styled("div")`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
`;

const NoticeChip = styled("div")`
  align-items: center;
  background-color: oklch(from var(--discord-white) l c h / 20%);
  border-radius: 1rem;
  color: var(--discord-white);
  display: inline-flex;
  font-size: 0.75rem;
  font-weight: 500;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  text-transform: uppercase;
`;

const NoticeContent = styled("span")`
  font-size: 1rem;
  line-height: 1.5;
`;

function StaticNotice({ notice }: { notice: Notice }) {
  const headerText =
    notice.header ? `### ${resolveSpecialText(notice.header)}` : "";
  const contentText = notice.content ? resolveSpecialText(notice.content) : "";

  const hasStarted =
    notice.startAt ? new Date() >= new Date(notice.startAt) : null;
  const hasEnded = notice.endAt ? new Date() >= new Date(notice.endAt) : null;

  const isActive = hasStarted !== false && hasEnded !== true;

  return (
    <NoticeWrapper>
      <ChipWrapper>
        {isActive && <NoticeChip>Active</NoticeChip>}
        <NoticeChip>{notice.type}</NoticeChip>
        <NoticeChip>{notice.persisted ? "Persisted" : "Transient"}</NoticeChip>
        <NoticeChip>Priority {notice.priority}</NoticeChip>
        {notice.startAt && (
          <NoticeChip>
            {hasStarted ? "Started" : "Starting"}{" "}
            {new Date(notice.startAt).toLocaleString()}
          </NoticeChip>
        )}
        {notice.endAt && (
          <NoticeChip>
            {hasEnded ? "Ended" : "Ending"}{" "}
            {new Date(notice.endAt).toLocaleString()}
          </NoticeChip>
        )}
      </ChipWrapper>
      {headerText && (
        <NoticeContent>
          <Markdown>{headerText}</Markdown>
        </NoticeContent>
      )}
      {contentText && (
        <NoticeContent>
          <Markdown>{contentText}</Markdown>
        </NoticeContent>
      )}
    </NoticeWrapper>
  );
}

export function EditableNotice({ notice }: { notice: Notice }) {
  return <StaticNotice notice={notice} />;
}
