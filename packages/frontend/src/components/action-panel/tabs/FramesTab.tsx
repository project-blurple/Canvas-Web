import { GuildFrame } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { DynamicButton } from "@/components/button";
import { useAuthContext, useSelectedFrameContext } from "@/contexts";
import { useCanvasImage } from "@/hooks";
import { useGuildFrames, useUserFrames } from "@/hooks/queries/useFrame";
import { createPixelUrl, decodeUserGuildsBase64 } from "@/util";
import { Heading } from "../ActionPanel";
import {
  ActionPanelTabBody,
  ScrollBlock,
  TabBlock,
} from "./ActionPanelTabBody";
import ActionPanelTooltip from "./ActionPanelTooltip";
import BotCommandCard from "./BotCommandCard";
import { FramePreviewList } from "./FramePreviewList";
import FrameInfoCard from "./SelectedFrameInfoCard";

const FramesTabBlock = styled(TabBlock)`
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
  const { frame: selectedFrame, setFrame: setSelectedFrame } =
    useSelectedFrameContext();
  const sourceImage = useCanvasImage(canvasId);

  const guildIds = user ? decodeUserGuildsBase64(user) : undefined;
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

  const groupedByOwnerId = guildFrames.reduce<Record<string, GuildFrame[]>>(
    (acc, frame) => {
      const ownerId = frame.ownerId;
      acc[ownerId] ??= [];
      acc[ownerId].push(frame);
      return acc;
    },
    {},
  );

  const sortedGuildFrameMap = Object.entries(groupedByOwnerId).sort(
    ([, framesA], [, framesB]) => {
      const firstFrameA = framesA[0];
      const firstFrameB = framesB[0];
      if (!firstFrameA || !firstFrameB) {
        return 0;
      }

      const ownerGuildA = firstFrameA.ownerGuild.name;
      const ownerGuildB = firstFrameB.ownerGuild.name;
      return ownerGuildA.localeCompare(ownerGuildB);
    },
  );

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
          {sortedGuildFrameMap.map(([ownerId, frames]) => {
            const firstFrame = frames[0];
            if (!firstFrame) {
              return null;
            }

            return (
              <FramesContainer key={ownerId}>
                <Heading>{firstFrame.ownerGuild.name}</Heading>
                <FramePreviewList
                  items={[...frames].sort((a, b) =>
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
        </ActionPanelTabBody>
      )}
    </FramesTabBlock>
  );
}
