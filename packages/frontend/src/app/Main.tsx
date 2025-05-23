"use client";

import { styled } from "@mui/material";

import { ActionPanel } from "@/components/action-panel";
import { CanvasView } from "@/components/canvas";
import { SlideableDrawer } from "@/components/slideable-drawer";

const Wrapper = styled("main")`
  body:has(&) {
    --navbar-height: 4rem;
    --layout-padding-y: 1rem;
    --layout-padding-x: 2rem;
    --row-gap: 0.5rem;
    --column-gap: 1rem;
    --action-panel-width: 19rem;

    display: grid;
    grid-template-rows: var(--navbar-height) calc(100dvh - var(--navbar-height));
    height: 100dvh;
  }

  display: grid;
  grid-template-rows: 1fr 1fr;
  row-gap: var(--row-gap);
  column-gap: var(--column-gap);

  ${({ theme }) => theme.breakpoints.up("md")} {
    grid-auto-flow: column;
    grid-template-columns: 1fr var(--action-panel-width);
    grid-template-rows: initial;
    padding: var(--layout-padding-y) var(--layout-padding-x);
  }

  ${({ theme }) => theme.breakpoints.up("lg")} {
    --layout-padding-y: 2rem;
    --layout-padding-x: 4rem;
    --column-gap: 2rem;
    --action-panel-width: 23rem;
  }
`;

export default function Main() {
  return (
    <Wrapper>
      <CanvasView />
      <SlideableDrawer>
        <ActionPanel />
      </SlideableDrawer>
    </Wrapper>
  );
}
