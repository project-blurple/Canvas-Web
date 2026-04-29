"use client";

import type { CanvasSummary } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { LockKeyhole, Paintbrush } from "lucide-react";
import { CanvasView } from "@/components/canvas";
import { SlideableDrawer } from "@/components/slideable-drawer";
import { useCanvasContext } from "@/contexts";
import { useCanvasList } from "@/hooks";
import Admin from "../Admin";

const CanvasInfoWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  align-items: center;
`;

const CanvasWrapper = styled("div")`
  // I stole this from Main.tsx
  body:has(&) {
    --action-panel-width: 19rem;
    --navbar-height: 4rem;
    column-gap: 1rem;
    row-gap: 0;

    display: grid;
    // Restricts the height of the page to the viewport
    grid-template-rows: var(--navbar-height) calc(100dvh - var(--navbar-height));
    height: 100dvh;

    ${({ theme }) => theme.breakpoints.up("lg")} {
      --column-gap: 2rem;
      --action-panel-width: 23rem;
    }
  }

  column-gap: inherit;
  display: grid;
  grid-template-rows: 1fr 1fr;
  row-gap: inherit;

  height: 60vh;
  width: 80%;

  ${({ theme }) => theme.breakpoints.up("md")} {
    grid-auto-flow: column;
    grid-template-columns: 1fr var(--action-panel-width);
    grid-template-rows: initial;
    padding: var(--layout-padding-y) var(--layout-padding-x);
  }
`;

const CanvasSelectorPanelWrapper = styled("div")`
  // I stole this from the Action Panel
  --padding-width: 1rem;
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: var(--card-border-radius);
  border: var(--card-border);
  display: grid;
  gap: 0.5rem;
  grid-template-rows: auto;
  overflow-y: auto; // Fallback property, should appear before overflow-block
  overflow-block: auto;
  padding: var(--padding-width);

  > * {
    border-radius: calc(var(--card-border-radius) - var(--padding-width));
  }

  ${({ theme }) => theme.breakpoints.down("md")} {
    border-radius: 0;
    border: unset;
  }
`;

const CanvasOptionsWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
`;

const CanvasOptionButtonStyled = styled("button")`
  appearance: none;
  border: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-style: inherit;
  line-height: inherit;

  background-color: var(--discord-legacy-dark-but-not-black);
  border-radius: inherit;
  cursor: pointer;
  padding: 0.5rem 1rem;

  &[aria-selected="true"] {
    outline: var(--focus-outline);
  }
`;

const CanvasOptionHeader = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: start;
`;

const CanvasOptionTitle = styled("h2")`
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--discord-white);
`;

const CanvasDataWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

function CanvasOptionButton({
  canvas,
  ...props
}: {
  canvas: CanvasSummary;
} & React.ComponentPropsWithoutRef<"button">) {
  return (
    <CanvasOptionButtonStyled {...props}>
      <CanvasOptionHeader>
        <CanvasOptionTitle>{canvas.name}</CanvasOptionTitle>
        {canvas.isLocked ?
          <LockKeyhole />
        : <Paintbrush />}
      </CanvasOptionHeader>
    </CanvasOptionButtonStyled>
  );
}

export default function AdminCanvasPage() {
  const { data: canvases = [], isLoading: canvasListIsLoading } =
    useCanvasList();
  const { canvas: activeCanvas, setCanvas } = useCanvasContext();

  return (
    <Admin>
      <CanvasInfoWrapper>
        {canvasListIsLoading ?
          "Loading…"
        : canvases.length === 0 ?
          "No canvases found"
        : <>
            <CanvasWrapper>
              {/* Maybe just have cards with image previews instead? idk */}
              <CanvasView showInvite={false} showReticle={false} />
              <SlideableDrawer>
                <CanvasSelectorPanelWrapper>
                  <CanvasOptionsWrapper>
                    {canvases.map((canvas) => (
                      <CanvasOptionButton
                        aria-selected={activeCanvas?.id === canvas.id}
                        canvas={canvas}
                        key={canvas.id}
                        onClick={() => setCanvas(canvas.id, false)}
                      />
                    ))}
                  </CanvasOptionsWrapper>
                </CanvasSelectorPanelWrapper>
              </SlideableDrawer>
            </CanvasWrapper>
            {activeCanvas && (
              <CanvasDataWrapper>
                <h2>{activeCanvas.name}</h2> {/* Editable */}
                <p>
                  {activeCanvas.width}x{activeCanvas.height}
                </p>
                <p>
                  User-facing coordinates: ({activeCanvas.startCoordinates[0]},{" "}
                  {activeCanvas.startCoordinates[1]})
                </p>
                <p>
                  Canvas is {activeCanvas.isLocked ? "locked" : "unlocked"}
                  {/* Editable */}
                </p>
                <p>
                  All colors {activeCanvas.allColorsGlobal ? "are" : "are not"}{" "}
                  global
                  {/* Editable */}
                </p>
              </CanvasDataWrapper>
            )}
          </>
        }
      </CanvasInfoWrapper>
    </Admin>
  );
}
