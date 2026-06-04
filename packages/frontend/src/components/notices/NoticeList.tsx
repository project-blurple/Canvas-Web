"use client";

import { styled } from "@mui/material";
import { MegaphoneOff } from "lucide-react";
import { useCanvasContext } from "@/contexts";
import { useNotices } from "@/hooks/queries/useNotice";
import ContentUnavailableView from "../ContentUnavailableView";
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
  const { data: notices } = useNotices();
  const { canvas } = useCanvasContext();

  const filtered =
    notices
      ?.filter(
        (notice) => notice.canvasId === null || notice.canvasId === canvas?.id,
      )
      .sort(
        (a, b) =>
          a.priority - b.priority ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ) ?? [];

  if (filtered.length === 0) {
    return (
      <ContentUnavailableView.Root>
        <MegaphoneOff />
        <ContentUnavailableView.Heading>
          No notices
        </ContentUnavailableView.Heading>
        <ContentUnavailableView.Description>
          No notices for {canvas.name}
        </ContentUnavailableView.Description>
      </ContentUnavailableView.Root>
    );
  }
  return (
    <UnorderedList {...props} role="list">
      {filtered.map((notice) => (
        <NoticeListItem key={notice.id} notice={notice} />
      ))}
    </UnorderedList>
  );
}
