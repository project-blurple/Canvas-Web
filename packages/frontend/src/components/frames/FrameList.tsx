import { GuildOwnedFrame, SystemOwnedFrame } from "@blurple-canvas-web/types";
import { Link, styled } from "@mui/material";
import { Heading } from "lucide-react";
import {
  useAuthContext,
  useCanvasContext,
  useSelectedFrameContext,
} from "@/contexts";
import { useGuildFrames, useUserFrames } from "@/hooks/queries/useFrame";
import { useCanvasImage } from "@/hooks/useCanvasImage";
import { ActionPanelTabBody } from "../action-panel/tabs/ActionPanelTabBody";
import { FramePreviewList } from "../action-panel/tabs/FramePreviewList";

const FramesContainer = styled("div")`
  display: flex;
  flex-direction: column;
`;

export default function FrameList() {
  const { user } = useAuthContext();
  const { canvas } = useCanvasContext();
  const { setFrame: setSelectedFrame } = useSelectedFrameContext();

  const sourceImage = useCanvasImage(canvas.id);

  const { data: userFrames = [] } = useUserFrames({
    canvasId: canvas.id,
    userId: user?.id,
  });

  const guildIds = Object.keys(user?.guilds ?? {});
  const { data: guildFrames = [] } = useGuildFrames({
    canvasId: canvas.id,
    guildIds: guildIds,
  });

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

  return (
    <ActionPanelTabBody>
      <FramesContainer>
        <Heading>Your Frames</Heading>
        {user ?
          userFrames.length !== 0 ?
            <FramePreviewList
              items={userFrames}
              sourceImage={sourceImage}
              onSelectFrame={setSelectedFrame}
            />
          : <p>You have no frames</p>
        : <p>
            <Link href="/signin">Sign in</Link> to view frames
          </p>
        }
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
              items={frames.toSorted((a, b) => a.name.localeCompare(b.name))}
              sourceImage={sourceImage}
              onSelectFrame={setSelectedFrame}
            />
          </FramesContainer>
        );
      })}
    </ActionPanelTabBody>
  );
}
