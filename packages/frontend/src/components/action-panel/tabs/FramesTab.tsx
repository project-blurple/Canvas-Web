import { Frame } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import Link from "next/link";
import { useAuthContext, useCanvasContext } from "@/contexts";
import { useCanvasImage } from "@/hooks";
import { useFrame } from "@/hooks/queries/useFrame";
import { useScreenDimensions } from "@/hooks/useScreenDimensions";
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

const FramesContainer = styled("div", {
  shouldForwardProp: (prop) => prop !== "isMobile",
})<{ isMobile?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  ${({ isMobile }) =>
    isMobile &&
    `
      @media (max-width: 767px) {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));

        > h2 {
          grid-column: 1 / -1;
        }
      }
    `}
`;

interface FramesTabProps {
  active?: boolean;
  canvasId: number;
}

export default function FramesTab({ active, canvasId }: FramesTabProps) {
  const { user } = useAuthContext();
  const { selectedFrame, setSelectedFrame } = useCanvasContext();
  const sourceImage = useCanvasImage(canvasId);
  const { width } = useScreenDimensions();
  const isMobile = width < 768;

  const guildIds = user ? decodeUserGuildsBase64(user) : undefined;
  const { data: userFrames = [] } = useFrame({
    canvasId: canvasId,
    userId: user?.id,
  });
  const { data: guildFrames = [] } = useFrame({
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

  const guildFrameMap: { [key: string]: Frame[] } = guildFrames.reduce(
    (map, frame) => {
      const ownerId = frame.ownerId;
      map[ownerId] ??= [];
      map[ownerId].push(frame);
      return map;
    },
    {} as { [key: string]: Frame[] },
  );

  const sortedGuildFrameMap = Object.entries(guildFrameMap).sort(
    ([, framesA], [, framesB]) => {
      const ownerGuildA = framesA[0]?.ownerGuild?.name || "";
      const ownerGuildB = framesB[0]?.ownerGuild?.name || "";
      return ownerGuildA.localeCompare(ownerGuildB);
    },
  );

  return (
    <FramesTabBlock active={active}>
      <ScrollBlock>
        <ActionPanelTabBody>
          <FramesContainer isMobile={isMobile}>
            <Heading>Your Frames</Heading>
            {userFrames.map((frame) => (
              <FramePreviewCard
                key={frame.id}
                frame={frame}
                sourceImage={sourceImage}
                isMobile={isMobile}
                onClick={() => setSelectedFrame(frame)}
              />
            ))}
          </FramesContainer>
          {sortedGuildFrameMap.map(([ownerId, frames]) => (
            <FramesContainer key={ownerId} isMobile={isMobile}>
              <Heading>{frames[0]?.ownerGuild?.name}</Heading>
              {frames
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((frame) => (
                  <FramePreviewCard
                    key={frame.id}
                    frame={frame}
                    sourceImage={sourceImage}
                    isMobile={isMobile}
                    onClick={() => setSelectedFrame(frame)}
                  />
                ))}
            </FramesContainer>
          ))}
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
