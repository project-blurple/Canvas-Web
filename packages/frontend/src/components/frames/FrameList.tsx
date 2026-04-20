import { GuildOwnedFrame, SystemOwnedFrame } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import Link from "next/link";
import {
  useAuthContext,
  useCanvasContext,
  useSelectedFrameContext,
} from "@/contexts";
import { useGuildFrames, useUserFrames } from "@/hooks/queries/useFrame";
import { useCanvasImage } from "@/hooks/useCanvasImage";
import { Heading } from "../action-panel/ActionPanel";
import { ActionPanelTabBody } from "../action-panel/tabs/ActionPanelTabBody";
import { FramePreviewList } from "../action-panel/tabs/FramePreviewList";

const FramesWrapper = styled("div")`
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

  const inbuiltFullCanvasFrame = {
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
  } as const satisfies SystemOwnedFrame;

  return (
    <ActionPanelTabBody>
      <FramesWrapper>
        <Heading>Your frames</Heading>
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
      </FramesWrapper>
      <FramesWrapper>
        <Heading>Blurple Canvas</Heading>
        <FramePreviewList
          items={[inbuiltFullCanvasFrame]}
          sourceImage={sourceImage}
          onSelectFrame={setSelectedFrame}
        />
      </FramesWrapper>
      {sortedGuildFrameMap.map(([ownerId, frames]) => {
        const firstFrame = frames[0];
        if (!firstFrame) {
          return null;
        }

        return (
          <FramesWrapper key={ownerId}>
            <Heading>{firstFrame.owner.guild.name}</Heading>
            <FramePreviewList
              items={frames.toSorted((a, b) => a.name.localeCompare(b.name))}
              sourceImage={sourceImage}
              onSelectFrame={setSelectedFrame}
            />
          </FramesWrapper>
        );
      })}
    </ActionPanelTabBody>
  );
}
