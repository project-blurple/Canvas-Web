import type { Notice, NoticeType } from "@blurple-canvas-web/types";
import { css, styled } from "@mui/material";
import { X } from "lucide-react";
import Markdown from "markdown-to-jsx";
import { useRef, useState } from "react";
import { Button } from "@/components/button";
import NumberField from "@/components/NumberField";
import { resolveSpecialText } from "@/util/text";

const noticeCss = css`
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: 1rem;
  border: var(--card-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  width: 100%;
`;

const NoticeWrapper = styled("div")`
  ${noticeCss}
`;

const NoticeForm = styled("form")`
  ${noticeCss}
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

const StyledTextarea = styled("textarea")`
  background-color: var(--discord-legacy-dark-but-not-black);
  border: var(--card-border);
  color: var(--discord-white);
  padding: 0.5rem;
  resize: vertical;
`;

const StyledHeaderTextarea = styled(StyledTextarea)`
  font-size: 1.25rem;
  font-weight: 600;
  height: 2.5rem;
`;

const StyledContentTextarea = styled(StyledTextarea)`
  font-size: 1rem;
  line-height: 1.5;
  height: 10rem;
`;

const Divider = styled("hr")`
  border: none;
  border-top: var(--card-border);
  margin: 0.5rem 0;
`;

const EditHeaderWrapper = styled("div")`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Select = styled("select")`
  background-color: var(--discord-legacy-dark-but-not-black);
  border: var(--card-border);
  color: var(--discord-white);
  padding: 0.25rem;
  width: fit-content;
`;

const inlineControlWrapperCss = css`
  align-items: center;
  background-color: var(--discord-legacy-dark-but-not-black);
  border-radius: 0.5rem;
  border: var(--card-border);
  display: flex;
  flex-direction: row;
  gap: 0.25rem;
  padding-block: 0.25rem;
  padding-inline: 0.5rem 0.25rem;
`;

const inlineControlLabelCss = css`
  color: var(--discord-white);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  white-space: nowrap;
`;

const inlineControlInputCss = css`
  background-color: var(--discord-legacy-but-not-black);
  border-radius: 0.25rem;
  border: none;
  color: var(--discord-white);
  font-size: 0.875rem;
`;

const InlineFieldLabel = styled("label")`
  ${inlineControlLabelCss}
`;

const InlineDateInput = styled("input")`
  ${inlineControlInputCss}
  padding: 0.25rem;
`;

const ClearIconButton = styled("button")`
  background-color: transparent;
  border-radius: 0.25rem;
  border: none;
  color: var(--discord-white);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0;
`;

const PriorityField = styled(NumberField)`
  ${inlineControlWrapperCss}

  label {
    ${inlineControlLabelCss}
  }

  input {
    ${inlineControlInputCss}
    padding-block: 0;
    padding-inline: 0.25rem;
    width: 3rem;
  }
`;

const PersistedCheckboxWrapper = styled("div")`
  ${inlineControlWrapperCss}
  padding: 0.25rem 0.5rem;
`;

const DateInputWrapper = styled("div")`
  ${inlineControlWrapperCss}
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
  const headerRef = useRef<HTMLTextAreaElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [type, setType] = useState(notice.type);
  const [isPersisted, setIsPersisted] = useState(notice.persisted);
  const [priority, setPriority] = useState(notice.priority);
  const [startAt, setStartAt] = useState(notice.startAt);
  const [endAt, setEndAt] = useState(notice.endAt);
  const [, setPreviewTick] = useState(0);

  function saveChanges() {
    // TODO: Implement saving changes to the notice
    setIsEditMode(false);
  }

  function deleteNotice() {
    // TODO: Implement notice deletion logic
    setIsEditMode(false);
  }

  function handleInput() {
    // Force re-render to update the markdown preview as the user types
    setPreviewTick((t) => t + 1);
  }

  const currentHeader = headerRef.current?.value ?? notice.header ?? null;
  const currentContent = contentRef.current?.value ?? notice.content ?? null;

  return (
    <NoticeForm
      onSubmit={(e) => {
        e.preventDefault();
        saveChanges();
      }}
    >
      <EditHeaderWrapper>
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as NoticeType)}
        >
          <option value={"info" as NoticeType} selected={type === "info"}>
            Info
          </option>
          <option value={"warning" as NoticeType} selected={type === "warning"}>
            Warning
          </option>
          <option value={"error" as NoticeType} selected={type === "error"}>
            Error
          </option>
        </Select>
        <PersistedCheckboxWrapper>
          <input
            type="checkbox"
            id="persisted"
            name="persisted"
            checked={isPersisted}
            onChange={(e) => setIsPersisted(e.target.checked)}
          />
          <InlineFieldLabel htmlFor="persisted">Persisted</InlineFieldLabel>
        </PersistedCheckboxWrapper>
        <PriorityField
          label="Priority"
          value={priority}
          onValueChange={(value) => setPriority(value ?? 0)}
        />
        <DateInputWrapper>
          <InlineFieldLabel htmlFor="startAt">Start</InlineFieldLabel>
          <InlineDateInput
            type="datetime-local"
            id="startAt"
            name="startAt"
            value={startAt ? new Date(startAt).toISOString().slice(0, 16) : ""}
            onChange={(e) =>
              setStartAt(e.target.value ? new Date(e.target.value) : null)
            }
          />
          <ClearIconButton type="button" onClick={() => setStartAt(null)}>
            <X size={16} />
          </ClearIconButton>
        </DateInputWrapper>
        <DateInputWrapper>
          <InlineFieldLabel htmlFor="endAt">End</InlineFieldLabel>
          <InlineDateInput
            type="datetime-local"
            id="endAt"
            name="endAt"
            value={endAt ? new Date(endAt).toISOString().slice(0, 16) : ""}
            onChange={(e) =>
              setEndAt(e.target.value ? new Date(e.target.value) : null)
            }
          />
          <ClearIconButton type="button" onClick={() => setEndAt(null)}>
            <X size={16} />
          </ClearIconButton>
        </DateInputWrapper>
      </EditHeaderWrapper>
      <StyledHeaderTextarea
        name="header"
        aria-label="Notice header"
        defaultValue={notice.header ?? ""}
        ref={headerRef}
        onInput={handleInput}
      />
      <StyledContentTextarea
        name="content"
        aria-label="Notice content"
        defaultValue={notice.content ?? ""}
        ref={contentRef}
        onInput={handleInput}
      />
      <Divider />
      <ContentWrapper>
        <HeaderAsMarkdown header={currentHeader} />
        <ContentAsMarkdown content={currentContent} />
      </ContentWrapper>

      <ButtonWrapper>
        <StyledButton type="submit">Save</StyledButton>
        <StyledButton type="button" onClick={() => setIsEditMode(false)}>
          Cancel
        </StyledButton>
        <StyledButton type="button" onClick={deleteNotice}>
          Delete
        </StyledButton>
      </ButtonWrapper>
    </NoticeForm>
  );
}

export function EditableNotice({ notice }: { notice: Notice }) {
  const [isEditMode, setIsEditMode] = useState(false);

  return isEditMode ?
      <EditModeNotice notice={notice} setIsEditMode={setIsEditMode} />
    : <StaticNotice notice={notice} setIsEditMode={setIsEditMode} />;
}
