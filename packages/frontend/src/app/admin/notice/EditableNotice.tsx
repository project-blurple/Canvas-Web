import type { Notice } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import Markdown from "markdown-to-jsx";
import { useState } from "react";
import { Button } from "@/components/button";
import { resolveSpecialText } from "@/util/text";

const NoticeWrapper = styled("div")`
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: 1rem;
  border: var(--card-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

const ContentWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const NoticeContent = styled("span")`
  font-size: 1rem;
  line-height: 1.5;
`;

const StyledButton = styled(Button)`
  background-color: var(--discord-blurple);
  color: var(--discord-white);
`;

const ButtonWrapper = styled("div")`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
`;

const Divider = styled("hr")`
  border: none;
  border-top: var(--card-border);
  margin: 0.5rem 0;
`;

function isNoticeActive(notice: Notice): boolean {
  const now = new Date();
  const hasStarted = notice.startAt ? now >= new Date(notice.startAt) : true;
  const hasEnded = notice.endAt ? now >= new Date(notice.endAt) : false;
  return hasStarted && !hasEnded;
}

function ContentAsMarkdown({ content }: { content: string | null }) {
  if (!content) return null;

  const resolvedContent = resolveSpecialText(content);

  return (
    <NoticeContent>
      <Markdown>{resolvedContent}</Markdown>
    </NoticeContent>
  );
}

function HeaderAsMarkdown({ header }: { header: string | null }) {
  return <ContentAsMarkdown content={header ? `### ${header}` : null} />;
}

interface NoticeProps {
  notice: Notice;
  setIsEditMode: (isEditMode: boolean) => void;
}

function StaticNotice({ notice, setIsEditMode }: NoticeProps) {
  const isActive = isNoticeActive(notice);

  return (
    <NoticeWrapper>
      <ChipWrapper>
        {isActive && <NoticeChip>Active</NoticeChip>}
        <NoticeChip>{notice.type}</NoticeChip>
        <NoticeChip>{notice.persisted ? "Persisted" : "Transient"}</NoticeChip>
        <NoticeChip>Priority {notice.priority}</NoticeChip>
        {notice.startAt && (
          <NoticeChip>
            Start {new Date(notice.startAt).toLocaleString()}
          </NoticeChip>
        )}
        {notice.endAt && (
          <NoticeChip>End {new Date(notice.endAt).toLocaleString()}</NoticeChip>
        )}
      </ChipWrapper>
      <ContentWrapper>
        <HeaderAsMarkdown header={notice.header} />
        <ContentAsMarkdown content={notice.content} />
      </ContentWrapper>
      <ButtonWrapper>
        <StyledButton onClick={() => setIsEditMode(true)}>Edit</StyledButton>
        {isActive ?
          <StyledButton>Deactivate</StyledButton>
        : <StyledButton>Activate</StyledButton>}
      </ButtonWrapper>
    </NoticeWrapper>
  );
}

function EditModeNotice({ notice, setIsEditMode }: NoticeProps) {
  function saveChanges() {
    // TODO: Implement saving changes to the notice
    setIsEditMode(false);
  }

  function cancelChanges() {
    setIsEditMode(false);
  }

  return (
    <NoticeWrapper>
      <Divider />
      <ContentWrapper>
        <HeaderAsMarkdown header={notice.header} />
        <ContentAsMarkdown content={notice.content} />
      </ContentWrapper>
      <ButtonWrapper>
        <StyledButton onClick={saveChanges}>Save</StyledButton>
        <StyledButton onClick={cancelChanges}>Cancel</StyledButton>
      </ButtonWrapper>
    </NoticeWrapper>
  );
}

export function EditableNotice({ notice }: { notice: Notice }) {
  const [isEditMode, setIsEditMode] = useState(false);

  return isEditMode ?
      <EditModeNotice notice={notice} setIsEditMode={setIsEditMode} />
    : <StaticNotice notice={notice} setIsEditMode={setIsEditMode} />;
}
