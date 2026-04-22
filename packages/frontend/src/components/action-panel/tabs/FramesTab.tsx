import type {
  GuildOwnedFrame,
  SystemOwnedFrame,
} from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { DynamicButton } from "@/components/button";
import {
  useAuthContext,
  useCanvasContext,
  useSelectedFrameContext,
} from "@/contexts";
import { useCanvasImage } from "@/hooks";
import { useGuildFrames, useUserFrames } from "@/hooks/queries/useFrame";
import { createPixelUrl } from "@/util";
import { Heading } from "../ActionPanel";
import {
  ActionPanelTabBody,
  ScrollBlock,
  Tabpanel,
} from "./ActionPanelTabBody";
import ActionPanelTooltip from "./ActionPanelTooltip";
import BotCommandCard from "./BotCommandCard";
import { FramePreviewList } from "./FramePreviewList";
import FrameInfoCard from "./SelectedFrameInfoCard";

const FramesTabBlock = styled(Tabpanel)`
  grid-template-rows: 1fr auto;
`;

const FramesContainer = styled("div")`
  display: flex;
  flex-direction: column;
`;

interface FramesTabProps {
  active?: boolean;
  canvasId: number;
}

export default function FramesTab({ active, canvasId }: FramesTabProps) {
  const { user } = useAuthContext();
  const [selectedFrame, setSelectedFrame] = useSelectedFrameContext();
  const { canvas } = useCanvasContext();
  const sourceImage = useCanvasImage(canvasId);

  const guildIds = Object.keys(user?.guilds ?? {});
  const { data: userFrames = [] } = useUserFrames({
    canvasId: canvasId,
    userId: user?.id,
  });
  const { data: guildFrames = [] } = useGuildFrames({
    canvasId: canvasId,
    guildIds: guildIds,
  });

  const [tooltipIsOpen, setTooltipIsOpen] = useState(false);
  const closeTooltip = () => setTooltipIsOpen(false);
  const openTooltip = () => setTooltipIsOpen(true);

  if (!user) {
    return (
      <FramesTabBlock active={active}>
        <ActionPanelTabBody>
          <FramesContainer>
            <Heading>Your frames</Heading>
            <p>
              <Link href="/signin">Sign in</Link> to view frames
            </p>
          </FramesContainer>
        </ActionPanelTabBody>
      </FramesTabBlock>
    );
  }

  const groupedByOwnerId = guildFrames.reduce<
    Record<string, GuildOwnedFrame[]>
  >((acc, frame) => {
    const ownerId = frame.owner.guild.guild_id;
    acc[ownerId] ??= [];
    acc[ownerId].push(frame);
    return acc;
  }, {});

  const sortedGuildFrameMap = Object.entries(groupedByOwnerId).sort(
    ([, framesA], [, framesB]) => {
      const firstFrameA = framesA[0];
      const firstFrameB = framesB[0];
      if (!firstFrameA || !firstFrameB) {
        return 0;
      }

      const ownerGuildA = firstFrameA.owner.guild.name;
      const ownerGuildB = firstFrameB.owner.guild.name;
      return ownerGuildA.localeCompare(ownerGuildB);
    },
  );

  const inbuiltFullCanvasFrame: SystemOwnedFrame = {
    id: `system-${canvas.id.toString()}`,
    canvasId: canvas.id,
    name: canvas.name,
    x0: 0,
    y0: 0,
    x1: canvas.width,
    y1: canvas.height,
    owner: {
      type: "system",
      name: "Blurple Canvas",
    },
  };

  const frameUrl =
    selectedFrame ?
      createPixelUrl({
        canvasId: canvasId,
        frameId: selectedFrame.id,
      })
    : "";

  return (
    <FramesTabBlock active={active}>
      <ScrollBlock>
        <ActionPanelTabBody>
          <FramesContainer>
            <Heading>Your Frames</Heading>
            {userFrames.length !== 0 ?
              <FramePreviewList
                items={userFrames}
                sourceImage={sourceImage}
                onSelectFrame={setSelectedFrame}
              />
            : <p>You have no frames</p>}
          </FramesContainer>
          <FramesContainer>
            <Heading>Blurple Canvas</Heading>
            <FramePreviewList
              items={[inbuiltFullCanvasFrame]}
              sourceImage={sourceImage}
              onSelectFrame={setSelectedFrame}
            />
          </FramesContainer>
          {sortedGuildFrameMap.map(([ownerId, frames]) => {
            const firstFrame = frames[0];
            if (!firstFrame) {
              return null;
            }

            return (
              <FramesContainer key={ownerId}>
                <Heading>{firstFrame.owner.guild.name}</Heading>
                <FramePreviewList
                  items={frames.toSorted((a, b) =>
                    a.name.localeCompare(b.name),
                  )}
                  sourceImage={sourceImage}
                  onSelectFrame={setSelectedFrame}
                />
              </FramesContainer>
            );
          })}
        </ActionPanelTabBody>
      </ScrollBlock>
      {selectedFrame && (
        <ActionPanelTabBody>
          <FrameInfoCard frame={selectedFrame} />
          <BotCommandCard command="/frame create" />
          {selectedFrame.owner.type !== "system" && (
            <ActionPanelTooltip
              title="Copied"
              onClose={closeTooltip}
              open={tooltipIsOpen}
            >
              <DynamicButton
                color={null}
                onAction={() => {
                  openTooltip();
                  navigator.clipboard.writeText(frameUrl);
                }}
              >
                Copy frame link
              </DynamicButton>
            </ActionPanelTooltip>
          )}
        </ActionPanelTabBody>
      )}
    </FramesTabBlock>
  );
}
