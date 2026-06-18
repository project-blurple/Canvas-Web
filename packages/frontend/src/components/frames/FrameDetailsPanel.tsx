import { styled } from "@mui/material";
import { ArrowLeftFromLine, Crosshair, SquarePen } from "lucide-react";
import { useSelectedFrameContext } from "@/contexts/SelectedFrameContext";
import ActionPanelPrimitives from "../action-panel/primitives";
import { ActionPanelTabBody } from "../action-panel/tabs/ActionPanelTabBody";
import { FramePanelMode } from "../action-panel/tabs/FramesTab";
import { BasicButton } from "../button";

const ControlButtonRow = styled("div")`
  background: transparent;
  display: flex;
  gap: 0.5rem;
  padding: 0;

  > * {
    flex: 1;
  }
`;

export default function FrameDetailsPanel({
  setActivePanel,
}: {
  setActivePanel: (panel: FramePanelMode) => void;
}) {
  const { frame, setFrame } = useSelectedFrameContext();

  if (!frame) {
    setActivePanel(FramePanelMode.List);
    return null;
  }
  return (
    <div>
      <ActionPanelTabBody>
        <ControlButtonRow>
          <BasicButton onClick={() => setFrame(null)}>
            <ArrowLeftFromLine />
          </BasicButton>
          <BasicButton>
            <Crosshair />
          </BasicButton>
          <BasicButton>
            <SquarePen />
          </BasicButton>
        </ControlButtonRow>
        <div>
          <ActionPanelPrimitives.SectionHeading>
            Frame details
          </ActionPanelPrimitives.SectionHeading>
          {frame.name}
        </div>
      </ActionPanelTabBody>
    </div>
  );
}
