"use client";

import { styled } from "@mui/material";

import { ActionPanel } from "@/components/action-panel";
import { CanvasView } from "@/components/canvas";
import Notices from "@/components/notices/Notices";
import { SlideableDrawer } from "@/components/slideable-drawer";

const Wrapper = styled("main")`
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

  ${({ theme }) => theme.breakpoints.up("md")} {
    grid-auto-flow: column;
    grid-template-columns: 1fr var(--action-panel-width);
    grid-template-rows: initial;
    padding: var(--layout-padding-y) var(--layout-padding-x);
  }
`;

export default function Main() {
  return (
    <>
      <Notices />
      <Wrapper>
        <CanvasView />
        <SlideableDrawer>
          <ActionPanel />
        </SlideableDrawer>
      </Wrapper>
    </>
  );
}
