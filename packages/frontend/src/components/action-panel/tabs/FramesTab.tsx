import { Frame } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useAuthContext } from "@/contexts";
import { useCanvasImage } from "@/hooks";
import { useFrame } from "@/hooks/queries/useFrame";
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
`;

interface FramesTabProps {
  active?: boolean;
  canvasId: number;
}

export default function FramesTab({ active, canvasId }: FramesTabProps) {
  const { user } = useAuthContext();
  const sourceImage = useCanvasImage(canvasId);

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
            <Heading>Your Frames</Heading>
            <p>
              <a href="/signin">Sign in</a> to view frames
            </p>
          </FramesContainer>
        </ActionPanelTabBody>
      </FramesTabBlock>
    );
  }

  const guildFrameMap: { [key: string]: Frame[] } = guildFrames.reduce(
    (map, frame) => {
      const ownerId = frame.ownerId;
      if (!map[ownerId]) {
        map[ownerId] = [];
      }
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
          <FramesContainer>
            <Heading>Your Frames</Heading>
            {userFrames.map((frame) => (
              <FramePreviewCard
                key={frame.id}
                frame={frame}
                sourceImage={sourceImage}
              />
            ))}
          </FramesContainer>
          {sortedGuildFrameMap.map(([ownerId, frames]) => (
            <FramesContainer key={ownerId}>
              <Heading>{frames[0]?.ownerGuild?.name}</Heading>
              {frames
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((frame) => (
                  <FramePreviewCard
                    key={frame.id}
                    frame={frame}
                    sourceImage={sourceImage}
                  />
                ))}
            </FramesContainer>
          ))}
        </ActionPanelTabBody>
      </ScrollBlock>
      <ActionPanelTabBody>
        <FrameInfoCard frame={userFrames[0] ?? null} />
        {/* need to add select */}
        <BotCommandCard command="/frame create" />
      </ActionPanelTabBody>
    </FramesTabBlock>
  );
}
