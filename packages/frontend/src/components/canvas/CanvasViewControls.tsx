import { css, styled } from "@mui/material";
import {
  Grid2x2,
  Grid2x2X,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { CANVAS_WRAPPER_CLASS_NAME } from "@/util";
import { Button } from "../button/Button";
import VisuallyHidden from "../VisuallyHidden";

const CanvasViewControlColumn = styled("div", {
  shouldForwardProp: (prop: string) =>
    !["$isPanelVisible", "$isFullscreen"].includes(prop),
})<{ $isPanelVisible?: boolean; $isFullscreen?: boolean }>`
  inset-inline-end: 0.5rem;
  inset-block-start: 3.5rem;

  ${(p) =>
    p.$isPanelVisible &&
    p.$isFullscreen &&
    css`
      right: min(var(--action-panel-width), calc(100vw - 1rem));
    `};

  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  opacity: 0.75;
  position: absolute;
  z-index: 3;

  > *:first-child {
    #${CANVAS_WRAPPER_CLASS_NAME}:not(:fullscreen, :-webkit-full-screen) & {
      border-radius: 0.5rem 1rem 0.5rem 0.5rem;
    }
  }

  ${({ theme }) => theme.breakpoints.up("md")} {
    inset-block-start: 0.5rem;
    opacity: 1;
  }
`;

const StyledCanvasViewControlButton = styled(Button)`
  border-color: transparent;
  border-radius: 0.5rem;
  color: white;
  min-inline-size: auto;
  padding: 0.5rem;
  text-decoration: none;

  transition-duration: var(--transition-duration-fast);
  transition-property:
    -webkit-backdrop-filter, backdrop-filter, border-color, box-shadow;
  transition-timing-function: ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      backdrop-filter: blur(8px);
      border-color: inherit;
    }
  }
`;

function CanvasViewControlButton({
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof StyledCanvasViewControlButton>,
  "onPointerDown" | "type"
>) {
  return (
    <StyledCanvasViewControlButton
      onPointerDown={(event) => event.stopPropagation()}
      type="button"
      {...props}
    >
      {children}
    </StyledCanvasViewControlButton>
  );
}

interface CanvasViewControlsProps {
  fullscreen: {
    isActive: boolean;
    isAvailable: boolean;
    toggle: () => void;
  };
  panel: {
    isActive: boolean;
    toggle: () => void;
  };
  grid: {
    isActive: boolean;
    toggle: () => void;
  };
}

export default function CanvasViewControls({
  fullscreen,
  panel,
  grid,
}: CanvasViewControlsProps) {
  return (
    <CanvasViewControlColumn
      $isFullscreen={fullscreen.isActive}
      $isPanelVisible={panel.isActive}
    >
      {fullscreen.isAvailable && (
        <CanvasViewControlButton onClick={fullscreen.toggle}>
          <VisuallyHidden>
            {fullscreen.isActive ? "Exit fullscreen" : "Enter fullscreen"}
          </VisuallyHidden>
          {fullscreen.isActive ?
            <Minimize2 />
          : <Maximize2 />}
        </CanvasViewControlButton>
      )}

      {fullscreen.isAvailable && fullscreen.isActive && (
        <CanvasViewControlButton onClick={panel.toggle}>
          <VisuallyHidden>
            {panel.isActive ? "Hide action panel" : "Show action panel"}
          </VisuallyHidden>
          {panel.isActive ?
            <PanelRightClose />
          : <PanelRightOpen />}
        </CanvasViewControlButton>
      )}

      <CanvasViewControlButton onClick={grid.toggle}>
        <VisuallyHidden>
          {grid.isActive ? "Hide grid" : "Show grid"}
        </VisuallyHidden>
        {grid.isActive ?
          <Grid2x2X />
        : <Grid2x2 />}
      </CanvasViewControlButton>
    </CanvasViewControlColumn>
  );
}
