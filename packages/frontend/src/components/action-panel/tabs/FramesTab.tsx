import { GuildFrame } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import Link from "next/link";
import { useAuthContext, useCanvasContext } from "@/contexts";
import { useCanvasImage } from "@/hooks";
import { useGuildFrames, useUserFrames } from "@/hooks/queries/useFrame";
import { decodeUserGuildsBase64 } from "@/util";
import { Heading } from "../ActionPanel";
import {
  ActionPanelTabBody,
  ScrollBlock,
  TabBlock,
} from "./ActionPanelTabBody";
import BotCommandCard from "./BotCommandCard";
import { FramePreviewCard } from "./FramePreviewCard";
import FrameInfoCard from "./SelectedFrameInfoCard";

const FramesTabBlock = styled(TabBlock)`
  grid-template-rows: 1fr auto;
`;

const FramesContainer = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media (max-width: 767px) {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));

    > h2 {
      grid-column: 1 / -1;
    }
  }
`;

interface FramesTabProps {
  active?: boolean;
  canvasId: number;
}

export default function FramesTab({ active, canvasId }: FramesTabProps) {
  const { user } = useAuthContext();
  const { selectedFrame, setSelectedFrame } = useCanvasContext();
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

  return (
    <FramesTabBlock active={active}>
      <ScrollBlock>
        <ActionPanelTabBody>
          <FramesContainer>
            <Heading>Your Frames</Heading>
            {userFrames.length !== 0 ?
              userFrames.map((frame) => (
                <FramePreviewCard
                  key={frame.id}
                  frame={frame}
                  sourceImage={sourceImage}
                  onClick={() => setSelectedFrame(frame)}
                />
              ))
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
                {frames
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((frame) => (
                    <FramePreviewCard
                      key={frame.id}
                      frame={frame}
                      sourceImage={sourceImage}
                      onClick={() => setSelectedFrame(frame)}
                    />
                  ))}
              </FramesContainer>
            );
          })}
        </ActionPanelTabBody>
      </ScrollBlock>
      {selectedFrame && (
        <ActionPanelTabBody>
          <FrameInfoCard frame={selectedFrame} />
          <BotCommandCard command="/frame create" />
        </ActionPanelTabBody>
      )}
    </FramesTabBlock>
  );
}
