import { styled } from "@mui/material";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
  Pause,
  Play,
} from "lucide-react";
import { useCanvasContext, useTimelineContext } from "@/contexts";
import { useSnapshots } from "@/hooks/queries/useSnapshots";
import ActionPanelPrimitives from "../action-panel/primitives";
import { ActionPanelTabBody } from "../action-panel/tabs/ActionPanelTabBody";
import { BasicButton } from "../button";

const ControlsContent = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Button = styled(BasicButton)`
  width: 100%;
`;

const NarrowButton = styled(BasicButton)`
  min-width: 0;
`;

const ButtonRow = styled("div")`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;

  & > * {
    flex: 1;
  }
`;

interface ControlsButtonProps extends React.ComponentPropsWithRef<
  typeof NarrowButton
> {
  icon: LucideIcon;
}

function ControlsButton({ icon, ...props }: ControlsButtonProps) {
  const IconComponent = icon;
  return (
    <NarrowButton {...props}>
      <IconComponent />
    </NarrowButton>
  );
}

export default function TimelineControls() {
  const { canvas } = useCanvasContext();
  const { data: snapshots } = useSnapshots(canvas.id);
  const {
    currentTimelineFrame,
    handleTimelineSeek,
    isPlaying,
    setIsPlaying,
    timelineIsAvailable,
    timelineIsActive,
    setTimelineIsActive,
    totalTimelineFrames,
  } = useTimelineContext();

  const currentSnapshot = snapshots?.[currentTimelineFrame] ?? null;

  const clampFrame = (frame: number) => {
    if (totalTimelineFrames <= 0) return 0;
    return Math.min(Math.max(frame, 0), totalTimelineFrames - 1);
  };

  const seekByFrameOffset = (offset: number) => {
    handleTimelineSeek(clampFrame(currentTimelineFrame + offset));
  };

  const seekBy24Hours = (direction: -1 | 1) => {
    if (!currentSnapshot || !snapshots) return;

    const targetSnapshotAt =
      new Date(currentSnapshot.snapshotAt).getTime() +
      direction * 24 * 60 * 60 * 1000;

    let selectedIndex = currentTimelineFrame;

    if (direction < 0) {
      for (let index = currentTimelineFrame - 1; index >= 0; index -= 1) {
        const candidateTime = new Date(snapshots[index].snapshotAt).getTime();
        selectedIndex = index;

        if (candidateTime <= targetSnapshotAt) {
          break;
        }
      }
    } else {
      for (
        let index = currentTimelineFrame + 1;
        index < snapshots.length;
        index += 1
      ) {
        const candidateTime = new Date(snapshots[index].snapshotAt).getTime();
        selectedIndex = index;

        if (candidateTime >= targetSnapshotAt) {
          break;
        }
      }
    }

    handleTimelineSeek(clampFrame(selectedIndex));
  };

  if (!timelineIsAvailable) return null;

  return (
    <ActionPanelTabBody>
      {!timelineIsActive ?
        <Button onClick={() => setTimelineIsActive(true)}>View timeline</Button>
      : <div>
          <ActionPanelPrimitives.SectionHeading>
            Timeline controls
          </ActionPanelPrimitives.SectionHeading>
          <ControlsContent>
            {!isPlaying ?
              <ButtonRow>
                <ControlsButton
                  icon={ChevronFirst}
                  onClick={() => seekBy24Hours(-1)}
                />
                <ControlsButton
                  icon={ChevronLeft}
                  onClick={() => seekByFrameOffset(-1)}
                />
                <ControlsButton
                  icon={Play}
                  onClick={() => setIsPlaying(true)}
                />
                <ControlsButton
                  icon={ChevronRight}
                  onClick={() => seekByFrameOffset(1)}
                />
                <ControlsButton
                  icon={ChevronLast}
                  onClick={() => seekBy24Hours(1)}
                />
              </ButtonRow>
            : <ButtonRow>
                <ControlsButton icon={ChevronsLeft} onClick={() => {}} />
                <ControlsButton icon={ChevronLeft} onClick={() => {}} />
                <ControlsButton
                  icon={Pause}
                  onClick={() => setIsPlaying(false)}
                />
                <ControlsButton icon={ChevronRight} onClick={() => {}} />
                <ControlsButton icon={ChevronsRight} onClick={() => {}} />
              </ButtonRow>
            }
            <Button onClick={() => setTimelineIsActive(false)}>
              Disable timeline
            </Button>
          </ControlsContent>
        </div>
      }
    </ActionPanelTabBody>
  );
}
