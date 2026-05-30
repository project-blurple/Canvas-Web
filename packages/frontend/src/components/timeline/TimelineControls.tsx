import { styled } from "@mui/material";
import { useTimelineContext } from "@/contexts";
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

export default function TimelineControls() {
  const { timelineIsAvailable, timelineIsActive, setTimelineIsActive } =
    useTimelineContext();

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
            <p>yay</p>
            <Button onClick={() => setTimelineIsActive(false)}>
              Disable timeline
            </Button>
          </ControlsContent>
        </div>
      }
    </ActionPanelTabBody>
  );
}
