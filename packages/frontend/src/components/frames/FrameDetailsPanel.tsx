import { type Frame, FrameOwnerType } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { ArrowLeftFromLine, Crosshair, SquarePen } from "lucide-react";
import config from "@/config/clientConfig";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { useSelectedFrameContext } from "@/contexts/SelectedFrameContext";
import { calculateScale, hexStringToPixelColor } from "@/util";
import ActionPanelPrimitives from "../action-panel/primitives";
import { ActionPanelTabBody } from "../action-panel/tabs/ActionPanelTabBody";
import { FramePanelMode } from "../action-panel/tabs/FramesTab";
import { BasicButton, DynamicButton } from "../button";
import FrameListCard from "./SelectedFrameListCard";

const ControlButtonRow = styled("div")`
  background: transparent;
  display: flex;
  gap: 0.5rem;
  padding: 0;

  > * {
    flex: 1;
  }
`;

function DownloadButton({ frame }: { frame: Frame }) {
  const { canvas } = useCanvasContext();

  const downloadLink = (() => {
    const scale = calculateScale(
      (frame.x1 - frame.x0 + 1) * (frame.y1 - frame.y0 + 1),
    );

    if (frame.owner.type === FrameOwnerType.System) {
      const baseUrl = `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvas.id)}/frame/${encodeURIComponent(frame.id)}@${scale}.png`;

      const isWholeCanvas =
        frame.x0 <= 0 &&
        frame.y0 <= 0 &&
        frame.x1 >= canvas.width - 1 &&
        frame.y1 >= canvas.height - 1;

      if (isWholeCanvas) {
        return baseUrl;
      }

      return `${baseUrl}?${new URLSearchParams({
        x0: frame.x0.toString(),
        y0: frame.y0.toString(),
        x1: frame.x1.toString(),
        y1: frame.y1.toString(),
      })}`;
    }

    return `${config.apiUrl}/api/v1/frame/${frame.id}@${scale}.png`;
  })();

  const color = hexStringToPixelColor(frame.id);

  return (
    <a href={downloadLink} target="_blank" rel="noopener noreferrer">
      <DynamicButton color={color} style={{ inlineSize: "100%" }}>
        Download image
      </DynamicButton>
    </a>
  );
}

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
        <FrameListCard frame={frame} />
        <ControlButtonRow>
          <BasicButton onClick={() => setFrame(null)}>
            <ArrowLeftFromLine />
          </BasicButton>
          <BasicButton>
            <Crosshair />
          </BasicButton>
          <BasicButton onClick={() => setActivePanel(FramePanelMode.Edit)}>
            <SquarePen />
          </BasicButton>
        </ControlButtonRow>
        <div>
          <ActionPanelPrimitives.SectionHeading>
            Downloads
          </ActionPanelPrimitives.SectionHeading>
          <DownloadButton frame={frame} />
          {/* Download timelapse */}
          {/* Export stats */}
        </div>
      </ActionPanelTabBody>
    </div>
  );
}
